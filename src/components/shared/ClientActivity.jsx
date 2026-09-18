import { useEffect, useRef, useState } from 'react';
import { Button, Card } from './index.jsx';
import { supabase } from '../../supabase/client.js';
import './client-activity.css';
import { PurchaseReceipt } from './PurchaseReceipt.jsx';

const PAGE_SIZE=20;
const when=value=>value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(value))+' HKT' : 'Not recorded';
const money=value=>`HK$${Number(value).toLocaleString('en-HK')}`;
const status=value=>({paid:'Paid',refunded:'Refunded',pending:'Pending',failed:'Failed'}[value] || 'Not recorded');

function useActivity(kind,clientId) {
  const [page,setPage]=useState(0),[retry,setRetry]=useState(0);
  const [state,setState]=useState({loading:true,data:null,error:false});
  useEffect(()=>{
    let active=true,sequence=0,controller,identity;
    setState({loading:true,data:null,error:false});
    const clear=()=>{sequence++;controller?.abort();setState({loading:false,data:null,error:true});};
    async function load() {
      const request=++sequence;controller?.abort();controller=new AbortController();
      try {
        const {data:session}=await supabase.auth.getSession();
        if(!active || request!==sequence)return;
        if(!session.session) {clear();return;}
        identity=session.session.user.id;
        const args={p_kind:kind,p_offset:page*PAGE_SIZE,p_limit:PAGE_SIZE};
        if(clientId)args.p_client_id=clientId;
        const {data,error}=await supabase.rpc(clientId?'admin_client_activity':'my_client_activity',args).abortSignal(controller.signal);
        if(!active || request!==sequence)return;
        if(error || !Array.isArray(data?.items) || !Number.isInteger(data.total))throw new Error('unavailable');
        if(page>0 && page*PAGE_SIZE>=data.total) {setPage(Math.max(0,Math.ceil(data.total/PAGE_SIZE)-1));return;}
        setState({loading:false,data,error:false});
      } catch {if(active && request===sequence)setState({loading:false,data:null,error:true});}
    }
    const focus=()=>{if(!document.hidden)load();};
    const {data:subscription}=supabase.auth.onAuthStateChange((event,session)=>{
      if(event==='SIGNED_OUT' || (identity && identity!==session?.user?.id)) {
        clear();identity=session?.user?.id;if(session)queueMicrotask(load);
      }
    });
    load();const timer=setInterval(focus,60000);
    window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
    return()=>{active=false;sequence++;controller?.abort();clearInterval(timer);subscription.subscription.unsubscribe();window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
  },[kind,clientId,page,retry]);
  return {...state,page,setPage,reload:()=>setRetry(n=>n+1)};
}

function ProgressPhoto({photo,index}) {
  const [state,setState]=useState({}),timer=useRef(),request=useRef(0);
  useEffect(()=>()=>{request.current++;clearTimeout(timer.current);},[photo.storage_path]);
  async function show() {
    const id=++request.current;clearTimeout(timer.current);setState({loading:true});
    try {
      const {data,error}=await supabase.storage.from('session-photos').createSignedUrl(photo.storage_path,60);
      if(id!==request.current)return;
      if(error || !data?.signedUrl)throw new Error('unavailable');
      setState({url:data.signedUrl});timer.current=setTimeout(()=>setState({expired:true}),60000);
    } catch {if(id===request.current)setState({error:true});}
  }
  return <div className="client-progress-photo">{state.url ? <img src={state.url} alt={`Session progress photo ${index+1}`} onError={()=>setState({error:true})}/> : <><Button size="sm" variant="soft" disabled={state.loading} onClick={show}>{state.loading?'Loading photo…':`View photo ${index+1}`}</Button>{state.error && <p role="alert">Photo unavailable. Please try again.</p>}{state.expired && <p>Photo link expired. Open it again to view.</p>}</>}</div>;
}
function ProgressEntry({item}) {
  return <Card pad={22}><div className="client-activity-head"><h3>{item.focus || 'Session note'}</h3><span>{when(item.session_at || item.created_at)}</span></div><p className="client-activity-meta">{item.teacher_name || 'Instructor not recorded'}{item.studio_name?` · ${item.studio_name}`:''}</p><p className="client-activity-note">{item.note || 'No written note recorded.'}</p>{!!item.photos?.length && <div className="client-progress-photos">{item.photos.map((p,i)=><ProgressPhoto key={p.id} photo={p} index={i}/>)}</div>}<p className="client-activity-meta">Note saved {when(item.created_at)}</p></Card>;
}
function PaymentEntry({item}) {
  return <Card pad={22}><div className="client-activity-head"><h3>{item.package_name || 'Payment'}</h3><strong>{money(item.amount_hkd)}</strong></div><dl className="client-activity-fields"><div><dt>Date</dt><dd>{when(item.created_at)}</dd></div><div><dt>Status</dt><dd>{status(item.status)}</dd></div><div><dt>Payment method</dt><dd>{item.method==='stripe'?'Stripe':item.method || 'Not recorded'}</dd></div>{item.format && <div><dt>Format</dt><dd>{item.format}</dd></div>}<div><dt>Payment reference</dt><dd>{item.id}</dd></div></dl></Card>;
}
function OnlinePackage({item,canViewReceipt}) {
  return <Card pad={22}><div className="client-activity-head"><h3>{item.package_name} · {item.format}</h3><strong>{money(item.price_hkd)}</strong></div><p>{item.credits} sessions purchased · {status(item.payment_status)}</p><p className="client-activity-meta">Purchased {when(item.paid_at)}</p><p>Valid for {item.validity_months} month{item.validity_months===1?'':'s'} from first visit.</p><p className="client-activity-meta">An expiry date and remaining balance for this purchase have not been recorded. Contact the studio to confirm usage.</p>{canViewReceipt && <PurchaseReceipt orderId={item.id}/>}</Card>;
}
const config={
  progress:{title:'Your session story',empty:'No session notes or progress photos recorded yet.',Entry:ProgressEntry},
  payments:{title:'Payment history',empty:'No online payment records yet. Imported package purchase amounts are shown with the studio packages.',Entry:PaymentEntry},
  packages:{title:'Packages purchased online',empty:'No packages purchased online yet.',Entry:OnlinePackage},
};
export function ClientActivity({kind,clientId}) {
  const state=useActivity(kind,clientId),{title,empty,Entry}=config[kind];
  return <section className="client-activity" aria-label={title}><h2>{title}</h2>
    {state.loading ? <p role="status">Loading records…</p> : state.error ? <Card><p role="alert">Records could not be loaded. Please retry or sign in again.</p><Button size="sm" onClick={state.reload}>Retry records</Button></Card> : state.data && <>
      {!state.data.linked ? <Card><p>This client does not have a linked login yet. Studio package records are shown below.</p></Card> : state.data.items.length ? <div className="client-activity-list">{state.data.items.map(item=><Entry key={item.id} item={item} canViewReceipt={!clientId}/>)}</div> : <Card><p>{empty}</p></Card>}
      {state.data.total>PAGE_SIZE && <nav className="client-activity-pages" aria-label={`${title} pages`}><Button size="sm" variant="soft" disabled={!state.page} onClick={()=>state.setPage(p=>p-1)}>Previous</Button><span>{state.page*PAGE_SIZE+1}–{Math.min((state.page+1)*PAGE_SIZE,state.data.total)} of {state.data.total}</span><Button size="sm" variant="soft" disabled={(state.page+1)*PAGE_SIZE>=state.data.total} onClick={()=>state.setPage(p=>p+1)}>Next</Button></nav>}
      <p className="client-activity-meta">Updates automatically every minute · Checked {when(state.data.as_of)}</p>
    </>}
  </section>;
}
