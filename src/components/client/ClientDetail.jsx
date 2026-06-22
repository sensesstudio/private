import { useState, useEffect } from 'react';
import { Icon, Button, Avatar, Stars, Skel, SpecChips, Pill, useVP } from '../shared/index.jsx';
import { hkd } from '../shared/index.jsx';
import { TEACHERS, GOALS, PROGRESS_LOG, LOCATIONS } from '../../data.js';
import { locName, teacherById } from '../../data.js';
import { metaItem, labelMini } from '../../styles.js';
import { TeacherCard } from './ClientCore.jsx';
import { useSlots, daysForTeacher, takeRandomOpen } from '../../slots.js';
import { inputStyle } from '../../styles.js';

export function sortByMatch(arr) { return [...arr].sort((a, b) => b.match - a.match); }

function EmptyState({ icon, title, body, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '50px 24px' }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--sand)', display: 'grid', placeItems: 'center', margin: '0 auto 18px' }}><Icon n={icon} size={26} color="var(--taupe)" /></div>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 21, color: 'var(--espresso)', margin: '0 0 7px' }}>{title}</h3>
      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, color: 'var(--fg3)', lineHeight: 1.6, margin: '0 auto', maxWidth: 300 }}>{body}</p>
      {action}
    </div>
  );
}
export { EmptyState };

function TeacherSkel() {
  return (
    <div style={{ background: 'var(--ivory)', borderRadius: 22, padding: 16, display: 'flex', gap: 14, border: '1px solid var(--border-soft)' }}>
      <Skel w={64} h={64} r={18} />
      <div style={{ flex: 1 }}>
        <Skel w="60%" h={18} /><div style={{ height: 8 }} />
        <Skel w="80%" h={12} /><div style={{ height: 14 }} />
        <Skel w="40%" h={12} />
      </div>
    </div>
  );
}

function suggestReason(t, goalLabels) {
  const g = (goalLabels || []).join(' ').toLowerCase();
  if (t.specs.some(s => /rehab|reformer/i.test(s)) && /rehab|injury|posture|back/.test(g))
    return "Specialises in the lower-back rehab you've been working on — a natural next step from your sessions with Élise.";
  if (t.specs.some(s => /posture|align|found/i.test(s)))
    return 'Posture & alignment focus matches your profile goals — good for the weeks Élise is fully booked.';
  if (t.specs.some(s => /restor|prenatal|breath/i.test(s)))
    return 'Restorative work to balance your strength sessions — pairs well with your current routine.';
  if (t.specs.some(s => /athletic|strength|mobil/i.test(s)))
    return 'Builds the core strength your progress is trending toward — a complement to your rehab work.';
  return 'A strong fit for your goals and schedule, with openings this week.';
}

