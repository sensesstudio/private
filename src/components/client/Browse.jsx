import { useState } from 'react';
import { Icon, Eyebrow, Button, Avatar, Stars, Segmented, useVP } from '../shared/index.jsx';
import { hkd } from '../shared/index.jsx';
import { TEACHERS, LOCATIONS } from '../../data.js';
import { locName, teacherById } from '../../data.js';
import { useSlots, openSlotsForDay } from '../../slots.js';

// Drop image paths here to enable the hero carousel
const HERO_PHOTOS = [
  'assets/hero/cover.jpg',
];

function HeroCarousel() {
  const [i, setI] = useState(0);
  if (!HERO_PHOTOS.length) {
    return (
      <div style={{ height: 180, overflow: 'hidden', margin: '16px -20px 0' }}>
        <image-slot id="browse-hero-photo" style={{ display: 'block', width: '100%', height: '100%' }} shape="rect" fit="cover" placeholder="Drop a studio / movement photo" />
      </div>
    );
  }
  const next = () => setI(v => (v + 1) % HERO_PHOTOS.length);
  const multi = HERO_PHOTOS.length > 1;
  return (
    <button onClick={next} className="tap" style={{ position: 'relative', height: 180, overflow: 'hidden', margin: '16px -20px 0', cursor: multi ? 'pointer' : 'default', display: 'block', width: 'calc(100% + 40px)', padding: 0, border: 'none', background: 'var(--sand)' }}>
      {HERO_PHOTOS.map((src, idx) => (
        <img key={idx} src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 38%', display: 'block', opacity: idx === i ? 1 : 0, transition: 'opacity .5s var(--ease)' }} />
      ))}
      {multi && (
        <div style={{ position: 'absolute', top: 10, right: 14, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(35,30,26,.4)', backdropFilter: 'blur(6px)', color: '#fff', padding: '5px 10px', borderRadius: 999, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10.5 }}>
          <Icon n="images" size={12} color="#fff" /> Tap for more
        </div>
      )}
      {multi && (
        <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
          {HERO_PHOTOS.map((_, d) => <span key={d} style={{ width: 6, height: 6, borderRadius: 999, background: d === i ? '#fff' : 'rgba(255,255,255,.5)', transition: 'background .3s' }} />)}
        </div>
      )}
    </button>
  );
}

const SESSION_TYPES = [
  { id: 'reformer', name: 'Rehab', icon: 'activity', from: 900, blurb: 'Spring-loaded precision, clinical care' },
  { id: 'contemporary', name: 'Core & Strength', icon: 'flame', from: 900, blurb: 'Dynamic, strength-building flow' },
  { id: 'prenatal', name: 'Pre / Postnatal & Restore', icon: 'flower-2', from: 900, blurb: 'Gentle, intelligent, strengthening' },
  { id: 'mat', name: 'Mobility', icon: 'wind', from: 900, blurb: 'Move well, far beyond the studio' },
  { id: 'foundations', name: 'Posture & Alignment', icon: 'move-vertical', from: 450, blurb: 'Where a strong practice begins' },
  { id: 'gyrotonic', name: '1:1 The GYROTONIC®', icon: 'orbit', from: 1000, blurb: 'Circular, flowing, full-body movement' },
];

function BrowseTeacher({ t, onOpen }) {
  const ell = { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
  return (
    <div className="tap card-hover" onClick={() => onOpen(t)} style={{ background: 'var(--ivory)', borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 13, display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar t={t} size={46} radius={13} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15.5, color: 'var(--espresso)', margin: 0, lineHeight: 1.15, ...ell }}>{t.name}</h3>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--taupe)', marginTop: 2, ...ell }}>{t.headline}</div>
          </div>
        </div>
        <Stars value={t.rating} reviews={t.reviews} size={12} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0, ...ell }}><Icon n="map-pin" size={12} /> {locName(t.locId)}</span>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--espresso)', flex: 'none' }}>{hkd(t.rate)}<span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 10.5, color: 'var(--fg3)' }}>/hr</span></span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '9px 13px', borderTop: '1px solid var(--border-soft)', background: 'var(--cream)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10.5, color: 'var(--accent)', minWidth: 0, ...ell }}><span className="live-dot" style={{ flex: 'none' }} /> {t.soon}</span>
        <Icon n="arrow-right" size={13} color="var(--taupe)" style={{ flex: 'none' }} />
      </div>
    </div>
  );
}

