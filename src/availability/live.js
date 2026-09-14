import { useSyncExternalStore } from 'react';
import { supabase } from '../supabase/client.js';
import { replaceLiveReferenceData } from '../data.js';
import { createAvailabilityStore } from './store.js';

export const liveStore = createAvailabilityStore({
  async load() {
    if (!supabase) throw new Error('Supabase is not configured');
    const { data, error } = await supabase.rpc('availability_snapshot').abortSignal(AbortSignal.timeout(15000));
    if (error) throw error;
    return data;
  },
  references: replaceLiveReferenceData,
  subscribe(onChange, onStatus) {
    if (!supabase) return () => {};
    let channel = supabase.channel('live-availability');
    for (const table of ['slots', 'room_busy', 'sync_state', 'mindbody_rooms', 'teacher_profiles', 'studios']) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, onChange);
    }
    channel.subscribe(onStatus);
    const auth = supabase.auth.onAuthStateChange(() => { queueMicrotask(onChange); });
    const visible = () => { if (document.visibilityState === 'visible') onChange(); };
    window.addEventListener('online', onChange);
    document.addEventListener('visibilitychange', visible);
    return () => {
      supabase.removeChannel(channel);
      auth.data.subscription.unsubscribe();
      window.removeEventListener('online', onChange);
      document.removeEventListener('visibilitychange', visible);
    };
  },
});

export const useLiveAvailability = () => useSyncExternalStore(liveStore.subscribe, liveStore.getSnapshot);

export async function setTeacherAvailability({ studioId, startsAt, open }) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { data, error } = await supabase.rpc('set_teacher_availability', {
    p_studio: studioId, p_starts_at: new Date(startsAt).toISOString(), p_open: open,
  });
  if (error) throw error;
  await liveStore.refresh();
  return data;
}
