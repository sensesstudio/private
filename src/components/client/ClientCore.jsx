import { useState } from 'react';
import { Icon, Eyebrow, Button, Avatar, Stars, MatchBadge, SpecChips, useVP } from '../shared/index.jsx';
import { hkd } from '../shared/index.jsx';
import { TEACHERS, LOCATIONS, GOALS, INJURIES, SCHEDULES, LEVELS } from '../../data.js';
import { locName } from '../../data.js';
import { inputStyle, socialBtn, backLink } from '../../styles.js';
import { isDeclarationComplete } from '../../clientStore.js';

export function ClientNav({ tab, setTab }) {
  const items = [['home', 'Home'], ['search', 'Search'], ['tag', 'Pricing'], ['calendar-check', 'Bookings'], ['user', 'Profile']];
  return (
    <div style={{ flex: 'none', background: 'rgba(250,247,243,.94)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--border)', padding: '10px 8px calc(10px + env(safe-area-inset-bottom)) 8px', display: 'flex', justifyContent: 'space-around', zIndex: 40 }}>
      {items.map(([ic, label]) => {
        const on = tab === label;
        return (
          <button key={label} className="tap" onClick={() => setTab(label)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '6px 6px', minWidth: 0, flex: 1, minHeight: 48, color: on ? 'var(--accent)' : 'var(--fg3)' }}>
            <Icon n={ic} size={22} sw={on ? 2.2 : 1.7} />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: on ? 600 : 400, fontSize: 10, letterSpacing: '.04em' }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ClientLogin({ onBrowse, onSignIn, onBack }) {
  const { mobile } = useVP();
  const [email, setEmail] = useState('');
  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', background: 'var(--cream)', position: 'relative' }}>
      <div style={{ position: 'relative', height: mobile ? '56vh' : 440, flex: 'none' }}>
        <image-slot id="client-login-hero" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} shape="rect" fit="cover" placeholder="Drop a studio / movement photo" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(58,50,44,.18) 0%, rgba(58,50,44,.0) 30%, rgba(245,239,234,.0) 60%, var(--cream) 100%)', pointerEvents: 'none' }} />
        {onBack && (
          <button className="tap" onClick={onBack} style={{ position: 'absolute', top: 18, left: 16, zIndex: 5, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(250,247,243,.9)', border: 'none', borderRadius: 999, padding: '9px 14px', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11.5, color: 'var(--espresso)' }}>
            <Icon n="arrow-left" size={15} color="var(--espresso)" /> Explore
          </button>
        )}
      </div>

      <div style={{ flex: 1, padding: '6px 26px 30px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 6px' }}>
          <img src="assets/logo5-trim.png" alt="Senses Studio · Yoga + Pilates" style={{ height: 58 }} />
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: 'var(--taupe)', margin: '8px auto 24px', maxWidth: 320 }}>
          Matched with a private instructor who moves the way you want to move.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 360, width: '100%', margin: '0 auto' }}>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email address" style={inputStyle} />
          <input type="password" placeholder="Password" style={inputStyle} />
          <button className="tap" onClick={onSignIn} style={{ alignSelf: 'flex-end', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12.5, color: 'var(--taupe)', padding: '2px 2px', marginTop: -2 }}>Forgot password?</button>
          <Button variant="dark" full size="lg" onClick={onSignIn} style={{ marginTop: 4 }}>Sign in</Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg3)' }}>New here</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <Button variant="accent" full size="lg" onClick={onBrowse} icon="calendar-days" iconRight="arrow-right">Browse our schedule</Button>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="tap" onClick={onSignIn} style={socialBtn}><Icon n="apple" size={17} /> Apple</button>
            <button className="tap" onClick={onSignIn} style={socialBtn}><span style={{ fontWeight: 700, fontFamily: 'var(--font-serif)' }}>G</span> Google</button>
          </div>
        </div>
        <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', marginTop: 'auto', paddingTop: 22 }}>5 studios · Central · Causeway Bay · Quarry Bay · Kwun Tong · Lai Chi Kok</p>
      </div>
    </div>
  );
}

