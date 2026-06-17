// Reference-data hooks. They start from the bundled static data (so the UI is
// always correct on first paint and never breaks), then, when Supabase is
// configured, swap to the live rows. Any error/empty result keeps the static
// fallback — this is the safe, no-auth first step onto the live database.

import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './client.js';
import { LOCATIONS } from '../data.js';

export function useStudios() {
  const [state, setState] = useState({ studios: LOCATIONS, live: false });
  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    let active = true;
    supabase.from('studios').select('*').then(({ data, error }) => {
      if (!active || error || !data || !data.length) return;
      // preserve the curated display order (Central first, etc.)
      const order = LOCATIONS.map(l => l.id);
      const studios = [...data].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      setState({ studios, live: true });
    });
    return () => { active = false; };
  }, []);
  return state;
}
