import { useEffect, useState } from 'react';
import { Avatar, Button, Card, PhoneFrame, Sheet, SpecChips } from '../shared/index.jsx';
import { ClientBrowse } from '../client/Browse.jsx';
import { ChatAssistant } from '../client/ChatAssistant.jsx';
import { TEACHERS, LOCATIONS, teacherById, locName } from '../../data.js';
import { daysForTeacher, slotById } from '../../slots.js';
import { useLiveAvailability, liveStore, setTeacherAvailability } from '../../availability/live.js';
import { availabilityDays, hkLabel, hkDateKey, hkTime, HOUR_MS } from '../../availability/time.js';
import { syncCovers } from '../../availability/model.js';
import { supabase } from '../../supabase/client.js';
import { inputStyle } from '../../styles.js';
import './live.css';
import { RoomSchedule } from './RoomSchedule.jsx';

function AvailabilityStatus() {
  const { loading, error, snapshot } = useLiveAvailability();
  const healthy = !error && syncCovers(snapshot, new Date(), new Date(Date.now() + HOUR_MS));
  return <div className="live-status" role="status">
    {loading ? '正在載入時段… · Loading availability…' : !healthy ? <>
      暫時未能確認房間空檔，請稍後再試。 · Availability is temporarily unavailable.
      <Button variant="ghost" onClick={() => liveStore.refresh()}>重試 · Retry</Button>
    </> : '時間以香港時間顯示 · Hong Kong time · Next 14 days'}
  </div>;
}

