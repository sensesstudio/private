import { useState } from 'react';
import { Icon, Eyebrow, Button, Avatar, Card, Pill, Segmented, Modal, useVP, useLiveProgress, useLiveReviews, downloadCSV } from '../shared/index.jsx';
import { hkd } from '../shared/index.jsx';
import { TEACHERS, BOOKINGS, CLIENTS, LOCATIONS, APPLICANTS, REVENUE, PROGRESS_LOG, GOALS } from '../../data.js';
import { locName, teacherById } from '../../data.js';
import { useClientStore, getClientProfile, pregnancyFromEDD } from '../../clientStore.js';
import { tdStyle } from '../../styles.js';
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
        <div style={{ flex: 'none', background: 'rgba(250,247,243,.95)', backdropFilter: 'blur(14px)', borderTop: '1px solid var(--border)', padding: '9px 12px calc(9px + env(safe-area-inset-bottom))', display: 'flex', justifyContent: 'space-around', overflowX: 'auto' }}>
          {nav.map(([ic, label]) => {
            const on = tab === label;
            return (
              <button key={label} className="tap" onClick={() => setTab(label)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 6px', minWidth: 44, minHeight: 46, color: on ? 'var(--accent)' : 'var(--fg3)', flex: 'none' }}>
                <Icon n={ic} size={20} sw={on ? 2.2 : 1.7} />
                <span style={{ fontFamily: 'var(--font-sans)', fontWeight: on ? 600 : 400, fontSize: 8.5, letterSpacing: '.02em', whiteSpace: 'nowrap' }}>{label}</span>
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

function BarChart({ data, fmt = v => v, height = 150 }) {
  const max = Math.max(...data.map(d => d.v));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height }}>
      {data.map((d, i) => {
        const h = (d.v / max) * (height - 28);
        const on = i === data.length - 1;
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

function StatusTag({ status }) {
  const map = {
    confirmed: ['var(--accent)', 'var(--accent-tint)', 'Confirmed'],
    completed: ['var(--taupe)', 'var(--sand)', 'Completed'],
    cancelled: ['var(--terracotta)', 'rgba(185,117,91,.14)', 'Cancelled'],
    refunded: ['var(--terracotta)', 'rgba(185,117,91,.14)', 'Refunded'],
    pending: ['#9a7b3c', 'rgba(201,178,124,.2)', 'Pending'],
  };
  const [c, bg, label] = map[status] || map.pending;
  return <Pill color={c} bg={bg}>{label}</Pill>;
}

function Toast({ msg }) {
  return <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 300, background: 'var(--espresso)', color: 'var(--cream)', padding: '13px 22px', borderRadius: 999, fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 13.5, boxShadow: 'var(--shadow-lg)', display: 'flex', alignItems: 'center', gap: 9, animation: 'rise .35s var(--ease)' }}><Icon n="check-circle-2" size={17} color="var(--blush)" /> {msg}</div>;
}

function AdminDashboard({ setTab }) {
  const { mobile } = useVP();
  const totalRev = REVENUE.reduce((a, b) => a + b.v, 0);
  const recent = BOOKINGS.slice(0, 6);
  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 1180, margin: '0 auto' }}>
      <PageHead eyebrow="Studio overview · June 2026" title="Dashboard" sub="Across all five Hong Kong studios."
        right={<Segmented options={['Today', 'Current Week', 'Current Month']} value="Current Month" onChange={() => {}} />}
      />
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 22 }}>
        <Stat icon="calendar-check" label="Bookings this month" value="486" sub="+9%" />
        <Stat icon="banknote" label="Revenue (June)" value={hkd(768000)} sub="+6%" />
        <Stat icon="users" label="Active teachers" value="24" sub="+3" tone="sand" />
        <Stat icon="user" label="Active clients" value="312" sub="+18" tone="sand" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1.5fr 1fr', gap: 18, marginBottom: 18 }}>
        <Card pad={mobile ? 18 : 26}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--espresso)', margin: 0 }}>Revenue trend</h3>
              <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', margin: '4px 0 0' }}>HK$ thousands · last 6 months</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 24, color: 'var(--espresso)', whiteSpace: 'nowrap' }}>HK${(totalRev / 1000).toFixed(2)}M</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, color: 'var(--accent)' }}>total H1</div>
            </div>
          </div>
          <BarChart data={REVENUE} fmt={v => v} height={mobile ? 150 : 200} />
        </Card>
        <Card pad={mobile ? 18 : 26}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 20, color: 'var(--espresso)', margin: '0 0 16px' }}>By studio</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[['Central', 92], ['Causeway Bay', 78], ['Quarry Bay', 64], ['Kwun Tong', 51], ['Lai Chi Kok', 38]].map(([name, pct]) => (
              <div key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 13, color: 'var(--espresso)' }}>{name}</span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12.5, color: 'var(--taupe)' }}>{pct}%</span>
                </div>
                <div style={{ height: 7, background: 'var(--sand)', borderRadius: 999, overflow: 'hidden' }}><div style={{ width: pct + '%', height: '100%', background: 'var(--accent)', borderRadius: 999 }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card pad={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--border-soft)' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 18, color: 'var(--espresso)', margin: 0 }}>Recent bookings</h3>
          <button className="tap" onClick={() => setTab('Bookings')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)' }}>View all</button>
        </div>
        {recent.map((b, i, a) => { const c = CLIENTS.find(x => x.id === b.cId); const t = teacherById(b.tId); return (
          <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 22px', borderBottom: i < a.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
            <Avatar t={c} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13.5, color: 'var(--espresso)' }}>{c.name}</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)' }} className="hide-mobile"> · with {t.name}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12, color: 'var(--fg3)' }} className="hide-mobile">{new Date(b.date + 'T00:00:00').toLocaleDateString('en-HK', { day: 'numeric', month: 'short' })}</span>
            <StatusTag status={b.status} />
            <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: 'var(--espresso)', minWidth: 70, textAlign: 'right' }}>{hkd(b.amount)}</span>
          </div>
        ); })}
      </Card>
    </div>
  );
}

