// Kicks off Stripe Checkout for a package by calling the create-checkout Edge
// Function, then redirecting to Stripe's hosted payment page. The user's session
// JWT is attached automatically by supabase-js, so the function knows who's buying.

import { supabase } from './client.js';

export async function startCheckout(packageId) {
  if (!supabase) return { ok: false, error: 'not configured' };
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { packageId, origin: window.location.origin },
  });
  if (error) {
    // supabase-js wraps non-2xx in FunctionsHttpError; pull the function's own
    // JSON { error } message out of the Response for a useful alert.
    let msg = error.message || 'Could not start checkout';
    try { const body = await error.context?.json?.(); if (body?.error) msg = body.error; } catch { /* keep msg */ }
    return { ok: false, error: msg };
  }
  if (!data?.url) {
    return { ok: false, error: data?.error || 'Could not start checkout' };
  }
  window.location.href = data.url; // off to Stripe
  return { ok: true };
}
