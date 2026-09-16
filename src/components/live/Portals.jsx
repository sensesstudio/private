import { useState } from 'react';
import { Avatar, Button, PhoneFrame, Sheet, SpecChips } from '../shared/index.jsx';
import { ClientBrowse } from '../client/Browse.jsx';
import { ChatAssistant } from '../client/ChatAssistant.jsx';
import { LOCATIONS, teacherById, locName } from '../../data.js';
import { daysForTeacher, slotById } from '../../slots.js';
import { useLiveAvailability, liveStore, setTeacherAvailability } from '../../availability/live.js';
import { availabilityDays, hkLabel, hkDateKey, hkTime, HOUR_MS } from '../../availability/time.js';
import { syncCovers } from '../../availability/model.js';
import { supabase } from '../../supabase/client.js';
import { useAccount } from '../../supabase/useAccount.js';
import { inputStyle } from '../../styles.js';
import './live.css';
import { LiveAdminWorkspace } from '../admin/LiveWorkspace.jsx';
import { ClientPricing } from './Pricing.jsx';

function AvailabilityStatus() {
  const { loading, error, snapshot } = useLiveAvailability();
  const healthy = !error && syncCovers(snapshot, new Date(), new Date(Date.now() + HOUR_MS));
  return <div className="live-status" role="status">
    {loading ? 'Loading availability…' : !healthy ? <>
      Availability is temporarily unavailable.
      <Button variant="ghost" onClick={() => liveStore.refresh()}>Retry</Button>
    </> : 'Hong Kong time · Next 14 days'}
  </div>;
}

