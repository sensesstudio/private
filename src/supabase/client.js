// Supabase client — the single source of truth for all three portals.
//
// Reads credentials from Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// Live portals show unavailable states when credentials are not configured.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const returnUrl = new URL(window.location.href);
const googleReturn = returnUrl.searchParams.get('oauth') === 'google';

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, flowType: 'pkce', detectSessionInUrl: !googleReturn },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;

// One exchange per page load, including under React StrictMode. A PKCE verifier
// stays in this browser; Google tokens never become hash-based portal routes.
export const clientAuthReady = (async () => {
  if (!googleReturn) return null;
  let notice = 'Google sign-in could not be completed. Please try again in the browser where you started.';
  try {
    const errors = new URLSearchParams(returnUrl.hash.slice(1));
    if (returnUrl.searchParams.has('error') || errors.has('error')) {
      notice = 'Google sign-in was not completed. You can try again or sign in with email.';
    } else if (supabase && returnUrl.searchParams.get('code')) {
      const { error } = await supabase.auth.exchangeCodeForSession(returnUrl.searchParams.get('code'));
      if (!error) notice = null;
    }
  } catch { /* Show a fixed message; never render provider errors or tokens. */ }
  finally {
    const clean = new URL(window.location.href);
    for (const key of ['oauth','code','error','error_code','error_description']) clean.searchParams.delete(key);
    clean.hash = 'client';
    window.history.replaceState(window.history.state, '', clean);
  }
  return notice;
})();

export async function googleSignInAvailable(signal) {
  if (!isSupabaseConfigured) return false;
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey }, signal });
  if (!response.ok) throw new Error('Sign-in options unavailable');
  return (await response.json()).external?.google === true;
}
