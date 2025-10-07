// functions/webhook.ts
import Stripe from 'stripe';

type Bindings = {
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ENTITLEMENTS: KVNamespace;
};

export const onRequestPost: PagesFunction<Bindings> = async (ctx) => {
  const sig = ctx.request.headers.get('stripe-signature') || '';
  const rawBody = await ctx.request.text();

  const stripe = new Stripe(ctx.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, ctx.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return new Response(`Bad signature: ${err.message}`, { status: 400 });
  }

  const putEntitlement = async (deviceId: string, data: any, ttlSeconds?: number) => {
    await ctx.env.ENTITLEMENTS.put(`ent:${deviceId}`, JSON.stringify(data), {
      expirationTtl: ttlSeconds,
    });
  };

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // 端末IDは client_reference_id か subscription_data.metadata.deviceId に入る
      const deviceId =
        session.client_reference_id ||
        (session.metadata && (session.metadata as any).deviceId) ||
        '';

      // 期限などは Subscription から拾う
      let currentPeriodEnd: number | undefined;
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        currentPeriodEnd = sub.current_period_end;
      }
      if (deviceId) {
        const ttl =
          currentPeriodEnd ? currentPeriodEnd - Math.floor(Date.now() / 1000) : undefined;
        await putEntitlement(deviceId, { active: true, plan: 'plus', slots: 'unlimited', currentPeriodEnd }, ttl);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const deviceId = (sub.metadata && sub.metadata['deviceId']) || '';
      const isActive = sub.status === 'active' || sub.status === 'trialing';

      if (deviceId) {
        const ttl = sub.current_period_end - Math.floor(Date.now() / 1000);
        await putEntitlement(deviceId, { active: isActive, plan: 'plus', slots: 'unlimited', currentPeriodEnd: sub.current_period_end }, ttl);
      }
      break;
    }

    case 'customer.subscription.deleted':
    case 'invoice.payment_failed': {
      const obj = event.data.object as any;
      const sub =
        obj.object === 'subscription'
          ? (obj as Stripe.Subscription)
          : obj.subscription
          ? await stripe.subscriptions.retrieve(obj.subscription)
          : undefined;
      const deviceId = sub?.metadata?.['deviceId'];
      if (deviceId) {
        await putEntitlement(deviceId, { active: false, plan: 'free', slots: 1 }, 60 * 60 * 24);
      }
      break;
    }
  }

  return new Response('ok', { status: 200 });
};
