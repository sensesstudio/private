import { PAYMENT_ORIGINS, STRIPE_ACCOUNT, checkoutParameters, fulfillSession } from '../_shared/payments.js';
export function createCheckoutHandler({ stripe, admin, configured, livemode }) {
  return async request => {
    const origin = request.headers.get('Origin');
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
      'Access-Control-Allow-Origin': PAYMENT_ORIGINS.includes(origin) ? origin : PAYMENT_ORIGINS[0],
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (origin && !PAYMENT_ORIGINS.includes(origin)) return json({ error: 'Origin not allowed.' }, 403);
    let input;
    try { input = await request.json(); } catch { return json({ error: 'Invalid request.' }, 400); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'Invalid request.' }, 400);
    try {
      if (input.action === 'availability') {
        if (!configured || !stripe) return json({ available: false });
        const account = await stripe.accounts.retrieve();
        return json({ available: account.id === STRIPE_ACCOUNT && account.charges_enabled === true, livemode });
      }
      const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) return json({ error: 'Please sign in first.' }, 401);
      const { data: auth, error: authError } = await admin.auth.getUser(token);
      if (authError || !auth?.user) return json({ error: 'Please sign in again.' }, 401);
      if (!configured || !stripe) return json({ error: 'Online payments are temporarily unavailable.' }, 503);
      const account = await stripe.accounts.retrieve();
      if (account.id !== STRIPE_ACCOUNT || !account.charges_enabled) return json({ error: 'Online payments are temporarily unavailable.' }, 503);
      if (input.action === 'status') {
        if (typeof input.sessionId !== 'string' || !/^cs_[a-zA-Z0-9_]+$/.test(input.sessionId)) return json({ error: 'Invalid checkout reference.' }, 400);
        const { data: order, error } = await admin.from('package_checkout_orders').select('*').eq('stripe_session_id', input.sessionId).eq('client_id', auth.user.id).maybeSingle();
        if (error) throw error;
        if (!order) return json({ error: 'Checkout not found for this account.' }, 404);
        const session = await stripe.checkout.sessions.retrieve(input.sessionId);
        const result = await fulfillSession(admin, session);
        if (result.ignored) return json({ error: 'Checkout could not be verified.' }, 409);
        return json({ status: result.paymentId ? 'paid' : session.status === 'expired' ? 'expired' : 'pending', package_name: order.package_name, credits: order.credits, format: order.format });
      }
      if (typeof input.packageId !== 'string' || input.packageId.length > 80 || !PAYMENT_ORIGINS.includes(input.origin)) return json({ error: 'Invalid package request.' }, 400);
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data: order, error } = await admin.rpc('prepare_package_checkout', { p_client_id: auth.user.id, p_package_id: input.packageId, p_origin: input.origin, p_livemode: livemode });
        if (error) {
          if (error.message?.includes('trial_already_purchased')) return json({ error: 'You have already purchased this trial offer.' }, 409);
          if (error.message?.includes('client_account_required')) return json({ error: 'Please sign in with a client account to buy a package.' }, 403);
          if (error.message?.includes('package_unavailable')) return json({ error: 'This package is no longer available. Please refresh pricing.' }, 409);
          throw error;
        }
        let session;
        if (order.stripe_session_id) session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
        else {
          // An uncertain reservation is retained for review instead of risking
          // a second charge after a network failure during Session creation.
          if (+new Date(order.checkout_expires_at) < Date.now() + 30 * 60000) return json({ error: 'Please contact the studio to check your previous checkout before trying again.' }, 409);
          session = await stripe.checkout.sessions.create(checkoutParameters(order), { idempotencyKey: `package-order-${order.id}` });
          const { error: saveError } = await admin.from('package_checkout_orders').update({ stripe_session_id: session.id }).eq('id', order.id);
          if (saveError) throw saveError;
        }
        if (session.livemode !== livemode) throw new Error('mode_mismatch');
        if (session.status === 'expired') {
          const { error: expireError } = await admin.from('package_checkout_orders').update({ status: 'expired' }).eq('id', order.id).eq('status', 'pending');
          if (expireError) throw expireError;
          continue;
        }
        if (session.status === 'complete') {
          const result = await fulfillSession(admin, session);
          return json({ status: result.paymentId ? 'paid' : 'pending', session_id: session.id });
        }
        if (!session.url || new URL(session.url).hostname !== 'checkout.stripe.com') throw new Error('invalid_checkout_url');
        return json({ url: session.url });
      }
      return json({ error: 'Please try checkout again.' }, 409);
    } catch { return json({ error: 'Could not confirm checkout. Please retry or contact the studio.' }, 503); }
  };
}
