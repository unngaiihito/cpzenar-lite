// functions/create-checkout-session.ts
import Stripe from 'stripe';

export const onRequestPost: PagesFunction<{
  STRIPE_SECRET_KEY: string
}> = async (ctx) => {
  const stripe = new Stripe(ctx.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  const body = await ctx.request.json().catch(() => ({}));
  const { priceId, deviceId } = body as { priceId?: string; deviceId?: string };

  if (!priceId || !deviceId) {
    return new Response(JSON.stringify({ error: 'priceId and deviceId required' }), { status: 400 });
  }

  const origin = new URL(ctx.request.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/cancel.html`,
    client_reference_id: deviceId,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { deviceId },   // ← ここが後段の Webhook で効く
    },
    // customer_email: '（任意）ログイン不要なら省略'
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'content-type': 'application/json' },
  });
};