function clientAbout(c, ov) {
  const ages = { c1: '25–34', c2: '35–44', c3: '45–54', c4: '25–34', c5: '25–34', c6: '35–44', c7: 'Under 25', c8: '45–54', c9: '35–44', c10: '25–34' };
  const levels = { c1: 'Some experience', c3: 'Experienced', c9: 'Experienced' };
  const notes = {
    c1: "I'd love to feel stronger and finally move past my lower-back niggle. Hoping to build a calm, consistent routine.",
    c2: 'Want to build real strength and feel more capable in everyday life.',
    c5: 'Staying safe and mobile through pregnancy — gentle is good.',
  };
  const lvl = { new: 'New to pilates', some: 'Some experience', exp: 'Experienced' };
  const langMap = { en: 'English', yue: 'Cantonese', zh: 'Mandarin', none: 'No preference' };
  const pregFallback = c.id === 'c5' ? '2nd trimester (13–26 wks)' : 'No';
  const surgFallback = c.id === 'c8' ? 'Yes — knee, 8 months ago' : 'No';
  const needsDoctor = ov && (ov.pregnant === 'yes' || ov.surgery === 'yes');
  return {
    age: (ov && ov.age) || ages[c.id] || '25–34',
    level: ov && ov.level ? (lvl[ov.level] || ov.level) : (levels[c.id] || 'Some experience'),
    goal: ov && ov.goals && ov.goals.length ? ov.goals.map(id => (GOALS.find(g => g.id === id) || {}).label).filter(Boolean).join(', ') : c.goal,
    pregnant: ov && ov.pregnant ? (ov.pregnant === 'yes' ? (() => { const p = pregnancyFromEDD(ov.edd); return p ? `Due ${p.dueLabel} · ≈${p.weeks} wks (${p.trimester})` : 'Yes'; })() : 'No') : pregFallback,
    surgery: ov && ov.surgery ? (ov.surgery === 'yes' ? 'Yes — within last 12 months' : 'No') : surgFallback,
    doctor: needsDoctor ? (ov.doctorClearance === 'yes' ? 'Yes — cleared by doctor' : ov.doctorClearance === 'no' ? 'No — not cleared' : 'Awaiting confirmation') : null,
    languages: ov && ov.languages && ov.languages.length ? ov.languages.map(id => langMap[id] || id).join(', ') : null,
    credits: ov && typeof ov.credits === 'number' ? `${ov.credits} credit${ov.credits === 1 ? '' : 's'} remaining` : null,
    billing: ov && ov.payments && ov.payments.length
      ? `${ov.payments.length} payment${ov.payments.length === 1 ? '' : 's'} · ${hkd(ov.payments.reduce((t, p) => t + (p.amount || 0), 0))}`
      : null,
    waiver: ov && ov.waiver && ov.waiver.agreed
      ? `Signed by ${ov.waiver.name}${ov.waiver.date ? ' · ' + new Date(ov.waiver.date).toLocaleDateString('en-HK', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`
      : 'Not signed',
    contact: ov && (ov.phone || ov.email) ? [ov.phone, ov.email].filter(Boolean).join(' · ') : null,
    channels: ov && ov.channels ? (['whatsapp', 'email'].filter(k => ov.channels[k]).map(k => k === 'whatsapp' ? 'WhatsApp' : 'Email').join(' & ') || 'None selected') : null,
    note: (ov && ov.notes) || notes[c.id] || '—',
    updated: !!ov,
  };
}

