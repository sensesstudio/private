import { hkTime, hkDateKey } from './time.js';

export const STUDIO_IDS = ['central', 'cwb', 'kt'];
export const MAX_SYNC_AGE_MS = 15 * 60 * 1000;
export const MAX_FETCH_AGE_MS = 90 * 1000;
const stamp = value => value ? new Date(value).getTime() : NaN;
export const overlaps = (aStart, aEnd, bStart, bEnd) => stamp(aStart) < stamp(bEnd) && stamp(bStart) < stamp(aEnd);

export function syncCovers(snapshot, start, end, now = Date.now()) {
  const sync = snapshot?.sync;
  const age = now - stamp(sync?.last_ok_at);
  return age >= -60000 && age <= MAX_SYNC_AGE_MS &&
    stamp(sync?.from) <= stamp(start) && stamp(sync?.until) >= stamp(end) &&
    STUDIO_IDS.every(id => snapshot?.rooms?.some(r => r.studio_id === id && r.resource_id != null && r.active));
}

// A failed or stale read never turns into demo availability. Ranges are [start,end):
// a session ending at 10:00 does not conflict with one beginning at 10:00.
export function projectSlots(snapshot, { now = Date.now(), fetchedAt = now, failed = false } = {}) {
  const raw = snapshot?.slots || [];
  const teachers = new Set((snapshot?.teachers || []).map(t => t.id));
  const holdsOrBookings = raw.filter(s => s.status === 'booked' ||
    (s.status === 'held' && (!s.hold_expires_at || stamp(s.hold_expires_at) > now)));
  return raw.map(row => {
    const startsAt = new Date(row.starts_at);
    const endsAt = new Date(row.ends_at);
    let reason = null;
    let status = row.status;
    if (status === 'held' && row.hold_expires_at && stamp(row.hold_expires_at) <= now) status = 'open';
    if (status === 'open') {
      if (!teachers.has(row.teacher_id) || !STUDIO_IDS.includes(row.studio_id)) reason = 'unavailable';
      else if (!Number.isFinite(+startsAt) || !Number.isFinite(+endsAt) || +endsAt <= +startsAt) reason = 'unavailable';
      else if (+startsAt <= now) reason = 'past';
      else if (failed || now - fetchedAt > MAX_FETCH_AGE_MS || !syncCovers(snapshot, startsAt, endsAt, now)) reason = 'sync_unavailable';
      else if ((snapshot.room_busy || []).some(b => b.studio_id === row.studio_id && overlaps(startsAt, endsAt, b.starts_at, b.ends_at))) reason = 'room_busy';
      else if (holdsOrBookings.some(s => s.id !== row.id && (s.studio_id === row.studio_id || s.teacher_id === row.teacher_id) && overlaps(startsAt, endsAt, s.starts_at, s.ends_at))) reason = 'reserved';
      else if ((snapshot.reservations || []).some(b => (b.studio_id === row.studio_id || b.teacher_id === row.teacher_id) && overlaps(startsAt, endsAt, b.starts_at, b.ends_at))) reason = 'reserved';
      if (reason) status = 'blocked';
    }
    return { id: row.id, teacherId: row.teacher_id, studioId: row.studio_id, startsAt, endsAt,
      status, sourceStatus: row.status, blockedReason: reason,
      holdExpiresAt: row.hold_expires_at ? new Date(row.hold_expires_at) : null, time: Number.isFinite(+startsAt) ? hkTime(startsAt) : '—' };
  });
}

export function mapTeachers(rows = [], slots = []) {
  return rows.map(r => {
    const next = slots.filter(s => s.teacherId === r.id && s.status === 'open').sort((a, b) => a.startsAt - b.startsAt)[0];
    const locIds = [...new Set([r.home_studio_id, ...(r.studio_ids || [])])].filter(id => STUDIO_IDS.includes(id));
    const soon = next ? `${hkDateKey(next.startsAt)} · ${hkTime(next.startsAt)}` : 'No open sessions';
    return { id: r.id, name: r.full_name, initials: (r.full_name || '').split(/\s+/).map(s => s[0]).slice(0, 2).join(''),
      headline: r.headline || '', specs: r.specs || [], rate: r.rate_hkd || 0, locId: r.home_studio_id, locIds,
      exp: r.experience_years, langs: r.langs || [], certs: r.certs || [], style: r.style || '',
      nextStartsAt: next ? +next.startsAt : null, rating: null, reviews: 0, match: null, reasons: [], photo: null, ph: 'sage', soon, nextAvail: soon, online: false };
  });
}