export function ClientHome({ onOpen, goSearch, answers, name, live }) {
  const ranked = sortByMatch(TEACHERS);
  const top = ranked[0];
  const goalLabels = (answers.goals || []).map(g => (GOALS.find(x => x.id === g) || {}).label).filter(Boolean);
  const log = PROGRESS_LOG || [];
  const latest = log[0];
  const logTeacher = latest ? teacherById(latest.tId) : top;
  const recentFocus = [...new Set(log.slice(0, 4).map(l => l.focus.split(/[—&]/)[0].trim()))].slice(0, 3);
  const SESSIONS_DONE = 8, MILESTONE = 10;
  const remaining = Math.max(0, MILESTONE - SESSIONS_DONE);
  const pct = Math.min(100, Math.round((SESSIONS_DONE / MILESTONE) * 100));
  const [showFull, setShowFull] = useState(false);
  const firstName = (live && name) ? name.split(' ')[0] : 'Mara';
  const initials = (live && name) ? name.split(/\s+/).map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() : 'MW';

  return (
    <div style={{ padding: '8px 20px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--accent)' }}>Monday · 15 June</div>
          <h1 style={{ margin: '7px 0 0', lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--font-script)', fontSize: 38, color: 'var(--ink)' }}>Welcome,</span><br />
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 32, color: 'var(--espresso)' }}>{firstName}</span>
          </h1>
        </div>
        <Avatar t={{ initials, ph: 'almond' }} size={46} />
      </div>

      <div style={{ marginTop: 22, borderRadius: 24, overflow: 'hidden', position: 'relative', background: 'var(--espresso)' }}>
        <image-slot id="client-home-hero" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.42 }} shape="rect" fit="cover" placeholder="" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(58,50,44,.62), rgba(58,50,44,.86))' }} />
        <div style={{ position: 'relative', padding: '20px 20px 18px', color: 'var(--cream)' }}>
          {live ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--blush)' }}>
                <Icon n="sparkles" size={13} color="var(--blush)" /> Welcome
              </div>
              <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 21, lineHeight: 1.35, color: 'var(--cream)', margin: '14px 0 6px' }}>
                Let's find your rhythm{goalLabels[0] ? <> — starting with <span style={{ color: 'var(--blush)' }}>{goalLabels[0].toLowerCase()}</span></> : ''}.
              </p>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, lineHeight: 1.5, color: 'var(--cream)', opacity: .9, margin: '0 0 16px' }}>
                Book your first private session — your instructor tailors every move to you.
              </p>
              <Button variant="light" full size="md" onClick={goSearch} iconRight="arrow-right">Find your instructor</Button>
            </>
          ) : (
            <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--blush)' }}>
              <Icon n="sparkles" size={13} color="var(--blush)" /> Your progress
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 10.5, opacity: .7 }}>Last visit · 3 days ago</span>
          </div>

          <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 21, lineHeight: 1.35, color: 'var(--cream)', margin: '14px 0 14px' }}>
            You're <span style={{ color: 'var(--blush)' }}>{remaining} session{remaining === 1 ? '' : 's'}</span> from your <span style={{ color: 'var(--blush)' }}>{MILESTONE}-session milestone</span>.
          </p>

          <div style={{ margin: '0 0 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, opacity: .85, marginBottom: 6 }}>
              <span>{MILESTONE}-session milestone</span><span style={{ whiteSpace: 'nowrap' }}>{SESSIONS_DONE} / {MILESTONE}</span>
            </div>
            <div style={{ height: 7, background: 'rgba(250,247,243,.2)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ width: pct + '%', height: '100%', background: 'var(--blush)', borderRadius: 999 }} />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, margin: '14px 0 14px' }}>
            <Icon n="bell" size={14} color="var(--blush)" style={{ marginTop: 1, flex: 'none' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, lineHeight: 1.5, color: 'var(--cream)' }}>{logTeacher.name.split(' ')[0]} planned <span style={{ color: 'var(--blush)' }}>single-leg work</span> next — book this week to keep the momentum.</span>
          </div>

          <Button variant="light" full size="md" onClick={goSearch} iconRight="arrow-right">Book your next session</Button>

          <button className="tap" onClick={() => setShowFull(v => !v)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--blush)' }}>
            {showFull ? 'Hide details' : 'See full progress'} <Icon n={showFull ? 'chevron-up' : 'chevron-down'} size={13} color="var(--blush)" />
          </button>

          {showFull && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(250,247,243,.18)' }}>
              <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 15, lineHeight: 1.5, color: 'var(--cream)', margin: '0 0 12px' }}>
                Across <span style={{ color: 'var(--blush)' }}>{SESSIONS_DONE} sessions</span>, {logTeacher.name.split(' ')[0]} has guided you through <span style={{ color: 'var(--blush)' }}>{(recentFocus[0] || 'lower-back mobility').toLowerCase()}</span> — and it's paying off.
              </p>
              {latest && (
                <div style={{ display: 'flex', gap: 10, background: 'rgba(250,247,243,.1)', borderRadius: 14, padding: '12px 13px', marginBottom: 12 }}>
                  <Icon n="quote" size={15} color="var(--blush)" style={{ marginTop: 2, flex: 'none' }} />
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, lineHeight: 1.5, color: 'var(--cream)', fontStyle: 'italic' }}>"{latest.note.split('. ')[0]}."</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10.5, color: 'var(--blush)', marginTop: 6 }}>{logTeacher.name} · after session {latest.n}</div>
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ width: '100%', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--blush)', marginBottom: 1 }}>Recent focus areas</span>
                {recentFocus.map(f => (
                  <span key={f} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10.5, color: 'var(--cream)', background: 'rgba(250,247,243,.16)', border: '1px solid rgba(250,247,243,.24)', padding: '5px 10px', borderRadius: 999 }}>
                    <Icon n="target" size={11} color="var(--blush)" /> {f}
                  </span>
                ))}
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {goalLabels.length > 0 && (
        <div style={{ marginTop: 18, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)' }}>Working towards</span>
          {goalLabels.map(g => <Pill key={g} color="var(--accent)" bg="var(--accent-tint)">{g}</Pill>)}
        </div>
      )}

      <div style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="live-dot" />
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--espresso)', margin: 0, whiteSpace: 'nowrap' }}>Available now</h2>
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, color: 'var(--fg3)', flex: 'none' }}>Book at your call</span>
        </div>
        <div className="screen-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 6px' }}>
          {ranked.filter(t => t.online).map(t => (
            <div key={t.id} className="tap" onClick={() => onOpen(t)} style={{ flex: 'none', width: 156, background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Avatar t={t} size={46} radius={13} />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}><span className="live-dot" />Free</span>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)', marginTop: 11, lineHeight: 1.1 }}>{t.name}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', marginTop: 3 }}>{t.soon}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11, color: 'var(--accent)', marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 4 }}>Book now <Icon n="arrow-right" size={12} color="var(--accent)" /></div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '26px 0 6px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--espresso)', margin: 0 }}>Suggested for you</h2>
        <button className="tap" onClick={goSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>See all</button>
      </div>
      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon n="sparkles" size={13} color="var(--accent)" /> Based on your goals, history & profile · available this week
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {ranked.filter(t => t.online).slice(0, 3).map(t => (
          <div key={t.id} className="tap card-hover" onClick={() => onOpen(t)} style={{ background: 'var(--ivory)', borderRadius: 20, border: '1px solid var(--border-soft)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', gap: 13, padding: 14 }}>
              <Avatar t={t} size={56} radius={15} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--espresso)', lineHeight: 1.1 }}>{t.name}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--taupe)', marginTop: 2 }}>{t.headline}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 9, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}><span className="live-dot" />{t.soon.replace('Free ', '')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 10, background: 'var(--accent-tint)', borderRadius: 11, padding: '8px 10px' }}>
                  <Icon n="sparkles" size={12} color="var(--accent)" style={{ marginTop: 1, flex: 'none' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11.5, lineHeight: 1.45, color: 'var(--espresso)' }}>{suggestReason(t, goalLabels)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientSearch({ onOpen, loading }) {
  const { mobile } = useVP();
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('any');
  const ranked = sortByMatch(TEACHERS).filter(t =>
    (loc === 'any' || t.locId === loc) &&
    (q === '' || (t.name + t.headline + t.specs.join()).toLowerCase().includes(q.toLowerCase()))
  );
  return (
    <div style={{ padding: '8px 20px 28px' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30, color: 'var(--espresso)', margin: '6px 0 4px' }}>Find your instructor</h1>
      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--fg3)', margin: '0 0 16px' }}>{ranked.length} private instructors · ranked by your match</p>
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Icon n="search" size={18} color="var(--fg3)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, style, focus…" style={{ ...inputStyle, paddingLeft: 44 }} />
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -20px 18px', padding: '0 20px 4px' }} className="screen-scroll">
        {[{ id: 'any', name: 'All studios' }, ...LOCATIONS].map(l => {
          const on = loc === l.id;
          return <button key={l.id} className="tap" onClick={() => setLoc(l.id)} style={{ flex: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, letterSpacing: '.04em', padding: '10px 16px', minHeight: 42, borderRadius: 999, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'transparent', color: on ? '#fff' : 'var(--taupe)' }}>{l.name}</button>;
        })}
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>{[0, 1, 2].map(i => <TeacherSkel key={i} />)}</div>
      ) : ranked.length === 0 ? (
        <EmptyState icon="search-x" title="No instructors here yet" body="Try another studio or clear your search — we're adding teachers across all five locations." />
      ) : (
        <div style={{ display: mobile ? 'flex' : 'grid', gridTemplateColumns: mobile ? undefined : '1fr 1fr', flexDirection: mobile ? 'column' : undefined, gap: 13 }}>
          {ranked.map((t, i) => <TeacherCard key={t.id} t={t} onOpen={() => onOpen(t)} recommended={i === 0 && loc === 'any' && q === ''} compact />)}
        </div>
      )}
    </div>
  );
}

