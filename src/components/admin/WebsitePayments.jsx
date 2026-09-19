import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Icon } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';
import './payments.css';
import { ReceiptEmailSettings } from './ReceiptEmailSettings.jsx';
const statuses=['paid','pending','failed','expired','refunded'];
const title=value=>value[0].toUpperCase()+value.slice(1);
const when=value=>value?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(value))+' HKT':'—';
const money=value=>new Intl.NumberFormat('en-HK',{style:'currency',currency:'HKD'}).format(value);
export function WebsitePayments() {
  const [query,setQuery]=useState(''),[status,setStatus]=useState('all'),[page,setPage]=useState(0);
  const [state,setState]=useState({loading:true,data:null,error:false}),[connection,setConnection]=useState('checking');
  const pending=useRef(null);
  const refresh=useCallback(async(background=false)=>{
    pending.current?.abort();const request=new AbortController();pending.current=request;
    if(!background)setState({loading:true,data:null,error:false});
    try {
      const {data,error}=await supabase.rpc('admin_website_payments',{p_query:query,p_status:status,p_offset:page*25,p_limit:25}).abortSignal(request.signal);
      if(error||!Array.isArray(data?.items)||!Number.isSafeInteger(data.total))throw new Error('unavailable');
      if(!request.signal.aborted){const lastPage=Math.max(0,Math.ceil(data.total/25)-1);if(page>lastPage){setPage(lastPage);setState({loading:true,data:null,error:false});}else setState({loading:false,data,error:false});}
    }catch {if(!request.signal.aborted)setState({loading:false,data:null,error:true});}
  },[query,status,page]);
  useEffect(()=>{
    let active=true;
    supabase.functions.invoke('create-checkout',{body:{action:'availability'}}).then(({data,error})=>{
      if(active)setConnection(error?'unknown':data?.available?(data.livemode?'available':'test'):'unavailable');
    }).catch(()=>{if(active)setConnection('unknown');});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{
    const start=setTimeout(()=>refresh(),200);
    const automatic=()=>{if(document.visibilityState==='visible')refresh(true);};
    const interval=setInterval(automatic,60000);window.addEventListener('focus',automatic);document.addEventListener('visibilitychange',automatic);
    const auth=supabase.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){pending.current?.abort();setState({loading:false,data:null,error:true});}});
    return ()=>{clearTimeout(start);clearInterval(interval);window.removeEventListener('focus',automatic);document.removeEventListener('visibilitychange',automatic);pending.current?.abort();auth.data.subscription.unsubscribe();};
  },[refresh]);
  function filter(set,value){pending.current?.abort();setState({loading:true,data:null,error:false});setPage(0);set(value);}
  const {data,loading,error}=state,pages=Math.max(1,Math.ceil((data?.total||0)/25));
  return <section aria-label="Website payment records">
    <ReceiptEmailSettings/>
    <p role="status" className="admin-client-notice">{connection==='checking'?'Checking Stripe checkout…':connection==='available'?'Stripe checkout is available.':connection==='test'?'Stripe is in test mode. Only live website records are listed below.':connection==='unavailable'?'Stripe checkout is not enabled yet. Existing website records are shown below.':'Stripe connection could not be checked. Saved website records are shown below.'}</p>
    <div className="admin-client-tools"><label className="admin-client-search"><Icon n="search" size={16}/><input aria-label="Search payments" maxLength={200} placeholder="Search client, email, package or reference…" value={query} onChange={e=>filter(setQuery,e.target.value)}/></label>
      <select aria-label="Payment status" value={status} onChange={e=>filter(setStatus,e.target.value)}><option value="all">All statuses</option>{statuses.map(s=><option key={s} value={s}>{title(s)}</option>)}</select>
      <Button variant="soft" size="sm" disabled={loading} onClick={()=>refresh()}>Refresh records</Button>
    </div>
    {loading?<p role="status">Loading payment records…</p>:error?<Card><p role="alert">Payment records could not be loaded. Please check your admin session and try again.</p></Card>:data&&<Card pad={0}>
      <div className="admin-table-scroll"><table className="admin-table website-payments-table"><caption className="admin-client-caption">{data.total} records · Website Stripe checkout · HKD · Hong Kong time</caption>
        <thead><tr>{['Date','Client','Package','Amount','Status','Stripe reference'].map(h=><th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{data.items.map(r=><tr key={r.id}><td data-label="Date">{when(r.paid_at||r.created_at)}<small>{r.paid_at?'Payment received':'Checkout created'}</small></td><td data-label="Client"><strong>{r.client_name||'Name unavailable'}</strong><small>{r.client_email||'—'}</small></td><td data-label="Package">{r.package_name}<small>{r.format} · {r.credits} sessions</small></td><td data-label="Amount">{money(r.price_hkd)}</td><td data-label="Status"><span className="payment-status">{title(r.status)}</span></td><td data-label="Stripe reference">{r.stripe_session_id||'Awaiting checkout'}<small>Order: {r.id}</small></td></tr>)}</tbody>
      </table></div>
      {!data.items.length&&<div className="admin-empty-panel"><Icon n="credit-card" size={30}/><p>{query||status!=='all'?'No payment records match these filters.':'No website payment records yet.'}</p></div>}
      <div className="admin-client-pagination"><span>Page {page+1} of {pages}</span><div><Button variant="soft" size="sm" disabled={page===0} onClick={()=>setPage(page-1)}>Previous</Button><Button variant="soft" size="sm" disabled={page+1>=pages} onClick={()=>setPage(page+1)}>Next</Button></div></div>
    </Card>}
    <p className="admin-muted">Live website transactions only. Pending, failed and expired checkouts are not successful payments. Records refresh automatically every minute.</p>
  </section>;
}
