import test from 'node:test';
import assert from 'node:assert/strict';
import { roomBlocksForDay, roomScheduleStatus } from '../src/availability/rooms.js';
import { MAX_FETCH_AGE_MS } from '../src/availability/model.js';

const now = +new Date('2026-09-30T02:00:00Z');
const block = (studio_id, starts_at, ends_at) => ({ studio_id, starts_at, ends_at });
const state = () => ({
  fetchedAt: now, error: null, loading: false,
  snapshot: {
    room_busy: [], rooms: ['central', 'cwb', 'kt'].map(studio_id => ({ studio_id, active: true, resource_id: 1 })),
    sync: { last_ok_at: new Date(now).toISOString(), from: '2026-09-29T16:00:00Z', until: '2026-10-13T16:00:00Z' },
  },
});
test('room day includes midnight overlaps, excludes touching boundaries, and sorts across studios', () => {
  const data = { room_busy: [
    block('kt', '2026-09-30T04:00:00Z', '2026-09-30T05:00:00Z'),
    block('central', '2026-09-29T15:30:00Z', '2026-09-29T16:30:00Z'),
    block('cwb', '2026-09-30T03:00:00Z', '2026-09-30T04:00:00Z'),
    block('central', '2026-09-29T15:00:00Z', '2026-09-29T16:00:00Z'),
    block('central', '2026-09-30T16:00:00Z', '2026-09-30T17:00:00Z'),
    block('qb', '2026-09-30T03:00:00Z', '2026-09-30T04:00:00Z'),
    block('central', 'invalid', '2026-09-30T04:00:00Z'),
  ] };
  assert.deepEqual(roomBlocksForDay(data, '2026-09-30').map(r => r.studio_id), ['central', 'cwb', 'kt']);
  assert.equal(roomBlocksForDay(data, '2026-09-30', 'central').length, 1);
  assert.equal(roomBlocksForDay(data, '2026-10-01', 'central').length, 1);
  assert.equal(data.room_busy[0].studio_id, 'kt');
});
test('an empty room list is confirmed only with fresh reads, fresh sync, active rooms and full-day coverage', () => {
  const s = state();
  const status = () => roomScheduleStatus(s, '2026-09-30', 'all', now);
  assert.equal(status(), 'current');
  s.error = 'offline'; assert.equal(status(), 'unavailable'); s.error = null;
  s.fetchedAt = now - MAX_FETCH_AGE_MS - 1; assert.equal(status(), 'unavailable'); s.fetchedAt = now;
  s.snapshot.sync.last_ok_at = null; assert.equal(status(), 'never_synced');
  s.snapshot.sync.last_ok_at = new Date(now - 16 * 60000).toISOString(); assert.equal(status(), 'stale');
  s.snapshot.sync.last_ok_at = new Date(now).toISOString();
  s.snapshot.rooms[0].active = false; assert.equal(status(), 'unmapped');
  assert.equal(roomScheduleStatus(s, '2026-09-30', 'cwb', now), 'current');
  s.snapshot.rooms[0].active = true;
  s.snapshot.sync.until = '2026-09-30T15:00:00Z'; assert.equal(status(), 'outside_coverage');
  assert.equal(roomScheduleStatus({ snapshot: null, loading: true }, '2026-09-30'), 'loading');
  assert.equal(roomScheduleStatus({ snapshot: null, loading: false }, '2026-09-30'), 'unavailable');
});