function OptionTile({ label, note, icon, on, onClick, multi }) {
  return (
    <button className="tap" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', cursor: 'pointer',
      background: on ? 'var(--accent-tint)' : 'var(--ivory)', border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border)'),
      borderRadius: 16, padding: '15px 16px', minHeight: 58, transition: 'all .2s var(--ease)',
    }}>
      {icon && <span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', background: on ? 'var(--accent)' : 'var(--sand)', flex: 'none', transition: 'all .2s var(--ease)' }}><Icon n={icon} size={18} color={on ? '#fff' : 'var(--taupe)'} /></span>}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 15, color: 'var(--espresso)' }}>{label}</span>
        {note && <span style={{ display: 'block', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', marginTop: 2 }}>{note}</span>}
      </span>
      <span style={{ width: 22, height: 22, flex: 'none', borderRadius: multi ? 7 : '50%', border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--linen)'), background: on ? 'var(--accent)' : 'transparent', display: 'grid', placeItems: 'center', transition: 'all .2s var(--ease)' }}>
        {on && <Icon n="check" size={13} color="#fff" sw={3} />}
      </span>
    </button>
  );
}

function YesNo({ label, note, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--ivory)', border: '1px solid var(--border)', borderRadius: 16, padding: '15px 16px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 15, color: 'var(--espresso)' }}>{label}</div>
        {note && <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', marginTop: 2 }}>{note}</div>}
      </div>
      <div style={{ display: 'flex', gap: 6, flex: 'none' }}>
        {['no', 'yes'].map(v => {
          const on = value === v;
          return (
            <button key={v} className="tap" onClick={() => onChange(v)} style={{ cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12, letterSpacing: '.06em', textTransform: 'uppercase', minWidth: 52, minHeight: 40, padding: '0 14px', borderRadius: 999, border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'transparent', color: on ? '#fff' : 'var(--taupe)' }}>{v === 'yes' ? 'Yes' : 'No'}</button>
          );
        })}
      </div>
    </div>
  );
}

const tileGrid = () => ({ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 10 });

function FindingMatch() {
  const [msg, setMsg] = useState(0);
  const msgs = ['Reading your goals…', 'Weighing schedules & studios…', 'Matching specialisations…', 'Curating your instructors…'];
  useState(() => { const i = setInterval(() => setMsg(m => Math.min(m + 1, msgs.length - 1)), 580); return () => clearInterval(i); });
  return (
    <div style={{ minHeight: '100%', background: 'var(--cream)', display: 'grid', placeItems: 'center', padding: 30 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 26px' }}>
          <div className="spin-slow" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid var(--sand)', borderTopColor: 'var(--accent)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}><Icon n="sparkles" size={30} color="var(--accent)" /></div>
        </div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 26, color: 'var(--espresso)', margin: '0 0 8px' }}>Finding your match</h2>
        <p key={msg} style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, color: 'var(--taupe)', margin: 0 }}>{msgs[msg]}</p>
      </div>
    </div>
  );
}

