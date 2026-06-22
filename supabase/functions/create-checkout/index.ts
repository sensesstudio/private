// Supabase Edge Function: create a Stripe Checkout session for a package.
//
// The client (logged-in) calls this; we read the price from the packages table
// server-side (never trust a price sent by the browser), attach the user id as
// metadata, and return the Stripe-hosted checkout URL. Card data never touches
// our app. Deploy with JWT verification ON (default) — it needs the user.
//
// Required secret: STRIPE_SECRET_KEY
// (SUPABASE_URL / SUPABASE_ANON_KEY are provided automatically.)

import Stripe from 'npm:stripe@^17.0.0';
import { createClient } from 'npm:@supabase/supabase-js@^2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    // Identify the caller from their JWT.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Please sign in first.' }, 401);

    const { packageId, origin } = await req.json();

    // Authoritative price from the database — not the browser.
    const { data: pkg, error } = await supabase.from('packages').select('*').eq('id', packageId).single();
    if (error || !pkg) return json({ error: 'Unknown package.' }, 400);

    // One-time trials: block a second purchase of the same trial. Check with the
    // service role so it's reliable regardless of row-level security.
    if (packageId.endsWith('-trial')) {
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data: prior } = await admin.from('payments')
        .select('id').eq('client_id', user.id).eq('package_id', packageId).eq('status', 'paid').maybeSingle();
      if (prior) return json({ error: 'You have already used this trial offer.' }, 400);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'hkd',
          unit_amount: pkg.price_hkd * 100, // HKD cents
          product_data: { name: `Senses Studio — ${pkg.name}`, description: `${pkg.credits} private session credit(s)` },
        },
      }],
      success_url: `${origin || ''}/?checkout=success`,
      cancel_url: `${origin || ''}/?checkout=cancel`,
      client_reference_id: user.id,
      metadata: { client_id: user.id, package_id: pkg.id, credits: String(pkg.credits) },
    });

    return json({ url: session.url });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