function AdminClients() {
  const { mobile } = useVP();
  const live = useLiveProgress();
  const [sel, setSel] = useState(null);
  const [view, setView] = useState('About');
  const [q, setQ] = useState('');
  const open = c => { setView('About'); setSel(c); };
  const rows = CLIENTS.filter(c => q === '' || c.name.toLowerCase().includes(q.toLowerCase()));

  const progressFor = c => {
    if (!c) return [];
    if (c.id === 'c1') return [...live.filter(e => e.cId === 'c1'), ...PROGRESS_LOG];
    const liveOwn = live.filter(e => e.cId === c.id);
    const fromBookings = BOOKINGS.filter(b => b.cId === c.id && b.status === 'completed').map(b => ({
      id: b.id, date: b.date, tId: b.tId, focus: c.goal, note: 'Session completed. Detailed notes will appear here once logged by the instructor.',
    }));
    return [...liveOwn, ...fromBookings];
  };

  useClientStore();
  const about = sel ? clientAbout(sel, getClientProfile(sel.id)) : null;
  const prog = progressFor(sel);
  const cReviews = useLiveReviews().filter(r => sel && r.cId === sel.id); // reflections this client shared

  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 1040, margin: '0 auto' }}>
      <PageHead eyebrow="Studio members" title="Clients" sub={`${CLIENTS.length} active clients`} right={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'var(--ivory)', border: '1px solid var(--border)', borderRadius: 999, padding: '9px 15px', minWidth: 180 }}>
            <Icon n="search" size={16} color="var(--taupe)" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search clients…" style={{ flex: 1, minWidth: 0, border: 'none', background: 'none', outline: 'none', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 14, color: 'var(--ink)' }} />
          </div>
          <Button variant="soft" size="sm" icon="sheet" onClick={() => downloadCSV('senses-clients.csv',
            ['Name', 'Goal', 'Joined', 'Sessions', 'Status', 'Lifetime spend (HKD)'],
            CLIENTS.map(c => [c.name, c.goal, c.joined, c.sessions, c.status, c.spend]))}>Export to Excel</Button>
        </div>
      } />
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }} className="screen-scroll">
          <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Client', 'Goal', 'Joined', 'Sessions', 'Status', ''].map((h, hi) => <th key={hi} style={{ textAlign: h === 'Sessions' ? 'right' : 'left', padding: '14px 18px', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.id} className="tap" onClick={() => open(c)} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-soft)' : 'none', cursor: 'pointer' }}>
                  <td style={tdStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar t={c} size={34} /><span style={{ fontWeight: 500, color: 'var(--espresso)' }}>{c.name}</span></div></td>
                  <td style={tdStyle}>{c.goal}</td>
                  <td style={tdStyle}>{c.joined}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{c.sessions}</td>
                  <td style={tdStyle}>{c.status === 'active' ? <Pill color="var(--sage)" bg="rgba(138,144,121,.16)">Active</Pill> : c.status === 'new' ? <Pill color="var(--accent)" bg="var(--accent-tint)">New</Pill> : <Pill color="#9a7b3c" bg="rgba(201,178,124,.22)">Lapsed</Pill>}</td>
                  <td style={tdStyle}><Icon n="chevron-right" size={16} color="var(--clay)" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={!!sel} onClose={() => setSel(null)} w={520}>
        {sel && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '22px 24px 16px' }}>
              <Avatar t={sel} size={56} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: 'var(--espresso)', margin: 0 }}>{sel.name}</h2>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', marginTop: 2 }}>Member since {sel.joined} · {sel.sessions} sessions</div>
              </div>
              <button className="tap" onClick={() => setSel(null)} style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--sand)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none' }}><Icon n="x" size={17} color="var(--taupe)" /></button>
            </div>
            <div style={{ padding: '0 24px' }}><Segmented options={['About', 'Progress']} value={view} onChange={setView} style={{ width: '100%', display: 'flex' }} /></div>
            <div className="screen-scroll" style={{ maxHeight: '52vh', overflowY: 'auto', padding: '18px 24px 26px' }}>
              {view === 'About' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {about.updated && <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-tint)', padding: '5px 10px', borderRadius: 999 }}><Icon n="badge-check" size={12} color="var(--accent)" /> Updated by client</div>}
                  {[['target', 'Primary goal', about.goal], ['user', 'Age range', about.age], ['gauge', 'Experience', about.level], ['flower-2', 'Pregnant', about.pregnant], ['stethoscope', 'Recent surgery', about.surgery], ...(about.doctor ? [['heart-pulse', 'Doctor cleared to exercise', about.doctor]] : []), ...(about.languages ? [['languages', 'Preferred language', about.languages]] : []), ...(about.contact ? [['phone', 'Contact', about.contact]] : []), ...(about.channels ? [['bell', 'Notify by', about.channels]] : []), ...(about.credits ? [['ticket', 'Credits', about.credits]] : []), ...(about.billing ? [['banknote', 'Payments', about.billing]] : []), ['shield-check', 'Liability waiver', about.waiver]].map(([ic, k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--sand)', display: 'grid', placeItems: 'center', flex: 'none' }}><Icon n={ic} size={16} color="var(--taupe)" /></span>
                      <div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg3)' }}>{k}</div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 14, color: 'var(--espresso)', marginTop: 2 }}>{v}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ background: 'var(--cream)', borderRadius: 14, padding: '14px 16px', marginTop: 2 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 5 }}>In their own words</div>
                    <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.55, color: 'var(--espresso)', margin: 0, fontStyle: about.note === '—' ? 'normal' : 'italic' }}>{about.note === '—' ? 'No note provided.' : '"' + about.note + '"'}</p>
                  </div>
                  {cReviews.length > 0 && (
                    <div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 8 }}>Session reflections</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {cReviews.map(r => { const rt = teacherById(r.tId); return (
                          <div key={r.id} style={{ background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 12, padding: '11px 13px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 12, color: 'var(--espresso)' }}>{rt ? rt.name : 'Instructor'}</span>
                              <span style={{ display: 'inline-flex', gap: 1 }}>{[1, 2, 3, 4, 5].map(i => <Icon key={i} n="star" size={12} color={i <= r.stars ? 'var(--accent)' : 'var(--linen)'} sw={0} style={{ fill: i <= r.stars ? 'var(--accent)' : 'var(--linen)' }} />)}</span>
                            </div>
                            {r.text && <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, lineHeight: 1.5, color: 'var(--taupe)', margin: '6px 0 0' }}>"{r.text}"</p>}
                          </div>
                        ); })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                prog.length === 0 ? <EmptyState icon="clipboard-list" title="No progress yet" body="Notes appear here once an instructor logs a session." /> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {prog.map((p, idx) => { const t = teacherById(p.tId); const num = prog.length - idx; return (
                      <div key={p.id} style={{ background: 'var(--ivory)', borderRadius: 14, border: '1px solid var(--border-soft)', padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', whiteSpace: 'nowrap' }}>Session {num}</span>
                          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11, color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{new Date(p.date + 'T00:00:00').toLocaleDateString('en-HK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--espresso)', marginBottom: 6 }}>{p.focus}</div>
                        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, lineHeight: 1.5, color: 'var(--taupe)', margin: 0 }}>{p.note}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 9 }}><Avatar t={t} size={22} radius={7} /><span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: 11.5, color: 'var(--fg3)' }}>{t.name}</span></div>
                      </div>
                    ); })}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AdminTeachers() {
  const { mobile } = useVP();
  const rows = TEACHERS.map(t => ({ t, done: BOOKINGS.filter(b => b.tId === t.id && b.status === 'completed').length }));
  const exportXls = () => downloadCSV('senses-teachers.csv',
    ['Name', 'Focus', 'Studio', 'Rate (HKD/hr)', 'Rating', 'Reviews', 'Experience (yrs)', 'Completed sessions'],
    rows.map(({ t, done }) => [t.name, t.headline, locName(t.locId), t.rate, t.rating, t.reviews, t.exp, done]));
  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 1040, margin: '0 auto' }}>
      <PageHead eyebrow="Studio team" title="Teachers" sub={`${TEACHERS.length} active instructors`} right={<Button variant="soft" size="sm" icon="sheet" onClick={exportXls}>Export to Excel</Button>} />
      {mobile && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginBottom: 8 }}><Icon n="move-horizontal" size={14} /> Swipe the table to see more</div>}
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }} className="screen-scroll">
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Instructor', 'Focus', 'Studio', 'Rate', 'Rating', 'Sessions', 'Status'].map((h, hi) => <th key={hi} style={{ textAlign: ['Rate', 'Rating', 'Sessions'].includes(h) ? 'right' : 'left', padding: '14px 18px', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map(({ t, done }, i) => (
                <tr key={t.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <td style={tdStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar t={t} size={34} /><span style={{ fontWeight: 500, color: 'var(--espresso)' }}>{t.name}</span></div></td>
                  <td style={tdStyle}>{t.headline}</td>
                  <td style={tdStyle}>{locName(t.locId)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{hkd(t.rate)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{t.rating} ({t.reviews})</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{done}</td>
                  <td style={tdStyle}><Pill color="var(--sage)" bg="rgba(138,144,121,.16)">Active</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AdminApprovals() {
  const { mobile } = useVP();
  const [queue, setQueue] = useState(APPLICANTS);
  const [toast, setToast] = useState(null);
  const act = (id, kind) => {
    const a = queue.find(x => x.id === id);
    setQueue(q => q.filter(x => x.id !== id));
    setToast(`${a.name} ${kind === 'approve' ? 'approved — welcome to Senses' : 'declined'}`);
    setTimeout(() => setToast(null), 2600);
  };
  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 900, margin: '0 auto' }}>
      <PageHead eyebrow="Onboarding" title="Teacher approvals" sub={`${queue.length} applications awaiting review`} />
      {queue.length === 0 ? <EmptyState icon="check-circle-2" title="All caught up" body="Every application has been reviewed. New applicants will appear here as they apply." /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {queue.map(a => (
            <Card key={a.id} pad={mobile ? 16 : 22}>
              <div style={{ display: 'flex', gap: 15, alignItems: 'flex-start' }}>
                <Avatar t={a} size={58} radius={16} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 19, color: 'var(--espresso)', margin: 0 }}>{a.name}</h3>
                    <Pill color="#9a7b3c" bg="rgba(201,178,124,.2)">Applied {a.applied}</Pill>
                  </div>
                  <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13.5, color: 'var(--taupe)', margin: '5px 0 10px' }}>{a.headline} · {a.exp} yrs · {locName(a.locId)}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{a.certs.map(s => <span key={s} style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11, color: 'var(--taupe)', background: 'var(--sand)', padding: '6px 12px', borderRadius: 999 }}>{s}</span>)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <Button variant="ghost" size="sm" onClick={() => act(a.id, 'decline')}>Decline</Button>
                <Button variant="soft" size="sm" icon="file-text">Review docs</Button>
                <Button variant="accent" size="sm" icon="check" onClick={() => act(a.id, 'approve')}>Approve</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {toast && <Toast msg={toast} />}
    </div>
  );
}

