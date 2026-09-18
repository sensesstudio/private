export const PAYMENT_ORIGINS = ['https://sensesprivate.up.railway.app', 'https://sensesprivate.com', 'https://www.sensesprivate.com'];
export const STRIPE_ACCOUNT = 'acct_1IlCbuBrjGodBrcF';
export const INTEGRATION = 'senses-private-packages-rqjzkmnp';
export function checkoutParameters(order) {
  return {
    mode: 'payment', locale: 'en', integration_identifier: INTEGRATION,
    // Snapshot the recipient with the order so retries use identical parameters.
    ...(order.receipt_email ? { customer_email: order.receipt_email, payment_intent_data: { receipt_email: order.receipt_email, description: `Senses Studio — ${order.package_name} (${order.format}), ${order.credits} session${order.credits === 1 ? '' : 's'}` } } : {}),
    line_items: [{ quantity: 1, price_data: { currency: 'hkd', unit_amount: order.price_hkd * 100,
      product_data: { name: `Senses Studio — ${order.package_name} (${order.format})`, description: `${order.credits} session${order.credits === 1 ? '' : 's'}. Valid for ${order.validity_months} month${order.validity_months === 1 ? '' : 's'} from first visit.` } } }],
    success_url: `${order.return_origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}#client`,
    cancel_url: `${order.return_origin}/?checkout=cancel#client`,
    expires_at: Math.floor(+new Date(order.checkout_expires_at) / 1000),
    client_reference_id: order.client_id,
    metadata: { integration: INTEGRATION, order_id: order.id, client_id: order.client_id, package_id: order.package_id },
  };
}
export async function fulfillSession(admin, session) {
  if (session.metadata?.integration !== INTEGRATION || !session.metadata?.order_id) return { ignored: true };
  if (session.mode !== 'payment' || session.payment_status !== 'paid') return { pending: true };
  const { data, error } = await admin.rpc('fulfill_package_checkout', {
    p_order_id: session.metadata.order_id, p_session_id: session.id,
    p_client_id: session.client_reference_id, p_amount_total: session.amount_total,
    p_currency: session.currency, p_payment_status: session.payment_status, p_livemode: session.livemode,
  });
  if (error) throw new Error('fulfillment_failed');
  return { paymentId: data };
}
