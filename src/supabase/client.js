// Supabase client — the single source of truth for all three portals.
//
// Reads credentials from Vite env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
// While they're unset, `supabase` is null and `isSupabaseConfigured` is false, so
// the app cleanly falls back to the in-memory demo store. Drop the keys into
// .env.local and everything below switches on — no other code changes needed.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 5 } },
    })
  : null;
