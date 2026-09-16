import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';
import { useAccount } from '../../supabase/useAccount.js';
import { clientAccountAction } from '../../supabase/clientAccounts.js';
import { inputStyle } from '../../styles.js';
const date=value=>value ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Asia/Hong_Kong'}).format(new Date(`${value}T00:00:00+08:00`)) : 'Not recorded';
const instant=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(value))+' HKT';

function SetPassword({ onSaved }) {
  const [current,setCurrent]=useState(''), [password,setPassword]=useState(''), [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false), [error,setError]=useState('');
  async function submit(e) {
    e.preventDefault();if (busy) return;
    if (password!==confirm) { setError('The new passwords do not match.');return; }
    setBusy(true);setError('');
    try {
      await clientAccountAction({action:'change-password',currentPassword:current,password});
      setCurrent('');setPassword('');setConfirm('');await onSaved();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="client-account-form"><h2>Choose your own password</h2><p>Change the temporary password before viewing your packages and visits. Use at least 12 characters with letters and numbers.</p>
    <form onSubmit={submit}>
      <label>Current password<input aria-label="Current password" type="password" autoComplete="current-password" required value={current} onChange={e=>setCurrent(e.target.value)} style={inputStyle} /></label>
      <label>New password<input aria-label="New password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} /></label>
      <label>Confirm new password<input aria-label="Confirm new password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={confirm} onChange={e=>setConfirm(e.target.value)} style={inputStyle} /></label>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" variant="accent" disabled={busy}>{busy ? 'Saving…' : 'Set password'}</Button>
    </form>
  </div>;
}

function ClientRecords({ onPasswordSaved }) {
  const [state,setState]=useState({loading:true,data:null,error:false});
  const pending=useRef(null);
  const refresh=useCallback(async (background=false)=>{
    pending.current?.abort();const request=new AbortController();pending.current=request;
    if (!background) setState({loading:true,data:null,error:false});
    try {
      const {data,error}=await supabase.rpc('my_client_account').abortSignal(request.signal);
      if (error || !['active','not_linked','password_required'].includes(data?.status)) throw new Error('unavailable');
      if (!request.signal.aborted) setState({loading:false,data,error:false});
    } catch { if (!request.signal.aborted) setState({loading:false,data:null,error:true}); }
  },[]);
  useEffect(()=>{
    refresh();const update=()=>{if (document.visibilityState==='visible') refresh(true);};
    const timer=setInterval(update,60000);window.addEventListener('focus',update);
    return ()=>{pending.current?.abort();clearInterval(timer);window.removeEventListener('focus',update);};
  },[refresh]);
  const data=state.data;
  if (state.loading) return <p role="status">Loading your account…</p>;
  if (state.error) return <div role="alert"><p>Your records could not be loaded.</p><Button onClick={()=>refresh()}>Retry</Button></div>;
  if (data.status==='not_linked') return <p>Your login is not linked to a studio client record yet. Contact the studio to connect your packages and visits.</p>;
  if (data.status==='password_required') return <SetPassword onSaved={onPasswordSaved} />;
  return <>
    <p className="client-account-welcome">Welcome, {data.name}.</p>
    <h2>My visits</h2>
    <div className="client-account-visits">
      {data.private_lifetime && <Card pad={20}><h3>Private lifetime</h3><p>{data.private_lifetime.sessions} sessions attended</p><small>Records updated {date(data.private_lifetime.as_of)}</small></Card>}
      <Card pad={20}><h3>Last visit</h3><p>{data.last_visit?.never_attended ? 'Never attended' : date(data.last_visit?.date)}</p>{data.last_visit?.as_of && <small>Records updated {date(data.last_visit.as_of)}</small>}</Card>
      <Card pad={20}><h3>Next visit</h3><p>{data.next_visit?.at ? instant(data.next_visit.at) : data.next_visit?.no_booking ? 'No upcoming booking' : 'Not recorded'}</p>{data.next_visit?.at && data.next_visit.details && <p>{data.next_visit.details}</p>}{data.next_visit?.as_of && <small>Records updated {date(data.next_visit.as_of)}</small>}</Card>
    </div>
    <p className="client-account-note">Visit dates are from studio records. Contact the studio for booking changes. Full visit history is not available here yet.</p>
    <h2>My packages</h2>
    {!data.packages?.length && <p>No packages on your studio record yet.</p>}
    <div className="client-account-packages">{data.packages?.map(pack=><Card pad={22} key={pack.id}>
      <h3>{pack.name}</h3><p className="client-account-balance"><strong>{pack.remaining}</strong> / {pack.total} sessions remaining</p>
      <dl><div><dt>Sessions used</dt><dd>{Math.max(0,pack.total-pack.remaining)}</dd></div><div><dt>Purchase date</dt><dd>{date(pack.purchased_on)}</dd></div><div><dt>Expiry date</dt><dd>{date(pack.expires_on)}</dd></div></dl>
      {pack.needs_review && <p>Balance needs review. Please confirm with the studio.</p>}
      {pack.current===false && <p>This package is not currently usable in Mindbody.</p>}
      <p className="client-account-note">{pack.synced_at ? `Mindbody last updated ${instant(pack.synced_at)}.${pack.sync_status!=='synced' || Date.now()-new Date(pack.synced_at).getTime()>30*60000 ? ' Update delayed; showing last available values.' : ''}` : 'Studio record · Not yet linked to Mindbody.'}</p>
    </Card>)}</div>
  </>;
}

export function ClientAccount() {
  const account=useAccount();
  const [email,setEmail]=useState(''), [password,setPassword]=useState(''), [busy,setBusy]=useState(false), [notice,setNotice]=useState('');
  async function login(e) {
    e.preventDefault();if (busy || !supabase) return;
    setBusy(true);setNotice('');
    try { const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if (error) throw error;setPassword(''); }
    catch { setNotice('Sign-in failed. Check your email and password.'); }
    finally { setBusy(false); }
  }
  async function logout(message='') {
    const {error}=await supabase.auth.signOut();
    if (error) { setNotice('Sign-out failed. Please retry.');return; }
    setPassword('');setNotice(message);
  }
  return <section className="live-section client-account">
    <h1>My account</h1>
    {account.loading ? <p role="status">Checking account…</p> : !account.user ? <div className="client-account-form">
      <p>Sign in with the email and password provided by the studio to view your packages and visits.</p>
      <form onSubmit={login}>
        <label>Email<input aria-label="Email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} /></label>
        <label>Password<input aria-label="Password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} /></label>
        <Button type="submit" variant="accent" disabled={busy || !supabase}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <p>Need a login or forgot your password? <a href="https://wa.me/85298818081" target="_blank" rel="noopener noreferrer">Contact the studio</a>.</p>
    </div> : <>
      <div className="client-account-session"><span>{account.user.email}</span><Button variant="ghost" onClick={()=>logout()}>Sign out</Button></div>
      {account.profile?.role==='client' ? <ClientRecords key={account.user.id} onPasswordSaved={()=>logout('Password updated. Sign in with your new password.')} /> : <p>Please sign out and use a client account to view your packages and visits.</p>}
    </>}
    {(notice || account.error) && <p role="status">{notice || account.error}</p>}
  </section>;
}
