import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client.js';

// Component-local private state; never feed this into the public liveStore.
export function useAdminRoomDetails(day, syncVersion) {
  const [result, setResult] = useState(null);
  const [revision, setRevision] = useState(0);
  const [tick, setTick] = useState(Date.now());
  useEffect(() => {
    let active = true, generation = 0;
    const controllers = new Set();
    async function load() {
      const mine = ++generation;
      for (const c of controllers) c.abort();
      const controller = new AbortController(); controllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), 25000);
      try {
        const { data, error } = await supabase.functions.invoke('admin-room-details', { body: { day }, signal: controller.signal });
        if (error || data?.day !== day || !Array.isArray(data.rows)) throw new Error('unavailable');
        if (active && mine === generation) setResult({ day, syncVersion, rows: data.rows, checked: Date.now(), error: false });
      } catch {
        if (active && mine === generation) setResult({ day, syncVersion, rows: [], checked: Date.now(), error: true });
      } finally { clearTimeout(timeout); controllers.delete(controller); }
    }
    setResult(null);
    void load();
    const refresh = setInterval(load, 60000);
    const clock = setInterval(() => setTick(Date.now()), 10000);
    const visible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', visible);
    const auth = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return;
      ++generation;
      for (const c of controllers) c.abort();
      if (active) setResult(null);
    });
    return () => { active = false; ++generation; clearInterval(refresh); clearInterval(clock); controllers.forEach(c => c.abort()); document.removeEventListener('visibilitychange', visible); auth.data.subscription.unsubscribe(); };
  }, [day, syncVersion, revision]);
  const valid = result?.day === day && result?.syncVersion === syncVersion && Math.max(tick, Date.now()) - result.checked < 90000;
  return { rows: valid && !result.error ? result.rows : [], loading: !result, error: !!result && (!valid || result.error), refresh: () => setRevision(r => r + 1) };
}
