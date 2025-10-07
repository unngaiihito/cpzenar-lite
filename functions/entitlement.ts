// functions/entitlement.ts
type Bindings = { ENTITLEMENTS: KVNamespace };

export const onRequestGet: PagesFunction<Bindings> = async (ctx) => {
  const { searchParams } = new URL(ctx.request.url);
  const device = searchParams.get('device') || '';

  if (!device) {
    return new Response(JSON.stringify({ active: false, plan: 'free', slots: 1 }), {
      headers: { 'content-type': 'application/json' },
    });
  }
  const raw = await ctx.env.ENTITLEMENTS.get(`ent:${device}`);
  const data = raw ? JSON.parse(raw) : { active: false, plan: 'free', slots: 1 };

  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json' },
  });
};
