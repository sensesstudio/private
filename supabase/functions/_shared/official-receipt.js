import { INTEGRATION } from './payments.js';
export const TERMS_VERSION = '2026-09-15';
export const SUPPORT_EMAIL = 'cs@senses-studio.co';
export function stripeReceiptUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['pay.stripe.com', 'receipt.stripe.com'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('invalid_receipt_url');
  return url.href;
}
export async function verifiedPurchase(stripe, order) {
  if (order.status !== 'paid' || !order.stripe_session_id) throw new Error('payment_not_confirmed');
  const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, { expand: ['payment_intent.latest_charge'] });
  const intent = session.payment_intent, charge = intent?.latest_charge;
  if (session.id !== order.stripe_session_id || session.metadata?.integration !== INTEGRATION || session.metadata?.order_id !== order.id ||
      session.client_reference_id !== order.client_id || session.mode !== 'payment' || session.payment_status !== 'paid' ||
      session.livemode !== order.livemode || session.amount_total !== order.price_hkd * 100 || session.currency !== 'hkd' ||
      intent?.status !== 'succeeded' || charge?.paid !== true || charge?.status !== 'succeeded' ||
      charge?.amount !== session.amount_total || charge?.currency !== session.currency || charge?.livemode !== order.livemode) throw new Error('receipt_not_verified');
  return { session, charge };
}
export async function getOfficialReceipt({admin, stripe, renderPdf}, order) {
  const { charge } = await verifiedPurchase(stripe, order);
  const {data:profile,error:profileError} = await admin.from('profiles').select('full_name').eq('id',order.client_id).maybeSingle();
  if (profileError) throw new Error('receipt_unavailable');
  const details = charge.payment_method_details;
  const snapshot = {
    terms_version: TERMS_VERSION, client_name: charge.billing_details?.name || profile?.full_name || 'Client',
    email: order.receipt_email || charge.billing_details?.email || '',
    paid_at: order.paid_at, package_name: order.package_name, format: order.format,
    credits: order.credits, amount_hkd: order.price_hkd, validity_months: order.validity_months,
    payment_method: details?.card ? `${details.card.brand.toUpperCase()} ending ${details.card.last4}` : `${details?.type || 'Online payment'} via Stripe`,
    stripe_url: charge.receipt_url ? stripeReceiptUrl(charge.receipt_url) : null,
    livemode: order.livemode,
  };
  const {data:receipt,error} = await admin.rpc('ensure_official_receipt',{p_order_id:order.id,p_snapshot:snapshot});
  if(error || !receipt?.document || !receipt?.receipt_number) throw new Error('receipt_unavailable');
  const pdf = await renderPdf({...receipt.document, receipt_number:receipt.receipt_number});
  return {receipt,pdf,filename:`Senses-Official-Receipt-${receipt.receipt_number}.pdf`};
}
export function bytesToBase64(bytes) {
  let binary=''; for(let i=0;i<bytes.length;i+=8192) binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return btoa(binary);
}
