import { useState } from 'react';
import { Icon, Eyebrow, Button, Avatar, Card, Stars, Segmented, Modal, SpecChips, useVP, addLiveProgress } from '../shared/index.jsx';
import { hkd } from '../shared/index.jsx';
import { TEACHERS, BOOKINGS, CLIENTS, LOCATIONS, EARNINGS } from '../../data.js';
import { locName } from '../../data.js';
import { inputStyle, labelMini } from '../../styles.js';
import { EmptyState } from '../client/ClientDetail.jsx';

function Workspace({ title, nav, tab, setTab, children, headRight }) {
  const { mobile } = useVP();
  if (mobile) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--cream)' }}>
        <div style={{ flex: 'none', padding: '14px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-soft)', background: 'var(--cream)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="assets/submark-brown-trim.png" alt="" style={{ height: 26 }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--taupe)' }}>{title}</span>
          </div>
          {headRight}
        </div>
        <div className="screen-scroll" style={{ flex: 1, minHeight: 0 }}>{children}</div>
        <div style={{ flex: 'none', background: 'rgba(250,247,243,.95)', backdropFilter: 'blur(14px)', borderTop: '1px solid var(--border)', padding: '9px 12px calc(9px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'space-around' }}>
          {nav.map(([ic, label]) => {
            const on = tab === label;
            return (
              <button key={label} className="tap" onClick={() => setTab(label)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 8px', minWidth: 52, minHeight: 46, color: on ? 'var(--accent)' : 'var(--fg3)' }}>
                <Icon n={ic} size={21} sw={on ? 2.2 : 1.7} />
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: on ? 600 : 400, fontSize: 9.5, letterSpacing: '.02em' }}>{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--cream)', overflow: 'hidden' }}>
      <aside style={{ width: 248, flex: 'none', borderRight: '1px solid var(--border)', padding: '26px 18px', display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '0 8px 22px' }}>
          <img src="assets/submark-brown-trim.png" alt="" style={{ height: 32 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 17, color: 'var(--espresso)', lineHeight: 1 }}>Senses</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', color: 'var(--fg3)', marginTop: 3 }}>{title}</div>
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {nav.map(([ic, label]) => {
            const on = tab === label;
            return (
              <button key={label} className="tap" onClick={() => setTab(label)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 13, cursor: 'pointer', border: 'none', textAlign: 'left', background: on ? 'var(--accent-tint)' : 'transparent', color: on ? 'var(--accent)' : 'var(--taupe)', minHeight: 46 }}>
                <Icon n={ic} size={19} sw={on ? 2.1 : 1.7} />
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: on ? 600 : 400, fontSize: 13.5 }}>{label}</span>
              </button>
            );
          })}
        </nav>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 8px 0', borderTop: '1px solid var(--border-soft)' }}>
          {headRight}
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }} className="screen-scroll">{children}</main>
    </div>
  );
}

function PageHead({ eyebrow, title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
      <div>
        {eyebrow && <Eyebrow style={{ marginBottom: 8 }}>{eyebrow}</Eyebrow>}
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30, color: 'var(--espresso)', margin: 0, lineHeight: 1.05 }}>{title}</h1>
        {sub && <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, color: 'var(--fg3)', margin: '7px 0 0' }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Stat({ icon, label, value, sub, tone = 'accent' }) {
  return (
    <Card pad={20} style={{ flex: 1, minWidth: 150 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: tone === 'accent' ? 'var(--accent-tint)' : 'var(--sand)', display: 'grid', placeItems: 'center' }}><Icon n={icon} size={18} color={tone === 'accent' ? 'var(--accent)' : 'var(--taupe)'} /></span>
        {sub && <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 3 }}><Icon n="trending-up" size={13} color="var(--accent)" /> {sub}</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 30, color: 'var(--espresso)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', marginTop: 6 }}>{label}</div>
    </Card>
  );
}

function BarChart({ data, fmt = v => v, height = 150, highlight = -1 }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
      {data.map((d, i) => {
        const h = (d.v / max) * (height - 28);
        const on = i === (highlight === -1 ? data.length - 1 : highlight);
        return (
          <div key={d.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10.5, color: on ? 'var(--accent)' : 'var(--fg3)' }}>{fmt(d.v)}</span>
            <div style={{ width: '100%', maxWidth: 42, height: h, borderRadius: 8, background: on ? 'var(--accent)' : 'var(--sand)', transition: 'height .6s var(--ease)' }} />
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11, color: 'var(--fg3)' }}>{d.m}</span>
          </div>
        );
      })}
    </div>
  );
}

