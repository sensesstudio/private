// Translate between the UI's camelCase intake answers and the Postgres rows.
// Keeping this in one place means the swap to Supabase doesn't ripple into the
// components — they keep using the same answer shape they use today.

const yn = (v) => (v === 'yes' ? true : v === 'no' ? false : null);
const fromBool = (b) => (b === true ? 'yes' : b === false ? 'no' : undefined);

// UI answers -> client_profiles row (only defined keys are included, so partial
// saves stay partial).
export function answersToClientRow(a = {}) {
  const row = {};
  const set = (k, v) => { if (v !== undefined) row[k] = v; };
  set('goals', a.goals);
  set('age_band', a.age);
  set('level', a.level);
  set('injuries', a.injury);
  set('schedule_prefs', a.schedule);
  if ('location' in a) {
    const list = Array.isArray(a.location) ? a.location : (a.location ? [a.location] : []);
    row.preferred_studio_ids = list.filter(id => id && id !== 'any'); // 'any' = no preference -> empty
  }
  set('languages', a.languages);
  set('notes', a.notes);
  if ('pregnant' in a) row.pregnant = yn(a.pregnant);
  if ('edd' in a) row.edd = a.edd || null;
  if ('surgery' in a) row.recent_surgery = yn(a.surgery);
  if ('doctorClearance' in a) row.doctor_cleared = yn(a.doctorClearance);
  return row;
}

// client_profiles row -> UI answers.
export function clientRowToAnswers(r) {
  if (!r) return null;
  return {
    goals: r.goals || [],
    age: r.age_band || undefined,
    level: r.level || undefined,
    injury: r.injuries || [],
    schedule: r.schedule_prefs || [],
    location: r.preferred_studio_ids || [],
    languages: r.languages || [],
    notes: r.notes || '',
    pregnant: fromBool(r.pregnant),
    edd: r.edd || undefined,
    surgery: fromBool(r.recent_surgery),
    doctorClearance: fromBool(r.doctor_cleared),
  };
}
