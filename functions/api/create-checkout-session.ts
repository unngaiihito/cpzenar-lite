export const onRequestPost: PagesFunction<{ STRIPE_SECRET_KEY: string }> = async (ctx) => {
  const { request, env } = ctx;
  const sk = env.STRIPE_SECRET_KEY;
  if (!sk) return new Response("Missing STRIPE_SECRET_KEY", { status: 500 });

  const body = await request.json().catch(() => ({} as any));
  const priceId = body?.priceId ?? ""; // 例: "price_***" または lookup_key を受け取ってサーバ側でPrice解決してもOK
  if (!priceId) return new Response("priceId required", { status: 400 });

  // success/cancel はフロントから渡す or 固定
  const success_url = body?.success_url ?? "https://app.cpzenar.com/?paid=1";
  const cancel_url  = body?.cancel_url  ?? "https://app.cpzenar.com/?canceled=1";

  // Stripe API (Checkout Session) を fetch で叩く（Node SDK不要）
  const form = new URLSearchParams({
    mode: "subscription",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    success_url,
    cancel_url,
    // 顧客が作成される通常のフロー。必要に応じて customer/email 等を追加
  });

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sk}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    return new Response(JSON.stringify(data), { status: res.status, headers: { "Content-Type": "application/json" } });
  }
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
};
