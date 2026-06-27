import { useState, useEffect, useRef } from 'react';
import { Icon, Button, Avatar, Stars, Skel, SpecChips, Pill, useVP, useLiveReviews, useFavs, toggleFav } from '../shared/index.jsx';
import { hkd } from '../shared/index.jsx';
import { TEACHERS, GOALS, PROGRESS_LOG, LOCATIONS } from '../../data.js';
import { locName } from '../../data.js';
import { isSupabaseConfigured } from '../../supabase/client.js';
import { fetchReviews } from '../../supabase/queries.js';
import { metaItem, labelMini } from '../../styles.js';
import { TeacherCard } from './ClientCore.jsx';
import { useSlots, daysForTeacher, takeRandomOpen } from '../../slots.js';
import { inputStyle } from '../../styles.js';

export function sortByMatch(arr) { return [...arr].sort((a, b) => b.match - a.match); }

// Home promo slides — edit freely. `tab` is where the CTA goes; `img` loads from
// assets/promos (gradient `ph` shows until a photo is added).
const PROMOS = [
  { id: 'promo1', eyebrow: 'Opening offer', title: 'Your first session, your way', text: 'Try a private 1:1 or semi-private 1:2 with any instructor.', cta: 'Book a trial', tab: 'Search', img: 'assets/promos/promo1.jpg', ph: 'blush' },
  { id: 'promo2', eyebrow: 'Best value', title: '10-class packs', text: 'Save across all five studios — credits never tied to one place.', cta: 'See pricing', tab: 'Pricing', img: 'assets/promos/promo2.jpg', ph: 'sage' },
  { id: 'promo3', eyebrow: 'Five studios', title: 'One pass, all of Hong Kong', text: '5 studios now and more coming.', cta: 'Explore studios', tab: 'Locations', img: 'assets/promos/promo3.jpg', ph: 'almond' },
];

