import test from 'node:test';
import assert from 'node:assert/strict';
import { projectSlots, syncCovers, mapTeachers, MAX_FETCH_AGE_MS } from '../src/availability/model.js';
import { availabilityDays, hkDateKey, hkTime, dayOffset } from '../src/availability/time.js';
import { createAvailabilityStore } from '../src/availability/store.js';

const now = +new Date('2026-09-30T02:00:00Z');
const raw = (patch = {}) => ({ id: 'slot-a', teacher_id: 'teacher-a', studio_id: 'central', starts_at: '2026-09-30T03:00:00Z', ends_at: '2026-09-30T04:00:00Z', status: 'open', hold_expires_at: null, ...patch });
const snapshot = (patch = {}) => ({ teachers: [{ id: 'teacher-a', full_name: 'A', studio_ids: ['central'] }, { id: 'teacher-b', full_name: 'B' }], slots: [raw()], room_busy: [], reservations: [], studios: [], rooms: ['central', 'cwb', 'kt'].map(studio_id => ({ studio_id, resource_id: 1, active: true })), sync: { last_ok_at: new Date(now).toISOString(), from: '2026-09-29T16:00:00Z', until: '2026-10-13T16:00:00Z' }, ...patch });
const project = data => projectSlots(data, { now });

test('Hong Kong days stay correct across midnight, month, year and client timezones', () => {
  assert.equal(hkDateKey('2026-12-31T16:01:00Z'), '2027-01-01');
  assert.equal(hkTime('2026-12-31T16:01:00Z'), '00:01');
  const days = availabilityDays(new Date('2026-09-30T15:59:00Z'));
  assert.equal(days.length, 14); assert.equal(days[0].iso, '2026-09-30'); assert.equal(days[1].iso, '2026-10-01');
  assert.equal(days[13].iso, '2026-10-13'); assert.equal(dayOffset('2026-10-01', new Date(now)), 1);
});
test('room overlap is studio-specific and allows back-to-back sessions', () => {
  assert.equal(project(snapshot())[0].status, 'open');
  for (const [start, end, expected] of [['02:00', '03:00', 'open'], ['04:00', '05:00', 'open'], ['03:30', '04:30', 'blocked'], ['02:00', '05:00', 'blocked']]) {
    assert.equal(project(snapshot({ room_busy: [{ studio_id: 'central', starts_at: `2026-09-30T${start}:00Z`, ends_at: `2026-09-30T${end}:00Z` }] }))[0].status, expected);
  }
  assert.equal(project(snapshot({ room_busy: [{ studio_id: 'cwb', starts_at: raw().starts_at, ends_at: raw().ends_at }] }))[0].status, 'open');
});
test('held/booked slots reserve the room across teachers, and teacher across rooms', () => {
  for (const other of [raw({ id: 'other', teacher_id: 'teacher-b', status: 'booked' }), raw({ id: 'other', studio_id: 'cwb', status: 'held', hold_expires_at: new Date(now + 60000) })]) {
    assert.equal(project(snapshot({ slots: [raw(), other] }))[0].blockedReason, 'reserved');
  }
  assert.equal(project(snapshot({ reservations: [{ teacher_id: 'teacher-b', studio_id: 'central', starts_at: raw().starts_at, ends_at: raw().ends_at }] }))[0].blockedReason, 'reserved');
});
test('expired holds reopen only when room and sync still allow it', () => {
  const held = raw({ status: 'held', hold_expires_at: new Date(now - 1).toISOString() });
  assert.equal(project(snapshot({ slots: [held] }))[0].status, 'open');
  assert.equal(project(snapshot({ slots: [held], room_busy: [raw()] }))[0].status, 'blocked');
  assert.equal(project(snapshot({ slots: [raw({ status: 'held' })] }))[0].status, 'held');
});
test('stale, incomplete and failed reads fail closed', () => {
  const base = snapshot();
  for (const s of [snapshot({ sync: null }), snapshot({ rooms: [] }), snapshot({ sync: { ...base.sync, last_ok_at: new Date(now - 16 * 60000) } }), snapshot({ sync: { ...base.sync, until: raw().starts_at } })]) {
    assert.equal(project(s)[0].blockedReason, 'sync_unavailable');
  }
  assert.equal(projectSlots(base, { now, failed: true })[0].status, 'blocked');
  assert.equal(projectSlots(base, { now, fetchedAt: now - MAX_FETCH_AGE_MS - 1 })[0].status, 'blocked');
  assert.equal(project(snapshot({ teachers: [] }))[0].status, 'blocked');
  assert.equal(project(snapshot({ slots: [raw({ starts_at: new Date(now - 1000).toISOString() })] }))[0].blockedReason, 'past');
});
test('teacher mapping never invents ratings, photos, matches or extra studios', () => {
  const [teacher] = mapTeachers([{ id: 'teacher-a', full_name: 'Test Teacher', home_studio_id: 'central', studio_ids: ['central', 'cwb', 'qb'] }], project(snapshot()));
  assert.deepEqual(teacher.locIds, ['central', 'cwb']);
  assert.equal(teacher.match, null); assert.equal(teacher.rating, null); assert.equal(teacher.photo, null);
  assert.equal(teacher.soon, '2026-09-30 · 11:00');
});

const flush = (ms = 5) => new Promise(resolve => setTimeout(resolve, ms));
test('store coalesces realtime events, retries errors and isolates late responses after unsubscribe', async () => {
  const requests = []; let change, status, connections = 0, cleanups = 0;
  const store = createAvailabilityStore({ now: () => now, coalesceMs: 0, load: () => new Promise((resolve, reject) => requests.push({ resolve, reject })), subscribe: (c, s) => { change = c; status = s; connections++; return () => cleanups++; } });
  const a = store.subscribe(() => {}), b = store.subscribe(() => {});
  assert.equal(connections, 1); assert.equal(requests.length, 1);
  change(); change(); requests[0].resolve(snapshot()); await flush();
  assert.equal(requests.length, 2); requests[1].resolve(snapshot()); await flush();
  assert.equal(store.getSnapshot().slots[0].status, 'open');
  status('CHANNEL_ERROR'); assert.equal(store.getSnapshot().slots[0].status, 'blocked');
  status('SUBSCRIBED'); requests[2].resolve(snapshot()); await flush();
  assert.equal(store.getSnapshot().slots[0].status, 'open');
  change(); await flush(); requests[3].reject(new Error('offline')); await flush();
  assert.equal(store.getSnapshot().error, 'availability_unavailable');
  change(); await flush(); a(); b();
  assert.equal(cleanups, 1);
  requests[4].resolve(snapshot()); await flush();
  assert.equal(store.getSnapshot().error, 'availability_unavailable');
});

test('store absorbs a burst of realtime events into one snapshot request and drops the burst on unsubscribe', async () => {
  const requests = []; let change;
  const store = createAvailabilityStore({ now: () => now, coalesceMs: 40, load: () => new Promise(resolve => requests.push(resolve)), subscribe: c => { change = c; return () => {}; } });
  const stop = store.subscribe(() => {});
  requests[0](snapshot()); await flush();
  for (let i = 0; i < 25; i++) change(); // one Mindbody sync = many row events
  await flush(); assert.equal(requests.length, 1); // nothing fires inside the window
  await flush(60); assert.equal(requests.length, 2); // exactly one refresh for the whole burst
  requests[1](snapshot()); await flush();
  change(); change(); await flush(60); assert.equal(requests.length, 3); // next burst is its own request
  requests[2](snapshot()); await flush();
  change(); stop(); await flush(60);
  assert.equal(requests.length, 3); // an armed burst never fires after the last subscriber leaves
});
