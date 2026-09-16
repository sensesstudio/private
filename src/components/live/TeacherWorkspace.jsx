import { useState } from 'react';
import { Workspace, PageHead, Stat } from '../admin/Portal.jsx';
import { Avatar, Button, Card, Icon, Segmented, SpecChips } from '../shared/index.jsx';
import { EmptyPanel } from './ClientProfile.jsx';
import { teacherById, locName } from '../../data.js';
import { useLiveAvailability } from '../../availability/live.js';
import { hkDateKey, hkTime } from '../../availability/time.js';
import '../admin/admin.css';

const NAV=[['sun','Today'],['calendar-days','Availability'],['users','Sessions'],['banknote','Earnings'],['user','Profile']];
function TeacherSessions() {
  const [tab,setTab]=useState('Upcoming');
  return <><PageHead eyebrow="Your clients" title="Sessions" sub="Bookings and instructor session records."/><Segmented options={['Upcoming','Past']} value={tab} onChange={setTab}/><div style={{marginTop:20}}><EmptyPanel icon="calendar-check" title={`${tab} sessions are not connected yet`}>Confirmed client sessions will appear here when instructor bookings are connected.</EmptyPanel></div><div className="teacher-layout" style={{marginTop:20}}><Card><h2 className="admin-card-title">Session notes</h2><p className="admin-muted">Select a connected session to record focus areas and feedback.</p></Card><Card><h2 className="admin-card-title">Posture record</h2><p className="admin-muted">Client posture records and progress photos are not connected yet.</p></Card></div></>;
}
function TeacherEarnings() {
  return <><PageHead eyebrow="Your income" title="Earnings" sub="Your session earnings and payout history."/><div className="admin-stats"><Stat icon="banknote" label="This month · Not connected" value="—"/><Stat icon="calendar-check" label="Completed sessions · Not connected" value="—"/><Stat icon="wallet" label="Next payout · Not connected" value="—"/></div><div className="teacher-layout"><Card><h2 className="admin-card-title">Earnings trend</h2><div className="admin-pending-chart"><Icon n="chart-no-axes-combined" size={30}/><p>Earnings reporting is not connected yet.</p></div></Card><Card><h2 className="admin-card-title">Payout account</h2><p className="admin-muted">Payout account details are not connected yet. Please contact the studio to confirm your arrangements.</p></Card></div><Card pad={0} style={{marginTop:20}}><div className="admin-card-head"><h2 className="admin-card-title">Payout history</h2></div><div className="admin-table-scroll"><table className="admin-table"><thead><tr>{['Period','Sessions','Gross','Fees','Net','Status'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody><tr><td colSpan={6} className="admin-panel-note">Payout records are not connected yet.</td></tr></tbody></table></div></Card></>;
}
function TeacherProfile({account,me}) {
  return <><PageHead eyebrow="Public profile" title="Your profile" sub="Your instructor details and teaching preferences."/><div className="profile-stack"><Card pad={0}><div className="teacher-profile-cover"/><div className="teacher-profile-body"><Avatar t={me || {initials:account.full_name?.slice(0,2).toUpperCase() || 'S',ph:'almond'}} size={80} radius={20}/><h2 className="admin-card-title" style={{marginTop:14}}>{me?.name || account.full_name}</h2><p className="admin-muted">{me?.headline || 'Your public instructor profile has not been published yet.'}</p></div></Card><Card><h2 className="admin-card-title">Bio</h2><p className="admin-muted">{me?.bio || 'Biography is not connected yet.'}</p></Card><div className="teacher-layout"><Card><h2 className="admin-card-title">Hourly rate</h2><p>{me?.rate!=null ? `HK$${me.rate.toLocaleString('en-HK')}` : 'Not recorded'}</p></Card><Card><h2 className="admin-card-title">Assigned studios</h2><p>{me?.locIds?.map(locName).join(' · ') || 'No studios assigned.'}</p></Card></div><Card><h2 className="admin-card-title">Specialisations</h2>{me?.specs?.length ? <SpecChips items={me.specs} accent/> : <p className="admin-muted">Not recorded</p>}<h2 className="admin-card-title" style={{marginTop:24}}>Certifications</h2>{me?.certs?.length ? me.certs.map(c=><p key={c}>{c}</p>) : <p className="admin-muted">Not recorded</p>}</Card><EmptyPanel icon="message-circle" title="Client reflections">Client reviews are not connected yet.</EmptyPanel><p className="admin-muted">Contact the studio to update your public profile, rate or studio assignments.</p></div></>;
}
export function LiveTeacherWorkspace({account,session,availability}) {
  const [tab,setTab]=useState('Today');
  const state=useLiveAvailability();
  const projected=teacherById(account.id);
  const raw=state.snapshot?.teachers?.find(t=>t.id===account.id);
  const me=projected ? {...projected,rate:raw?.rate_hkd ?? null} : null;
  const today=hkDateKey(new Date());
  const openings=state.slots.filter(s=>s.teacherId===account.id && s.sourceStatus==='open' && hkDateKey(s.startsAt)===today);
  const badge=<div className="admin-account"><strong>{account.full_name}</strong><Button size="sm" variant="ghost" onClick={session.logout}>Sign out</Button></div>;
  return <Workspace title="Teacher" nav={NAV} tab={tab} setTab={setTab} headRight={badge}>{session.error && <p role="alert">{session.error}</p>}{tab==='Availability' ? availability : <div className="admin-page" key={tab}>
    {tab==='Today' && <><PageHead eyebrow={`Hong Kong · ${today}`} title={`Welcome, ${account.full_name || 'instructor'}`} sub="Your studio day at a glance." right={<Button size="sm" variant="soft" onClick={()=>setTab('Availability')}>Manage availability</Button>}/><div className="admin-stats"><Stat icon="calendar-check" label="Sessions today · Not connected" value="—"/><Stat icon="clock" label="Saved availability today" value={state.loading || state.error ? '—' : openings.length}/><Stat icon="banknote" label="Earnings · Not connected" value="—"/></div><div className="teacher-layout"><Card><h2 className="admin-card-title">Today's availability</h2>{state.error ? <p className="admin-muted">Availability is temporarily unavailable.</p> : state.loading ? <p role="status">Loading…</p> : openings.length ? openings.map(s=><div className="admin-room-row" key={s.id}><Icon n="clock" size={18}/><div><strong>{hkTime(s.startsAt)}–{hkTime(s.endsAt)} HKT</strong><span>{locName(s.studioId)} · {s.status==='open' ? 'Open' : 'Unavailable'}</span></div></div>) : <p className="admin-muted">No openings published for today.</p>}</Card><EmptyPanel icon="users" title="Your next client">Your confirmed session list is not connected yet.</EmptyPanel></div></>}
    {tab==='Sessions' && <TeacherSessions/>}{tab==='Earnings' && <TeacherEarnings/>}{tab==='Profile' && <TeacherProfile account={account} me={me}/>}
  </div>}</Workspace>;
}