function SessionPreview({ slotId, onClose }) {
  useLiveAvailability();
  const slot = slotById(slotId);
  const teacher = slot && teacherById(slot.teacherId);
  const available = slot?.status === 'open' && teacher;
  const studio = LOCATIONS.find(l => l.id === slot?.studioId);
  const text = slot && teacher ? `Hello, I would like to enquire about a private session with ${teacher.name} on ${hkDateKey(slot.startsAt)} at ${hkTime(slot.startsAt)} HKT, ${studio?.name || ''}. Please confirm availability.` : '';
  return <Sheet open onClose={onClose}><section className="live-section">
    <h2>Session details</h2>
    {slot && teacher && <><h3>{teacher.name}</h3><p>{hkLabel(slot.startsAt)} · {hkTime(slot.startsAt)}–{hkTime(slot.endsAt)} HKT</p><p>{studio?.name}<br />{studio?.address}</p></>}
    <p role="status">{available ? 'Online confirmation is coming soon. This slot has not been held or booked; contact the studio to confirm.' : 'This session is no longer available. Please choose another time.'}</p>
    {available && <a className="live-link" href={`https://wa.me/85298818081?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">Enquire on WhatsApp</a>}
    <Button variant="ghost" onClick={onClose}>Back</Button>
  </section></Sheet>;
}

function Instructor({ id, onBack, onPick }) {
  useLiveAvailability();
  const t = teacherById(id);
  const days = daysForTeacher(id);
  const [selected, select] = useState(0);
  if (!t) return <section className="live-section"><p>Instructor unavailable.</p><Button onClick={onBack}>Back</Button></section>;
  return <section className="live-section">
    <Button variant="ghost" onClick={onBack}>Back</Button>
    <div className="live-person"><Avatar t={t} size={64} /><div><h1>{t.name}</h1><p>{t.headline}</p></div></div>
    <p>{t.locIds.map(locName).join(' · ')}</p>
    <SpecChips items={t.specs} accent />
    <p>{t.langs.join(' · ')}</p><p>{t.certs.join(' · ')}</p>
    <AvailabilityStatus />
    <div className="live-dates">{days.map((d, i) => <button key={d.iso} aria-pressed={i === selected} onClick={() => select(i)}>{hkLabel(d.date)}</button>)}</div>
    <div className="live-slot-list">{days[selected].slots.map(s => <button key={s.id} disabled={s.status !== 'open'} onClick={() => onPick(s)}>
      <strong>{s.time}–{hkTime(s.endsAt)}</strong><span>{locName(s.studioId)}</span><span>{s.status === 'open' ? 'View' : 'Unavailable'}</span>
    </button>)}</div>
    {!days[selected].slots.length && <p>No sessions opened for this date.</p>}
  </section>;
}

export function LiveClientPortal() {
  useLiveAvailability();
  const [tab, setTab] = useState(() => { const q = new URLSearchParams(window.location.search); return q.has('checkout') || q.has('pricing') ? 'pricing' : 'browse'; });
  const [instructor, setInstructor] = useState(null);
  const [slotId, setSlotId] = useState(null);
  const pick = s => { if (slotById(s.id)?.status === 'open') setSlotId(s.id); };
  return <PhoneFrame showWhatsApp={tab !== 'ask' || !!instructor} navBar={<nav className="live-nav" aria-label="Client navigation">
    <button aria-pressed={tab === 'browse'} onClick={() => { setTab('browse'); setInstructor(null); }}>Browse</button>
    <button aria-pressed={tab === 'ask'} onClick={() => { setTab('ask'); setInstructor(null); }}>Match for me</button>
    <button aria-pressed={tab === 'pricing'} onClick={() => { setTab('pricing'); setInstructor(null); }}>Pricing</button>
  </nav>} overlay={slotId && <SessionPreview slotId={slotId} onClose={() => setSlotId(null)} />}>
    {tab !== 'pricing' && <AvailabilityStatus />}
    {instructor ? <Instructor id={instructor} onBack={() => setInstructor(null)} onPick={pick} /> : tab === 'pricing' ? <ClientPricing onBrowse={() => setTab('browse')} /> : tab === 'ask' ?
      <ChatAssistant onPickSlot={(teacher, day, time, id) => { const s = slotById(id); if (s) pick(s); }} /> :
      <ClientBrowse embedded onOpen={t => setInstructor(t.id)} onPickSlot={pick} />}
  </PhoneFrame>;
}

function StaffGate({ role, children, workspace = false }) {
  const account = useAccount();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(null);
  async function login(e) {
    e.preventDefault(); if (!supabase || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
    } catch { setError('Sign-in failed. Check your email and password.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setError(null);
    try { const result = await supabase.auth.signOut(); if (result.error) throw result.error; }
    catch { setError('Sign-out failed. Please retry.'); }
  }
  if (account.loading) return <section className="live-section" role="status">Checking account…</section>;
  if (!account.user) return <section className="live-section live-login">
    <h1>{role === 'teacher' ? 'Instructor sign-in' : 'Admin sign-in'}</h1>
    <form onSubmit={login}>
      <label>Email<input aria-label="Email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} /></label>
      <label>Password<input aria-label="Password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} /></label>
      {(error || account.error) && <p role="alert">{error || account.error}</p>}
      <button className="live-link" type="submit" disabled={busy || !supabase}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form>
  </section>;
  if (account.profile?.role !== role) return <section className="live-section"><h1>Access unavailable</h1><p>{account.error || 'Please use an authorised staff account.'}</p>{error && <p role="alert">{error}</p>}<Button onClick={logout}>Sign out</Button></section>;
  if (workspace) return children(account.profile, { logout, error });
  return <div><div className="live-staff-head"><span>{account.profile.full_name}</span><Button variant="ghost" onClick={logout}>Sign out</Button></div>{error && <p role="alert">{error}</p>}{children(account.profile)}</div>;
}

const ERROR_TEXT = {
  authentication_required: 'Please sign in again.',
  teacher_access_required: 'Your instructor account is not active.',
  studio_not_assigned: 'This studio is not assigned to you.',
  teacher_time_conflict: 'You already have an overlapping session.',
  slot_reserved: 'This session is held or booked and cannot be closed.',
  slot_has_booking_history: 'Please contact an admin about this session.',
  outside_availability_window: 'Choose a future session within 14 days.',
};

function TeacherAvailability({ account }) {
  const { slots, loading, error: readError } = useLiveAvailability();
  const me = teacherById(account.id);
  const studios = LOCATIONS.filter(l => me?.locIds.includes(l.id));
  const [chosenStudio, chooseStudio] = useState('');
  const studio = studios.find(l => l.id === chosenStudio)?.id || studios[0]?.id || '';
  const [week, setWeek] = useState(0), [pending, setPending] = useState(null), [notice, setNotice] = useState(null);
  const days = availabilityDays().slice(week * 7, week * 7 + 7);
  async function toggle(startsAt, existing) {
    if (pending) return;
    setPending(startsAt); setNotice(null);
    try {
      await setTeacherAvailability({ studioId: studio, startsAt, open: !existing });
      setNotice(existing ? 'Session closed.' : 'Saved. Clients can see this session when the room is free.');
    } catch (e) { setNotice(ERROR_TEXT[e.message] || 'Could not save. Please retry.'); }
    finally { setPending(null); }
  }
  return <section className="live-section">
    <h1>Availability</h1><p>Each session is 60 minutes, in Hong Kong time.</p>
    <AvailabilityStatus />
    {!loading && !me && !readError && <p>Contact an admin to activate your instructor profile.</p>}
    {me && !studios.length && <p>No studio assigned yet.</p>}
    <div className="live-toolbar">
      <label>Studio<select aria-label="Studio" value={studio} onChange={e => chooseStudio(e.target.value)}>{studios.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      <Button variant="ghost" disabled={week === 0} onClick={() => setWeek(0)}>First week</Button>
      <Button variant="ghost" disabled={week === 1} onClick={() => setWeek(1)}>Second week</Button>
    </div>
    {notice && <p className="live-status" role="status">{notice}</p>}
    {studio && <div className="live-grid-scroll"><table className="live-grid"><caption>Tap a session to open or close</caption><thead><tr><th>HKT</th>{days.map(d => <th key={d.iso}>{hkLabel(d.date)}</th>)}</tr></thead><tbody>
      {Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`).map(time => <tr key={time}><th>{time}</th>{days.map(day => {
        const start = `${day.iso}T${time}:00+08:00`;
        const existing = slots.find(s => s.teacherId === account.id && +s.startsAt === +new Date(start) && s.studioId === studio);
        const other = slots.find(s => s.teacherId === account.id && s.studioId !== studio && +s.startsAt < +new Date(start) + HOUR_MS && +s.endsAt > +new Date(start));
        const reserved = existing?.status === 'held' || existing?.status === 'booked';
        const blocked = existing?.status === 'blocked';
        const past = +new Date(start) <= Date.now();
        const text = reserved ? 'Reserved' : other ? 'Other studio' : blocked ? 'Open · Unavailable' : existing ? 'Open' : 'Closed';
        return <td key={day.iso}><button aria-label={`${day.iso} ${time} ${locName(studio)} ${text}`} aria-pressed={!!existing} disabled={!!pending || loading || !!readError || past || reserved || !!other}
          data-state={reserved || other ? 'reserved' : blocked ? 'blocked' : existing ? 'open' : 'closed'} onClick={() => toggle(start, existing)}>{pending === start ? 'Saving…' : text}</button></td>;
      })}</tr>)}
    </tbody></table></div>}
    <p>“Open · Unavailable” means the room is occupied, the schedule is unconfirmed, or the session has passed. The opening remains saved, but clients cannot select it.</p>
  </section>;
}

export function LiveTeacherPortal() {
  return <div className="live-scroll"><StaffGate role="teacher">{account => <TeacherAvailability key={account.id} account={account} />}</StaffGate></div>;
}
export function LiveAdminPortal() {
  return <div className="live-admin-root"><StaffGate role="admin" workspace>{(account, session) =>
    <LiveAdminWorkspace account={account} session={session} />
  }</StaffGate></div>;
}