function AdminProspects() {
  const { mobile } = useVP();
  const [toast, setToast] = useState(null);
  const [done, setDone] = useState({});
  const prospects = [
    { id: 'p1', name: 'Grace Lau', initials: 'GL', ph: 'sage', type: 'No booking', detail: 'Signed up 2 days ago · completed intake', when: '2d' },
    { id: 'p2', name: 'Leon Fischer', initials: 'LF', ph: 'almond', type: 'Has credits · not booked', detail: '5-class pack bought · 0 sessions taken', when: '5d' },
    { id: 'p3', name: 'Olivia Tsang', initials: 'OT', ph: 'taupe', type: 'Abandoned checkout', detail: '10-class pack · HK$9,000 · payment not completed', when: '1d' },
    { id: 'p4', name: 'Marcus Ho', initials: 'MH', ph: 'blush', type: 'Abandoned checkout', detail: 'First session · HK$900 · payment failed', when: '3d' },
    { id: 'p5', name: 'Hana Sato', initials: 'HS', ph: '', type: 'No booking', detail: 'Signed up Jun 2024 · intake incomplete', when: '1w' },
  ];
  const typeColor = ty => ty === 'Abandoned checkout' ? ['var(--terracotta)', 'rgba(185,117,91,.14)'] : ty.startsWith('Has credits') ? ['#9a7b3c', 'rgba(201,178,124,.22)'] : ['var(--taupe)', 'var(--sand)'];
  const nudge = p => { setDone(d => ({ ...d, [p.id]: true })); setToast(`Reminder sent to ${p.name}`); setTimeout(() => setToast(null), 2600); };

  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 1000, margin: '0 auto' }}>
      <PageHead eyebrow="Conversion" title="Prospects" sub="Accounts that haven't booked yet, and abandoned checkouts." />
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        <Stat icon="user-search" label="Open prospects" value={String(prospects.length)} />
        <Stat icon="shopping-cart" label="Abandoned checkouts" value="2" tone="sand" />
        <Stat icon="trending-up" label="Prospect → client (Jun)" value="38%" sub="+5%" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {prospects.map(p => { const [c, bg] = typeColor(p.type); return (
          <Card key={p.id} pad={mobile ? 14 : 18} style={{ display: 'flex', gap: 14, alignItems: mobile ? 'flex-start' : 'center', flexDirection: mobile ? 'column' : 'row' }}>
            <div style={{ display: 'flex', gap: 13, alignItems: 'center', flex: 1, minWidth: 0, width: '100%' }}>
              <Avatar t={p} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14.5, color: 'var(--espresso)' }}>{p.name}</span>
                  <Pill color={c} bg={bg}>{p.type}</Pill>
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', marginTop: 3 }}>{p.detail}</div>
              </div>
            </div>
            <div style={{ flex: 'none', width: mobile ? '100%' : 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              {done[p.id]
                ? <Pill color="var(--accent)" bg="var(--accent-tint)"><Icon n="check" size={12} color="var(--accent)" sw={3} /> Reminder sent</Pill>
                : <Button variant="soft" size="sm" icon="send" onClick={() => nudge(p)}>Send reminder</Button>}
            </div>
          </Card>
        ); })}
      </div>
      {toast && <Toast msg={toast} />}
    </div>
  );
}

