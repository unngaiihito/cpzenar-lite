// functions/price-id.ts
export const onRequestGet: PagesFunction<{ STRIPE_SECRET_KEY: string }> = async ({ env }) => {
  const url =
    'https://api.stripe.com/v1/prices?active=true&limit=1&lookup_keys[]=plus_monthly_298';

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
    },
  });
  const data = await res.json();
  const price = data?.data?.[0] ?? null;

  return new Response(JSON.stringify({ priceId: price?.id ?? null }), {
    headers: { 'content-type': 'application/json' },
  });
};
