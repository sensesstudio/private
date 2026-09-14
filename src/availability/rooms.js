import { MAX_FETCH_AGE_MS, MAX_SYNC_AGE_MS, STUDIO_IDS } from './model.js';
import { DAY_MS, HOUR_MS, hkStart } from './time.js';

const stamp = value => value == null ? NaN : +new Date(value);

// A daily occupancy view includes sessions spanning midnight and preserves
// source blocks. Counts are occupied intervals, not unique client bookings.
export function roomBlocksForDay(snapshot, dateKey, studioId = 'all') {
  const start = +hkStart(dateKey), end = start + DAY_MS;
  return (snapshot?.room_busy || []).filter(row =>
    STUDIO_IDS.includes(row.studio_id) && (studioId === 'all' || row.studio_id === studioId) &&
    stamp(row.starts_at) < end && stamp(row.ends_at) > start && stamp(row.ends_at) > stamp(row.starts_at)
  ).slice().sort((a, b) => stamp(a.starts_at) - stamp(b.starts_at) ||
    a.studio_id.localeCompare(b.studio_id) || stamp(a.ends_at) - stamp(b.ends_at));
}

export function roomScheduleStatus({ snapshot, fetchedAt, error, loading }, dateKey, studioId = 'all', now = Date.now()) {
  if (!snapshot) return loading ? 'loading' : 'unavailable';
  if (error || !Number.isFinite(fetchedAt) || now - fetchedAt > MAX_FETCH_AGE_MS || fetchedAt > now + 60000) return 'unavailable';
  const syncAge = now - stamp(snapshot.sync?.last_ok_at);
  if (!Number.isFinite(syncAge)) return 'never_synced';
  if (syncAge < -60000 || syncAge > MAX_SYNC_AGE_MS) return 'stale';
  const selected = studioId === 'all' ? STUDIO_IDS : [studioId];
  if (selected.some(id => !snapshot.rooms?.some(r => r.studio_id === id && r.active && r.resource_id != null))) return 'unmapped';
  const start = +hkStart(dateKey);
  if (!(stamp(snapshot.sync?.from) <= start && stamp(snapshot.sync?.until) >= start + DAY_MS)) return 'outside_coverage';
  return 'current';
}

// Merge overlapping/duplicate occupied intervals before calculating free time.
// Free segments are exposed only when this specific room's day is verified.
export function roomDayGrid(state, dateKey, studioId, now = Date.now()) {
  const start = +hkStart(dateKey) + 7 * HOUR_MS, end = start + 15 * HOUR_MS;
  const status = roomScheduleStatus(state, dateKey, studioId, now);
  const current = status === 'current';
  const merged = [];
  for (const row of roomBlocksForDay(state.snapshot, dateKey, studioId)) {
    const a = stamp(row.starts_at), b = stamp(row.ends_at);
    if (b <= start || a >= end) continue;
    const previous = merged[merged.length - 1];
    if (previous && a <= previous.end) previous.end = Math.max(previous.end, b);
    else merged.push({ start: a, end: b });
  }
  const busyMs = merged.reduce((sum, span) => sum + Math.min(end, span.end) - Math.max(start, span.start), 0);
  const hours = Array.from({ length: 15 }, (_, index) => {
    const lo = start + index * HOUR_MS, hi = lo + HOUR_MS;
    const segments = [];
    let cursor = lo;
    for (const span of merged.filter(s => s.start < hi && s.end > lo)) {
      const a = Math.max(lo, span.start), b = Math.min(hi, span.end);
      if (a > cursor) segments.push({ kind: current ? 'free' : 'unknown', start: cursor, end: a });
      segments.push({ kind: 'busy', start: a, end: b, actualStart: span.start, actualEnd: span.end, continues: span.start < lo });
      cursor = b;
    }
    if (cursor < hi) segments.push({ kind: current ? 'free' : 'unknown', start: cursor, end: hi });
    return { start: lo, end: hi, segments };
  });
  return { studioId, status, current, freeMinutes: current ? (end - start - busyMs) / 60000 : null, hours };
}
