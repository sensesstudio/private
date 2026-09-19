import { useEffect, useState } from 'react';
import { Button, Card } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';
export function WaiverEmailSettings() {
 const [data,setData]=useState(null),[key,setKey]=useState(''),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{let active=true;supabase.rpc('waiver_mail_settings').then(({data,error})=>{if(active){setData(error?null:data);setError(!!error);}});return()=>{active=false;};},[]);
 async function save(event){event.preventDefault();setBusy(true);setError(false);
  try{const {data,error}=await supabase.rpc('waiver_mail_settings',{p_key:key.trim()||null,p_enabled:true});if(error||!data)throw error;setData(data);setKey('');setOpen(false);}catch{setError(true);}finally{setBusy(false);}
 }
 return <Card pad={22}><div className="client-activity-head"><h3>Liability waiver emails</h3><Button size="sm" variant="soft" onClick={()=>{setKey('');setOpen(v=>!v);}}>Waiver email settings</Button></div>
  <p>{data?.configured&&data.enabled?'Automatic waiver email is configured.':'Connect email delivery to send signed liability waivers automatically.'}</p>
  <p className="admin-muted">Each email includes the complete signed waiver, participant and signer names, signing time and document version.</p>
  {data?.counts&&<p className="admin-muted">{data.counts.sent} accepted by email provider · {data.counts.queued} queued · {data.counts.failed} need attention</p>}
  {open&&<form onSubmit={save} style={{display:'grid',gap:12,maxWidth:620}}><p>Sender: <strong>cs@senses-studio.co</strong>. First verify senses-studio.co in <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer">Resend</a>, then enter your <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer">API key</a> below.</p><label>Resend API key<input style={{display:'block',width:'100%'}} type="password" autoComplete="off" value={key} onChange={e=>setKey(e.target.value)} placeholder={data?.configured?'Leave blank to keep saved key':'re_…'} required={!data?.configured}/></label><p className="admin-muted">Your key is encrypted and is not displayed after saving. New signatures are queued automatically. Queued confirmations will be sent once connected. Earlier signatures are not emailed retrospectively.</p><Button type="submit" disabled={busy}>{busy?'Saving…':'Save & enable waiver emails'}</Button></form>}
  {error&&<p role="alert">Waiver email settings could not be loaded or saved. Please check your admin session and API key.</p>}
 </Card>;
}
