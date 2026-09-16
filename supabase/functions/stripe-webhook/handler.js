import { INTEGRATION, fulfillSession } from '../_shared/payments.js';
const EVENTS = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded', 'checkout.session.async_payment_failed', 'checkout.session.expired']);
export function createWebhookHandler({ stripe, admin, secret, verify }) {
  return async request => {
    const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
    if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
    if (!stripe || !secret) return reply({ error: 'unavailable' }, 503);
    const signature = request.headers.get('stripe-signature');
    if (!signature) return reply({ error: 'invalid_signature' }, 400);
    let event;
    try { event = await verify(await request.text(), signature); } catch { return reply({ error: 'invalid_signature' }, 400); }
    if (!EVENTS.has(event.type)) return reply({ received: true });
    if (event.data?.object?.metadata?.integration !== INTEGRATION) return reply({ received: true });
    try {
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id);
      const result = await fulfillSession(admin, session);
      if (!result.paymentId && !result.ignored && ['checkout.session.expired', 'checkout.session.async_payment_failed'].includes(event.type)) {
        const { error } = await admin.from('package_checkout_orders').update({ status: event.type.endsWith('expired') ? 'expired' : 'failed' })
          .eq('id', session.metadata.order_id).eq('stripe_session_id', session.id).eq('status', 'pending');
        if (error) throw error;
      }
      return reply({ received: true });
    } catch { return reply({ error: 'fulfillment_unavailable' }, 500); }
  };
}
