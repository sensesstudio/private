import { useEffect, useState } from 'react';
import { clientAuthReady, googleSignInAvailable, supabase } from '../../supabase/client.js';
import './google-sign-in.css';

export function GoogleReturnNotice() {
  const [notice, setNotice] = useState(null);
  useEffect(() => { let active = true; clientAuthReady.then(value => { if (active) setNotice(value); }); return () => { active = false; }; }, []);
  return notice ? <p className="google-return-notice" role="alert">{notice}</p> : null;
}

export function GoogleSignIn({ destination = 'account', disabled = false }) {
  const [availability, setAvailability] = useState('loading');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const request = new AbortController(), timer = setTimeout(() => request.abort(), 10000);
    googleSignInAvailable(request.signal).then(available => { if (active) setAvailability(available ? 'ready' : 'disabled'); })
      .catch(() => { if (active) setAvailability('error'); }).finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); request.abort(); };
  }, []);
  async function login() {
    if (busy || disabled || availability !== 'ready') return;
    setBusy(true); setError('');
    try {
      // Only fixed, same-origin client destinations. No caller-controlled next URL.
      const redirectTo = new URL('/', window.location.origin);
      redirectTo.searchParams.set(destination === 'pricing' ? 'pricing' : 'account', '1');
      redirectTo.searchParams.set('oauth', 'google');
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: {
        redirectTo: redirectTo.href, queryParams: { prompt: 'select_account' },
      } });
      if (error) throw error;
    } catch { setError('Google sign-in could not start. Please try again or use email.'); setBusy(false); }
  }
  return <div className="google-sign-in">
    <button type="button" className="google-sign-in-button" onClick={login} disabled={disabled || busy || availability !== 'ready'}>
      <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z"/>
        <path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.78-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19Z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/>
      </svg>
      {busy ? 'Connecting to Google…' : 'Continue with Google'}
    </button>
    <p className="google-sign-in-help">{availability === 'disabled' ? 'Google sign-in is coming soon. Please use email for now.' : availability === 'error' ? 'Google sign-in is temporarily unavailable. Please use email or reload the page.' : 'New here? Google creates your account. Existing clients, use your studio email.'}</p>
    {error && <p role="alert">{error}</p>}
    <div className="google-sign-in-divider"><span>or use email</span></div>
  </div>;
}
