// Rule-based natural-language parser for the booking assistant. Pure & sync —
// no React, no slot imports. Serves two roles:
//   1. Offline fallback when the AI edge function isn't configured / errors.
//   2. The exact `intent` shape the Claude edge function must emit.
//
// intent = { need, dayIdx, daySpan, timeOfDay, studio, teacher, language, raw }
//   need:      SESSION_TYPES id ('reformer' | 'contemporary' | ...) | null
//   dayIdx:    0=today, 1=tomorrow, 2=day after | null (=> scan daySpan days)
//   daySpan:   how many days to scan when dayIdx is null (default 3)
//   timeOfDay: 'morning' | 'afternoon' | 'evening' | null
//   studio:    LOCATIONS id | null
//   teacher:   TEACHERS id | null
//   language:  'Cantonese' | 'English' | 'Mandarin' | null

import { TEACHERS } from '../data.js';

const DAY_KW = [
  { re: /後日|後天|day[- ]?after/i, dayIdx: 2 },
  { re: /聽日|聼日|明日|明天|tomorrow|tmr|tmrw/i, dayIdx: 1 },
  { re: /今日|今天|today|今晚|tonight/i, dayIdx: 0 },
];
const WEEK_KW = /今個(禮拜|星期)|呢個(禮拜|星期)|this ?week|近排|呢排/i;

const TOD_KW = [
  { re: /夜晚|晚上|今晚|evening|night|tonight/i, tod: 'evening' },
  { re: /晏晝|下晝|中午|afternoon|noon|\bpm\b/i, tod: 'afternoon' },
  { re: /朝早|朝頭早|上晝|早上|morning|\bam\b/i, tod: 'morning' },
];

const NEED_SYN = [
  { id: 'reformer', re: /reformer|rehab|injur|復康|康復|受傷|改善|普拉提機/i },
  { id: 'prenatal', re: /pre[- ]?natal|post[- ]?natal|pregnan|產前|產後|懷孕|孕婦|restorat|修復/i },
  { id: 'contemporary', re: /strength|core|athletic|contempor|力量|核心|肌力/i },
  { id: 'mat', re: /\bmat\b|mobilit|conditioning|墊上|柔韌|靈活|活動度/i },
  { id: 'foundations', re: /posture|align|foundation|beginner|新手|入門|姿勢|體態/i },
  { id: 'gyrotonic', re: /gyroton|gyro/i },
  { id: 'polestar', re: /polestar/i },
  { id: 'stott', re: /stott/i },
];

const STUDIO_KW = [
  { id: 'central', re: /central|中環/i },
  { id: 'cwb', re: /causeway|cwb|銅鑼灣/i },
  { id: 'qb', re: /quarry|qb|鰂魚涌/i },
  { id: 'kt', re: /kwun ?tong|\bkt\b|觀塘/i },
  { id: 'lck', re: /lai ?chi ?kok|lck|荔枝角/i },
];

const LANG_KW = [
  { id: 'Cantonese', re: /cantonese|廣東話|粵語|廣東/i },
  { id: 'Mandarin', re: /mandarin|普通話|普通话|國語/i },
  { id: 'English', re: /english|英文|英語/i },
];

export function parseQuery(text) {
  const t = (text || '').trim();
  const intent = { need: null, dayIdx: null, daySpan: 3, timeOfDay: null, studio: null, teacher: null, language: null, raw: t };
  if (!t) return intent;

  const day = DAY_KW.find(d => d.re.test(t));
  if (day) intent.dayIdx = day.dayIdx;
  else if (WEEK_KW.test(t)) intent.daySpan = 7;

  const tod = TOD_KW.find(x => x.re.test(t));
  if (tod) intent.timeOfDay = tod.tod;
  if (/今晚|tonight/i.test(t)) { intent.dayIdx = 0; intent.timeOfDay = 'evening'; }

  const need = NEED_SYN.find(n => n.re.test(t));
  if (need) intent.need = need.id;

  const studio = STUDIO_KW.find(s => s.re.test(t));
  if (studio) intent.studio = studio.id;

  const lang = LANG_KW.find(l => l.re.test(t));
  if (lang) intent.language = lang.id;

  const low = t.toLowerCase();
  const tm = TEACHERS.find(x => {
    const fn = x.name.split(' ')[0].toLowerCase();
    return low.includes(x.name.toLowerCase()) || (fn.length >= 3 && low.includes(fn));
  });
  if (tm) intent.teacher = tm.id;

  return intent;
}
