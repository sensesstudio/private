// ════════════════════════════════════════════════════════════════
// Senses Pilates — CLIENT public browse / discovery (pre-login)
// ════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// HERO CAROUSEL — HAND-OFF NOTE (for Claude or a developer):
// Drop image paths into HERO_PHOTOS below (e.g. 'assets/hero/01.jpg').
// • Empty array  → hero shows a drag-and-drop photo box (current state).
// • 1+ photos    → hero shows a carousel; each tap advances to the next
//                  photo, looping. Works with any number of images.
// To wire up the 10 photos later, just add their paths to this array —
// no other code changes needed.
// ─────────────────────────────────────────────────────────────────
const HERO_PHOTOS = [
  'assets/hero/cover.jpg',
  // add more paths here to enable the tap-to-advance carousel
];

function HeroCarousel() {
  const [i, setI] = React.useState(0);
  // No photos yet → keep the drag-and-drop box so the user can fill it now.
  if (!HERO_PHOTOS.length) {
    return (
      <div style={{ height: 180, overflow: 'hidden', margin: '16px -20px 0' }}>
        <image-slot id="browse-hero-photo" style={{ display: 'block', width: '100%', height: '100%' }} shape="rect" fit="cover" placeholder="Drop a studio / movement photo"></image-slot>
      </div>);

  }
  const next = () => setI((v) => (v + 1) % HERO_PHOTOS.length);
  const multi = HERO_PHOTOS.length > 1;
  return (
    <button onClick={next} className="tap" style={{ position: 'relative', height: 180, overflow: 'hidden', margin: '16px -20px 0', cursor: multi ? 'pointer' : 'default', display: 'block', width: 'calc(100% + 40px)', padding: 0, border: 'none', background: 'var(--sand)' }}>
      {HERO_PHOTOS.map((src, idx) =>
      <img key={idx} src={src} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 38%', display: 'block', opacity: idx === i ? 1 : 0, transition: 'opacity .5s var(--ease)' }} />
      )}
      {multi &&
      <div style={{ position: 'absolute', top: 10, right: 14, display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(35,30,26,.4)', backdropFilter: 'blur(6px)', color: '#fff', padding: '5px 10px', borderRadius: 999, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10.5 }}>
        <Icon n="images" size={12} color="#fff" /> Tap for more
      </div>}
      {multi &&
      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5 }}>
        {HERO_PHOTOS.map((_, d) => <span key={d} style={{ width: 6, height: 6, borderRadius: 999, background: d === i ? '#fff' : 'rgba(255,255,255,.5)', transition: 'background .3s' }}></span>)}
      </div>}
    </button>);

}

const SESSION_TYPES = [
{ id: 'reformer', name: 'Rehab', icon: 'activity', from: 900, n: 1, ph: '', blurb: 'Spring-loaded precision, clinical care' },
{ id: 'contemporary', name: 'Core & Strength', icon: 'flame', from: 900, n: 1, ph: 'sage', blurb: 'Dynamic, strength-building flow' },
{ id: 'prenatal', name: 'Pre / Postnatal & Restore', icon: 'flower-2', from: 900, n: 1, ph: 'almond', blurb: 'Gentle, intelligent, strengthening' },
{ id: 'mat', name: 'Mobility', icon: 'wind', from: 900, n: 1, ph: 'taupe', blurb: 'Move well, far beyond the studio' },
{ id: 'foundations', name: 'Posture & Alignment', icon: 'move-vertical', from: 450, n: 1, ph: 'blush', blurb: 'Where a strong practice begins' },
{ id: 'gyrotonic', name: '1:1 The GYROTONIC®', icon: 'orbit', from: 1000, n: 1, ph: 'sage', blurb: 'Circular, flowing, full-body movement' }];


// public teacher row (no personalised match score)
function BrowseTeacher({ t, onOpen }) {
  return (
    <div className="tap card-hover" onClick={() => onOpen(t)} style={{ background: 'var(--ivory)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-soft)' }}>
      <div style={{ padding: 14, display: 'flex', gap: 13 }}>
        <Avatar t={t} size={62} radius={16} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--espresso)', margin: 0, lineHeight: 1.1 }}>{t.name}</h3>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)', marginTop: 2 }}>{t.headline}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 7, flexWrap: 'wrap' }}>
            <Stars value={t.rating} reviews={t.reviews} size={12} />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon n="map-pin" size={12} /> {locName(t.locId)}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)' }}>{hkd(t.rate)}</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 10.5, color: 'var(--fg3)' }}>/hour</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border-soft)', background: 'var(--cream)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11.5, color: 'var(--accent)' }}><span className="live-dot"></span> {t.soon}</span>
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, color: 'var(--taupe)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>View <Icon n="arrow-right" size={12} color="var(--taupe)" /></span>
      </div>
    </div>);

}

