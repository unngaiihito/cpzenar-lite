// functions/api/stripe-webhook.ts
// Pages Functions (Edge) 用：Stripe パッケージを使わずに署名検証
export const onRequestPost: PagesFunction<{ STRIPE_WEBHOOK_SECRET: string }> = async (ctx) => {
  const { request, env } = ctx;
  const secret = env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('Missing STRIPE_WEBHOOK_SECRET', { status: 500 });

  // 署名ヘッダと生ボディ
  const sig = request.headers.get('stripe-signature') ?? '';
  const payload = await request.text();

  const ok = await verifyStripeSignature(payload, sig, secret);
  if (!ok) return new Response('Invalid signature', { status: 400 });

  // ここまで来たら検証済み。イベント処理へ
  const event = JSON.parse(payload);

  switch (event.type) {
    case 'checkout.session.completed':
      // TODO: サブスク開始処理（ユーザー付与など）
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      // TODO: ライセンス状態更新
      break;
    default:
      // noop
      break;
  }

  return new Response('ok', { status: 200 });
};

// --- helpers ---

function parseStripeSigHeader(h: string) {
  // 例: t=169..., v1=abcdef, v1=...
  const out: Record<string, string[]> = {};
  for (const part of h.split(',')) {
    const [k, v] = part.split('=', 2);
    if (!k || !v) continue;
    (out[k] ??= []).push(v);
  }
  return out;
}

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string) {
  try {
    const parts = parseStripeSigHeader(sigHeader);
    const t = parts['t']?.[0];          // timestamp
    const v1List = parts['v1'] ?? [];   // HMAC 候補群
    if (!t || v1List.length === 0) return false;

    const encoder = new TextEncoder();
    const data = `${t}.${payload}`;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    const expected = buf2hex(sigBuf);

    // 時間一定比較（Timing attack 対策）
    return v1List.some(v => timingSafeEqual(expected, v));
  } catch {
    return false;
  }
}

function buf2hex(buf: ArrayBuffer) {
  const b = new Uint8Array(buf);
  return [...b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}