function AdminBookings() {
  const { mobile } = useVP();
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Confirmed', 'Completed', 'Cancelled'];
  const [over, setOver] = useState({});
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState(null);
  const rows = BOOKINGS.filter(b => filter === 'All' || b.status === filter.toLowerCase());
  const reassign = (b, newId) => {
    setOver(o => ({ ...o, [b.id]: newId }));
    setActive(null);
    const c = CLIENTS.find(x => x.id === b.cId);
    setToast(`Reassigned to ${teacherById(newId).name} · ${c.name} notified`);
    setTimeout(() => setToast(null), 2800);
  };

  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 1180, margin: '0 auto' }}>
      <PageHead eyebrow="All studios" title="Bookings" sub={`${rows.length} sessions`} right={
        <Button variant="soft" size="sm" icon="sheet" onClick={() => downloadCSV('senses-bookings.csv',
          ['Client', 'Instructor', 'Studio', 'Date', 'Time', 'Type', 'Status', 'Amount (HKD)'],
          rows.map(b => { const c = CLIENTS.find(x => x.id === b.cId); const t = teacherById(over[b.id] || b.tId); return [c.name, t.name, locName(b.locId), b.date, b.time, b.type, b.status, b.amount]; }))}>Export to Excel</Button>
      } />
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {filters.map(f => { const on = filter === f; return <button key={f} className="tap" onClick={() => setFilter(f)} style={{ cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, padding: '9px 15px', minHeight: 40, borderRadius: 999, border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border)'), background: on ? 'var(--accent)' : 'transparent', color: on ? '#fff' : 'var(--taupe)' }}>{f}</button>; })}
      </div>
      {mobile && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginBottom: 8 }}><Icon n="move-horizontal" size={14} /> Swipe the table sideways to see more</div>}
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }} className="screen-scroll">
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Client', 'Instructor', 'Studio', 'Date', 'Time', 'Type', 'Status', 'Amount', ''].map((h, hi) => (
                  <th key={hi} style={{ textAlign: h === 'Amount' ? 'right' : 'left', padding: '14px 18px', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b, i) => { const c = CLIENTS.find(x => x.id === b.cId); const t = teacherById(over[b.id] || b.tId); const moved = !!over[b.id]; return (
                <tr key={b.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <td style={tdStyle}><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Avatar t={c} size={32} /><span style={{ fontWeight: 500, color: 'var(--espresso)' }}>{c.name}</span></div></td>
                  <td style={tdStyle}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{t.name}{moved && <Pill color="var(--accent)" bg="var(--accent-tint)" style={{ fontSize: 8 }}>moved</Pill>}</span></td>
                  <td style={tdStyle}>{locName(b.locId)}</td>
                  <td style={tdStyle}>{new Date(b.date + 'T00:00:00').toLocaleDateString('en-HK', { day: 'numeric', month: 'short' })}</td>
                  <td style={tdStyle}>{b.time}</td>
                  <td style={tdStyle}>{b.type}</td>
                  <td style={tdStyle}><StatusTag status={b.status} /></td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', fontWeight: 600, color: 'var(--espresso)' }}>{hkd(b.amount)}</td>
                  <td style={tdStyle}>{b.status === 'confirmed' ? <button className="tap" onClick={() => setActive(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11, color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon n="repeat" size={13} color="var(--accent)" /> Reassign</button> : <span style={{ color: 'var(--clay)' }}>—</span>}</td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </Card>
      <Modal open={!!active} onClose={() => setActive(null)} w={440}>
        {active && (() => { const c = CLIENTS.find(x => x.id === active.cId); const cur = over[active.id] || active.tId; return (
          <div style={{ padding: 26 }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 22, color: 'var(--espresso)', margin: '0 0 4px' }}>Reassign instructor</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--fg3)', margin: '0 0 16px' }}>{c.name} · {new Date(active.date + 'T00:00:00').toLocaleDateString('en-HK', { day: 'numeric', month: 'short' })} · {active.time} · {locName(active.locId)}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }} className="screen-scroll">
              {TEACHERS.map(tt => { const on = tt.id === cur; return (
                <button key={tt.id} className="tap" onClick={() => reassign(active, tt.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 13px', borderRadius: 14, cursor: 'pointer', textAlign: 'left', background: on ? 'var(--accent-tint)' : 'var(--ivory)', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-soft)') }}>
                  <Avatar t={tt} size={38} radius={11} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--espresso)' }}>{tt.name}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)' }}>{tt.specs[0]} · {locName(tt.locId)}</div>
                  </div>
                  {on ? <Pill color="var(--accent)" bg="transparent">Current</Pill> : <Icon n="arrow-right" size={16} color="var(--clay)" />}
                </button>
              ); })}
            </div>
          </div>
        ); })()}
      </Modal>
      {toast && <Toast msg={toast} />}
    </div>
  );
}

