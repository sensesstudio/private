export const HK_TZ = 'Asia/Hong_Kong';
export const DAY_MS = 86400000;
export const HOUR_MS = 3600000;
export const WINDOW_DAYS = 14;

export function hkDateKey(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: HK_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}
export function hkTime(value) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: HK_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value));
}
export function hkStart(dateKey) { return new Date(`${dateKey}T00:00:00+08:00`); }
export function hkLabel(value, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('en-HK', { ...options, timeZone: HK_TZ }).format(new Date(value));
}
export function availabilityDays(now = new Date()) {
  const start = hkStart(hkDateKey(now)).getTime();
  return Array.from({ length: WINDOW_DAYS }, (_, key) => {
    const date = new Date(start + key * DAY_MS);
    return { key, date, iso: hkDateKey(date), dow: hkLabel(date, { weekday: 'short' }), dom: Number(hkLabel(date, { day: 'numeric' })) };
  });
}
export function dayOffset(dateKey, now = new Date()) {
  return Math.round((hkStart(dateKey) - hkStart(hkDateKey(now))) / DAY_MS);
}
