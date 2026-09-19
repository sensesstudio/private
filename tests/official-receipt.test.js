import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {PDFDocument,StandardFonts,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {receiptRenderer} from '../supabase/functions/_shared/receipt-pdf.js';
import {receiptEmailPayload,officialReceiptsHandler} from '../supabase/functions/official-receipts/handler.js';
import {getOfficialReceipt,TERMS_VERSION} from '../supabase/functions/_shared/official-receipt.js';
import {createCheckoutHandler} from '../supabase/functions/create-checkout/handler.js';
import {INTEGRATION,STRIPE_ACCOUNT} from '../supabase/functions/_shared/payments.js';
const client='11111111-0000-4000-8000-000000000001',other='11111111-0000-4000-8000-000000000002',id='22222222-0000-4000-8000-000000000001';
const document={terms_version:TERMS_VERSION,receipt_number:'SS-2026-00000001',client_name:'Synthetic Buyer',email:'buyer@example.test',paid_at:'2026-09-18T12:15:00Z',package_name:'Trial session',format:'1:1',credits:1,amount_hkd:900,validity_months:1,payment_method:'VISA ending 4242',stripe_url:'https://pay.stripe.com/receipts/payment/synthetic',livemode:true};
const renderPdf=receiptRenderer({PDFDocument,StandardFonts,rgb,fontkit,loadUnicodeFont:()=>{throw new Error('not needed');}});
function mocks(){
 const order={id,client_id:client,status:'paid',stripe_session_id:'cs_live_synthetic',livemode:true,price_hkd:900,credits:1,paid_at:document.paid_at,receipt_email:document.email,package_name:document.package_name,format:'1:1',validity_months:1,payment_id:'payment-id'};
 const charge={paid:true,status:'succeeded',amount:90000,currency:'hkd',livemode:true,billing_details:{name:'Synthetic Buyer'},receipt_url:document.stripe_url};
 const session={id:order.stripe_session_id,mode:'payment',payment_status:'paid',livemode:true,amount_total:90000,currency:'hkd',client_reference_id:client,metadata:{integration:INTEGRATION,order_id:id},payment_intent:{status:'succeeded',latest_charge:charge}};
 const calls=[];let snapshot,claimed=false;
 const stripe={accounts:{retrieve:async()=>({id:STRIPE_ACCOUNT,charges_enabled:true})},checkout:{sessions:{retrieve:async()=>session}}};
 const admin={auth:{getUser:async()=>({data:{user:{id:client}}})},from:table=>{const chain={select:()=>chain,eq:()=>chain,maybeSingle:async()=>({data:table==='profiles'?{full_name:'Synthetic Buyer'}:order})};return chain;},rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='ensure_official_receipt'){snapshot??={document:args.p_snapshot,receipt_number:document.receipt_number};return {data:snapshot};}
  if(name==='waiver_worker_jobs')return {data:{configured:false}};
  if(name==='receipt_worker_jobs')return {data:{configured:true,key:'synthetic-key',sender:'cs@senses-studio.co',jobs:[order]}};
  if(name==='claim_receipt_email'){if(claimed)return {data:null};claimed=true;return {data:{payload:args.p_payload,attempt:1}};}
  return {data:null};
 }};
 return {order,charge,session,stripe,admin,calls};
}
test('official download verifies ownership, paid amount and stable snapshot without credit writes',async()=>{
 const m=mocks(),handler=createCheckoutHandler({...m,configured:true,livemode:true,renderPdf});
 const request=(token=true)=>new Request('https://example.test',{method:'POST',headers:token?{Authorization:'Bearer synthetic'}:{},body:JSON.stringify({action:'official-receipt',orderId:id,amount:1,email:'attacker@example.test'})});
 assert.equal((await handler(request(false))).status,401);
 m.order.client_id=other;assert.equal((await handler(request())).status,404);m.order.client_id=client;
 m.order.status='pending';assert.equal((await handler(request())).status,409);m.order.status='paid';
 m.session.amount_total=1;assert.equal((await handler(request())).status,503);m.session.amount_total=90000;
 const response=await handler(request());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
 const result=await response.json();const pdf=await PDFDocument.load(result.pdf_base64);assert.equal(pdf.getPageCount(),1);assert.match(pdf.getTitle(),/^Official Receipt/);
 assert.equal(m.calls.filter(c=>c.name==='ensure_official_receipt').at(-1).args.p_snapshot.amount_hkd,900);
 assert.equal(m.calls.some(c=>/fulfill|prepare/.test(c.name)),false);
 const original=await getOfficialReceipt({...m,renderPdf},m.order);m.charge.billing_details.name='Changed later';const again=await getOfficialReceipt({...m,renderPdf},m.order);assert.deepEqual(original.pdf,again.pdf);
});
test('mail includes branded PDF with terms and Stripe link; cron auth and claims prevent duplicate sends',async()=>{
 const m=mocks(),sent=[];const handler=officialReceiptsHandler({...m,renderPdf,syncKey:'private-cron-key',fetchImpl:async(url,options)=>{sent.push({url,options});return new Response(JSON.stringify({id:'provider-id'}));}});
 const request=key=>new Request('https://example.test',{method:'POST',headers:key?{'x-sync-key':key}:{},body:'{}'});
 assert.equal((await handler(request())).status,401);assert.equal(sent.length,0);
 assert.equal((await handler(request('private-cron-key'))).status,200);assert.equal(sent.length,1);
 assert.equal((await handler(request('private-cron-key'))).status,200);assert.equal(sent.length,1);
 const email=JSON.parse(sent[0].options.body);assert.deepEqual(email.to,['buyer@example.test']);assert.equal(email.reply_to,'cs@senses-studio.co');assert.match(email.text,/15 September 2026/);assert.match(email.html,/pay.stripe.com/);assert.equal(email.attachments.length,1);assert.equal((await PDFDocument.load(email.attachments[0].content)).getPageCount(),1);assert.match(sent[0].options.headers['Idempotency-Key'],/senses-official-receipt/);
 assert.equal(m.calls.find(c=>c.name==='finish_receipt_email').args.p_provider_id,'provider-id');
 const input=await getOfficialReceipt({...m,renderPdf},m.order);input.receipt.document.client_name='<script>';assert.doesNotMatch(receiptEmailPayload(input,'cs@senses-studio.co').html,/<script>/);
});
test('mail transport failure is queued and never reported as accepted',async()=>{
 const m=mocks(),handler=officialReceiptsHandler({...m,renderPdf,syncKey:'cron',fetchImpl:async()=>new Response('{}',{status:503})});
 const response=await handler(new Request('https://example.test',{method:'POST',headers:{'x-sync-key':'cron'}}));
 assert.deepEqual(await response.json(),{configured:true,sent:0,failed:1,waiver:{configured:false,sent:0}});assert.equal(m.calls.find(c=>c.name==='finish_receipt_email').args.p_provider_id,null);
});