function AdminPayouts() {
  const { mobile } = useVP();
  const stripeFee = gross => Math.round(gross * 0.034 + 2.35 * Math.max(1, Math.round(gross / 900)));
  const _p = (id, arrival, gross, refunds, status) => { const fees = stripeFee(gross); return { id, arrival, gross, fees, refunds, net: gross - fees - refunds, status }; };
  const payouts = [
    _p('po_1Qk7Za', '2026-06-16', 184500, 900, 'in_transit'),
    _p('po_1Qj4Xb', '2026-06-09', 213000, 0, 'paid'),
    _p('po_1Qh1Wc', '2026-06-02', 176400, 4750, 'paid'),
    _p('po_1Qf8Vd', '2026-05-26', 198900, 0, 'paid'),
    _p('po_1Qd5Ue', '2026-05-19', 207300, 900, 'paid'),
  ];
  const inTransit = payouts.filter(p => p.status === 'in_transit').reduce((a, p) => a + p.net, 0);
  const paidTotal = payouts.filter(p => p.status === 'paid').reduce((a, p) => a + p.net, 0);
  const totalFees = payouts.reduce((a, p) => a + p.fees, 0);
  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 1040, margin: '0 auto' }}>
      <PageHead eyebrow="Stripe · HKD" title="Payouts" sub="Deposits to your studio bank account, net of Stripe fees and refunds."
        right={<Button variant="soft" size="sm" icon="external-link">Open in Stripe</Button>}
      />
      <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 22 }}>
        <Stat icon="banknote" label="Next payout · in transit" value={hkd(inTransit)} sub="16 Jun" />
        <Stat icon="check-circle-2" label="Paid (last 30 days)" value={hkd(paidTotal)} tone="sand" />
        <Stat icon="percent" label="Stripe fees (period)" value={hkd(totalFees)} tone="sand" />
      </div>
      {mobile && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', marginBottom: 8 }}><Icon n="move-horizontal" size={14} /> Swipe the table to see fees & net</div>}
      <Card pad={0} style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }} className="screen-scroll">
          <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Payout ID', 'Arrival', 'Gross charges', 'Stripe fees', 'Refunds', 'Net deposit', 'Status'].map(h => <th key={h} style={{ textAlign: ['Gross charges', 'Stripe fees', 'Refunds', 'Net deposit'].includes(h) ? 'right' : 'left', padding: '14px 18px', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--fg3)', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
            <tbody>
              {payouts.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: i < payouts.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                  <td style={{ ...tdStyle, fontFamily: 'var(--font-mono, monospace)', color: 'var(--espresso)' }}>{p.id}</td>
                  <td style={tdStyle}>{new Date(p.arrival + 'T00:00:00').toLocaleDateString('en-HK', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{hkd(p.gross)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--terracotta)' }}>−{hkd(p.fees)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: p.refunds ? 'var(--terracotta)' : 'var(--clay)' }}>{p.refunds ? '−' + hkd(p.refunds) : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14, color: 'var(--espresso)' }}>{hkd(p.net)}</td>
                  <td style={tdStyle}>{p.status === 'paid' ? <Pill color="var(--sage)" bg="rgba(138,144,121,.16)">Paid</Pill> : <Pill color="#9a7b3c" bg="rgba(201,178,124,.22)">In transit</Pill>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--fg3)', margin: '14px 2px 0', lineHeight: 1.6 }}>Net deposit = gross card charges − Stripe processing fees (≈3.4% + HK$2.35/transaction) − refunds. Payouts settle to your linked account on a rolling 7-day schedule.</p>
    </div>
  );
}

function AdminRefunds() {
  const { mobile } = useVP();
  const [reqs, setReqs] = useState([
    { id: 'r1', cId: 'c6', tId: 't4', amount: 480, reason: 'Cancelled within policy (>24h)', date: '13 Jun', status: 'pending' },
    { id: 'r2', cId: 'c9', tId: 't4', amount: 480, reason: 'Instructor unavailable — studio fault', date: '11 Jun', status: 'pending' },
    { id: 'r3', cId: 'c2', tId: 't2', amount: 520, reason: 'Duplicate charge', date: '9 Jun', status: 'approved' },
  ]);
  const [active, setActive] = useState(null);
  const decide = (id, kind) => { setReqs(r => r.map(x => x.id === id ? { ...x, status: kind } : x)); setActive(null); };

  return (
    <div style={{ padding: mobile ? '20px 18px 28px' : '34px 40px 40px', maxWidth: 900, margin: '0 auto' }}>
      <PageHead eyebrow="Client care" title="Refunds" sub={`${reqs.filter(r => r.status === 'pending').length} requests pending`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {reqs.map(r => { const c = CLIENTS.find(x => x.id === r.cId); const t = teacherById(r.tId); return (
          <Card key={r.id} pad={mobile ? 16 : 20} style={{ display: 'flex', gap: 14, alignItems: mobile ? 'flex-start' : 'center', flexDirection: mobile ? 'column' : 'row' }}>
            <div style={{ display: 'flex', gap: 13, alignItems: 'center', flex: 1, minWidth: 0, width: '100%' }}>
              <Avatar t={c} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14.5, color: 'var(--espresso)' }}>{c.name}</span>
                  <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 15, color: 'var(--terracotta)' }}>{hkd(r.amount)}</span>
                </div>
                <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 12.5, color: 'var(--fg3)', marginTop: 3 }}>{r.reason} · {r.date} · {t.name}</div>
              </div>
            </div>
            {r.status === 'pending' ? (
              <div style={{ display: 'flex', gap: 9, flex: 'none', width: mobile ? '100%' : 'auto', justifyContent: 'flex-end' }}>
                <Button variant="ghost" size="sm" onClick={() => decide(r.id, 'declined')}>Decline</Button>
                <Button variant="accent" size="sm" icon="rotate-ccw" onClick={() => setActive(r)}>Refund</Button>
              </div>
            ) : <StatusTag status={r.status === 'approved' ? 'refunded' : 'cancelled'} />}
          </Card>
        ); })}
      </div>
      <Modal open={!!active} onClose={() => setActive(null)} w={440}>
        {active && (() => { const c = CLIENTS.find(x => x.id === active.cId); return (
          <div style={{ padding: 28 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(185,117,91,.14)', display: 'grid', placeItems: 'center', margin: '0 auto 16px' }}><Icon n="rotate-ccw" size={26} color="var(--terracotta)" /></div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 23, color: 'var(--espresso)', textAlign: 'center', margin: '0 0 8px' }}>Refund {hkd(active.amount)}?</h2>
            <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13.5, color: 'var(--taupe)', textAlign: 'center', lineHeight: 1.55, margin: '0 0 22px' }}>This returns {hkd(active.amount)} to {c.name} via the original Stripe payment. The instructor's payout will be adjusted.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="ghost" full onClick={() => setActive(null)}>Cancel</Button>
              <Button variant="accent" full icon="check" onClick={() => decide(active.id, 'approved')}>Confirm refund</Button>
            </div>
          </div>
        ); })()}
      </Modal>
    </div>
  );
}