function Toast({ msg }) {
  return <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 300, background: 'var(--espresso)', color: 'var(--cream)', padding: '13px 22px', borderRadius: 999, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 13.5, boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 9, animation: 'rise .35s var(--ease)' }}><Icon n="check-circle-2" size={17} color="var(--blush)" /> {msg}</div>;
}

function TeacherLogin({ onIn }) {
  const { mobile } = useVP();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--cream)' }}>
      {!mobile && (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <image-slot id="teacher-login-hero" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} shape="rect" fit="cover" placeholder="Drop a studio photo" />
          <div className="app-ph taupe" style={{ position: 'absolute', inset: 0, zIndex: -1 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(58,50,44,.35), rgba(58,50,44,.65))' }} />
          <div style={{ position: 'absolute', left: 48, bottom: 48, right: 48, color: 'var(--cream)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 34, lineHeight: 1.15, margin: 0, color: 'var(--cream)', maxWidth: 420 }}>Teach the way you were trained to. We'll handle the rest.</h2>
          </div>
        </div>
      )}
      <div style={{ width: mobile ? '100%' : 460, flex: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: mobile ? '0 28px' : '0 56px' }}>
        <Eyebrow>Instructor portal</Eyebrow>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 32, color: 'var(--espresso)', margin: '12px 0 26px', lineHeight: 1.1 }}>Welcome back</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380 }}>
          <input placeholder="Email address" style={inputStyle} defaultValue="elise@senses.studio" />
          <input type="password" placeholder="Password" style={inputStyle} defaultValue="········" />
          <Button variant="dark" full size="lg" onClick={onIn} style={{ marginTop: 4 }}>Sign in</Button>
          <button className="tap" style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 13, color: 'var(--taupe)', marginTop: 4 }}>Forgot password?</button>
        </div>
      </div>
    </div>
  );
}

function TeacherToday({ me, setTab }) {
  const { mobile } = useVP();
  const today = BOOKINGS.filter(b => b.tId === me.id && b.status === 'confirmed').slice(0, 3);
  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <PageHead eyebrow="Monday · 15 June" title={<span><span style={{ fontFamily: 'var(--font-script)', fontWeight: 400 }}>Good morning, </span>{me.name.split(' ')[0]}</span>} sub="Three sessions today · your first is at 7:00." />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <Stat icon="calendar-check" label="Sessions today" value="3" />
        <Stat icon="users" label="Active clients" value="18" sub="+2" />
        <Stat icon="wallet" label="This month" value={hkd(49400)} sub="+12%" />
        <Stat icon="star" label="Rating" value="4.9" sub={me.reviews + ' reviews'} tone="sand" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.3fr 1fr', gap: 18 }}>
        <Card pad={mobile ? 18 : 24}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--espresso)', margin: 0 }}>Today's schedule</h3>
            <button className="tap" onClick={() => setTab('Your Bookings')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>All sessions</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {today.map((b, i) => { const c = CLIENTS.find(x => x.id === b.cId); return (
              <div key={b.id} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0', borderBottom: i < today.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                <div style={{ width: 52, flex: 'none' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 18, color: 'var(--espresso)' }}>{b.time}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)' }}>60 min</div>
                </div>
                <Avatar t={c} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14.5, color: 'var(--espresso)' }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)' }}>{b.type} · {c.goal}</div>
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--taupe)', background: 'var(--sand)', padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{locName(b.locId)}</div>
              </div>
            ); })}
          </div>
        </Card>
        <Card pad={mobile ? 18 : 24}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--espresso)', margin: '0 0 8px' }}>Earnings · 6 months</h3>
          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', margin: '0 0 18px' }}>Net after studio share</p>
          <BarChart data={EARNINGS} fmt={v => (v / 1000).toFixed(0) + 'k'} height={150} />
        </Card>
      </div>
    </div>
  );
}

