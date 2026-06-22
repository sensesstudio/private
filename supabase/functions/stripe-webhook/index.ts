// Supabase Edge Function: Stripe webhook — the auto-crediting half.
//
// Stripe calls this when a payment completes. We verify the signature, then
// (using the service-role key, which bypasses RLS) record a payment row and a
// matching +credits entry in the ledger. Idempotent on the Stripe session id.
//
// Required secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are provided automatically.)
//
// ⚠️ Deploy this function with JWT verification OFF (Stripe can't send a Supabase
// JWT). In the dashboard: function → Details → turn off "Verify JWT".

import Stripe from 'npm:stripe@^17.0.0';
import { createClient } from 'npm:@supabase/supabase-js@^2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (e) {
    return new Response(`Signature verification failed: ${(e as Error).message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const clientId = s.metadata?.client_id;
    const packageId = s.metadata?.package_id;
    const credits = parseInt(s.metadata?.credits || '0', 10);
    const amountHkd = Math.round((s.amount_total ?? 0) / 100);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (clientId) {
      // Idempotency: only record this Stripe session once.
      const { data: existing } = await admin.from('payments').select('id').eq('stripe_ref', s.id).maybeSingle();
      if (!existing) {
        const { data: pay } = await admin.from('payments')
          .insert({ client_id: clientId, package_id: packageId, amount_hkd: amountHkd, method: 'stripe', status: 'paid', stripe_ref: s.id })
          .select('id').single();
        if (credits > 0) {
          await admin.from('credit_ledger')
            .insert({ client_id: clientId, delta: credits, reason: 'purchase', payment_id: pay?.id });
        }
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
