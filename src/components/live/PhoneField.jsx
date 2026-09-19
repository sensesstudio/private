import { COUNTRY_CODES, splitPhone, joinPhone } from '../../phone.js';
import { inputStyle } from '../../styles.js';

// Country code picker plus local number. Pasting a full "+852 …" number into
// the local box moves the code across instead of failing validation.
export function PhoneField({ id, label = 'Mobile number', value, onChange, describedBy }) {
  const { code, local } = splitPhone(value);
  const codes = COUNTRY_CODES.some(c => c.code === code) ? COUNTRY_CODES : [{ code, flag: '', name: code }, ...COUNTRY_CODES];
  const typed = e => { const next = e.target.value; if (next.includes('+')) { const s = splitPhone(next); onChange(joinPhone(s.code, s.local)); } else onChange(joinPhone(code, next)); };
  return <div className="profile-phone-field"><label htmlFor={id}>{label}</label><div className="profile-phone">
    <select aria-label="Country code" value={code} onChange={e => onChange(joinPhone(e.target.value, local))} style={inputStyle}>{codes.map(c => <option key={c.code} value={c.code} title={c.name}>{c.flag} {c.code}</option>)}</select>
    <input id={id} style={inputStyle} type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={24} placeholder="9123 4567" value={local} onChange={typed} aria-describedby={describedBy}/>
  </div></div>;
}