function ClientBrowse({ onGate, onOpen }) {
  const [seg, setSeg] = React.useState('Schedule');
  const [day, setDay] = React.useState(0);
  const [monthOff, setMonthOff] = React.useState(0); // 0 = current month (June 2026)
  const teachers = sortByMatch(TEACHERS);
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const baseMonth = 5,baseYear = 2026; // June 2026
  const mIdx = (baseMonth + monthOff) % 12;
  const mYear = baseYear + Math.floor((baseMonth + monthOff) / 12);
  const daysInMonth = new Date(mYear, mIdx + 1, 0).getDate();
  const startDom = monthOff === 0 ? 16 : 1; // current month starts “today”
  const daysList = [];
  for (let dom = startDom; dom <= daysInMonth; dom++) {
    const dt = new Date(mYear, mIdx, dom);
    daysList.push({ dow: DOW[dt.getDay()], dom });
  }
  const goMonth = (delta) => {const next = monthOff + delta;if (next < 0 || next > 11) return;setMonthOff(next);setDay(0);};
  const schedule = TEACHERS.
  flatMap((t) => buildAvail(t, 0)[(day + monthOff) % 7].slots.filter((s) => s.open).slice(0, 2).map((s) => ({ t, time: s.time }))).
  sort((a, b) => a.time.localeCompare(b.time)).
  slice(0, 14);

  return (
    <div style={{ minHeight: '100%', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      {/* top bar */}
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 4px' }}>
        <img src="assets/logo5-trim.png" alt="Senses Studio" style={{ height: 26 }} />
        <button className="tap" onClick={onGate} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe)', minHeight: 40, padding: '0 4px' }}>Sign in</button>
      </div>

      {/* hero */}
      <div style={{ flex: 'none', padding: '8px 20px 0' }}>
        <Eyebrow>Private Pilates · 5 studios · Hong Kong</Eyebrow>
        <h1 style={{ margin: '10px 0 0', lineHeight: 1.06 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30, color: 'var(--espresso)' }}>Book your </span>
          <span style={{ fontFamily: 'var(--font-script)', fontSize: 34, color: 'var(--taupe)' }}>private pilates</span>
        </h1>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 13, letterSpacing: '.14em', color: 'var(--taupe)', marginTop: 6 }}>私人普拉提課程</div>
        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, lineHeight: 1.55, color: 'var(--taupe)', margin: '8px 0 0' }}>
          Browse our instructors, sessions and live availability. Create an account only when you’re ready to book.
          <span style={{ display: 'block', marginTop: 6, fontSize: 12.5, color: 'var(--fg3)', lineHeight: 1.7 }}>瀏覽即時空檔，及即時確認預約。</span>
        </p>
        <HeroCarousel onGate={onGate} />
      </div>

      {/* segmented */}
      <div style={{ flex: 'none', padding: '16px 20px 4px' }}>
        <Segmented options={['Schedule', 'Needs', 'Teachers', 'Studios']} value={seg} onChange={setSeg} style={{ display: 'flex', width: '100%' }} />
      </div>

      {/* content */}
      <div style={{ flex: 1, padding: '14px 20px 16px' }}>
        {seg === 'Teachers' &&
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {teachers.map((t) => <BrowseTeacher key={t.id} t={t} onOpen={onOpen} />)}
          </div>
        }

        {seg === 'Needs' &&
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
            {SESSION_TYPES.map((s) =>
          <div key={s.id} className="tap card-hover" onClick={onGate} style={{ background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 15, boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column' }}>
                <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', height: 96, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
                  <image-slot id={'class-photo-' + s.id} style={{ display: 'block', width: '100%', height: '100%' }} shape="rect" fit="cover" placeholder={s.name}></image-slot>
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--espresso)', lineHeight: 1.2, minHeight: '2.4em', display: 'flex', alignItems: 'flex-start' }}>{s.name}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', margin: '6px 0 12px', lineHeight: 1.45, flex: 1 }}>{s.blurb}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11.5, color: 'var(--accent)' }}>from {hkd(s.from)}/hr</div>
              </div>
          )}
          </div>
        }

        {seg === 'Studios' &&
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {LOCATIONS.map((l) =>
          <div key={l.id} className="tap card-hover" onClick={onGate} style={{ display: 'flex', gap: 14, alignItems: 'center', background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
                <div className={'app-ph ' + (l.sea ? 'sage' : '')} style={{ width: 52, height: 52, borderRadius: 14, flex: 'none', display: 'grid', placeItems: 'center' }}>
                  <Icon n={l.sea ? 'waves' : 'map-pin'} size={20} color="rgba(255,255,255,.95)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--espresso)' }}>{l.name}</div>
                </div>
                <Icon n="chevron-right" size={18} color="var(--clay)" />
              </div>
          )}
          </div>
        }

        {seg === 'Schedule' &&
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11.5, color: 'var(--accent)' }}>
                <span className="live-dot"></span> Live availability
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
                  </button>);

            })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {schedule.map((sl, i) =>
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
            )}
              {schedule.length === 0 && <EmptyState icon="calendar-x" title="No open slots this day" body="Try another date — availability refreshes throughout the week." />}
            </div>
          </div>
        }
      </div>

      {/* sticky gate CTA */}
      <div style={{ position: 'sticky', bottom: 0, flex: 'none', padding: '12px 20px calc(16px + env(safe-area-inset-bottom))', background: 'linear-gradient(180deg, rgba(245,239,234,0), var(--cream) 35%)', borderTop: '1px solid var(--border-soft)' }}>
        <Button variant="accent" full size="lg" onClick={onGate} iconRight="arrow-right">Find my instructor</Button>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', margin: '9px 0 0' }}>Free to browse · create an account when you book</p>
      </div>
    </div>);

}

Object.assign(window, { SESSION_TYPES, HERO_PHOTOS, HeroCarousel, BrowseTeacher, ClientBrowse });