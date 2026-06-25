// Turns a parsed `intent` into real, bookable slot suggestions from the live
// slot store, plus a templated reply line. Deterministic — the source of truth
// for availability stays on the client even when the AI parses the question.

import { openSlotsForDay, daysForTeacher } from '../slots.js';
import { teacherById } from '../data.js';
import { NEED_KW, SESSION_TYPES } from '../components/client/Browse.jsx';

const BASE_DAY_IDX = 0; // app "today" = seeded BASE (2026-06-16); single point of change
const WINDOW = 7;       // slots.js seeds a 7-day window
const MAX = 5;          // suggestions per reply
const PER_TEACHER = 2;

const needLabel = (id) => (SESSION_TYPES.find(s => s.id === id) || {}).name || '';
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function inTimeOfDay(time, tod) {
  if (!tod) return true;
  if (tod === 'morning') return time < '12:00';
  if (tod === 'afternoon') return time >= '12:00' && time < '17:00';
  return time >= '17:00'; // evening
}

function teacherMatches(t, intent) {
  if (!t) return false;
  if (intent.need && !((NEED_KW[intent.need] || /$^/).test([...(t.specs || []), t.headline, ...(t.certs || [])].join(' ')))) return false;
  if (intent.studio && !(t.locIds || [t.locId]).includes(intent.studio)) return false;
  if (intent.teacher && t.id !== intent.teacher) return false;
  if (intent.language && !(t.langs || []).includes(intent.language)) return false;
  return true;
}

function scan(intent, dayIdxList, useTOD) {
  const out = [];
  const perTeacher = {};
  for (const dayIdx of dayIdxList) {
    if (dayIdx < 0 || dayIdx >= WINDOW) continue;
    const raw = openSlotsForDay(dayIdx).slice().sort((a, b) => a.time.localeCompare(b.time));
    for (const r of raw) {
      const t = teacherById(r.teacherId);
      if (!teacherMatches(t, intent)) continue;
      if (useTOD && !inTimeOfDay(r.time, intent.timeOfDay)) continue;
      perTeacher[r.teacherId] = (perTeacher[r.teacherId] || 0) + 1;
      if (perTeacher[r.teacherId] > PER_TEACHER) continue;
      const day = daysForTeacher(r.teacherId)[dayIdx];
      const slot = day && day.slots.find(s => s.time === r.time && s.status === 'open');
      if (!slot) continue; // taken between enumerate and resolve
      out.push({ teacher: t, teacherId: r.teacherId, dayIdx, day, slot, time: r.time });
    }
  }
  out.sort((a, b) => a.dayIdx - b.dayIdx || a.time.localeCompare(b.time) || (b.teacher.match || 0) - (a.teacher.match || 0));
  return out.slice(0, MAX);
}

export function findSlots(intent) {
  const baseDays = intent.dayIdx != null
    ? [BASE_DAY_IDX + intent.dayIdx]
    : Array.from({ length: intent.daySpan || 3 }, (_, i) => i);
  const wide = Array.from({ length: WINDOW }, (_, i) => i);

  let s = scan(intent, baseDays, true);
  if (s.length) return { suggestions: s, meta: { relaxed: null } };
  if (intent.timeOfDay) {
    s = scan(intent, baseDays, false);
    if (s.length) return { suggestions: s, meta: { relaxed: 'time' } };
  }
  s = scan(intent, wide, !!intent.timeOfDay);
  if (s.length) return { suggestions: s, meta: { relaxed: 'day' } };
  s = scan(intent, wide, false);
  if (s.length) return { suggestions: s, meta: { relaxed: 'day' } };
  s = scan({ ...intent, need: null }, wide, false);
  if (s.length) return { suggestions: s, meta: { relaxed: 'need' } };
  return { suggestions: [], meta: { relaxed: 'none' } };
}

export function buildReply(intent, result) {
  const n = result.suggestions.length;
  const need = needLabel(intent.need);
  const dayWord = intent.dayIdx === 0 ? 'today' : intent.dayIdx === 1 ? 'tomorrow' : intent.dayIdx === 2 ? 'in two days' : 'soon';
  const tod = intent.timeOfDay ? ' ' + intent.timeOfDay : '';
  if (n === 0) {
    return { text: `I couldn't find ${need ? need + ' ' : ''}availability in the next few days. Try another studio or time — or tap the WhatsApp button to message us directly.` };
  }
  const r = result.meta.relaxed;
  if (r === 'time') return { text: `Nothing ${dayWord}${tod} — here ${n === 1 ? 'is' : 'are'} ${n} other ${dayWord} option${n === 1 ? '' : 's'}:` };
  if (r === 'day') return { text: `${cap(dayWord)}${tod} looks full — the next openings:` };
  if (r === 'need') return { text: `No exact match — here ${n === 1 ? 'is' : 'are'} ${n} nearby option${n === 1 ? '' : 's'}:` };
  return { text: `Found ${n} open ${need || 'session'} slot${n === 1 ? '' : 's'} ${dayWord}${tod}. Tap one to book:` };
}
