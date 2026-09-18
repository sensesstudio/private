import { useEffect, useRef, useState } from 'react';
import { Button } from './index.jsx';
import { supabase } from '../../supabase/client.js';

export function PurchaseReceipt({ orderId }) {
  const [state, setState] = useState({}), request = useRef(0), popup = useRef(null);
  useEffect(() => {
    const clear = () => { request.current++; popup.current?.close(); popup.current = null; setState({}); };
    const { data } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') clear(); });
    return () => { request.current++; popup.current?.close(); popup.current = null; data.subscription.unsubscribe(); };
  }, [orderId]);
  async function open() {
    if (state.loading) return;
    const current = ++request.current;
    // Open during the click, before the async lookup, to support mobile browsers.
    const tab = window.open('about:blank', '_blank');
    if (tab) { tab.opener = null; tab.document.title = 'Loading receipt'; tab.document.body.textContent = 'Loading your receipt…'; }
    popup.current = tab; setState({ loading: true });
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', { body: { action: 'receipt', orderId } });
      if (error || !data?.url) throw new Error('unavailable');
      const url = new URL(data.url);
      if (url.protocol !== 'https:' || !['pay.stripe.com', 'receipt.stripe.com'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('invalid_url');
      if (current !== request.current) { tab?.close(); return; }
      popup.current = null;
      if (tab && !tab.closed) { tab.location.replace(url.href); setState({}); }
      else setState({ url: url.href });
    } catch {
      tab?.close();
      if (current === request.current) { popup.current = null; setState({ error: true }); }
    }
  }
  return <div style={{ marginTop: 16 }}>
    <Button size="sm" variant="soft" icon="download" disabled={state.loading} onClick={open}>{state.loading ? 'Loading receipt…' : 'View receipt / PDF'}</Button>
    <p style={{ fontSize: 12, color: 'var(--taupe)', lineHeight: 1.6 }}>Opens your Stripe receipt, where you can download a PDF.</p>
    {state.url && <a href={state.url} target="_blank" rel="noopener noreferrer">Open receipt to download PDF</a>}
    {state.error && <p role="alert">Your receipt could not be loaded. Please try again or contact the studio.</p>}
  </div>;
}
