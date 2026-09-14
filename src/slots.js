// Stable UI API. Demo and live stores never share slot mutations.
import { LIVE_AVAILABILITY } from './features.js';
import * as demo from './availability/demoSlots.js';
import { liveStore, useLiveAvailability } from './availability/live.js';
import { availabilityDays, hkDateKey, WINDOW_DAYS } from './availability/time.js';

export const HOLD_MS = demo.HOLD_MS;
export const SLOT_WINDOW_DAYS = LIVE_AVAILABILITY ? WINDOW_DAYS : 7;
export const useSlots = LIVE_AVAILABILITY ? () => useLiveAvailability().slots : demo.useSlots;
export const slotById = id => LIVE_AVAILABILITY ? liveStore.getSnapshot().slots.find(s => s.id === id) || null : demo.slotById(id);
export const holdSecondsLeft = demo.holdSecondsLeft;
// Read-path acceptance comes before Mindbody write-back and payment cutover.
// Do not let the simulated payment sheet mutate any live slot.
const bookingUnavailable = () => { throw new Error('Online booking is not enabled yet. Please contact the studio.'); };
export const holdSlot = LIVE_AVAILABILITY ? bookingUnavailable : demo.holdSlot;
export const releaseSlot = LIVE_AVAILABILITY ? bookingUnavailable : demo.releaseSlot;
export const bookSlot = LIVE_AVAILABILITY ? bookingUnavailable : demo.bookSlot;
export const takeRandomOpen = LIVE_AVAILABILITY ? () => null : demo.takeRandomOpen;
export function daysForTeacher(teacherId) {
  if (!LIVE_AVAILABILITY) return demo.daysForTeacher(teacherId);
  return availabilityDays().map(day => ({ ...day, slots: liveStore.getSnapshot().slots
    .filter(s => s.teacherId === teacherId && hkDateKey(s.startsAt) === day.iso)
    .sort((a, b) => a.startsAt - b.startsAt) }));
}
export function openSlotsForDay(dayIdx) {
  if (!LIVE_AVAILABILITY) return demo.openSlotsForDay(dayIdx);
  const day = availabilityDays()[dayIdx];
  if (!day || !Number.isInteger(dayIdx)) return [];
  return liveStore.getSnapshot().slots.filter(s => s.status === 'open' && hkDateKey(s.startsAt) === day.iso);
}
