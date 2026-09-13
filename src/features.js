// Opt-in preview. Supabase auth alone must never switch the public demo to live data.
export const LIVE_AVAILABILITY = import.meta.env?.VITE_LIVE_AVAILABILITY === 'true';
