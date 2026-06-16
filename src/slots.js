// Senses Pilates — availability slot store
//
// Concrete bookable slots. This shape maps 1:1 to a future `slots` DB table:
//   { id, teacherId, studioId, startsAt: Date, status: 'open' | 'held' | 'booked', holdExpiresAt: Date | null }
//
// Today it's an in-memory store with pub/sub so the UI reacts to holds, books,
// and hold expiries. When the backend lands, swap genSlots() for a fetch and the
// mutators (holdSlot/releaseSlot/bookSlot) for API calls — the component contract
// (daysForTeacher / useSlots / HOLD_MS) stays the same.

import { useState, useEffect } from 'react';
import { TEACHERS } from './data.js';

export const HOLD_MS = 10 * 60 * 1000; // a held slot is reserved for 10 minutes

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIMES = ['07:00', '08:00', '09:30', '11:00', '12:15', '14:00', '16:30', '18:00', '19:30'];
const BASE = new Date('2026-06-16T00:00:00');
const DAYS = 7;

// Seed concrete slots per teacher. Deterministic from the teacher id so the
// generated week is stable across reloads (mirrors the old buildAvail pattern).
function genSlots() {
  const out = [];
  for (const t of TEACHERS) {
    const seed = t.id.charCodeAt(1);
    for (let d = 0; d < DAYS; d++) {
      TIMES.forEach((tm, i) => {
        if ((seed + d * 3 + i * 5) % 7 <= 1) return; // teacher not working this slot
        const [hh, mm] = tm.split(':').map(Number);
        const startsAt = new Date(BASE);
        startsAt.setDate(BASE.getDate() + d);
        startsAt.setHours(hh, mm, 0, 0);
        out.push({
          id: `${t.id}-${d}-${tm.replace(':', '')}`,
          teacherId: t.id,
          studioId: t.locId,
          startsAt,
          status: (seed + d + i) % 10 > 3 ? 'open' : 'booked',
          holdExpiresAt: null,
        });
      });
    }
  }
  return out;
}

let SLOTS = genSlots();
const listeners = new Set();

function emit() {
  SLOTS = SLOTS.slice(); // fresh array ref so subscribers re-render
  listeners.forEach((fn) => fn());
}

// Release any holds whose 10-minute window has elapsed.
function sweepHolds() {
  const now = Date.now();
  let changed = false;
  SLOTS = SLOTS.map((s) => {
    if (s.status === 'held' && s.holdExpiresAt && s.holdExpiresAt.getTime() <= now) {
      changed = true;
      return { ...s, status: 'open', holdExpiresAt: null };
    }
    return s;
  });
  if (changed) emit();
}

export function slotById(id) {
  return SLOTS.find((s) => s.id === id) || null;
}

export function holdSlot(id) {
  const s = slotById(id);
  if (!s || s.status !== 'open') return s;
  SLOTS = SLOTS.map((x) => (x.id === id
    ? { ...x, status: 'held', holdExpiresAt: new Date(Date.now() + HOLD_MS) }
    : x));
  emit();
  return slotById(id);
}

export function releaseSlot(id) {
  const s = slotById(id);
  if (!s || s.status !== 'held') return;
  SLOTS = SLOTS.map((x) => (x.id === id ? { ...x, status: 'open', holdExpiresAt: null } : x));
  emit();
}

export function bookSlot(id) {
  SLOTS = SLOTS.map((x) => (x.id === id ? { ...x, status: 'booked', holdExpiresAt: null } : x));
  emit();
  return slotById(id);
}

// Book one random open slot for a teacher — drives the "live · updates in real
// time" feel on the teacher page. Returns the slot taken, or null if too few remain.
export function takeRandomOpen(teacherId) {
  const open = SLOTS.filter((s) => s.teacherId === teacherId && s.status === 'open');
  if (open.length <= 2) return null; // never strip a teacher's day bare
  const pick = open[Math.floor(Math.random() * open.length)];
  return bookSlot(pick.id);
}

const two = (n) => String(n).padStart(2, '0');
const hhmm = (date) => `${two(date.getHours())}:${two(date.getMinutes())}`;
const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Day-grouped availability for one teacher (shape mirrors the old buildAvail()).
export function daysForTeacher(teacherId) {
  const days = [];
  for (let d = 0; d < DAYS; d++) {
    const date = new Date(BASE);
    date.setDate(BASE.getDate() + d);
    const slots = SLOTS
      .filter((s) => s.teacherId === teacherId && sameDay(s.startsAt, date))
      .sort((a, b) => a.startsAt - b.startsAt)
      .map((s) => ({ id: s.id, time: hhmm(s.startsAt), status: s.status, startsAt: s.startsAt }));
    days.push({ key: d, dow: DAY_NAMES[date.getDay()], dom: date.getDate(), date, slots });
  }
  return days;
}

// Open slots across all teachers for a given day index (Browse schedule rail).
export function openSlotsForDay(dayIdx) {
  const date = new Date(BASE);
  date.setDate(BASE.getDate() + (((dayIdx % DAYS) + DAYS) % DAYS));
  return SLOTS
    .filter((s) => s.status === 'open' && sameDay(s.startsAt, date))
    .map((s) => ({ teacherId: s.teacherId, time: hhmm(s.startsAt) }));
}

// Subscribe a component to slot changes; also runs the hold-expiry sweep.
export function useSlots() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    const iv = setInterval(sweepHolds, 1000);
    return () => { listeners.delete(fn); clearInterval(iv); };
  }, []);
  return SLOTS;
}

// Remaining hold time in whole seconds for a slot (0 if not held / expired).
export function holdSecondsLeft(slot) {
  if (!slot || !slot.holdExpiresAt) return 0;
  return Math.max(0, Math.round((slot.holdExpiresAt.getTime() - Date.now()) / 1000));
}
