import { useRef, useState } from 'react';
import { PageHead, Stat } from './Portal.jsx';
import { Button, Card, Icon } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';
import { useProspects } from '../../admin/useProspects.js';
import { FOLLOWUP_BOARDS, PROSPECT_STATUSES, statusLabel, visibleProspects, SYNC_ERRORS } from '../../admin/prospects.js';
import { hkDateKey } from '../../availability/time.js';
import './prospects.css';
const when = value => value ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(value)) + ' HKT' : '—';
const day = value => value ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Asia/Hong_Kong'}).format(new Date(`${value}T00:00:00+08:00`)) : '—';
const SORTS=[['next_action_date:asc','Next action: earliest first'],['next_action_date:desc','Next action: latest first'],['last_contact_at:desc','Last contact: newest first'],['last_contact_at:asc','Last contact: oldest first'],['client_name:asc','Name: A–Z'],['client_name:desc','Name: Z–A'],['status:asc','Status: A–Z']];
function ContactPhone({row}) {
  if (!row.mobile) return '—';
  const id=typeof row.conversation_id==='string'?row.conversation_id.trim():'';
  if (!id) return <span title="Chat link is not available yet">{row.mobile}</span>;
  return <a href={`https://app.sleekflow.io/en/inbox?conversationId=${encodeURIComponent(id)}`} target="_blank" rel="noopener noreferrer" title="Open SleekFlow chat in a new tab" style={{color:'var(--ink)',textDecoration:'underline',textUnderlineOffset:3}}>{row.mobile}</a>;
}
function LastStaff({row}) {
 return <div>{row.last_staff_status==='confirmed'?<><strong>{row.last_staff_name}</strong><small style={{display:'block',marginTop:6}}>{row.last_staff_kind==='note'?'Internal note':'Message'} · {when(row.last_staff_at)}</small></>:row.last_staff_status==='none'?'No staff activity found':'Not available'}</div>;
}
function Conversation({row,full=false}) {
  return <div className="prospect-message"><p className={full?'':'prospect-message-preview'}>{row.last_message || 'No message available'}</p>
    <small>{row.message_at ? when(row.message_at) : ''}{row.channel ? ` · ${row.channel}` : ''}</small></div>;
}
function ProspectEditor({record,config,onCancel,onSaved}) {
  const [remarks,setRemarks]=useState(record.remarks),[next,setNext]=useState(record.next_action_date||''),[status,setStatus]=useState(record.status);
  const [saving,setSaving]=useState(false),[error,setError]=useState('');const pending=useRef(false);
  async function submit(event) {
    event.preventDefault();if(pending.current)return;pending.current=true;setSaving(true);setError('');
    try {
      const {error:failed}=await supabase.rpc(config.saveRpc,{p_id:record.id,p_version:record.version,p_remarks:remarks,p_next_action_date:next||null,p_status:status});
      if(failed)setError(failed.code==='40001'?'Another admin updated this prospect. Your draft is still here; copy it before closing and reopening the record.':'Could not save. Please check your connection and try again.');
      else await onSaved();
    } catch {setError('Could not save. Please try again.');}
    finally {pending.current=false;setSaving(false);}
  }
  return <section aria-label={config.editorLabel}>
    <PageHead eyebrow={config.eyebrow} title={record.client_name} sub={<ContactPhone row={record}/>} />
    <Card pad={22}><dl className="admin-client-fields"><div><dt>Last contact date</dt><dd>{when(record.last_contact_at)}</dd></div><div><dt>SleekFlow label</dt><dd>{record.source_present?config.label:'Label removed · Saved follow-up retained'}</dd></div></dl>
      <h2 className="admin-card-title prospect-conversation-title">Last SleekFlow conversation</h2><Conversation row={record} full/>
      <form onSubmit={submit}><fieldset disabled={saving} className="admin-editor-fields prospect-editor">
        <label className="prospect-remarks">Remarks<textarea aria-label="Remarks" rows={6} maxLength={10000} value={remarks} onChange={e=>setRemarks(e.target.value)}/></label>
        <label>Next action date<input type="date" min="2000-01-01" max="2100-12-31" value={next} onChange={e=>setNext(e.target.value)}/></label>
        <label>Status<select aria-label="Status" value={status} onChange={e=>setStatus(e.target.value)}>{PROSPECT_STATUSES.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select></label>
      </fieldset><p className="admin-muted">Follow-up details are saved for your studio team. Confirmed booking is a tracking status; it does not create a booking.</p>
      {error&&<p role="alert" className="admin-client-notice">{error}</p>}
      <div className="admin-editor-actions"><button type="button" onClick={onCancel} disabled={saving}>Cancel</button><button type="submit" disabled={saving}>{saving?'Saving…':'Save changes'}</button></div></form>
    </Card>
  </section>;
}
export function AdminProspects({board='prospects'}) {
  const config=FOLLOWUP_BOARDS[board];
  const syncError=code=>code==='label_not_found'?`The label “${config.label}” was not found uniquely in SleekFlow. Check its name and try again.`:SYNC_ERRORS[code]||SYNC_ERRORS.sync_unavailable;
  const {data,loading,error,refresh}=useProspects(config.directoryRpc);
  const [query,setQuery]=useState(''),[status,setStatus]=useState('all'),[scope,setScope]=useState('active'),[sort,setSort]=useState('next_action_date:asc'),[page,setPage]=useState(0);
  const [editor,setEditor]=useState(null),[connecting,setConnecting]=useState(false),[key,setKey]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const working=useRef(false);
  const [removing,setRemoving]=useState(null);
  async function sync(event) {
    event?.preventDefault();if(working.current)return;working.current=true;setBusy(true);setNotice('');
    const apiKey=key;setKey('');
    try {
      const {data:result,error:failed}=await supabase.functions.invoke('sleekflow-prospect-sync',{body:connecting?{action:'connect',board,api_key:apiKey}:{action:'sync',board}});
      let code=result?.error;
      if(failed?.context) {try {code=(await failed.context.json()).error;}catch {/* fixed message below */}}
      if(failed||code)setNotice(syncError(code));
      else {setConnecting(false);setNotice(result.status==='synced'?`${result.count} ${config.noun} synced.`:result.status==='busy'?'A sync is running or was just requested. This page updates automatically.':'Connect SleekFlow to start syncing.');}
      await refresh({background:true});
    }catch{setNotice(SYNC_ERRORS.sync_unavailable);}
    finally{working.current=false;setBusy(false);}
  }
  async function removeProspect() {
    if(working.current||!removing)return;working.current=true;setBusy(true);setNotice('');
    try {
      const {data:result,error:failed}=await supabase.functions.invoke('sleekflow-prospect-sync',{body:{action:'remove-prospect',board:'prospects',id:removing.id,version:removing.version,confirmed:true}});
      if(failed||result?.error)setNotice('Removal could not be verified. Refresh before retrying; the label may already have been removed.');
      else if(result.status==='removed'){setRemoving(null);setNotice('Private - Prospect label removed. Contact and conversation history are preserved.');}
      else setNotice('A sync is running or was just requested. Please retry shortly.');
      await refresh({background:true});
    }catch{setNotice('Removal could not be verified. Please refresh before retrying.');}
    finally{working.current=false;setBusy(false);}
  }
  const rows=data?.rows||[],syncInfo=data?.sync;
  const filtered=visibleProspects(rows,{query,status,scope,sort});
  const lastPage=Math.max(0,Math.ceil(filtered.length/25)-1),currentPage=Math.min(page,lastPage),shown=filtered.slice(currentPage*25,(currentPage+1)*25);
  const active=rows.filter(r=>r.source_present),today=hkDateKey(new Date());
  const stale=syncInfo?.configured&&(!syncInfo.last_ok_at||syncInfo.error_code||Date.now()-new Date(syncInfo.last_ok_at).getTime()>35*60000);
  function change(set,value){set(value);setPage(0);}
  return <div className={`admin-page admin-prospects-page ${board==='booking_in_progress'?'booking-followup-page':''}`}>
    {editor&&data&&!error ? <ProspectEditor record={editor} config={config} onCancel={()=>setEditor(null)} onSaved={async()=>{setEditor(null);setNotice('Follow-up saved.');await refresh({background:true});}}/> : <>
      <PageHead eyebrow="Conversion" title={config.title} sub={`SleekFlow · ${config.label}`} right={<div className="prospect-actions">{syncInfo?.configured&&<Button variant="soft" size="sm" disabled={busy||syncInfo.running} onClick={()=>sync()}>Sync now</Button>}<Button variant="soft" size="sm" disabled={busy||loading||error} onClick={()=>{setConnecting(v=>!v);setKey('');setNotice('');}}>{syncInfo?.configured?'Connection settings':'Connect SleekFlow'}</Button></div>}/>
      {removing&&<Card pad={22}><h2 className="admin-card-title">Remove prospect?</h2><p>Remove the Private - Prospect label from <strong>{removing.client_name}</strong> ({removing.mobile||'No mobile number'}) in SleekFlow? Their contact, conversations and other labels will remain. Saved follow-up details remain under Label removed.</p><div className="admin-editor-actions"><button type="button" disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button><button type="button" disabled={busy} onClick={removeProspect}>{busy?'Removing…':'Confirm removal'}</button></div></Card>}
      {notice&&<p role="status" className="admin-client-notice">{notice}</p>}
      {loading&&<p role="status" className="admin-panel-note">Loading {config.noun}…</p>}
      {error&&<Card pad={22}><p role="alert">{config.title} could not be loaded. Please check your admin session.</p><Button variant="soft" size="sm" onClick={()=>refresh()}>Try again</Button></Card>}
      {data&&!error&&<>
        {connecting&&<Card pad={22}><form onSubmit={sync} className="prospect-connection"><h2 className="admin-card-title">Connect SleekFlow</h2><p className="admin-muted">Paste your Platform API key to import contacts labelled {config.label}. Your key is encrypted and is never displayed after saving.</p>
          <label>Platform API key<input type="password" autoComplete="new-password" spellCheck={false} required minLength={10} maxLength={4096} value={key} onChange={e=>setKey(e.target.value)} disabled={busy}/></label>
          <div className="admin-editor-actions"><button type="button" disabled={busy} onClick={()=>{setConnecting(false);setKey('');}}>Cancel</button><button type="submit" disabled={busy}>{busy?'Connecting and syncing…':'Connect and sync'}</button></div>
        </form></Card>}
        {syncInfo.configured?<p className={stale?'admin-client-notice':'admin-muted'} role="status">{syncInfo.running?'Sync in progress. ':''}Auto-sync every 15 minutes · {syncInfo.last_ok_at?`Last synced ${when(syncInfo.last_ok_at)}`:'Awaiting first successful sync'}.{stale?' Showing the last available records.':''} {syncInfo.error_code?syncError(syncInfo.error_code):''}</p>:<p className="admin-client-notice">Connect SleekFlow to load real contacts. No contacts have been imported yet.</p>}
        <div className="admin-stats"><Stat icon="user-search" label={config.openLabel} value={active.filter(r=>r.status!=='confirmed booking').length}/><Stat icon="calendar" label="Actions due" value={active.filter(r=>r.status!=='confirmed booking'&&r.next_action_date&&r.next_action_date<=today).length}/><Stat icon="calendar-check" label="Confirmed bookings" value={active.filter(r=>r.status==='confirmed booking').length}/></div>
        <div className="admin-client-tools"><label className="admin-client-search"><Icon n="search" size={16}/><input aria-label={config.searchLabel} placeholder="Search name, mobile or remarks…" value={query} onChange={e=>change(setQuery,e.target.value)}/></label>
          <select aria-label="Filter prospect status" value={status} onChange={e=>change(setStatus,e.target.value)}><option value="all">All statuses</option>{PROSPECT_STATUSES.map(s=><option key={s} value={s}>{statusLabel(s)}</option>)}</select>
          <select aria-label="Filter prospect label" value={scope} onChange={e=>change(setScope,e.target.value)}><option value="active">Current label</option><option value="archived">Label removed</option><option value="all">All saved contacts</option></select>
          <select aria-label="Sort prospects" value={sort} onChange={e=>change(setSort,e.target.value)}>{SORTS.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
        </div>
        <Card pad={0}><div className="admin-table-scroll"><table className="admin-table prospects-table"><caption className="admin-client-caption">{filtered.length} {config.noun} · Dates shown in Hong Kong time</caption><thead><tr>{['Client name','Mobile number','Last SleekFlow conversation','Remarks','Last contact date',...(board==='booking_in_progress'?['Last contact staff']:[]),'Next action date','Status',''].map((h,i)=><th key={i} scope="col">{h||'Action'}</th>)}</tr></thead>
          <tbody>{shown.map(r=><tr key={r.id}><td data-label="Client name"><strong>{r.client_name}</strong>{!r.source_present&&<small>Label removed</small>}</td><td data-label="Mobile number"><ContactPhone row={r}/></td><td data-label="Last SleekFlow conversation"><Conversation row={r}/></td><td data-label="Remarks"><p className="prospect-remarks-preview">{r.remarks||'—'}</p></td><td data-label="Last contact date">{when(r.last_contact_at)}</td>{board==='booking_in_progress'&&<td data-label="Last contact staff"><LastStaff row={r}/></td>}<td data-label="Next action date">{day(r.next_action_date)}{r.next_action_date&&r.next_action_date<=today&&r.status!=='confirmed booking'&&<small>Follow-up due</small>}</td><td data-label="Status"><span className="prospect-status">{statusLabel(r.status)}</span></td><td><Button size="sm" variant="soft" style={{padding:'10px 12px',whiteSpace:'nowrap'}} onClick={()=>{setEditor(r);setNotice('');}}>Edit</Button>{board==='prospects'&&r.source_present&&<Button size="sm" variant="ghost" disabled={busy} onClick={()=>{setRemoving(r);setNotice('');}}>Remove prospect</Button>}</td></tr>)}</tbody></table></div>
          {!shown.length&&<div className="admin-empty-panel"><Icon n="user-search" size={30}/><p>{rows.length?`No ${config.noun} match these filters.`:syncInfo.last_ok_at?`No contacts currently have the ${config.label} label.`:'Contacts will appear after the first successful SleekFlow sync.'}</p></div>}
          <div className="admin-client-pagination"><span>Page {currentPage+1} of {lastPage+1}</span><div><Button variant="soft" size="sm" disabled={currentPage===0} onClick={()=>setPage(currentPage-1)}>Previous</Button><Button variant="soft" size="sm" disabled={currentPage>=lastPage} onClick={()=>setPage(currentPage+1)}>Next</Button></div></div>
        </Card>
        <p className="admin-muted">Last contact uses the latest available SleekFlow interaction. Follow-up edits stay in this portal and are kept if a label is removed.</p>
      </>}
    </>}
  </div>;
}
