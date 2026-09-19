import { PAYMENT_ORIGINS, STRIPE_ACCOUNT } from '../_shared/payments.js';
import { getOfficialReceipt, bytesToBase64, SUPPORT_EMAIL, stripeReceiptUrl } from '../_shared/official-receipt.js';
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function receiptEmailPayload({receipt,pdf,filename},sender) {
  const d=receipt.document;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))throw new Error('missing_email');
  if(!d.stripe_url)throw new Error('stripe_receipt_not_ready');
  const stripeUrl=stripeReceiptUrl(d.stripe_url), subject=`Senses Studio - Official Receipt ${receipt.receipt_number}`;
  return {from:`Senses Studio <${sender}>`,to:[d.email],reply_to:SUPPORT_EMAIL,subject,
    text:`Thank you for your purchase. Your Senses Official Receipt with package terms is attached.\n${d.package_name} (${d.format}) - HK$${d.amount_hkd}\nStripe receipt: ${stripeUrl}\nTerms version: 15 September 2026. Our latest policy prevails: https://senses-studio.co/pages/terms-conditions\nContact: ${SUPPORT_EMAIL}`,
    html:`<div style="background:#F5EFEA;padding:32px;color:#382F29;font-family:Arial,sans-serif"><h1>Senses Studio</h1><h2>Official Receipt</h2><p>Thank you for your purchase.</p><p>${escapeHtml(d.package_name)} (${escapeHtml(d.format)}) - HK$${d.amount_hkd}</p><p>Your Senses Official Receipt is attached as a PDF, including all package terms.</p><p><a href="${escapeHtml(stripeUrl)}">View your Stripe receipt</a></p><p>Terms version: 15 September 2026.<br/>Our latest policy prevails. Please refer to <a href="https://senses-studio.co/pages/terms-conditions">our latest terms and conditions</a>.</p><p>Contact: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p></div>`,
    attachments:[{filename,content:bytesToBase64(pdf),content_type:'application/pdf'}]};
}
export function officialReceiptsHandler({admin,stripe,renderPdf,syncKey,fetchImpl=fetch}) {
 return async request=>{
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':PAYMENT_ORIGINS.includes(origin)?origin:PAYMENT_ORIGINS[0],'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(origin&&!PAYMENT_ORIGINS.includes(origin))return json({error:'Origin not allowed.'},403);
  // Only the internal scheduler can dispatch customer email. There is no arbitrary recipient endpoint.
  if(!syncKey || request.headers.get('x-sync-key')!==syncKey)return json({error:'Unauthorized.'},401);
  try {
   const {data:config,error}=await admin.rpc('receipt_worker_jobs');if(error)throw error;
   if(!config.configured)return json({configured:false,sent:0});
   const account=await stripe.accounts.retrieve();if(account.id!==STRIPE_ACCOUNT)throw new Error('wrong_account');
   let sent=0,failed=0;
   for(const order of config.jobs){
    let claim;
    try {
     const document=await getOfficialReceipt({admin,stripe,renderPdf},order);
     const {data,error}=await admin.rpc('claim_receipt_email',{p_order_id:order.id,p_payload:receiptEmailPayload(document,config.sender)});
     if(error)throw error;if(!data)continue;claim=data;
     const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json','Idempotency-Key':`senses-official-receipt/${order.id}`},body:JSON.stringify(claim.payload),signal:AbortSignal.timeout(20000)});
     const result=await response.json();
     if(!response.ok||typeof result.id!=='string')throw new Error('delivery_failed');
     const saved=await admin.rpc('finish_receipt_email',{p_order_id:order.id,p_attempt:claim.attempt,p_provider_id:result.id});
     if(saved.error)throw saved.error;sent++;
    }catch {
     failed++;
     if(claim)await admin.rpc('finish_receipt_email',{p_order_id:order.id,p_attempt:claim.attempt,p_provider_id:null,p_error:'delivery_failed'});
    }
   }
   return json({configured:true,sent,failed});
  }catch{return json({error:'Receipt delivery is unavailable.'},503);}
 };
}
