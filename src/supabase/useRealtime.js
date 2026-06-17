// Realtime subscription hook — the heart of three-way information symmetry.
//
// Any portal that renders shared data subscribes to its table here; when ANY
// party (client, teacher, admin) writes a row, Postgres streams the change and
// `onChange` fires on every other connected device within ~1s. Pair it with an
// initial fetch: fetch once, then let this keep it live.
//
// Usage:
//   const reload = useCallback(() => fetchX().then(setX), []);
//   useEffect(() => { reload(); }, [reload]);
//   useRealtimeTable('bookings', reload, { filter: `client_id=eq.${clientId}` });

import { useEffect } from 'react';
import { supabase } from './client.js';

export function useRealtimeTable(table, onChange, { filter, event = '*' } = {}) {
  useEffect(() => {
    if (!supabase || !table) return undefined;
    const channel = supabase
      .channel(`rt:${table}:${filter || 'all'}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, ...(filter ? { filter } : {}) },
        (payload) => onChange?.(payload),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // onChange is intentionally excluded; pass a stable (useCallback) handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, filter, event]);
}
