export const onRequestPost: PagesFunction<{ STRIPE_WEBHOOK_SECRET: string }> = async (ctx) => {
  const { request, env } = ctx;
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });

  const sig = request.headers.get("stripe-signature") ?? "";
  const payload = await request.text();

  const ok = await verifyStripeSignature(payload, sig, secret);
  if (!ok) return new Response("Invalid signature", { status: 400 });

  const event = JSON.parse(payload);

  switch (event.type) {
    case "checkout.session.completed":
      // TODO: 課金開始の処理
      break;
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      // TODO: ライセンス状態の更新
      break;
    default:
      break;
  }
  return new Response("ok", { status: 200 });
};

function parseStripeSigHeader(h: string) {
  const out: Record<string, string[]> = {};
  for (const part of h.split(",")) {
    const [k, v] = part.split("=", 2);
    if (!k || !v) continue;
    (out[k] ??= []).push(v);
  }
  return out;
}

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string) {
  try {
    const parts = parseStripeSigHeader(sigHeader);
    const t = parts["t"]?.[0];
    const v1List = parts["v1"] ?? [];
    if (!t || v1List.length === 0) return false;

    const enc = new TextEncoder();
    const data = `${t}.${payload}`;

    const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
    const expected = buf2hex(sigBuf);

    return v1List.some(v => timingSafeEqual(expected, v));
  } catch {
    return false;
  }
}

function buf2hex(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  return [...b].map(x => x.toString(16).padStart(2, "0")).join("");
}
function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}
