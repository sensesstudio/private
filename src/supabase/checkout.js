// Kicks off Stripe Checkout for a package by calling the create-checkout Edge
// Function, then redirecting to Stripe's hosted payment page. The user's session
// JWT is attached automatically by supabase-js, so the function knows who's buying.

import { supabase } from './client.js';

export async function startCheckout(packageId) {
  if (!supabase) return { ok: false, error: 'not configured' };
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { packageId, origin: window.location.origin },
  });
  if (error || !data?.url) {
    return { ok: false, error: error?.message || data?.error || 'Could not start checkout' };
  }
  window.location.href = data.url; // off to Stripe
  return { ok: true };
}