function TeacherAvailability({ me }) {
  const { mobile } = useVP();
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const times = ['07:00', '08:00', '09:30', '11:00', '12:15', '14:00', '16:30', '18:00', '19:30'];
  const [loc, setLoc] = useState(me.locId);
  const [grids, setGrids] = useState(() => {
    const all = {};
    LOCATIONS.forEach((L, li) => {
      const g = {};
      days.forEach((d, di) => times.forEach((t, ti) => { g[d + t] = L.id === me.locId && ((di * 3 + ti * 5) % 7) > 2; }));
      all[L.id] = g;
    });
    return all;
  });
  const grid = grids[loc];
  const toggle = k => setGrids(gs => ({ ...gs, [loc]: { ...gs[loc], [k]: !gs[loc][k] } }));
  const countFor = id => Object.values(grids[id]).filter(Boolean).length;
  const openCount = countFor(loc);

  return (
    <div style={{ padding: mobile ? '20px 16px 28px' : '34px 40px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <PageHead eyebrow="Your week" title="Availability" sub="Choose a studio, then tap slots to open or close them. Clients book only what you open."
        right={<div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-tint)', padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{openCount} open · {locName(loc)}</div>}
      />
      <div className="screen-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '0 0 18px', paddingBottom: 4 }}>
        {LOCATIONS.map(L => {
          const on = loc === L.id; const n = countFor(L.id);
          return (
            <button key={L.id} className="tap" onClick={() => setLoc(L.id)} style={{ flex: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 15px', minHeight: 44, borderRadius: 999, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'var(--ivory)' }}>
              <Icon n={L.sea ? 'waves' : 'map-pin'} size={15} color={on ? '#fff' : 'var(--taupe)'} />
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13, color: on ? '#fff' : 'var(--espresso)', whiteSpace: 'nowrap' }}>{L.name}</span>
              {n > 0 && <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, color: on ? '#fff' : 'var(--accent)', background: on ? 'rgba(255,255,255,.22)' : 'var(--accent-tint)', borderRadius: 999, padding: '2px 7px' }}>{n}</span>}
            </button>
          );
        })}
      </div>
      <Card pad={mobile ? 12 : 18} style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: mobile ? 540 : 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
            <div />
            {days.map(d => <div key={d} style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--taupe)' }}>{d}</div>)}
          </div>
          {times.map(t => (
            <div key={t} style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', gap: 6, marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11.5, color: 'var(--fg3)' }}>{t}</div>
              {days.map(d => { const k = d + t; const on = grid[k]; return (
                <button key={k} className="tap" onClick={() => toggle(k)} style={{ height: 38, borderRadius: 9, cursor: 'pointer', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-soft)'), background: on ? 'var(--accent)' : 'var(--ivory)', display: 'grid', placeItems: 'center' }}>
                  {on && <Icon n="check" size={13} color="#fff" sw={3} />}
                </button>
              ); })}
            </div>
          ))}
        </div>
      </Card>
      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--accent)' }} /> Open</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}><span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--ivory)', border: '1px solid var(--border)' }} /> Closed</span>
      </div>
    </div>
  );
}

