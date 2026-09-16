import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../supabase/client.js';

// Private data lives only in this mounted Admin view, never in localStorage,
// the shared availability store, logs, or static files.
export function useClients() {
  const [state, setState] = useState({ data: null, loading: true, error: false });
  const pending = useRef(null);
  const refresh = useCallback(async ({ background = false } = {}) => {
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    if (!background) setState({ data: null, loading: true, error: false });
    try {
      if (!supabase) throw new Error('not_configured');
      const { data, error } = await supabase.rpc('admin_client_directory').abortSignal(request.signal);
      if (error || !Array.isArray(data?.rows) || (data.clients != null ? !Array.isArray(data.clients) : data.import && data.rows.length !== data.import.row_count)) throw new Error('unavailable');
      if (!request.signal.aborted) setState({ data, loading: false, error: false });
    } catch {
      if (!request.signal.aborted) setState({ data: null, loading: false, error: true });
    }
  }, []);
  useEffect(() => {
    refresh();
    const automatic = () => { if (document.visibilityState === 'visible') refresh({ background: true }); };
    const interval = setInterval(automatic, 60000);
    window.addEventListener('focus', automatic);
    document.addEventListener('visibilitychange', automatic);
    const listener = supabase?.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT') {
        pending.current?.abort();
        setState({ data: null, loading: false, error: true });
      }
    });
    return () => { clearInterval(interval); window.removeEventListener('focus', automatic); document.removeEventListener('visibilitychange', automatic); pending.current?.abort(); listener?.data.subscription.unsubscribe(); };
  }, [refresh]);
  return { ...state, refresh };
}