export function Intake({ onDone, onBack, answers, setAnswers }) {
  const { mobile } = useVP();
  const [finding, setFinding] = useState(false);
  const toggle = (key, val) => setAnswers(a => {
    const cur = a[key] || [];
    return { ...a, [key]: cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val] };
  });
  const setOne = (key, val) => setAnswers(a => ({ ...a, [key]: val }));

  const MEDIUMS = [
    { id: 'en', label: 'English' },
    { id: 'yue', label: 'Cantonese' },
    { id: 'zh', label: 'Mandarin' },
    { id: 'none', label: 'No preference' },
  ];
  // Multi-select; "No preference" is exclusive of the specific languages.
  const toggleMedium = (val) => setAnswers(a => {
    const cur = a.languages || [];
    if (val === 'none') return { ...a, languages: cur.includes('none') ? [] : ['none'] };
    const next = cur.includes(val) ? cur.filter(x => x !== val) : [...cur.filter(x => x !== 'none'), val];
    return { ...a, languages: next };
  });
  const langChosen = (answers.languages || []).length > 0;
  const declOk = isDeclarationComplete(answers);
  const canSubmit = langChosen && declOk;

  const steps = [
    { key: 'health', title: 'A quick health declaration', sub: 'Required for your safety — it helps your instructor adapt every session.',
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <YesNo label="Are you pregnant?" note="Including recently postnatal" value={answers.pregnant} onChange={v => setOne('pregnant', v)} />
          {answers.pregnant === 'yes' && (
            <div style={{ background: 'var(--accent-tint)', borderRadius: 16, padding: '15px 16px' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13.5, color: 'var(--espresso)', marginBottom: 11 }}>How many weeks along?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['1st trimester (1–12 wks)', '2nd trimester (13–26 wks)', '3rd trimester (27+ wks)'].map(w => {
                  const on = answers.pregnancyWeeks === w;
                  return <button key={w} className="tap" onClick={() => setOne('pregnancyWeeks', w)} style={{ cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, padding: '10px 14px', minHeight: 42, borderRadius: 999, border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--ivory)', color: on ? '#fff' : 'var(--taupe)' }}>{w}</button>;
                })}
              </div>
            </div>
          )}
          <YesNo label="Any recent surgery?" note="Within the last 12 months" value={answers.surgery} onChange={v => setOne('surgery', v)} />
          {(answers.pregnant === 'yes' || answers.surgery === 'yes') && (
            <YesNo label="Has a doctor cleared you to exercise?" note="Required if pregnant or post-surgery" value={answers.doctorClearance} onChange={v => setOne('doctorClearance', v)} />
          )}
          {!isDeclarationComplete(answers) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--terracotta)' }}><Icon n="info" size={13} color="var(--terracotta)" /> Please answer the health declaration — it's required.</div>
          )}
        </div>
      ) },
    { key: 'goals', title: 'What brings you to the mat?', sub: "Choose all that feel true — we'll weight your matches around them.",
      render: () => <div style={tileGrid()}>{GOALS.map(g => <OptionTile key={g.id} label={g.label} icon={g.icon} multi on={(answers.goals || []).includes(g.id)} onClick={() => toggle('goals', g.id)} />)}</div> },
    { key: 'age', title: 'A little about you', sub: 'Your age range helps us tailor a safe, suitable practice.',
      render: () => <div style={tileGrid()}>{['Under 25', '25–34', '35–44', '45–54', '55+'].map(a => <OptionTile key={a} label={a} on={answers.age === a} onClick={() => setOne('age', a)} />)}</div> },
    { key: 'level', title: 'Where are you in your practice?', sub: 'So we pair you with the right pace and patience.',
      render: () => <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{LEVELS.map(l => <OptionTile key={l.id} label={l.label} note={l.note} on={answers.level === l.id} onClick={() => setOne('level', l.id)} />)}</div> },
    { key: 'languages', title: 'Preferred teaching language', sub: 'Pick any that work for you — choose at least one. We’ll match instructors who teach in them.',
      render: () => (
        <div>
          <div style={tileGrid()}>{MEDIUMS.map(m => <OptionTile key={m.id} label={m.label} multi on={(answers.languages || []).includes(m.id)} onClick={() => toggleMedium(m.id)} />)}</div>
          {!langChosen && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--terracotta)' }}><Icon n="info" size={13} color="var(--terracotta)" /> Please select at least one.</div>}
        </div>
      ) },
    { key: 'injury', title: 'Anything we should hold gently?', sub: 'Injuries or sensitivities help us match a specialist. Optional.',
      render: () => <div style={tileGrid()}>{INJURIES.map(i => <OptionTile key={i} label={i} multi on={(answers.injury || []).includes(i)} onClick={() => toggle('injury', i)} />)}</div> },
    { key: 'schedule', title: 'When do you like to move?', sub: "We'll surface instructors who are open then.",
      render: () => <div style={tileGrid()}>{SCHEDULES.map(s => <OptionTile key={s.id} label={s.label} note={s.note} multi on={(answers.schedule || []).includes(s.id)} onClick={() => toggle('schedule', s.id)} />)}</div> },
    { key: 'location', title: 'Which studio is closest to your life?', sub: 'Five neighbourhoods across Hong Kong.',
      render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {LOCATIONS.map(l => <OptionTile key={l.id} label={l.name} note={l.blurb} icon={l.sea ? 'waves' : 'map-pin'} on={answers.location === l.id} onClick={() => setOne('location', l.id)} />)}
          <OptionTile label="No preference" note="Show me everyone" on={answers.location === 'any'} onClick={() => setOne('location', 'any')} />
        </div>
      ) },
    { key: 'notes', title: 'In your own words', sub: "Anything else about your goals or what you're hoping for? Optional.",
      render: () => {
        const words = (answers.notes || '').trim() ? (answers.notes || '').trim().split(/\s+/).length : 0;
        return (
          <div>
            <textarea value={answers.notes || ''} onChange={e => {
              const w = e.target.value.trim() ? e.target.value.trim().split(/\s+/) : [];
              if (w.length <= 100) setOne('notes', e.target.value); else setOne('notes', w.slice(0, 100).join(' '));
            }} placeholder="e.g. I'd love to feel stronger for hiking, and ease the tension in my shoulders from desk work…" style={{ ...inputStyle, minHeight: 150, resize: 'none', lineHeight: 1.55 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12, color: words > 100 ? 'var(--terracotta)' : 'var(--fg3)' }}>{words} / 100 words</div>
          </div>
        );
      } },
  ];

  const finish = () => { setFinding(true); setTimeout(() => { setFinding(false); onDone(); }, 2400); };
  if (finding) return <FindingMatch />;

  return (
    <div style={{ minHeight: '100%', background: 'var(--cream)', padding: '18px 22px calc(20px + env(safe-area-inset-bottom))' }}>
      <button className="tap" onClick={onBack} style={backLink}><Icon n="arrow-left" size={16} /> Back</button>
      <div style={{ width: '100%' }}>
        <Eyebrow>About you</Eyebrow>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 26, color: 'var(--espresso)', margin: '8px 0 24px', lineHeight: 1.1 }}>Matching what fits you most</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {steps.map(s => (
            <div key={s.key}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 21, color: 'var(--espresso)', margin: '0 0 4px' }}>{s.title}</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13.5, color: 'var(--fg3)', margin: '0 0 14px', lineHeight: 1.5 }}>{s.sub}</p>
              {s.render()}
            </div>
          ))}
        </div>
        <Button variant="accent" full size="lg" disabled={!canSubmit} onClick={finish} iconRight="sparkles" style={{ marginTop: 28 }}>See my matches</Button>
        {!canSubmit && <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 12, color: 'var(--fg3)', margin: '10px 0 0' }}>{!declOk ? 'Complete the health declaration to continue.' : 'Select a preferred teaching language to continue.'}</p>}
      </div>
    </div>
  );
}