function TeacherSessions({ me }) {
  const { mobile } = useVP();
  const [tab, setTab] = useState('Upcoming');
  const [logFor, setLogFor] = useState(null);
  const [logged, setLogged] = useState({});
  const [note, setNote] = useState('');
  const [focus, setFocus] = useState('');
  const [toast, setToast] = useState(null);
  const all = BOOKINGS.filter(b => b.tId === me.id);
  const list = tab === 'Upcoming' ? all.filter(b => b.status === 'confirmed') : all.filter(b => b.status !== 'confirmed');

  const openLog = (b, c) => { setNote(''); setFocus(''); setLogFor({ b, c }); };
  const saveLog = () => {
    addLiveProgress({ cId: logFor.c.id, tId: me.id, focus: focus.trim() || (logFor.c.goal || 'Session'), note: note.trim() });
    setLogged(l => ({ ...l, [logFor.b.id]: true }));
    setToast(`Progress saved — ${logFor.c.name.split(' ')[0]} can see it now`);
    setLogFor(null);
    setTimeout(() => setToast(null), 2800);
  };

  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 900, margin: '0 auto' }}>
      <PageHead eyebrow="Your clients" title="Sessions" />
      <Segmented options={['Upcoming', 'Past']} value={tab} onChange={setTab} style={{ marginBottom: 18 }} />
      {list.length === 0 ? <EmptyState icon="calendar-x" title="Nothing here" body="Sessions you teach will appear here." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {list.map(b => { const c = CLIENTS.find(x => x.id === b.cId); return (
            <Card key={b.id} pad={14}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <Avatar t={c} size={48} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 15, color: 'var(--espresso)' }}>{c.name}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', marginTop: 2 }}>{new Date(b.date + 'T00:00:00').toLocaleDateString('en-HK', { weekday: 'short', day: 'numeric', month: 'short' })} · {b.time} · {b.type}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 16, color: 'var(--espresso)' }}>{hkd(b.amount)}</div>
                  {b.status === 'completed'
                    ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--taupe)', background: 'var(--sand)', padding: '5px 11px', borderRadius: 999, marginTop: 4 }}>Completed</div>
                    : b.status === 'cancelled'
                    ? <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--terracotta)', background: 'rgba(185,117,91,.14)', padding: '5px 11px', borderRadius: 999, marginTop: 4 }}>Cancelled</div>
                    : <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-tint)', padding: '5px 11px', borderRadius: 999, marginTop: 4 }}>Confirmed</div>}
                </div>
              </div>
              {b.status !== 'cancelled' && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="tap" onClick={() => openLog(b, c)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11.5, color: logged[b.id] ? 'var(--taupe)' : 'var(--accent)' }}>
                    <Icon n={logged[b.id] ? 'check-circle-2' : 'notebook-pen'} size={14} color={logged[b.id] ? 'var(--taupe)' : 'var(--accent)'} /> {logged[b.id] ? 'Progress logged · edit' : 'Log progress'}
                  </button>
                </div>
              )}
            </Card>
          ); })}
        </div>
      )}
      <Modal open={!!logFor} onClose={() => setLogFor(null)} w={460}>
        {logFor && (
          <div style={{ padding: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <Avatar t={logFor.c} size={46} />
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 20, color: 'var(--espresso)', margin: 0 }}>Log progress</h2>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)' }}>{logFor.c.name} · {logFor.c.goal}</div>
              </div>
            </div>
            <div style={labelMini}>Focus area</div>
            <input value={focus} onChange={e => setFocus(e.target.value)} placeholder="e.g. Lower-back mobility & core control" style={{ ...inputStyle, marginTop: 8, marginBottom: 14 }} />
            <div style={labelMini}>Instructor's comment</div>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Focus, wins, form cues, what to progress next time…" style={{ ...inputStyle, minHeight: 110, resize: 'none', marginTop: 8 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 10, fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)' }}>
              <Icon n="eye" size={13} color="var(--accent)" /> Shared instantly to {logFor.c.name.split(' ')[0]}'s progress log
            </div>
            <div style={{ display: 'flex', gap: 9, marginTop: 14 }}>
              <Button variant="ghost" full onClick={() => setLogFor(null)}>Cancel</Button>
              <Button variant="accent" full icon="check" disabled={!note.trim()} onClick={saveLog}>Save progress</Button>
            </div>
          </div>
        )}
      </Modal>
      {toast && <Toast msg={toast} />}
    </div>
  );
}

function TeacherEarnings({ me }) {
  const { mobile } = useVP();
  const completed = BOOKINGS.filter(b => b.tId === me.id && b.status === 'completed');
  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <PageHead eyebrow="Your income" title="Earnings" sub="Paid out monthly to your linked account." />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <Stat icon="wallet" label="This month" value={hkd(49400)} sub="+12%" />
        <Stat icon="calendar" label="Last month" value={hkd(52100)} tone="sand" />
        <Stat icon="trending-up" label="Total · 2026" value={hkd(273500)} />
        <Stat icon="hand-coins" label="Next payout" value={hkd(18200)} sub="1 Jul" tone="sand" />
      </div>
      <Card pad={mobile ? 18 : 26} style={{ marginBottom: 18 }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--espresso)', margin: '0 0 18px' }}>Monthly net earnings</h3>
        <BarChart data={EARNINGS} fmt={v => (v / 1000).toFixed(0) + 'k'} height={mobile ? 150 : 190} />
      </Card>
      <Card pad={0}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-soft)' }}><h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 18, color: 'var(--espresso)', margin: 0 }}>Recent payments</h3></div>
        {completed.slice(0, 5).map((b, i, a) => { const c = CLIENTS.find(x => x.id === b.cId); return (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '14px 20px', borderBottom: i < a.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
            <Avatar t={c} size={38} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13.5, color: 'var(--espresso)' }}>{c.name}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)' }}>{new Date(b.date + 'T00:00:00').toLocaleDateString('en-HK', { day: 'numeric', month: 'short' })} · {b.type}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--accent)' }}>+{hkd(Math.round(b.amount * 0.7))}</div>
          </div>
        ); })}
      </Card>
    </div>
  );
}