function PromoHero({ goTab }) {
  const [i, setI] = useState(0);
  const startX = useRef(0);
  useEffect(() => {
    const iv = setInterval(() => setI(v => (v + 1) % PROMOS.length), 5000);
    return () => clearInterval(iv);
  }, []);
  const onStart = e => { startX.current = e.touches[0].clientX; };
  const onEnd = e => { const dx = e.changedTouches[0].clientX - startX.current; if (Math.abs(dx) > 40) setI(v => (v + (dx < 0 ? 1 : PROMOS.length - 1)) % PROMOS.length); };
  return (
    <div onTouchStart={onStart} onTouchEnd={onEnd} style={{ marginTop: 18, position: 'relative', height: 190, borderRadius: 22, overflow: 'hidden', background: 'var(--espresso)' }}>
      {PROMOS.map((p, idx) => (
        <div key={p.id} className={'app-ph ' + p.ph} style={{ position: 'absolute', inset: 0, opacity: idx === i ? 1 : 0, pointerEvents: idx === i ? 'auto' : 'none', transition: 'opacity .5s var(--ease)' }}>
          <img src={p.img} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(58,50,44,.78) 0%, rgba(58,50,44,.45) 60%, rgba(58,50,44,.25) 100%)' }} />
          <div style={{ position: 'relative', height: '100%', padding: '20px 20px 26px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1, maxWidth: '84%' }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--blush)' }}>{p.eyebrow}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 21, color: 'var(--cream)', margin: '5px 0 4px', lineHeight: 1.15 }}>{p.title}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'rgba(250,247,243,.9)', lineHeight: 1.45, marginBottom: 12 }}>{p.text}</div>
            <button className="tap" onClick={() => goTab && goTab(p.tab)} style={{ alignSelf: 'flex-start', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--cream)', color: 'var(--espresso)', border: 'none', borderRadius: 999, padding: '8px 15px', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12 }}>{p.cta} <Icon n="arrow-right" size={13} color="var(--espresso)" /></button>
          </div>
        </div>
      ))}
      <div style={{ position: 'absolute', bottom: 11, right: 16, display: 'flex', gap: 5 }}>
        {PROMOS.map((_, d) => <button key={d} className="tap" onClick={() => setI(d)} aria-label={`Slide ${d + 1}`} style={{ width: d === i ? 18 : 6, height: 6, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer', background: d === i ? 'var(--cream)' : 'rgba(250,247,243,.5)', transition: 'width .3s' }} />)}
      </div>
    </div>
  );
}

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
    return "Specialises in the lower-back rehab you've been working on — a natural next step from your sessions with Hailey.";
  if (t.specs.some(s => /posture|align|found/i.test(s)))
    return 'Posture & alignment focus matches your profile goals — good for the weeks Hailey is fully booked.';
  if (t.specs.some(s => /restor|prenatal|breath/i.test(s)))
    return 'Restorative work to balance your strength sessions — pairs well with your current routine.';
  if (t.specs.some(s => /athletic|strength|mobil/i.test(s)))
    return 'Builds the core strength your progress is trending toward — a complement to your rehab work.';
  return 'A strong fit for your goals and schedule, with openings this week.';
}

export function ClientHome({ onOpen, goSearch, answers, name, live, nextClass, goTab }) {
  const ranked = sortByMatch(TEACHERS);
  const favSet = useFavs();
  // Teachers the client has trained with (their class history). Demo uses the
  // mock progress log; real users get this from their real history later.
  const historyIds = live ? [] : [...new Set(PROGRESS_LOG.map(p => p.tId))];
  const onlineRanked = ranked.filter(t => t.online);
  // Rank: favourites first, then teachers from your history, then by match.
  const sigScore = t => (favSet.includes(t.id) ? 2 : 0) + (historyIds.includes(t.id) ? 1 : 0);
  const suggested = [...onlineRanked].sort((a, b) => sigScore(b) - sigScore(a)).slice(0, (favSet.length || historyIds.length) ? 5 : 3);
  const goalLabels = (answers.goals || []).map(g => (GOALS.find(x => x.id === g) || {}).label).filter(Boolean);
  const now = new Date();
  const dateLabel = `${now.toLocaleDateString('en-HK', { weekday: 'long' })} · ${now.getDate()} ${now.toLocaleDateString('en-HK', { month: 'long' })}`;
  const firstName = (live && name) ? name.split(' ')[0] : 'Mara';
  const initials = (live && name) ? name.split(/\s+/).map(w => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() : 'MW';

  return (
    <div style={{ padding: '8px 20px 28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 4 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--accent)' }}>{dateLabel}</div>
          <h1 style={{ margin: '7px 0 0', lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--font-script)', fontSize: 38, color: 'var(--ink)' }}>Welcome,</span><br />
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 32, color: 'var(--espresso)' }}>{firstName}</span>
          </h1>
        </div>
        <Avatar t={{ initials, ph: 'almond' }} size={46} />
      </div>

      <PromoHero goTab={goTab} />

      {nextClass && (
        <div className="tap card-hover" onClick={() => onOpen(nextClass.t)} style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 13, background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow-sm)', cursor: 'pointer' }}>
          <Avatar t={nextClass.t} size={48} radius={13} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--accent)' }}><Icon n="bell" size={12} color="var(--accent)" /> Next class</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--espresso)', marginTop: 3, lineHeight: 1.1 }}>{nextClass.t.name}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--taupe)', marginTop: 2 }}>{nextClass.dayLabel} · {nextClass.slotTime} · {locName(nextClass.t.locId)}</div>
          </div>
          <Icon n="chevron-right" size={18} color="var(--clay)" />
        </div>
      )}

      {live && (
      <div style={{ marginTop: 22, borderRadius: 24, overflow: 'hidden', position: 'relative', background: 'var(--espresso)' }}>
        <image-slot id="client-home-hero" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.42 }} shape="rect" fit="cover" placeholder="" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(58,50,44,.62), rgba(58,50,44,.86))' }} />
        <div style={{ position: 'relative', padding: '20px 20px 18px', color: 'var(--cream)' }}>
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
        </div>
      </div>
      )}

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
        </div>
        <div className="screen-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -20px', padding: '0 20px 6px' }}>
          {ranked.filter(t => t.online).map(t => {
            const parts = (t.soon || '').split('·').map(s => s.trim());
            const when = (parts[0] || 'Available').replace('Free', 'Available'); // "Available now" / "Available today"
            const at = parts[1] || ''; // next slot time, e.g. "4:30pm"
            return (
            <div key={t.id} className="tap" onClick={() => onOpen(t)} style={{ flex: 'none', width: 156, background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 18, padding: 14, boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Avatar t={t} size={46} radius={13} />
                {at && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 10.5, color: 'var(--accent)', background: 'var(--accent-tint)', padding: '5px 9px', borderRadius: 999 }}><span className="live-dot" />{at}</span>}
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)', marginTop: 11, lineHeight: 1.1 }}>{t.name}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, color: 'var(--sage)', marginTop: 3 }}>{when}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11, color: 'var(--accent)', marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 4 }}>Book now <Icon n="arrow-right" size={12} color="var(--accent)" /></div>
            </div>
          );})}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '26px 0 6px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 22, color: 'var(--espresso)', margin: 0 }}>Suggested for you</h2>
        <button className="tap" onClick={goSearch} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)' }}>See all</button>
      </div>
      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon n="sparkles" size={13} color="var(--accent)" /> Based on your goals, history & favourites · available this week
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {suggested.map(t => (
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
                  <Icon n={favSet.includes(t.id) ? 'heart' : historyIds.includes(t.id) ? 'history' : 'sparkles'} size={12} color="var(--accent)" sw={favSet.includes(t.id) ? 0 : 1.6} style={{ marginTop: 1, flex: 'none', fill: favSet.includes(t.id) ? 'var(--accent)' : 'none' }} />
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11.5, lineHeight: 1.45, color: 'var(--espresso)' }}>{favSet.includes(t.id) ? 'One of your favourites — book again.' : historyIds.includes(t.id) ? `You've trained with ${t.name.split(' ')[0]} before — keep the momentum.` : suggestReason(t, goalLabels)}</span>
                </div>
                <button className="tap" onClick={e => { e.stopPropagation(); onOpen(t); }} style={{ marginTop: 11, width: '100%', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 14px', minHeight: 42, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12.5 }}>Book now <Icon n="arrow-right" size={14} color="#fff" /></button>
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
    (loc === 'any' || (t.locIds || [t.locId]).includes(loc)) &&
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
  const [showReviews, setShowReviews] = useState(false);
  const faved = useFavs().includes(t.id);
  const liveReviews = useLiveReviews({ tId: t.id }); // reviews submitted in-app
  const [dbReviews, setDbReviews] = useState([]); // real reviews from Supabase
  useEffect(() => {
    setDbReviews([]);
    // Only query the backend for real (UUID) teacher ids; mock ids skip it.
    if (!isSupabaseConfigured || !/[0-9a-f-]{20,}/i.test(t.id)) return;
    let active = true;
    fetchReviews(t.id).then(r => { if (active) setDbReviews(r); }).catch(() => {});
    return () => { active = false; };
  }, [t.id]);
  const allReviews = [...liveReviews, ...dbReviews];

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
      {showReviews && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 'none', padding: '14px 18px 10px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border-soft)' }}>
            <button className="tap" onClick={() => setShowReviews(false)} style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--ivory)', border: '1px solid var(--border)', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}><Icon n="arrow-left" size={18} color="var(--espresso)" /></button>
            <div>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: 'var(--espresso)', lineHeight: 1 }}>Reviews · {t.name}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginTop: 3 }}>{t.rating} average · {t.reviews} reviews</div>
            </div>
          </div>
          <div className="screen-scroll" style={{ flex: 1, minHeight: 0, padding: '16px 18px 28px' }}>
            {allReviews.length === 0 ? (
              <EmptyState icon="message-square" title="No written reviews yet" body="When clients share a reflection after their session, it'll appear here." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {allReviews.map(r => (
                  <div key={r.id} style={{ background: 'var(--ivory)', borderRadius: 16, border: '1px solid var(--border-soft)', padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ display: 'inline-flex', gap: 1 }}>{[1, 2, 3, 4, 5].map(i => <Icon key={i} n="star" size={14} color={i <= r.stars ? 'var(--accent)' : 'var(--linen)'} sw={0} style={{ fill: i <= r.stars ? 'var(--accent)' : 'var(--linen)' }} />)}</span>
                      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)' }}>{r.date ? new Date(r.date + 'T00:00:00').toLocaleDateString('en-HK', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                    </div>
                    {r.text && <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.55, color: 'var(--espresso)', margin: '9px 0 0' }}>"{r.text}"</p>}
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--taupe)', marginTop: 8 }}>{r.clientName}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative', height: mobile ? 230 : 240 }}>
          <div className={'app-ph ' + (t.ph || '')} style={{ position: 'absolute', inset: 0 }} />
          {t.photo && <img src={t.photo} alt={t.name} loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 28%' }} />}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(58,50,44,.3) 0%, transparent 35%, rgba(58,50,44,.55) 100%)' }} />
          <button className="tap" onClick={onClose} style={{ position: 'absolute', top: 16, left: 16, width: 42, height: 42, borderRadius: 999, background: 'rgba(250,247,243,.92)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 5 }}><Icon n="arrow-left" size={20} color="var(--espresso)" /></button>
          <button className="tap" onClick={() => toggleFav(t.id)} aria-label={faved ? 'Remove favourite' : 'Add favourite'} style={{ position: 'absolute', top: 16, right: 16, width: 42, height: 42, borderRadius: 999, background: 'rgba(250,247,243,.92)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 5 }}><Icon n="heart" size={19} color="var(--terracotta)" sw={faved ? 0 : 1.8} style={{ fill: faved ? 'var(--terracotta)' : 'none' }} /></button>
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
          <button className="tap" onClick={() => setShowReviews(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Stars value={t.rating} reviews={t.reviews} />
            <Icon n="chevron-right" size={14} color="var(--clay)" />
          </button>
          <span style={metaItem}><Icon n="map-pin" size={14} /> {(() => { const ls = t.locIds || [t.locId]; return ls.length <= 2 ? ls.map(locName).join(' · ') : `${locName(ls[0])} +${ls.length - 1} more`; })()}</span>
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

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginBottom: 18, marginTop: 18 }}>
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