export function TeacherCard({ t, onOpen, recommended = false, compact = false }) {
  return (
    <div className="tap card-hover" onClick={onOpen} style={{ position: 'relative', background: 'var(--ivory)', borderRadius: 22, overflow: 'hidden', boxShadow: recommended ? 'var(--shadow-md)' : 'var(--shadow-sm)', border: '1px solid ' + (recommended ? 'var(--accent)' : 'var(--border-soft)') }}>
      {recommended && (
        <div style={{ background: 'var(--accent)', color: '#fff', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase' }}>
          <Icon n="sparkles" size={13} color="#fff" /> Recommended for you
        </div>
      )}
      <div style={{ padding: 16, display: 'flex', gap: 14 }}>
        <Avatar t={t} size={recommended ? 76 : 64} radius={18} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20, color: 'var(--espresso)', margin: 0, lineHeight: 1.1 }}>{t.name}</h3>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)', marginTop: 3 }}>{t.headline}</div>
            </div>
            <MatchBadge pct={t.match} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9, flexWrap: 'wrap' }}>
            <Stars value={t.rating} reviews={t.reviews} size={12} />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon n="map-pin" size={12} /> {locName(t.locId)}</span>
          </div>
          <div style={{ marginTop: 11, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <SpecChips items={t.specs.slice(0, compact ? 2 : 3)} />
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)', whiteSpace: 'nowrap' }}>{hkd(t.rate)}<span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)' }}>/hr</span></span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 16px', borderTop: '1px solid var(--border-soft)', background: 'var(--cream)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11.5, color: 'var(--accent)' }}>
          <span className="live-dot" /> {t.soon}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, color: 'var(--fg3)' }}>
          <Icon n="zap" size={12} color="var(--fg3)" /> Instant confirm
        </span>
      </div>
    </div>
  );
}
