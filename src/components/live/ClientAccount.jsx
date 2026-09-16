import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';
import { useAccount } from '../../supabase/useAccount.js';
import { clientAccountAction } from '../../supabase/clientAccounts.js';
import { LiveClientProfile, ClientHomeFrame } from './ClientProfile.jsx';
import { inputStyle } from '../../styles.js';

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

function ClientRecords({ onPasswordSaved, onLogout, onNavigate, mode, email, onOpen }) {
  const [state,setState]=useState({loading:true,data:null,error:false});
  const pending=useRef(null);
  const refresh=useCallback(async (background=false)=>{
    pending.current?.abort();const request=new AbortController();pending.current=request;
    if (!background) setState({loading:true,data:null,error:false});
    try {
      const {data,error}=await supabase.rpc('my_client_account').abortSignal(request.signal);
      if (error || !['active','not_linked','password_required','sign_in_required'].includes(data?.status)) throw new Error('unavailable');
      if (!request.signal.aborted) setState({loading:false,data,error:false});
    } catch { if (!request.signal.aborted) setState({loading:false,data:null,error:true}); }
  },[]);
  useEffect(()=>{
    refresh();const update=()=>{if (document.visibilityState==='visible') refresh(true);};
    const timer=setInterval(update,60000);window.addEventListener('focus',update);
    return ()=>{pending.current?.abort();clearInterval(timer);window.removeEventListener('focus',update);};
  },[refresh]);
  const data=state.data;
  const signOut=<div className="client-account-session"><span>{email}</span><Button variant="ghost" onClick={onLogout}>Sign out</Button></div>;
  if (state.loading) return <>{signOut}<p role="status">Loading your account…</p></>;
  if (state.error) return <>{signOut}<div role="alert"><p>Your records could not be loaded.</p><Button onClick={()=>refresh()}>Retry</Button></div></>;
  if (data.status==='not_linked') return <>{signOut}<p>Your login is not linked to a studio client record yet. Contact the studio to connect your packages and visits.</p></>;
  if (data.status==='sign_in_required') return <>{signOut}<p>Your session is no longer current. Please sign out and sign in again with your latest password.</p></>;
  if (data.status==='password_required') return <>{signOut}<SetPassword onSaved={onPasswordSaved} /></>;
  return <LiveClientProfile data={data} email={email} onLogout={onLogout} onNavigate={onNavigate} mode={mode} onOpen={onOpen}/>;
}

export function ClientAccount({mode="profile",onNavigate,onOpen}) {
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
  if(mode==='home' && !account.loading && (!account.user || account.profile?.role!=='client')) return <section className="live-section prototype-client-section"><ClientHomeFrame onNavigate={onNavigate} onOpen={onOpen}/></section>;
  return <section className="live-section client-account prototype-client-section">
    {!account.user && <h1>My account</h1>}
    {account.loading ? <p role="status">Checking account…</p> : !account.user ? <div className="client-account-form">
      <p>Sign in with the email and password provided by the studio to view your packages and visits.</p>
      <form onSubmit={login}>
        <label>Email<input aria-label="Email" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} style={inputStyle} /></label>
        <label>Password<input aria-label="Password" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} style={inputStyle} /></label>
        <Button type="submit" variant="accent" disabled={busy || !supabase}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <p>Need a login or forgot your password? <a href="https://wa.me/85298818081" target="_blank" rel="noopener noreferrer">Contact the studio</a>.</p>
    </div> : <>
      {account.profile?.role!=='client' && <Button variant="ghost" onClick={()=>logout()}>Sign out</Button>}
      {account.profile?.role==='client' ? <ClientRecords key={account.user.id} onPasswordSaved={()=>logout('Password updated. Sign in with your new password.')} onLogout={()=>logout()} email={account.user.email} onNavigate={onNavigate} mode={mode} onOpen={onOpen} /> : <p>Please sign out and use a client account to view your packages and visits.</p>}
    </>}
    {(notice || account.error) && <p role="status">{notice || account.error}</p>}
  </section>;
}