function SessionPreview({ slotId, onClose }) {
  useLiveAvailability();
  const slot = slotById(slotId);
  const teacher = slot && teacherById(slot.teacherId);
  const available = slot?.status === 'open' && teacher;
  const studio = LOCATIONS.find(l => l.id === slot?.studioId);
  const text = slot && teacher ? `你好，我想查詢私人課堂：${teacher.name}，${hkDateKey(slot.startsAt)} ${hkTime(slot.startsAt)}（香港時間），${studio?.name || ''}。請確認可否預約。` : '';
  return <Sheet open onClose={onClose}><section className="live-section">
    <h2>課堂時段 · Session details</h2>
    {slot && teacher && <><h3>{teacher.name}</h3><p>{hkLabel(slot.startsAt)} · {hkTime(slot.startsAt)}–{hkTime(slot.endsAt)} HKT</p><p>{studio?.name}<br />{studio?.address}</p></>}
    <p role="status">{available ? '網上確認預約尚未開放。此時段未被保留，請聯絡我們確認。' : '呢個時段暫時未能預約，請選擇其他時段。'}</p>
    <p>{available ? 'Online confirmation is coming soon. This slot has not been held or booked; contact the studio to confirm.' : 'This session is no longer available. Please choose another time.'}</p>
    {available && <a className="live-link" href={`https://wa.me/85298818081?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">WhatsApp 查詢 · Enquire</a>}
    <Button variant="ghost" onClick={onClose}>返回 · Back</Button>
  </section></Sheet>;
}

function Instructor({ id, onBack, onPick }) {
  useLiveAvailability();
  const t = teacherById(id);
  const days = daysForTeacher(id);
  const [selected, select] = useState(0);
  if (!t) return <section className="live-section"><p>呢位導師暫時未有開放資料。 · Instructor unavailable.</p><Button onClick={onBack}>返回 · Back</Button></section>;
  return <section className="live-section">
    <Button variant="ghost" onClick={onBack}>返回導師列表 · Back</Button>
    <div className="live-person"><Avatar t={t} size={64} /><div><h1>{t.name}</h1><p>{t.headline}</p></div></div>
    <p>{t.locIds.map(locName).join(' · ')}</p>
    <SpecChips items={t.specs} accent />
    <p>{t.langs.join(' · ')}</p><p>{t.certs.join(' · ')}</p>
    <AvailabilityStatus />
    <div className="live-dates">{days.map((d, i) => <button key={d.iso} aria-pressed={i === selected} onClick={() => select(i)}>{hkLabel(d.date)}</button>)}</div>
    <div className="live-slot-list">{days[selected].slots.map(s => <button key={s.id} disabled={s.status !== 'open'} onClick={() => onPick(s)}>
      <strong>{s.time}–{hkTime(s.endsAt)}</strong><span>{locName(s.studioId)}</span><span>{s.status === 'open' ? '查看 · View' : '未能預約 · Unavailable'}</span>
    </button>)}</div>
    {!days[selected].slots.length && <p>呢日暫時未有開放時段。 · No sessions opened for this date.</p>}
  </section>;
}

export function LiveClientPortal() {
  useLiveAvailability();
  const [tab, setTab] = useState('browse');
  const [instructor, setInstructor] = useState(null);
  const [slotId, setSlotId] = useState(null);
  const pick = s => { if (slotById(s.id)?.status === 'open') setSlotId(s.id); };
  return <PhoneFrame showWhatsApp={tab !== 'ask' || !!instructor} navBar={<nav className="live-nav" aria-label="Client navigation">
    <button aria-pressed={tab === 'browse'} onClick={() => { setTab('browse'); setInstructor(null); }}>搵導師 · Browse</button>
    <button aria-pressed={tab === 'ask'} onClick={() => { setTab('ask'); setInstructor(null); }}>問時段 · Ask</button>
  </nav>} overlay={slotId && <SessionPreview slotId={slotId} onClose={() => setSlotId(null)} />}>
    <AvailabilityStatus />
    {instructor ? <Instructor id={instructor} onBack={() => setInstructor(null)} onPick={pick} /> : tab === 'ask' ?
      <ChatAssistant onPickSlot={(teacher, day, time, id) => { const s = slotById(id); if (s) pick(s); }} /> :
      <ClientBrowse embedded onOpen={t => setInstructor(t.id)} onPickSlot={pick} />}
  </PhoneFrame>;
}

// Session restoration and role checks always use Supabase. No demo sign-in path.
function useAccount() {
  const [state, setState] = useState({ loading: true, user: null, profile: null, error: null });
  useEffect(() => {
    let active = true, request = 0;
    async function accept(session) {
      const mine = ++request;
      if (!session?.user) { if (active) setState({ loading: false, user: null, profile: null, error: null }); return; }
      setState({ loading: true, user: session.user, profile: null, error: null });
      try {
        const { data, error } = await supabase.from('profiles').select('id, role, full_name').eq('id', session.user.id).single();
        if (error) throw error;
        if (active && mine === request) setState({ loading: false, user: session.user, profile: data, error: null });
      } catch {
        if (active && mine === request) setState({ loading: false, user: session.user, profile: null, error: '未能讀取帳戶權限。 · Could not verify account access.' });
      }
    }
    if (!supabase) { setState({ loading: false, user: null, profile: null, error: '登入服務暫時未能使用。 · Sign-in is unavailable.' }); return; }
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setState({ loading: false, user: null, profile: null, error: '未能恢復登入。 · Please sign in again.' });
      else if (!request) void accept(data.session);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { queueMicrotask(() => { if (active) void accept(session); }); });
    return () => { active = false; request++; data.subscription.unsubscribe(); };
  }, []);
  return state;
}

function StaffGate({ role, children }) {
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
    } catch { setError('登入失敗，請檢查電郵及密碼。 · Sign-in failed. Check your email and password.'); }
    finally { setBusy(false); }
  }
  async function logout() {
    setError(null);
    try { const result = await supabase.auth.signOut(); if (result.error) throw result.error; }
    catch { setError('未能登出，請重試。 · Sign-out failed. Please retry.'); }
  }
  if (account.loading) return <section className="live-section" role="status">正在確認帳戶… · Checking account…</section>;
  if (!account.user) return <section className="live-section live-login">
    <h1>{role === 'teacher' ? '導師登入 · Instructor sign-in' : '管理員登入 · Admin sign-in'}</h1>
    <form onSubmit={login}>
      <label>電郵 · Email<input aria-label="Email" type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} /></label>
      <label>密碼 · Password<input aria-label="Password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} /></label>
      {(error || account.error) && <p role="alert">{error || account.error}</p>}
      <button className="live-link" type="submit" disabled={busy || !supabase}>{busy ? '登入中…' : '登入 · Sign in'}</button>
    </form>
  </section>;
  if (account.profile?.role !== role) return <section className="live-section"><h1>未有使用權限 · Access unavailable</h1><p>{account.error || '請使用獲授權嘅員工帳戶。 · Please use an authorised staff account.'}</p>{error && <p role="alert">{error}</p>}<Button onClick={logout}>登出 · Sign out</Button></section>;
  return <div><div className="live-staff-head"><span>{account.profile.full_name}</span><Button variant="ghost" onClick={logout}>登出 · Sign out</Button></div>{error && <p role="alert">{error}</p>}{children(account.profile)}</div>;
}

const ERROR_TEXT = {
  authentication_required: '請重新登入。 · Please sign in again.',
  teacher_access_required: '帳戶未有導師權限。 · Your instructor account is not active.',
  studio_not_assigned: '你未獲安排喺呢間分店任教。 · This studio is not assigned to you.',
  teacher_time_conflict: '你喺同一時間已有其他時段。 · You already have an overlapping session.',
  slot_reserved: '時段已被保留或預約，未能關閉。 · This session is held or booked and cannot be closed.',
  slot_has_booking_history: '呢個時段有預約紀錄，請聯絡管理員。 · Please contact an admin about this session.',
  outside_availability_window: '請選擇未來 14 日內嘅時段。 · Choose a future session within 14 days.',
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
      setNotice(existing ? '已關閉時段。 · Session closed.' : '已儲存。房間有空檔時，客戶就會見到呢個時段。 · Saved. Clients can see this session when the room is free.');
    } catch (e) { setNotice(ERROR_TEXT[e.message] || '未能儲存，請重試。 · Could not save. Please retry.'); }
    finally { setPending(null); }
  }
  return <section className="live-section">
    <h1>開放課堂時段 · Availability</h1><p>每節 60 分鐘，以香港時間顯示。 · Each session is 60 minutes, in Hong Kong time.</p>
    <AvailabilityStatus />
    {!loading && !me && !readError && <p>導師帳戶尚未啟用，請聯絡管理員。 · Contact an admin to activate your instructor profile.</p>}
    {me && !studios.length && <p>未有指定分店，請聯絡管理員。 · No studio assigned yet.</p>}
    <div className="live-toolbar">
      <label>分店 · Studio<select aria-label="Studio" value={studio} onChange={e => chooseStudio(e.target.value)}>{studios.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      <Button variant="ghost" disabled={week === 0} onClick={() => setWeek(0)}>前 7 日 · First week</Button>
      <Button variant="ghost" disabled={week === 1} onClick={() => setWeek(1)}>後 7 日 · Second week</Button>
    </div>
    {notice && <p className="live-status" role="status">{notice}</p>}
    {studio && <div className="live-grid-scroll"><table className="live-grid"><caption>按一下開啟或關閉時段 · Tap a session to open or close</caption><thead><tr><th>HKT</th>{days.map(d => <th key={d.iso}>{hkLabel(d.date)}</th>)}</tr></thead><tbody>
      {Array.from({ length: 15 }, (_, i) => `${String(i + 7).padStart(2, '0')}:00`).map(time => <tr key={time}><th>{time}</th>{days.map(day => {
        const start = `${day.iso}T${time}:00+08:00`;
        const existing = slots.find(s => s.teacherId === account.id && +s.startsAt === +new Date(start) && s.studioId === studio);
        const other = slots.find(s => s.teacherId === account.id && s.studioId !== studio && +s.startsAt < +new Date(start) + HOUR_MS && +s.endsAt > +new Date(start));
        const reserved = existing?.status === 'held' || existing?.status === 'booked';
        const blocked = existing?.status === 'blocked';
        const past = +new Date(start) <= Date.now();
        const text = reserved ? '已保留' : other ? '其他分店' : blocked ? '已開 · 未能預約' : existing ? '已開 Open' : '關 Closed';
        return <td key={day.iso}><button aria-label={`${day.iso} ${time} ${locName(studio)} ${text}`} aria-pressed={!!existing} disabled={!!pending || loading || !!readError || past || reserved || !!other}
          data-state={reserved || other ? 'reserved' : blocked ? 'blocked' : existing ? 'open' : 'closed'} onClick={() => toggle(start, existing)}>{pending === start ? '儲存中…' : text}</button></td>;
      })}</tr>)}
    </tbody></table></div>}
    <p>「已開 · 未能預約」表示房間被佔用、日程未能確認或時段已過。時段會保留，但客戶無法選取。<br />Opened sessions remain saved while room availability is being checked.</p>
  </section>;
}

export function LiveTeacherPortal() {
  return <div className="live-scroll"><StaffGate role="teacher">{account => <TeacherAvailability key={account.id} account={account} />}</StaffGate></div>;
}
function AdminAvailability() {
  const { slots } = useLiveAvailability();
  return <section className="live-section"><h1>時段概覽 · Availability overview</h1><AvailabilityStatus />
    <div className="live-admin-cards">{LOCATIONS.map(l => <Card key={l.id}><h2>{l.name}</h2><p>{slots.filter(s => s.studioId === l.id && s.status === 'open').length} 個可用時段 · available sessions</p></Card>)}</div>
    <h2>已啟用導師 · Active instructors</h2>{TEACHERS.map(t => <p key={t.id}>{t.name} · {t.locIds.map(locName).join(' · ')}</p>)}
    {!TEACHERS.length && <p>暫時未有已啟用導師。 · No active instructors yet.</p>}
  </section>;
}
export function LiveAdminPortal() {
  const [tab, setTab] = useState('rooms');
  return <div className="live-scroll"><StaffGate role="admin">{() => <>
    <nav className="live-nav live-admin-nav" aria-label="Admin navigation">
      <button aria-pressed={tab === 'rooms'} onClick={() => setTab('rooms')}>房間日程 · Room schedule</button>
      <button aria-pressed={tab === 'availability'} onClick={() => setTab('availability')}>導師時段 · Instructor availability</button>
    </nav>
    {tab === 'rooms' ? <RoomSchedule /> : <AdminAvailability />}
  </>}</StaffGate></div>;
}
