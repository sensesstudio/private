import { useEffect, useState } from 'react';
import { Button, Card } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';
import { clientAccountAction } from '../../supabase/clientAccounts.js';

export function ClientLoginAccess({ client }) {
  const [link,setLink]=useState(null), [loading,setLoading]=useState(true), [busy,setBusy]=useState(false);
  const [confirmed,setConfirmed]=useState(false), [credentials,setCredentials]=useState(null), [notice,setNotice]=useState(''), [error,setError]=useState('');
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    const request=new AbortController();
    setLoading(true);setError('');setConfirmed(false);setCredentials(null);setNotice('');
    supabase.from('studio_client_accounts').select('login_email,password_changed_at').eq('client_id',client.id).maybeSingle().abortSignal(request.signal).then(({data,error})=>{
      if (request.signal.aborted) return;
      if (error) setError('Login status could not be loaded. Please retry.');
      else setLink(data);
      setLoading(false);
    });
    return ()=>request.abort();
  },[client.id,retry]);
  async function create() {
    if (busy || !confirmed) return;
    setBusy(true);setError('');
    try {
      const result=await clientAccountAction({action:'create',clientId:client.id,email:client.email,confirmedEmail:true});
      if (!result?.email || !result?.temporary_password) throw new Error('Could not confirm login setup. Reload to check its status.');
      setCredentials(result);setLink({login_email:result.email,password_changed_at:null});
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(`Sign in: ${window.location.origin}/?account=1#client\nEmail: ${credentials.email}\nTemporary password: ${credentials.temporary_password}\nPlease change your password on first sign-in.`);
      setNotice('Login details copied. Share directly with this client.');
    } catch { setNotice('Copy is unavailable. Select the login details below to copy them.'); }
  }
  return <Card pad={22}>
    <h2 className="admin-card-title">Client login</h2>
    {loading ? <p role="status">Checking login…</p> : <>
      {link ? <><p>Login email: <strong>{link.login_email}</strong></p><p>{link.password_changed_at ? 'Active · Password set by client' : 'Created · Waiting for first password change'}</p>
        {!credentials && <p className="admin-muted">Passwords are not displayed again. Contact studio support if the client needs help signing in.</p>}</> : <>
        <p>Use the client email to sign in and view their own packages and visits.</p>
        {!client.email ? <p>Add an email using Edit client before creating a login.</p> : <>
          <label className="admin-login-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />I have verified that {client.email} belongs to this client.</label>
          <p className="admin-muted">A unique temporary password will be shown once. The client must change it on first sign-in. Hand over the details directly; no email is sent.</p>
          <Button size="sm" disabled={busy || !confirmed || !!error} onClick={create}>{busy ? 'Creating login…' : 'Create login'}</Button>
        </>}
      </>}
      {credentials && <div className="admin-login-credentials">
        <p><strong>Email</strong><br />{credentials.email}</p><p><strong>Temporary password</strong><br /><code>{credentials.temporary_password}</code></p>
        <p>Copy these details before leaving this page.</p><Button size="sm" variant="soft" onClick={copy}>Copy login details</Button>
      </div>}
    </>}
    {error && <div role="alert"><p>{error}</p><Button size="sm" variant="ghost" onClick={()=>setRetry(n=>n+1)}>Reload login status</Button></div>}
    {notice && <p role="status">{notice}</p>}
  </Card>;
}
