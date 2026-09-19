// Mobile numbers are one E.164-style string everywhere ("+852 9791 9712");
// the picker and the local number are only a view on it. Servers strip the
// spaces, so the string may keep whatever spacing the client typed.
export const DEFAULT_CODE = '+852';
export const COUNTRY_CODES = [
  { code: '+852', flag: '🇭🇰', name: 'Hong Kong' }, { code: '+853', flag: '🇲🇴', name: 'Macau' }, { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+886', flag: '🇹🇼', name: 'Taiwan' }, { code: '+65', flag: '🇸🇬', name: 'Singapore' }, { code: '+60', flag: '🇲🇾', name: 'Malaysia' },
  { code: '+63', flag: '🇵🇭', name: 'Philippines' }, { code: '+66', flag: '🇹🇭', name: 'Thailand' }, { code: '+62', flag: '🇮🇩', name: 'Indonesia' },
  { code: '+84', flag: '🇻🇳', name: 'Vietnam' }, { code: '+81', flag: '🇯🇵', name: 'Japan' }, { code: '+82', flag: '🇰🇷', name: 'South Korea' },
  { code: '+91', flag: '🇮🇳', name: 'India' }, { code: '+61', flag: '🇦🇺', name: 'Australia' }, { code: '+64', flag: '🇳🇿', name: 'New Zealand' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' }, { code: '+1', flag: '🇺🇸', name: 'United States / Canada' }, { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' }, { code: '+39', flag: '🇮🇹', name: 'Italy' }, { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+31', flag: '🇳🇱', name: 'Netherlands' }, { code: '+41', flag: '🇨🇭', name: 'Switzerland' }, { code: '+46', flag: '🇸🇪', name: 'Sweden' },
  { code: '+351', flag: '🇵🇹', name: 'Portugal' }, { code: '+971', flag: '🇦🇪', name: 'United Arab Emirates' }, { code: '+27', flag: '🇿🇦', name: 'South Africa' },
];
const KNOWN = new Set(COUNTRY_CODES.map(c => c.code));

export function splitPhone(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^\+\s*(\d+)([\s\S]*)$/);
  if (!match) return { code: DEFAULT_CODE, local: raw.replace(/^\+\s*/, '') };
  const [, run, rest] = match;
  for (const n of [4, 3, 2, 1]) {
    const code = '+' + run.slice(0, n);
    if (KNOWN.has(code)) return { code, local: (run.slice(n) + rest).trim() };
  }
  const n = Math.min(3, run.length); // an unlisted code is kept rather than guessed away
  return { code: '+' + run.slice(0, n), local: (run.slice(n) + rest).trim() };
}
export const joinPhone = (code, local) => `${code} ${String(local || '').trim()}`.trim();
export const compactPhone = value => String(value || '').replace(/[\s().-]/g, '');
export function isValidPhone(value) {
  const { local } = splitPhone(value);
  return /^\+[1-9]\d{6,14}$/.test(compactPhone(value)) && local.replace(/\D/g, '').length >= 5;
}
