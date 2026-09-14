import { projectSlots, mapTeachers } from './model.js';

// One connection shared by every useSlots subscriber. Dependency injection keeps
// refresh races and reconnect behaviour testable without a production database.
export function createAvailabilityStore({ load, subscribe, references = () => {}, now = Date.now }) {
  let snapshot = null, fetchedAt = 0, failed = false, pending = false, queued = false;
  let generation = 0, active = false, cleanup, poll, clock;
  let state = { slots: [], loading: true, refreshing: false, fetchedAt: null, error: null, snapshot: null };
  const listeners = new Set();
  const publish = () => {
    const slots = projectSlots(snapshot, { now: now(), fetchedAt, failed });
    references(mapTeachers(snapshot?.teachers, slots), snapshot?.studios);
    state = { slots, loading: !snapshot && pending, refreshing: pending, fetchedAt: snapshot ? fetchedAt : null,
      error: failed ? 'availability_unavailable' : null, snapshot };
    listeners.forEach(fn => fn());
  };
  async function refresh() {
    if (!active) return;
    if (pending) { queued = true; return; }
    const mine = generation;
    pending = true;
    publish();
    try {
      const next = await load();
      if (!active || mine !== generation) return;
      if (!next || !Array.isArray(next.slots) || !Array.isArray(next.teachers) || !Array.isArray(next.room_busy)) throw new Error('invalid_snapshot');
      snapshot = next; fetchedAt = now(); failed = false;
    } catch {
      if (active && mine === generation) failed = true;
    } finally {
      if (active && mine === generation) {
        pending = false; publish();
        if (queued) { queued = false; void refresh(); }
      }
    }
  }
  function start() {
    active = true; generation++;
    const connection = generation;
    cleanup = subscribe(() => { if (active && connection === generation) void refresh(); }, status => {
      if (!active || connection !== generation) return;
      if (status === 'SUBSCRIBED') void refresh();
      else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) { failed = true; publish(); }
    });
    void refresh();
    poll = setInterval(refresh, 30000);
    clock = setInterval(publish, 1000);
  }
  return {
    getSnapshot: () => state,
    refresh,
    subscribe(fn) {
      listeners.add(fn);
      if (listeners.size === 1) start();
      return () => {
        listeners.delete(fn);
        if (!listeners.size) {
          active = false; generation++; pending = false; queued = false;
          clearInterval(poll); clearInterval(clock); cleanup?.();
        }
      };
    },
  };
}
