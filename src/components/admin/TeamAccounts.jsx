import { useEffect, useRef, useState } from 'react';
import { PageHead } from './Portal.jsx';
import { Button, Card } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';
export function TeamAccounts() {
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[form,setForm]=useState(null),[receipt,setReceipt]=useState(null),[query,setQuery]=useState('');
 const pending=useRef(false);
 async function call(body){const {data,error}=await supabase.functions.invoke('team-accounts',{body});if(error){let message;try{message=(await error.context.json()).error;}catch{}throw new Error(message||'Could not manage team accounts. Please retry.');}if(data?.error)throw new Error(data.error);return data;}
 async function load(){try{setData(await call({action:'list'}));setError('');}catch(e){setError(e.message);}}
 useEffect(()=>{void load();},[]);
 async function submit(e){e.preventDefault();if(pending.current)return;pending.current=true;setBusy(true);setError('');setReceipt(null);
  try{const result=await call(form);setReceipt(result);setForm(null);await load();}catch(e){setError(e.message);}finally{setBusy(false);pending.current=false;}
 }
 const rows=(data?.accounts||[]).filter(r=>`${r.full_name} ${r.email} ${r.role}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <div className="admin-page">
  <PageHead eyebrow="Studio team" title="Team accounts" sub="Manage admin and teacher logins." right={<Button variant="soft" size="sm" disabled={busy||!data} onClick={()=>{setReceipt(null);setForm({action:'create',name:'',email:'',role:'teacher',confirmed:false});}}>Add account</Button>}/>
  {error&&<p role="alert" className="admin-client-notice">{error}</p>}
  {!data&&!error&&<p role="status">Loading team accounts…</p>}
  {error&&<Button variant="soft" size="sm" onClick={load}>Reload accounts</Button>}
  {receipt&&<Card pad={22}><h2 className="admin-card-title">Login details</h2><p>Share these details privately with the account holder. The password is shown only here and cannot be retrieved later.</p><dl className="admin-client-fields"><div><dt>Email</dt><dd>{receipt.email}</dd></div><div><dt>Password</dt><dd><code>{receipt.temporary_password}</code></dd></div></dl><Button variant="soft" size="sm" onClick={()=>setReceipt(null)}>Hide password</Button></Card>}
  {form&&<Card pad={22}><h2 className="admin-card-title">{form.action==='create'?'Add team account':'Reset password'}</h2><form onSubmit={submit}><fieldset disabled={busy} className="admin-editor-fields">
   {form.action==='create'?<><label>Name<input required maxLength={150} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Email<input type="email" required maxLength={254} value={form.email} autoComplete="off" onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Role<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="teacher">Teacher</option><option value="admin">Admin</option></select></label></>:<p>A new password will be generated for <strong>{form.email}</strong>. Their existing sessions will be revoked.</p>}
   <label style={{gridColumn:'1 / -1',display:'flex',alignItems:'center',gap:10}}><input type="checkbox" required checked={form.confirmed} onChange={e=>setForm({...form,confirmed:e.target.checked})}/>I have verified the account holder and {form.action==='create'?'their email and role.':'approve this password reset.'}</label>
  </fieldset>{form.action==='create'&&<p className="admin-muted">Admins can access studio administration. Teachers receive a teacher login and an unpublished profile. No invitation email is sent.</p>}
  <div className="admin-editor-actions"><button type="button" disabled={busy} onClick={()=>setForm(null)}>Cancel</button><button type="submit" disabled={busy}>{busy?'Saving…':form.action==='create'?'Create account':'Reset password'}</button></div></form></Card>}
  {data&&<><div className="admin-client-tools"><label className="admin-client-search"><input aria-label="Search team accounts" placeholder="Search name, email or role…" value={query} onChange={e=>setQuery(e.target.value)}/></label></div><Card pad={0}><div className="admin-table-scroll"><table className="admin-table"><caption className="admin-client-caption">{rows.length} team accounts</caption><thead><tr>{['Name','Login email','Role','Last sign-in','Action'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.full_name}{r.id===data.actor?' (You)':''}</td><td>{r.email}</td><td>{r.role==='admin'?'Admin':'Teacher'}</td><td>{r.last_sign_in_at?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(r.last_sign_in_at))+' HKT':'Not signed in yet'}</td><td>{r.id!==data.actor&&<Button variant="soft" size="sm" disabled={busy} onClick={()=>{setReceipt(null);setForm({action:'reset',id:r.id,email:r.email,confirmed:false});}}>Reset password</Button>}</td></tr>)}</tbody></table></div>{!rows.length&&<p className="admin-panel-note">No team accounts match your search.</p>}</Card></>}
 </div>;
}