function TeacherProfile({ me, onLogout }) {
  const { mobile } = useVP();
  const [rate, setRate] = useState(me.rate);
  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 760, margin: '0 auto' }}>
      <PageHead eyebrow="Public profile" title="Your profile" sub="This is what clients see when they match with you." />
      <Card pad={0} style={{ overflow: 'hidden', marginBottom: 18 }}>
        <div style={{ position: 'relative', height: 150 }}>
          <image-slot id="teacher-self-photo" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} shape="rect" fit="cover" placeholder="Drop your profile photo" />
          <div className={'app-ph ' + me.ph} style={{ position: 'absolute', inset: 0, zIndex: -1 }} />
        </div>
        <div style={{ padding: 22, marginTop: -44, position: 'relative' }}>
          <Avatar t={me} size={80} radius={20} style={{ border: '4px solid var(--ivory)' }} />
          <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 24, color: 'var(--espresso)', margin: '12px 0 4px' }}>{me.name}</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13.5, color: 'var(--taupe)', margin: 0 }}>{me.headline} · {locName(me.locId)}</p>
        </div>
      </Card>
      <Card pad={22} style={{ marginBottom: 16 }}>
        <div style={labelMini}>Bio</div>
        <textarea defaultValue={me.bio} style={{ ...inputStyle, minHeight: 90, resize: 'none', marginTop: 8 }} />
      </Card>
      <Card pad={22} style={{ marginBottom: 16 }}>
        <div style={labelMini}>Hourly rate (HKD) · private session</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
          <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 32, color: 'var(--espresso)', minWidth: 110 }}>{hkd(rate)}</span>
          <input type="range" min="400" max="800" step="10" value={rate} onChange={e => setRate(+e.target.value)} style={{ flex: 1, accentColor: 'var(--accent)' }} />
        </div>
        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)', margin: '10px 0 0' }}>Studio average is HK$520. Your rate is set per hour and shown to matched clients.</p>
      </Card>
      <Card pad={22} style={{ marginBottom: 16 }}>
        <div style={labelMini}>Specialisations</div>
        <div style={{ marginTop: 10 }}><SpecChips items={me.specs} accent /></div>
        <div style={{ ...labelMini, marginTop: 18 }}>Certifications</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 10 }}>{me.certs.map(c => <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13.5, color: 'var(--espresso)' }}><Icon n="check-circle-2" size={16} color="var(--accent)" /> {c}</div>)}</div>
      </Card>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button variant="accent" icon="check">Save changes</Button>
        <Button variant="ghost" onClick={onLogout}>Sign out</Button>
      </div>
    </div>
  );
}

export function TeacherPortal() {
  const [stage, setStage] = useState('login');
  const [tab, setTab] = useState('Today');
  const nav = [['layout-dashboard', 'Today'], ['calendar', 'Availability'], ['users', 'Your Bookings'], ['wallet', 'Earnings'], ['user', 'Your Profile']];
  const me = TEACHERS[0];

  if (stage === 'login') return <TeacherLogin onIn={() => setStage('app')} />;

  const screens = {
    Today: <TeacherToday me={me} setTab={setTab} />,
    Availability: <TeacherAvailability me={me} />,
    'Your Bookings': <TeacherSessions me={me} />,
    Earnings: <TeacherEarnings me={me} />,
    'Your Profile': <TeacherProfile me={me} onLogout={() => setStage('login')} />,
  };
  const avatarBtn = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <Avatar t={me} size={34} />
      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12.5, color: 'var(--espresso)' }} className="hide-mobile">{me.name}</span>
    </div>
  );

  return (
    <Workspace title="Instructor" nav={nav} tab={tab} setTab={setTab} headRight={avatarBtn}>
      <div key={tab}>{screens[tab]}</div>
    </Workspace>
  );
}
