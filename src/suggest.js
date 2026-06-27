// Rule-based personalised suggestion for the Profile "Your progress" card.
// Combines the four real data sources the studio cares about:
//   1. goals          — answers.goals (from intake)
//   2. health history — answers.pregnant / surgery / edd / injury
//   3. progress log   — PROGRESS_LOG (recent focus + last teacher)
//   4. favourites     — favTeachers (teachers the client hearted)
// Pure & synchronous (no AI, no network) so it works for everyone, instantly,
// and offline. The AI version (Claude) can later replace `line`/`reason` with
// generated copy using the same inputs — this stays the fallback.

import { TEACHERS, GOALS, PROGRESS_LOG } from './data.js';
import { pregnancyFromEDD } from './clientStore.js';

// goal id -> regex over a teacher's specs, and a readable noun phrase.
const GOAL_SPEC = {
  strength: /athletic|strength|condition|core/i,
  flex: /mobil|mat|stretch|flex/i,
  rehab: /rehab|injur|reformer/i,
  posture: /posture|align|foundation|beginner/i,
  natal: /prenatal|postnatal|restor|breath/i,
  calm: /restor|breath|mindful/i,
};
const GOAL_NOUN = {
  strength: 'building strength', flex: 'flexibility', rehab: 'injury rehab',
  posture: 'posture & alignment', natal: 'pre / postnatal care', calm: 'stress & calm',
};
const LANG_MAP = { en: 'English', yue: 'Cantonese', zh: 'Mandarin' };

const first = (t) => (t && t.name ? t.name.split(' ')[0] : '');

export function buildProgressSuggestion({ answers = {}, favTeachers = [] } = {}) {
  const log = PROGRESS_LOG || [];
  const recentFocus = log[0] && log[0].focus ? log[0].focus.split(/[—&]/)[0].trim() : '';
  const lastTeacherId = log[0] ? log[0].tId : null;

  const goals = answers.goals || [];
  const pregnant = answers.pregnant === 'yes';
  const injuries = (answers.injury || []).filter(x => x && x !== 'None');
  const prefLangs = (answers.languages || []).filter(l => l && l !== 'none').map(l => LANG_MAP[l]).filter(Boolean);

  // Primary focus: pregnancy first, then the first stated goal, then infer.
  const primaryGoal = pregnant ? 'natal' : (goals[0] || (/rehab|injur|back/i.test(recentFocus) ? 'rehab' : 'posture'));
  const primaryNoun = GOAL_NOUN[primaryGoal] || 'your goals';
  const specRe = GOAL_SPEC[primaryGoal] || /./;

  const pool = (() => { const on = TEACHERS.filter(t => t.online); return on.length ? on : TEACHERS; })();
  const byMatch = (a, b) => b.match - a.match;
  const langOk = (t) => !prefLangs.length || (t.langs || []).some(l => prefLangs.includes(l));
  const fitsFocus = (t) => specRe.test((t.specs || []).join(' '));

  // Recommend: a favourite that fits the focus -> any favourite -> best fit.
  let rec = null, reason = '';
  const favFit = favTeachers.find(t => fitsFocus(t) && langOk(t)) || favTeachers.find(fitsFocus);
  if (favFit) {
    rec = favFit;
    reason = `One of your favourites — keeps your ${primaryNoun} work going.`;
  } else if (favTeachers[0]) {
    rec = favTeachers[0];
    reason = 'Book again with your favourite — continuity helps your progress.';
  } else {
    rec = [...pool].sort(byMatch).find(t => fitsFocus(t) && langOk(t))
      || [...pool].sort(byMatch).find(fitsFocus)
      || [...pool].sort(byMatch)[0];
    if (pregnant) {
      reason = 'Prenatal & restorative specialist — safe, gentle work for this stage.';
    } else if (rec && rec.id === lastTeacherId) {
      reason = `You've been progressing well with ${first(rec)} — keep building on your ${recentFocus.toLowerCase() || 'foundations'}.`;
    } else {
      reason = `Specialises in ${primaryNoun}${recentFocus ? ` — a natural next step from your recent ${recentFocus.toLowerCase()}` : ''}.`;
    }
  }

  // Headline nudge (shown on the collapsed card).
  let line;
  if (pregnant) {
    const preg = answers.edd ? pregnancyFromEDD(answers.edd) : null;
    line = `Keeping your sessions prenatal-safe${preg && preg.trimester ? ` for your ${preg.trimester}` : ''} — gentle, restorative work this week.`;
  } else {
    const inj = injuries.length ? ` We'll keep your ${injuries[0].toLowerCase()} protected.` : '';
    const momentum = recentFocus
      ? `You're making progress on ${recentFocus.toLowerCase()} — right in line with your ${primaryNoun} goal.`
      : `Let's keep building towards your ${primaryNoun} goal.`;
    line = `${momentum}${inj} Book this week to hold your momentum.`;
  }

  return { line, rec: rec ? { teacher: rec, reason } : null, primaryNoun };
}
