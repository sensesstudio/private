import { useEffect, useState } from 'react';
import { supabase, clientAuthReady } from './client.js';

// Session restoration and role checks always use Supabase. No demo sign-in path.
export function useAccount() {
  const [state, setState] = useState({ loading: true, user: null, profile: null, error: null });
  useEffect(() => {
    let active = true, request = 0;
    async function accept(session) {
      const mine = ++request;
      if (!session?.user) { if (active) setState({ loading: false, user: null, profile: null, error: null }); return; }
      setState({ loading: true, user: session.user, profile: null, error: null });
      try {
        const { data, error } = await supabase.from('profiles').select('id, role, full_name').eq('id', session.user.id).single();
        if (error) throw error;
        if (active && mine === request) setState({ loading: false, user: session.user, profile: data, error: null });
      } catch {
        if (active && mine === request) setState({ loading: false, user: session.user, profile: null, error: 'Could not verify account access.' });
      }
    }
    if (!supabase) { setState({ loading: false, user: null, profile: null, error: 'Sign-in is unavailable.' }); return; }
    let subscription;
    clientAuthReady.then(async () => {
      if (!active) return;
      subscription = supabase.auth.onAuthStateChange((_event, session) => { queueMicrotask(() => { if (active) void accept(session); }); }).data.subscription;
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) setState({ loading: false, user: null, profile: null, error: 'Please sign in again.' });
      else if (!request) void accept(data.session);
    });
    return () => { active = false; request++; subscription?.unsubscribe(); };
  }, []);
  return state;
}