export function AdminPortal() {
  const [tab, setTab] = useState('Dashboard');
  const nav = [['layout-dashboard', 'Dashboard'], ['users-round', 'Clients'], ['flower-2', 'Teachers'], ['user-check', 'Approvals'], ['user-search', 'Prospects'], ['calendar', 'Bookings'], ['banknote', 'Payouts'], ['rotate-ccw', 'Refunds']];

  const screens = {
    Dashboard: <AdminDashboard setTab={setTab} />,
    Clients: <AdminClients />,
    Teachers: <AdminTeachers />,
    Approvals: <AdminApprovals />,
    Prospects: <AdminProspects />,
    Bookings: <AdminBookings />,
    Payouts: <AdminPayouts />,
    Refunds: <AdminRefunds />,
  };
  const badge = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{ width: 34, height: 34, borderRadius: 999, background: 'var(--espresso)', display: 'grid', placeItems: 'center', color: 'var(--cream)', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14 }}>S</div>
      <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12.5, color: 'var(--espresso)' }} className="hide-mobile">Studio Ops</span>
    </div>
  );

  return (
    <Workspace title="Admin" nav={nav} tab={tab} setTab={setTab} headRight={badge}>
      <div key={tab}>{screens[tab]}</div>
    </Workspace>
  );
}
