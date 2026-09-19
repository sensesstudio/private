import test from 'node:test';
import assert from 'node:assert/strict';
import { WAIVER_SECTIONS, WAIVER_TITLE } from '../src/waiver.js';
import { waiverCopyPayload, waiverCopiesHandler } from '../supabase/functions/waiver-copies/handler.js';

const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const job={signature_id:'33333333-0000-4000-8000-000000000001',signed_name:'Synthetic Signer',participant_name:'Synthetic Client',signer_capacity:'self',signed_at:'2026-09-19T03:00:00Z',version:'2026-09-16',
  document_sha256:'1fb69752bd5595fadfa4dfc96cdb86aa3ba6430b12a9012c816e43d7df741300',email:'client@example.test',client_name:'Synthetic Client',document_title:WAIVER_TITLE,document_body:{sections:WAIVER_SECTIONS},signature_image:PNG};
function mocks(jobs=[job]) {
  const calls=[];let claimed=false;
  const admin={rpc:async(name,args)=>{calls.push({name,args});
    if(name==='waiver_copy_jobs')return {data:{configured:true,key:'synthetic-key',sender:'cs@senses-studio.co',jobs}};
    if(name==='claim_waiver_copy_email'){if(claimed)return {data:null};claimed=true;return {data:{payload:args.p_payload,attempt:1}};}
    return {data:null};}};
  return {admin,calls};
}

test('waiver copy carries the signed document text, the signature record and the drawing', () => {
  const email=waiverCopyPayload(job,'cs@senses-studio.co');
  assert.deepEqual(email.to,['client@example.test']);assert.equal(email.reply_to,'cs@senses-studio.co');assert.equal(email.from,'Senses Studio <cs@senses-studio.co>');
  assert.equal(email.subject,'Senses Studio - Your signed Waiver and Release of Liability');
  for(const part of ['Synthetic Signer','Participant, aged 18 or above','2026-09-16','HKT','ASSUMPTION OF RISK','GOVERNING LAW AND JURISDICTION','- I am in good physical health','cs@senses-studio.co'])assert.ok(email.text.includes(part),part);
  assert.match(email.text,/19 September 2026/); // Hong Kong date
  assert.match(email.html,/<h3>Assumption of Risk<\/h3>/);assert.match(email.html,/<li>I am in good physical health/);
  assert.deepEqual(email.attachments,[{filename:'signature.png',content:PNG.slice(22),content_type:'image/png'}]);
  assert.deepEqual(waiverCopyPayload({...job,signature_image:null},'s@x.test').attachments,[]);
  assert.doesNotMatch(waiverCopyPayload({...job,signed_name:'<script>alert(1)</script>'},'s@x.test').html,/<script>/);
  assert.equal(waiverCopyPayload({...job,signer_capacity:'parent_guardian'},'s@x.test').text.includes('Parent / legal guardian'),true);
  assert.throws(()=>waiverCopyPayload({...job,email:''},'s@x.test'),/missing_email/);
  assert.throws(()=>waiverCopyPayload({...job,document_body:null},'s@x.test'),/document_unavailable/);
});

test('worker needs the cron key, claims each signature once, keys the provider call by signature and never invents recipients', async () => {
  const m=mocks(),sent=[];
  const handler=waiverCopiesHandler({...m,syncKey:'private-cron-key',fetchImpl:async(url,options)=>{sent.push({url,options});return new Response(JSON.stringify({id:'provider-id'}));}});
  const request=key=>new Request('https://example.test',{method:'POST',headers:key?{'x-sync-key':key}:{},body:'{}'});
  assert.equal((await handler(request())).status,401);assert.equal((await handler(request('wrong'))).status,401);assert.equal(sent.length,0);
  assert.equal((await handler(new Request('https://example.test',{method:'GET',headers:{'x-sync-key':'private-cron-key'}}))).status,405);
  assert.deepEqual(await (await handler(request('private-cron-key'))).json(),{configured:true,sent:1,failed:0});
  assert.deepEqual(await (await handler(request('private-cron-key'))).json(),{configured:true,sent:0,failed:0}); // already claimed
  assert.equal(sent.length,1);assert.equal(sent[0].url,'https://api.resend.com/emails');
  assert.equal(sent[0].options.headers['Idempotency-Key'],`senses-waiver-copy/${job.signature_id}`);assert.equal(sent[0].options.headers.Authorization,'Bearer synthetic-key');
  const email=JSON.parse(sent[0].options.body);assert.deepEqual(email.to,['client@example.test']);assert.equal(email.attachments.length,1);
  const finish=m.calls.find(c=>c.name==='finish_waiver_copy_email');assert.equal(finish.args.p_provider_id,'provider-id');assert.equal(finish.args.p_attempt,1);
});

test('unconfigured delivery sends nothing and a transport failure is requeued, never reported as accepted', async () => {
  const off={admin:{rpc:async()=>({data:{configured:false}})}};
  assert.deepEqual(await (await waiverCopiesHandler({...off,syncKey:'cron'})(new Request('https://example.test',{method:'POST',headers:{'x-sync-key':'cron'}}))).json(),{configured:false,sent:0});
  const m=mocks(),handler=waiverCopiesHandler({...m,syncKey:'cron',fetchImpl:async()=>new Response('{}',{status:503})});
  assert.deepEqual(await (await handler(new Request('https://example.test',{method:'POST',headers:{'x-sync-key':'cron'}}))).json(),{configured:true,sent:0,failed:1});
  const finish=m.calls.find(c=>c.name==='finish_waiver_copy_email');assert.equal(finish.args.p_provider_id,null);assert.equal(finish.args.p_error,'delivery_failed');
  // A job whose payload cannot be built is counted as failed without touching the provider or the outbox.
  const bad=mocks([{...job,email:'not-an-email'}]),calls=[];
  assert.deepEqual(await (await waiverCopiesHandler({...bad,syncKey:'cron',fetchImpl:async()=>{calls.push(1);return new Response('{}');}})(new Request('https://example.test',{method:'POST',headers:{'x-sync-key':'cron'}}))).json(),{configured:true,sent:0,failed:1});
  assert.equal(calls.length,0);assert.equal(bad.calls.some(c=>c.name==='claim_waiver_copy_email'),false);
});
