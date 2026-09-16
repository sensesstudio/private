import { useEffect, useState } from 'react';
import { Button } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';
import { useAccount } from '../../supabase/useAccount.js';
import { inputStyle } from '../../styles.js';

// Run for every client entry point, including the return from pricing OAuth.
export function ClientOnboarding({ children }) {
  const account = useAccount();
  const [check, setCheck] = useState(null), [retry, setRetry] = useState(0);
  const [name, setName] = useState(''), [phone, setPhone] = useState('+852 ');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const userId = account.profile?.role === 'client' ? account.user?.id : null;
  useEffect(() => {
    let active = true;
    setCheck(null); setError('');
    if (!userId) return () => { active = false; };
    (async () => {
      try {
        const { data, error: failure } = await supabase.rpc('ensure_my_client_profile');
        if (failure || !['ready','not_applicable','onboarding_required','link_required'].includes(data?.status)) throw failure || new Error();
        if (!active) return;
        setCheck({ ...data, userId });
        if (data.status === 'onboarding_required') { setName(data.name || ''); setPhone(data.phone || '+852 '); }
      } catch { if (active) setCheck({ status: 'error', userId }); }
    })();
    return () => { active = false; };
  }, [userId, retry]);

  async function save(event) {
    event.preventDefault(); if (busy) return;
    const mobile = phone.replace(/[\s().-]/g, '');
    if (!/^\+[1-9]\d{6,14}$/.test(mobile)) { setError('Enter a valid mobile number including the country code.'); return; }
    setBusy(true); setError('');
    try {
      const { data, error: failure } = await supabase.rpc('complete_my_client_profile', { p_name: name.trim(), p_phone: mobile });
      if (failure || data?.status !== 'ready') throw failure || new Error();
      setCheck({ status: 'ready', userId });
    } catch { setError('We could not save your details. Please retry, or sign in again.'); }
    finally { setBusy(false); }
  }
  async function signOut() {
    const result = await supabase.auth.signOut();
    if (result.error) setError('Could not sign out. Please retry.');
  }
  const checking = account.loading || (userId && check?.userId !== userId);
  const allowed = !userId || ['ready','not_applicable'].includes(check?.status);
  // Preserve the selected pack and sign-in form during Auth's loading events.
  // A confirmed onboarding requirement unmounts records until creation finishes.
  return <><div hidden={checking || !allowed} style={{display: !checking && allowed ? 'contents' : 'none'}}>{checking || allowed ? children : null}</div>
    {checking ? <section className="live-section" role="status">Preparing your account…</section> : !allowed && <section className="live-section live-login">
    {check.status === 'onboarding_required' ? <>
      <h1>Welcome to Senses</h1><p>Complete your profile so the studio can contact you about your sessions.</p>
      <form onSubmit={save}>
        <label>Full name<input style={inputStyle} autoComplete="name" required maxLength={200} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Email<input style={inputStyle} type="email" autoComplete="email" readOnly value={check.email} /></label>
        <label>Mobile number<input style={inputStyle} type="tel" autoComplete="tel" required maxLength={32} value={phone} onChange={e => setPhone(e.target.value)} aria-describedby="onboarding-phone-help" /></label>
        <p id="onboarding-phone-help">Include your country code, for example +852 for Hong Kong.</p>
        <button className="live-link" type="submit" disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save and continue'}</button>
      </form>
    </> : check.status === 'link_required' ? <>
      <h1>Connect your studio record</h1><p>Please contact the studio to connect your existing client record. Your packages will stay with that record.</p>
      <a className="live-link" href="https://wa.me/85298818081" target="_blank" rel="noopener noreferrer">Contact the studio</a>
    </> : <><h1>Finish setting up your account</h1><p>We could not load your profile. Please retry.</p><Button onClick={() => setRetry(r => r + 1)}>Retry</Button></>}
    {error && <p role="alert">{error}</p>}
    <Button variant="ghost" disabled={busy} onClick={signOut}>Sign out</Button>
  </section>}</>;
}