export function TeacherDetail({ t, onClose, onBook }) {
  const { mobile } = useVP();
  useSlots(); // re-render when slots are held / booked / released
  const [day, setDay] = useState(0);
  const [justBooked, setJustBooked] = useState(null);

  // Real-time availability: a slot gets taken every few seconds.
  useEffect(() => {
    const iv = setInterval(() => {
      const taken = takeRandomOpen(t.id);
      if (taken) {
        setJustBooked(taken.id);
        setTimeout(() => setJustBooked(null), 1600);
      }
    }, 4200);
    return () => clearInterval(iv);
  }, [t.id]);

  const avail = daysForTeacher(t.id);
  const d = avail[day];

  return (
    <div style={{ minHeight: '100%', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative', height: mobile ? 230 : 240 }}>
          <image-slot id={'teacher-photo-' + t.id} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} shape="rect" fit="cover" placeholder="Drop instructor photo" />
          <div className={'app-ph ' + (t.ph || '')} style={{ position: 'absolute', inset: 0, zIndex: -1 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(58,50,44,.3) 0%, transparent 35%, rgba(58,50,44,.55) 100%)' }} />
          <button className="tap" onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 42, height: 42, borderRadius: 999, background: 'rgba(250,247,243,.92)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 5 }}><Icon n={mobile ? 'chevron-down' : 'x'} size={20} color="var(--espresso)" /></button>
          <button className="tap" style={{ position: 'absolute', top: 16, right: 16, width: 42, height: 42, borderRadius: 999, background: 'rgba(250,247,243,.92)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 5 }}><Icon n="heart" size={19} color="var(--terracotta)" /></button>
          <div style={{ position: 'absolute', left: 18, bottom: 16, right: 18, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', color: 'var(--cream)' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 28, margin: 0, lineHeight: 1.05, color: 'var(--cream)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</h2>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13.5, opacity: .92, marginTop: 5 }}>{t.headline}</div>
            </div>
            <div style={{ background: 'var(--accent)', borderRadius: 14, padding: '8px 12px', textAlign: 'center', flex: 'none', boxShadow: 'var(--shadow-md)' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: '#fff', lineHeight: 1 }}>{t.match}%</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 8, letterSpacing: '.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,.85)', marginTop: 2 }}>match</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: mobile ? '18px 20px 16px' : '22px 26px 16px', maxWidth: 640, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <Stars value={t.rating} reviews={t.reviews} />
          <span style={metaItem}><Icon n="map-pin" size={14} /> {locName(t.locId)}</span>
          <span style={metaItem}><Icon n="award" size={14} /> {t.exp} yrs</span>
          <span style={{ ...metaItem, color: 'var(--accent)', fontWeight: 500 }}><span className="live-dot" /> {t.responds}</span>
        </div>

        <div style={{ marginTop: 16, background: 'var(--accent-tint)', borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Icon n="sparkles" size={15} color="var(--accent)" />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)' }}>Why you matched · {t.match}%</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {t.reasons.map(r => (
              <span key={r} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--espresso)', background: 'var(--ivory)', padding: '6px 11px', borderRadius: 999 }}>
                <Icon n="check" size={12} color="var(--accent)" sw={3} /> {r}
              </span>
            ))}
          </div>
        </div>

        <p style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 18, lineHeight: 1.55, color: 'var(--espresso)', margin: '16px 0 4px' }}>{t.bio}</p>
        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--taupe)', margin: '0 0 18px', fontStyle: 'italic' }}>"{t.style}"</p>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18 }}>
          <div><div style={labelMini}>Specialisations</div><SpecChips items={t.specs} accent /></div>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 150 }}>
            <div style={labelMini}>Certifications</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{t.certs.map(c => <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--espresso)' }}><Icon n="check-circle-2" size={15} color="var(--accent)" /> {c}</div>)}</div>
          </div>
          <div style={{ minWidth: 120 }}>
            <div style={labelMini}>Languages</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{t.langs.map(l => <div key={l} style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--espresso)' }}>{l}</div>)}</div>
          </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--espresso)', margin: 0 }}>Availability</h3>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, color: 'var(--accent)' }}><span className="live-dot" /> Live · updates in real time</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 -2px 14px', padding: '2px', scrollbarWidth: 'none' }} className="screen-scroll">
            {avail.map((dd, i) => {
              const on = day === i; const free = dd.slots.filter(s => s.status === 'open').length;
              return (
                <button key={i} className="tap" onClick={() => setDay(i)} style={{ flex: 'none', width: 52, textAlign: 'center', padding: '10px 0', borderRadius: 16, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--ivory)' }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: on ? 'rgba(255,255,255,.85)' : 'var(--fg3)' }}>{dd.dow}</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: on ? '#fff' : 'var(--espresso)', margin: '3px 0' }}>{dd.dom}</div>
                  <div style={{ width: 5, height: 5, borderRadius: 999, margin: '0 auto', background: free > 0 ? (on ? '#fff' : 'var(--accent)') : 'transparent' }} />
                </button>
              );
            })}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 9 }}>
            {d.slots.map((s) => {
              const open = s.status === 'open';
              return (
                <button key={s.id} className="tap" disabled={!open} onClick={() => onBook(t, d, s)} style={{
                  position: 'relative', cursor: open ? 'pointer' : 'not-allowed', minHeight: 46,
                  fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, borderRadius: 13,
                  border: '1px solid ' + (open ? 'var(--border)' : 'transparent'),
                  background: open ? 'var(--ivory)' : 'var(--sand)',
                  color: open ? 'var(--espresso)' : 'var(--fg3)',
                  textDecoration: open ? 'none' : 'line-through', opacity: open ? 1 : .6,
                  animation: justBooked === s.id ? 'flash .8s var(--ease)' : 'none',
                }}>{s.time}</button>
              );
            })}
            {d.slots.length === 0 && <div style={{ gridColumn: '1/-1', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--fg3)', textAlign: 'center', padding: '16px 0' }}>No sessions this day — try another date.</div>}
          </div>
        </div>
      </div>

      <div style={{ position: 'sticky', bottom: 0, flex: 'none', padding: '12px 20px calc(16px + env(safe-area-inset-bottom))', background: 'var(--cream)', borderTop: '1px solid var(--border)', boxShadow: '0 -10px 20px -8px rgba(58,50,44,.12)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 9, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11.5, color: 'var(--accent)' }}>
            <Icon n="zap" size={13} color="var(--accent)" /> Confirmed instantly — no waiting for approval
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 'none' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: 'var(--espresso)', lineHeight: 1 }}>{hkd(t.rate)}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)' }}>per private hour</div>
            </div>
            <Button variant="accent" size="lg" full onClick={() => onBook(t, d, d.slots.find(s => s.status === 'open'))} iconRight="arrow-right">Book a session</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