export function ClientBrowse({ onGate, onOpen }) {
  useSlots(); // reflect live slot availability
  const { mobile } = useVP();
  const [seg, setSeg] = useState('Schedule');
  const [day, setDay] = useState(0);
  const [monthOff, setMonthOff] = useState(0);
  const teachers = [...TEACHERS].sort((a, b) => b.match - a.match);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const baseMonth = 5, baseYear = 2026;
  const mIdx = (baseMonth + monthOff) % 12;
  const mYear = baseYear + Math.floor((baseMonth + monthOff) / 12);
  const daysInMonth = new Date(mYear, mIdx + 1, 0).getDate();
  const startDom = monthOff === 0 ? 16 : 1;
  const daysList = [];
  for (let dom = startDom; dom <= daysInMonth; dom++) {
    const dt = new Date(mYear, mIdx, dom);
    daysList.push({ dow: DOW[dt.getDay()], dom });
  }
  const goMonth = (delta) => { const next = monthOff + delta; if (next < 0 || next > 11) return; setMonthOff(next); setDay(0); };
  const perTeacher = {};
  const schedule = openSlotsForDay(day + monthOff)
    .filter(s => { perTeacher[s.teacherId] = (perTeacher[s.teacherId] || 0) + 1; return perTeacher[s.teacherId] <= 2; })
    .map(s => ({ t: teacherById(s.teacherId), time: s.time }))
    .sort((a, b) => a.time.localeCompare(b.time))
    .slice(0, 14);

  return (
    <div style={{ minHeight: '100%', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 4px' }}>
        <img src="assets/logo5-trim.png" alt="Senses Studio" style={{ height: 26 }} />
        <button className="tap" onClick={onGate} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe)', minHeight: 40, padding: '0 4px' }}>Sign in</button>
      </div>

      <div style={{ flex: 'none', padding: '8px 20px 0' }}>
        <Eyebrow>Private Pilates · 5 studios · Hong Kong</Eyebrow>
        <h1 style={{ margin: '10px 0 0', lineHeight: 1.06 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30, color: 'var(--espresso)' }}>Book your </span>
          <span style={{ fontFamily: 'var(--font-script)', fontSize: 34, color: 'var(--taupe)' }}>private pilates</span>
        </h1>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 13, letterSpacing: '.14em', color: 'var(--taupe)', marginTop: 6 }}>私人普拉提課程</div>
        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, lineHeight: 1.55, color: 'var(--taupe)', margin: '8px 0 0' }}>
          Browse our instructors, sessions and live availability. Create an account only when you're ready to book.
          <span style={{ display: 'block', marginTop: 6, fontSize: 12.5, color: 'var(--fg3)', lineHeight: 1.7 }}>瀏覽即時空檔，及即時確認預約。</span>
        </p>
        <HeroCarousel />
      </div>

      <div style={{ flex: 'none', padding: '16px 20px 4px' }}>
        <Segmented options={['Schedule', 'Needs', 'Teachers', 'Studios']} value={seg} onChange={setSeg} style={{ display: 'flex', width: '100%' }} />
      </div>

      <div style={{ flex: 1, padding: '14px 20px 16px' }}>
        {seg === 'Teachers' && (
          <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: mobile ? 10 : 14 }}>
            {teachers.map(t => <BrowseTeacher key={t.id} t={t} onOpen={onOpen} />)}
          </div>
        )}

        {seg === 'Needs' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            {SESSION_TYPES.map(s => (
              <div key={s.id} className="tap card-hover" onClick={onGate} style={{ background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 15, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                <div onClick={e => e.stopPropagation()} style={{ width: '100%', height: 96, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                  <image-slot id={'class-photo-' + s.id} style={{ display: 'block', width: '100%', height: '100%' }} shape="rect" fit="cover" placeholder={s.name} />
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--espresso)', lineHeight: 1.2, minHeight: '2.4em', display: 'flex', alignItems: 'flex-start' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', margin: '6px 0 12px', lineHeight: 1.45, flex: 1 }}>{s.blurb}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11.5, color: 'var(--accent)' }}>from {hkd(s.from)}/hr</div>
              </div>
            ))}
          </div>
        )}

        {seg === 'Studios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LOCATIONS.map(l => (
              <div key={l.id} className="tap card-hover" onClick={onGate} style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
                <div className={'app-ph ' + (l.sea ? 'sage' : '')} style={{ width: 52, height: 52, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center' }}>
                  <Icon n={l.sea ? 'waves' : 'map-pin'} size={20} color="rgba(255,255,255,.95)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--espresso)' }}>{l.name}</div>
                </div>
                <Icon n="chevron-right" size={18} color="var(--clay)" />
              </div>
            ))}
          </div>
        )}

        {seg === 'Schedule' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11.5, color: 'var(--accent)' }}>
                <span className="live-dot" /> Live availability
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button className="tap" onClick={() => goMonth(-1)} disabled={monthOff === 0} style={{ width: 32, height: 32, borderRadius: 999, display: 'grid', placeItems: 'center', cursor: monthOff === 0 ? 'not-allowed' : 'pointer', background: 'var(--ivory)', border: '1px solid var(--border)', opacity: monthOff === 0 ? .4 : 1 }}><Icon n="chevron-left" size={16} color="var(--espresso)" /></button>
                <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--espresso)', minWidth: 116, textAlign: 'center' }}>{MONTHS[mIdx]} {mYear}</span>
                <button className="tap" onClick={() => goMonth(1)} disabled={monthOff >= 11} style={{ width: 32, height: 32, borderRadius: 999, display: 'grid', placeItems: 'center', cursor: monthOff >= 11 ? 'not-allowed' : 'pointer', background: 'var(--ivory)', border: '1px solid var(--border)', opacity: monthOff >= 11 ? .4 : 1 }}><Icon n="chevron-right" size={16} color="var(--espresso)" /></button>
              </div>
            </div>
            <div className="screen-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -20px 16px', padding: '0 20px 4px' }}>
              {daysList.map((d, i) => {
                const on = day === i;
                return (
                  <button key={i} className="tap" onClick={() => setDay(i)} style={{ flex: 'none', width: 50, textAlign: 'center', padding: '9px 0', borderRadius: 15, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--ivory)' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 9.5, letterSpacing: '.08em', textTransform: 'uppercase', color: on ? 'rgba(255,255,255,.85)' : 'var(--fg3)' }}>{d.dow}</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: on ? '#fff' : 'var(--espresso)', marginTop: 2 }}>{d.dom}</div>
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {schedule.map((sl, i) => (
                <div key={i} className="tap" onClick={() => onOpen(sl.t)} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 0', borderBottom: i < schedule.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <div style={{ width: 50, flex: 'none' }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--espresso)' }}>{sl.time}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 10, color: 'var(--fg3)' }}>60 min</div>
                  </div>
                  <Avatar t={sl.t} size={42} radius={12} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--espresso)' }}>{sl.t.name}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)' }}>{sl.t.specs[0]} · {locName(sl.t.locId)}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, color: 'var(--accent)', flex: 'none' }}>Open</span>
                </div>
              ))}
              {schedule.length === 0 && (
                <div style={{ textAlign: 'center', padding: '50px 24px' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sand)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}><Icon n="calendar-x" size={26} color="var(--taupe)" /></div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 21, color: 'var(--espresso)', margin: '0 0 7px' }}>No open slots this day</h3>
                  <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, color: 'var(--fg3)', lineHeight: 1.6, margin: '0 auto', maxWidth: 300 }}>Try another date — availability refreshes throughout the week.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ position: 'sticky', bottom: 0, flex: 'none', padding: '12px 20px calc(16px + env(safe-area-inset-bottom))', background: 'linear-gradient(180deg, rgba(245,239,234,0), var(--cream) 35%)', borderTop: '1px solid var(--border-soft)' }}>
        <Button variant="accent" full size="lg" onClick={onGate} iconRight="arrow-right">Find my instructor</Button>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', margin: '9px 0 0' }}>Free to browse · create an account when you book</p>
      </div>
    </div>
  );
}
