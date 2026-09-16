import { useEffect, useState } from 'react';
import { Button, Icon, Pill, Segmented, Sheet } from '../shared/index.jsx';
import { supabase } from '../../supabase/client.js';
import { useAccount } from '../../supabase/useAccount.js';
import { startCheckout } from '../../supabase/checkout.js';
import { inputStyle } from '../../styles.js';
import './pricing.css';

const hkd = value => `HK$${Number(value).toLocaleString('en-HK')}`;
function ClientSignIn({ onClose }) {
  const [signup, setSignup] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  async function submit(e) {
    e.preventDefault(); if (busy || !supabase) return;
    setBusy(true); setNotice('');
    try {
      const result = signup ? await supabase.auth.signUp({ email: email.trim(), password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/?pricing=1#client` } }) :
        await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      setPassword('');
      if (signup && !result.data.session) setNotice('Check your email to confirm your account, then return here to sign in.');
      else onClose();
    } catch { setNotice(signup ? 'Could not create an account. Please check your details or try signing in.' : 'Sign-in failed. Check your email and password.'); }
    finally { setBusy(false); }
  }
  return <Sheet open onClose={onClose}><section className="live-section pricing-auth">
    <h2>{signup ? 'Create a client account' : 'Client sign-in'}</h2>
    <p>Sign in to keep your package purchases together.</p>
    <form onSubmit={submit}>
      {signup && <label>Full name<input aria-label="Full name" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></label>}
      <label>Email<input aria-label="Email" type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} /></label>
      <label>Password<input aria-label="Password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : undefined} value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} /></label>
      {notice && <p role="status">{notice}</p>}
      <Button type="submit" full variant="accent" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</Button>
    </form>
    <Button variant="ghost" onClick={() => { setSignup(!signup); setNotice(''); }}>{signup ? 'Already have an account? Sign in' : 'New here? Create account'}</Button>
    <Button variant="ghost" onClick={onClose}>Back to pricing</Button>
  </section></Sheet>;
}

export function ClientPricing({ onBrowse }) {
  const account = useAccount();
  const [format, setFormat] = useState('1:1'), [authOpen, setAuthOpen] = useState(false);
  const [catalog, setCatalog] = useState({ loading: true, packages: [], error: false, available: false });
  const [refresh, setRefresh] = useState(0), [buying, setBuying] = useState(null), [notice, setNotice] = useState('');
  const [purchases, setPurchases] = useState({ rows: [], error: false, loading: false });
  const [sessionId, setSessionId] = useState(() => new URLSearchParams(window.location.search).get('session_id'));
  const [payment, setPayment] = useState(null), [check, setCheck] = useState(0);
  const canceled = new URLSearchParams(window.location.search).get('checkout') === 'cancel';
  const userId = account.profile?.role === 'client' ? account.user?.id : null;
  useEffect(() => {
    let active = true;
    setCatalog({ loading: true, packages: [], error: false, available: false });
    async function load() {
      try {
        if (!supabase) throw new Error('unavailable');
        const [packages, readiness] = await Promise.all([
          supabase.from('packages').select('id,name,credits,price_hkd,validity_months,tag,format,is_trial,sort_order').eq('active', true).order('sort_order'),
          supabase.functions.invoke('create-checkout', { body: { action: 'availability' } }),
        ]);
        if (packages.error) throw packages.error;
        if (active) setCatalog({ loading: false, packages: packages.data || [], error: false, available: !readiness.error && readiness.data?.available === true, test: readiness.data?.livemode === false });
      } catch { if (active) setCatalog({ loading: false, packages: [], error: true, available: false }); }
    }
    load(); return () => { active = false; };
  }, [refresh]);
  useEffect(() => {
    let active = true;
    setPurchases({ rows: [], error: false, loading: !!userId });
    if (userId) supabase.from('package_checkout_orders').select('id,package_name,format,credits,price_hkd,validity_months,paid_at').eq('client_id', userId).eq('status','paid').order('paid_at', { ascending: false }).limit(100)
      .then(({ data, error }) => { if (active) setPurchases({ rows: error ? [] : data || [], error: !!error, loading: false }); });
    return () => { active = false; };
  }, [userId, refresh, payment?.status]);
  useEffect(() => {
    let active = true, timer, attempts = 0;
    setPayment(null);
    async function verify() {
      const result = await supabase.functions.invoke('create-checkout', { body: { action: 'status', sessionId } });
      if (!active) return;
      if (result.error || !['paid','pending','expired'].includes(result.data?.status)) setPayment({ status: 'error' });
      else {
        setPayment(result.data);
        if (result.data.status === 'pending' && ++attempts < 10) timer = setTimeout(verify, 3000);
      }
    }
    if (sessionId && userId) verify();
    return () => { active = false; clearTimeout(timer); };
  }, [sessionId, userId, check]);
  async function buy(pkg) {
    if (!account.user) { setAuthOpen(true); return; }
    if (!userId) { setNotice('Please sign in with a client account to buy a package.'); return; }
    if (buying) return;
    setBuying(pkg.id); setNotice('');
    try {
      const result = await startCheckout(pkg.id);
      if (!result.ok) setNotice(result.error);
      else if (result.session_id) { setSessionId(result.session_id); setCheck(n => n + 1); }
    } catch { setNotice('Could not start checkout. Please try again.'); }
    finally { setBuying(null); }
  }
  async function logout() {
    const result = await supabase.auth.signOut();
    if (result.error) setNotice('Could not sign out. Please try again.');
    else { setNotice(''); setSessionId(null); }
  }
  return <section className="client-pricing">
    <h1>Pricing</h1><p className="pricing-subtitle">Private 1:1 &amp; semi-private 1:2 · prepaid class packs.</p>
    <div className="pricing-account">{account.user ? <><span>{account.profile?.full_name || 'Your account'}</span><Button variant="ghost" size="sm" onClick={logout}>Sign out</Button></> : <Button variant="ghost" size="sm" onClick={() => setAuthOpen(true)}>Sign in</Button>}</div>
    {sessionId && <div className="pricing-notice" role="status">
      {!userId ? 'Sign in with the account used at checkout to confirm your purchase.' : payment?.status === 'paid' ? `Payment confirmed. ${payment.credits} session${payment.credits === 1 ? '' : 's'} added for ${payment.package_name} (${payment.format}).` : payment?.status === 'expired' ? 'This checkout has expired. You can choose a package below.' : payment?.status === 'error' ? 'We could not confirm your payment yet. Please check again before starting another checkout.' : 'Checking your payment. Your package will appear once Stripe confirms payment.'}
      {userId && payment?.status !== 'paid' && <Button variant="ghost" size="sm" onClick={() => setCheck(n => n + 1)}>Check payment status</Button>}
    </div>}
    {canceled && !sessionId && <p className="pricing-notice" role="status">Checkout cancelled. You can choose a package when ready.</p>}
    <Segmented options={[{ value: '1:1', label: 'Private · 1:1' }, { value: '1:2', label: 'Semi-private · 1:2' }]} value={format} onChange={setFormat} style={{ marginTop: 18, width: '100%', display: 'flex' }} />
    {format === '1:2' && <p className="pricing-pair-note">Prices are the total for two people sharing the session.</p>}
    {catalog.loading ? <p role="status">Loading packages…</p> : catalog.error ? <p role="alert">Packages could not be loaded. <Button variant="ghost" onClick={() => setRefresh(n => n + 1)}>Retry pricing</Button></p> : <>
      {!catalog.available && <p className="pricing-notice" role="status">Online payments are temporarily unavailable. Please contact the studio or <button onClick={() => setRefresh(n => n + 1)}>retry</button>.</p>}
      {catalog.test && <p className="pricing-notice">Test checkout · No live payment</p>}
      <div className="pricing-packs">{catalog.packages.filter(p => p.format === format).map(pkg => <article className="pricing-pack" data-popular={pkg.tag === 'Most chosen'} key={pkg.id}>
        {pkg.tag === 'Most chosen' && <span className="pricing-popular"><Pill color="#fff" bg="var(--accent)">Most chosen</Pill></span>}
        <div className="pricing-pack-head"><div><h2>{pkg.name}</h2><p>{pkg.is_trial ? 'A session to find your fit.' : pkg.credits === 1 ? 'One session, pay as you go.' : `${pkg.credits} prepaid sessions.`}</p></div><div className="pricing-price"><strong>{hkd(pkg.price_hkd)}</strong>{pkg.credits > 1 && <span>{hkd(pkg.price_hkd / pkg.credits)}/session</span>}</div></div>
        <div className="pricing-pack-detail"><Icon n="check-circle-2" size={15} color="var(--accent)" /><span>{pkg.credits} {format === '1:1' ? 'private' : 'semi-private'} session{pkg.credits === 1 ? '' : 's'}</span></div>
        <div className="pricing-pack-validity"><Icon n="calendar-clock" size={15} color="var(--taupe)" /><span>Valid for {pkg.validity_months} month{pkg.validity_months === 1 ? '' : 's'} from first visit</span></div>
        {pkg.is_trial && <p className="pricing-trial-note">One trial purchase per account, per format.</p>}
        <Button full variant="accent" disabled={!catalog.available || !!buying || account.loading} onClick={() => buy(pkg)}>{buying === pkg.id ? 'Starting checkout…' : `Buy · ${hkd(pkg.price_hkd)}`}</Button>
      </article>)}</div>
      {!catalog.packages.some(p => p.format === format) && <p>No packages are currently available for this format.</p>}
    </>}
    {notice && <p className="pricing-notice" role="alert">{notice}</p>}
    <p className="pricing-notice">Pay securely with Stripe. Buying a pack does not reserve a session. Contact the studio to arrange your first visit.</p>
    <Button full variant="accent" size="lg" iconRight="arrow-right" onClick={onBrowse}>Find my instructor</Button>
    {userId && <section className="pricing-purchases"><h2>Your purchases on this app</h2>
      {purchases.loading ? <p>Loading purchases…</p> : purchases.error ? <p>Purchases could not be loaded. <Button variant="ghost" size="sm" onClick={() => setRefresh(n => n + 1)}>Refresh purchases</Button></p> : purchases.rows.length ? purchases.rows.map(p => <article key={p.id}><strong>{p.package_name} · {p.format}</strong><span>{p.credits} sessions purchased · {hkd(p.price_hkd)}</span><span>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Hong_Kong' }).format(new Date(p.paid_at))} · Payment confirmed</span></article>) : <p>No purchases on this app yet.</p>}
    </section>}
    {authOpen && <ClientSignIn onClose={() => setAuthOpen(false)} />}
  </section>;
}
