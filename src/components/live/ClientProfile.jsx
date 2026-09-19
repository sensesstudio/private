import { useState } from 'react';
import { ClientActivity } from '../shared/ClientActivity.jsx';
import { Avatar, Button, Card, Icon, Segmented } from '../shared/index.jsx';
import { TEACHERS, GOALS } from '../../data.js';
import { useLiveAvailability } from '../../availability/live.js';
import { TERMS_SECTIONS } from '../../terms.js';
import { ClientIntakeForm, ClientPreferencesForm, ClientFavouritesForm, ClientWaiverForm, DocumentSections, ProfileRecordGate, useClientProfile } from './ClientProfileForms.jsx';
import { hkDateKey } from '../../availability/time.js';
import './profile.css';

export const recordDate = value => value && Number.isFinite(Date.parse(`${value}T00:00:00+08:00`)) ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Asia/Hong_Kong'}).format(new Date(`${value}T00:00:00+08:00`)) : 'Not recorded';
const instant = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(value))+' HKT' : 'Not recorded';
const initials = name => name?.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'S';
const contact = <a className="profile-text-link" href="https://wa.me/85298818081" target="_blank" rel="noopener noreferrer">Contact the studio <Icon n="arrow-up-right" size={14}/></a>;

export function EmptyPanel({icon='database',title,children,action}) {
  return <div className="profile-empty"><span><Icon n={icon} size={26}/></span><h3>{title}</h3><p>{children}</p>{action}</div>;
}
function RecordSource({asOf}) { return asOf && <p className="profile-source">Studio records · Updated {recordDate(asOf)}</p>; }
export function ProgressCard({data,openLog,logLabel='Open progress log'}) {
  const [expanded,setExpanded]=useState(false);
  const count=data.private_lifetime?.sessions;
  const known=Number.isInteger(count) && count>=0;
  const next=known ? (Math.floor(count/10)+1)*10 : null;
  return <section className="profile-dark progress-card" aria-label="Your progress">
    <div className="profile-card-meta"><span><Icon n="sparkles" size={14}/> Your progress</span><small>Last visit · {data.last_visit?.never_attended ? 'Never attended' : recordDate(data.last_visit?.date)}</small></div>
    <h2>{known ? <>You’re <em>{next-count} sessions</em> from your <em>{next}-session milestone</em>.</> : 'Your progress starts with your first recorded session.'}</h2>
    {known && <><div className="profile-meter-label"><span>Towards {next} sessions</span><span>{count%10} / 10</span></div><progress max={10} value={count%10} aria-label={`Progress towards ${next} sessions`} /><p className="profile-source">{count} private sessions attended · Records updated {recordDate(data.private_lifetime.as_of)}</p></>}
    <button className="profile-expand" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded ? 'Hide details' : 'See full progress'}<Icon n={expanded ? 'chevron-up' : 'chevron-down'} size={14}/></button>
    {expanded && <div className="profile-progress-details"><p>{known ? `${count} sessions recorded so far. Your next milestone is ${next} sessions.` : 'Your cumulative attendance has not been recorded yet.'}</p><p>Open your progress log to see recorded instructor notes and session photos.</p><button className="profile-expand" onClick={openLog}>{logLabel} <Icon n="arrow-right" size={14}/></button></div>}
  </section>;
}
export function PackageCard({pack,detail=false}) {
  const remaining=Number.isFinite(pack.remaining) ? pack.remaining : null;
  const total=Number.isFinite(pack.total) ? pack.total : null;
  return <section className="profile-dark package-card">
    <div className="profile-card-meta"><span>{pack.name} · Credits</span></div>
    <p className="profile-credit-number"><strong>{remaining ?? (pack.source==='website'?total:'—')}</strong><span>{pack.source==='website'&&remaining===null?' sessions purchased':`/ ${total ?? '—'} sessions remaining`}</span></p>
    {remaining!==null && total>0 && <progress max={total} value={Math.max(0,Math.min(total,remaining))} aria-label={`${pack.name} remaining sessions`} />}
    <p className="profile-source">{pack.source==='website'?`Valid for ${pack.validity_months} month${pack.validity_months===1?'':'s'} from the first booked class. Expiry date is set when activation is recorded.`:`Expiry date · ${recordDate(pack.expires_on)}`}</p>
    {pack.needs_review && <p>Balance needs review. Please confirm with the studio.</p>}
    {pack.current===false && <p>{pack.source==='website'?'Payment refunded.':'This package is not currently usable in Mindbody.'}</p>}
    {detail && <><dl><div><dt>Sessions used</dt><dd>{pack.payment_status==='refunded'?'Not applicable':total!==null && remaining!==null ? Math.max(0,total-remaining) : 'Not recorded per package'}</dd></div><div><dt>Purchase date</dt><dd>{recordDate(pack.purchased_on)}</dd></div></dl><p className="profile-source">{pack.source==='website'?'Purchased on this website · Payment confirmed.':pack.synced_at ? `Mindbody last updated ${instant(pack.synced_at)}.${pack.sync_status!=='synced' || Date.now()-new Date(pack.synced_at).getTime()>30*60000 ? ' Update delayed; showing last available values.' : ''}` : 'Studio record · Not yet linked to Mindbody.'}</p></>}
    <img className="profile-watermark" src="/assets/submark-brown-trim.webp" alt="" aria-hidden="true"/>
  </section>;
}
function NextVisit({data}) {
  const visit=data.next_visit;
  const past=visit?.at && new Date(visit.at).getTime()<Date.now();
  return <Card pad={18}><div className="profile-next"><span className="profile-icon"><Icon n="calendar-check"/></span><div><div className="profile-label">{past ? 'Last recorded next visit' : 'Next visit'}</div><h3>{visit?.at ? instant(visit.at) : visit?.no_booking ? 'No upcoming booking recorded' : 'Not recorded'}</h3>{visit?.at && visit.details && <p>{visit.details}</p>}</div></div><RecordSource asOf={visit?.as_of}/>{past && <p className="profile-source">This recorded date has passed. Contact the studio for your latest booking.</p>}</Card>;
}
function Visits({data}) {
  return <div className="client-account-visits"><Card pad={20}><h3>Last visit</h3><p>{data.last_visit?.never_attended ? 'Never attended' : recordDate(data.last_visit?.date)}</p><RecordSource asOf={data.last_visit?.as_of}/></Card><NextVisit data={data}/></div>;
}
export function StudioLocations() {
  const state=useLiveAvailability();
  // Only render locations confirmed by the live reference snapshot.
  const studios=state.snapshot?.studios || [];
  return <><p>Find your Senses studio in Hong Kong.</p><div className="profile-stack">{studios.map(l=><Card key={l.id} pad={22}><div className="profile-next"><span className="profile-icon"><Icon n="map-pin"/></span><div><h2>{l.name}</h2>{l.note && <p>{l.note}</p>}</div></div><p>{l.address || 'Address not recorded'}</p>{l.address && <a className="profile-text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Senses Studio '+l.name+' '+l.address)}`} target="_blank" rel="noopener noreferrer">View map <Icon n="arrow-up-right" size={14}/></a>}</Card>)}</div>{!studios.length && <EmptyPanel icon="map-pin" title={state.loading ? 'Loading studios…' : 'Studio locations unavailable'} action={contact}>Please contact the studio for directions.</EmptyPanel>}</>;
}
function Bookings({data,onBrowse}) {
  const [tab,setTab]=useState('Upcoming');
  return <><Segmented options={['Upcoming','Past']} value={tab} onChange={setTab}/><div className="profile-stack" style={{marginTop:18}}>{tab==='Upcoming' ? <NextVisit data={data}/> : <><Card><h3>Last visit</h3><p>{data.last_visit?.never_attended ? 'Never attended' : recordDate(data.last_visit?.date)}</p><RecordSource asOf={data.last_visit?.as_of}/></Card><EmptyPanel icon="calendar" title="Full visit history is not connected yet">Your last recorded visit is shown above.</EmptyPanel></>}<p className="profile-source">Visit dates are from studio records. For booking changes or current confirmation, contact the studio.</p>{contact}<Button variant="accent" onClick={onBrowse}>Find my instructor</Button></div></>;
}
function ProgressLog({data}) {
  return <><Card><div className="profile-label">Private lifetime</div><p className="profile-total">{data.private_lifetime?.sessions ?? '—'} <span>sessions attended</span></p><RecordSource asOf={data.private_lifetime?.as_of}/></Card><ClientActivity kind="progress"/><h2>My visits</h2><Visits data={data}/></>;
}
export function ClientHomeFrame({data,onNavigate,onOpen}) {
  const {loading,error}=useLiveAvailability();
  return <div className="prototype-home"><div className="profile-label">{new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'Asia/Hong_Kong'}).format(new Date())}</div><div className="profile-identity"><div><span className="profile-greeting">Welcome{data ? ',' : ' to'}</span><h1>{data?.name || 'Senses Studio'}</h1></div>{data && <Avatar t={{initials:initials(data.name),ph:'almond'}} size={54}/>}</div>
    <div className="profile-dark home-hero"><div className="profile-label">A practice that fits you</div><h2>Find your rhythm.<br/>Move with intention.</h2><p>Explore private Pilates sessions, find your instructor and make time for yourself.</p><Button variant="light" full onClick={()=>onNavigate('browse')} iconRight="arrow-right">Find your instructor</Button></div>
    {data ? <><NextVisit data={data}/><ProgressCard data={data} openLog={()=>onNavigate('account')} logLabel="View my profile"/><Button variant="soft" full onClick={()=>onNavigate('account')}>View my profile & packages</Button></> : <Card pad={22}><h2>Your practice, in one place</h2><p>Sign in to see your progress, packages and recorded visits.</p><Button variant="soft" onClick={()=>onNavigate('account')}>Sign in</Button></Card>}
    <div className="profile-section-head"><h2>Our instructors</h2><button className="profile-text-link" onClick={()=>onNavigate('browse')}>View all <Icon n="arrow-right" size={14}/></button></div>
    {TEACHERS.length ? <div className="profile-teachers">{TEACHERS.slice(0,4).map(t=><button key={t.id} className="profile-teacher" onClick={()=>onOpen(t.id)}><Avatar t={t} size={54}/><strong>{t.name}</strong><span>{t.headline}</span></button>)}</div> : <EmptyPanel icon="flower-2" title={loading ? 'Loading instructors…' : error ? 'Instructors unavailable' : 'No instructors published yet'} action={contact}>Please contact us to arrange your session.</EmptyPanel>}
    <div className="profile-home-links"><Button variant="soft" icon="tag" onClick={()=>onNavigate('pricing')}>Explore packages</Button><Button variant="soft" icon="map-pin" onClick={()=>onNavigate('locations')}>Our studios</Button></div>
  </div>;
}
const MENU=[['shield-check','Liability waiver','waiver'],['user-round','About me','about'],['calendar-check','Bookings','bookings'],['heart','Favourite teachers','favourites'],['clipboard-list','Progress log','progress'],['credit-card','Payment & packages','packages'],['map-pin','Studios & locations','locations'],['settings','Preferences','preferences'],['file-text','Terms & Conditions','terms']];
export function LiveClientProfile({data,email,onLogout,onNavigate,mode='profile',onOpen}) {
  const [page,setPage]=useState(null);
  const record=useClientProfile();
  data={...data,name:record.data?.contact?.name || data.name};
  const pack=data.packages?.find(p=>p.remaining>0 && p.current!==false && !p.needs_review && (!p.expires_on || p.expires_on>=hkDateKey(new Date()))) || data.packages?.[0];
  if(mode==='home') return <ClientHomeFrame data={data} onNavigate={onNavigate} onOpen={onOpen}/>;
  if(page) return <div className="prototype-subpage"><button className="profile-back" onClick={()=>setPage(null)}><Icon n="arrow-left" size={18}/>Profile</button><h1>{MENU.find(m=>m[2]===page)?.[1]}</h1>
    {page==='progress' && <ProgressLog data={data}/>}
    {page==='packages' && <><h2>My packages</h2><div className="client-account-packages">{data.packages?.map(p=><PackageCard key={p.id} pack={p} detail/>)}</div>{!data.packages?.length && <EmptyPanel icon="tag" title="No packages recorded"/>}<Button variant="accent" full onClick={()=>onNavigate('pricing')} style={{marginTop:18}}>View available packages</Button><ClientActivity kind="packages"/><ClientActivity kind="payments"/></>}
    {page==='bookings' && <Bookings data={data} onBrowse={()=>onNavigate('browse')}/>}
    {page==='about' && <ProfileRecordGate record={record}>{record.data && <ClientIntakeForm record={record}/>}</ProfileRecordGate>}
    {page==='preferences' && <ProfileRecordGate record={record}>{record.data && <ClientPreferencesForm record={record}/>}</ProfileRecordGate>}
    {page==='favourites' && <ProfileRecordGate record={record}>{record.data && <ClientFavouritesForm record={record}/>}</ProfileRecordGate>}
    {page==='locations' && <StudioLocations/>}
    {page==='terms' && <DocumentSections sections={TERMS_SECTIONS}/>}
    {page==='waiver' && <ProfileRecordGate record={record}>{record.data && <ClientWaiverForm record={record}/>}</ProfileRecordGate>}
  </div>;
  return <div className="prototype-profile"><div className="profile-identity"><Avatar t={{initials:initials(data.name),ph:'almond'}} size={66}/><div><h1>{data.name}</h1><p>{data.private_lifetime?.sessions!=null ? `${data.private_lifetime.sessions} private sessions attended` : 'Your personal practice'}</p></div></div>
    <ProgressCard data={data} openLog={()=>setPage('progress')}/>
    {pack ? <PackageCard pack={pack}/> : <Card><h2>Your packages</h2><p>No packages recorded yet.</p><Button variant="soft" onClick={()=>onNavigate('pricing')}>Explore packages</Button></Card>}
    <NextVisit data={data}/><div><div className="profile-label">Your focus</div><p className="profile-source">{record.data?.profile?.goals?.length ? record.data.profile.goals.map(id=>GOALS.find(g=>g.id===id)?.label || id).join(' · ') : 'Add your goals in About me.'}</p></div>
    <div className="profile-menu">{MENU.map(([icon,label,key])=><button key={key} onClick={()=>setPage(key)}><Icon n={icon} size={19}/><span>{label}</span>{key==='waiver' && <small className="profile-unavailable">{record.loading ? 'Loading…' : record.error ? 'Unavailable' : record.data?.waiver_signatures?.some(s=>s.version===record.data?.waiver_document?.version) ? 'Signed' : 'Not signed'}</small>}<Icon n="chevron-right" size={17}/></button>)}<button onClick={onLogout}><Icon n="log-out" size={19}/><span>Sign out</span><Icon n="chevron-right" size={17}/></button></div>
  </div>;
}
