import { MAX_FETCH_AGE_MS, MAX_SYNC_AGE_MS, STUDIO_IDS } from './model.js';
import { DAY_MS, hkStart } from './time.js';

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
