import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { provider,fetchProspects,findLabel } from '../supabase/functions/sleekflow-prospect-sync/provider.js';
import { createHandler } from '../supabase/functions/sleekflow-prospect-sync/handler.js';
import { visibleProspects } from '../src/admin/prospects.js';
const label={id:'label-1',hashtag:'Private - Prospect'};
const contact=i=>({id:`contact-${i}`,firstName:'Synthetic',lastName:String(i),phoneNumber:'+85255550001',lables:i%2?['Unrelated']:[label.hashtag],lastestMessage:{messageContent:'Test inquiry',channel:'whatsappcloudapi',createdAt:'2026-09-16T03:30:00Z',conversationId:'test-conversation'}});

test('SleekFlow scopes every page to the resolved label even for large accounts',async()=>{
 // Only these 205 synthetic matches are queried, regardless of account size.
 const contacts=Array.from({length:205},(_,i)=>({...contact(i),lables:[label.hashtag]})),calls=[];
 const api=async(path,body)=>{
  calls.push({path,body});if(path==='/api/labels')return [label];
  assert.deepEqual(body.conditions,[{containHashTag:'hashtags',conditionOperator:'ContainsAny',nextOperator:'And',values:[label.hashtag]}]);
  assert.equal(body.include.labels,true);assert.equal(body.include.latestMessage,true);
  return {totalContact:contacts.length,results:contacts.slice(body.pagination.offset,body.pagination.offset+200)};
 };
 contacts[0].lables=[' private - prospect '];contacts[2].lables=[label.id];
 contacts[4].lastestMessage={...contacts[4].lastestMessage,isSandbox:true};
 contacts[6].lastestMessage={uploadedFiles:[{}],timestamp:1789529400};
 contacts[8]={...contacts[8],labels:[label.hashtag],lables:undefined,latestMessage:null,lastestMessage:null,lastContact:'2026-09-18T02:00:00Z',lastContactFromCustomers:'2026-09-18T03:00:00Z'};
 const rows=await fetchProspects(api);
 assert.equal(rows.length,205);assert.equal(rows[0].last_message,'Test inquiry');assert.equal(rows[0].last_contact_at,'2026-09-16T03:30:00.000Z');
 assert.equal(rows.find(r=>r.id==='contact-4').last_message,null);assert.equal(rows.find(r=>r.id==='contact-6').last_message,'[Attachment]');
 assert.equal(rows.find(r=>r.id==='contact-8').last_contact_at,'2026-09-18T03:00:00.000Z');
 assert.deepEqual(calls.slice(1).map(c=>c.body.pagination.offset),[0,200]);assert.ok(rows.every(r=>!('email' in r)));
 for(const data of [{results:[],totalContact:3},{results:[contact(0),contact(0)],totalContact:2},{results:[{...contact(0),lables:null}],totalContact:1},{results:[],totalContact:10001}]) {
  await assert.rejects(fetchProspects(async p=>p==='/api/labels'?[label]:data),/source_changed|source_format|too_many_contacts/);
 }
 // Never silently skip non-matches in a supposedly label-scoped snapshot.
 for(const bad of ['Unrelated','Private - Prospects'])await assert.rejects(fetchProspects(async p=>p==='/api/labels'?[label]:{totalContact:1,results:[{...contact(0),lables:[bad]}]}),/source_format/);
 assert.deepEqual(await fetchProspects(async p=>p==='/api/labels'?[label]:{totalContact:0,results:[]}),[]);
 await assert.rejects(findLabel(async()=>[{id:'x',hashtag:'private - prospects'}]),/label_not_found/);
 await assert.rejects(findLabel(async()=>[label,label]),/label_not_found/);
 let captured;await provider('synthetic-key',async(u,o)=>{captured={u,o};return Response.json([label]);})('/api/labels');
 assert.equal(captured.u,'https://api.sleekflow.io/api/labels');assert.equal(captured.o.headers['X-Sleekflow-Api-Key'],'synthetic-key');assert.equal(captured.o.redirect,'error');
 for(const code of [401,403,429,500])await assert.rejects(provider('synthetic-key',async()=>new Response('private upstream body',{status:code}))('/api/labels'),/invalid_key|rate_limited|sync_unavailable/);
});

test('sync handler rejects non-admin, redacts failures, and never applies partial snapshots',async()=>{
 const calls=[];let allowed=false,fail=false;const key='synthetic-platform-key';
 const handler=createHandler({syncKey:'synthetic-cron-key',authorize:async()=>allowed?async(n,a)=>calls.push({n,a}):null,
  rpc:async(n,a)=>{calls.push({n,a});return n==='begin_sleekflow_sync'?{status:'ready',run_id:'lease',api_key:key,label:label.hashtag}:1;},
  fetcher:async(url)=>{if(fail)return new Response('secret-client-and-key',{status:500});return Response.json(url.endsWith('/labels')?[label]:{totalContact:1,results:[contact(0)]});}});
 const request=(body={},headers={})=>new Request('https://test.invalid',{method:'POST',headers,body:JSON.stringify(body)});
 assert.equal((await handler(request())).status,403);assert.equal(calls.length,0);
 allowed=true;assert.deepEqual(await (await handler(request({action:'connect',api_key:key}))).json(),{status:'synced',count:1});
 assert.equal(calls[0].n,'configure_sleekflow');assert.equal(calls.at(-1).a.p_rows.length,1);
 calls.length=0;fail=true;const response=await handler(request());const body=await response.text();
 assert.equal(response.status,503);assert.equal(body.includes('secret-client'),false);assert.equal(body.includes(key),false);
 assert.equal(calls.at(-1).a.p_rows,null);assert.equal(calls.at(-1).a.p_error,'sync_unavailable');
 allowed=false;assert.equal((await handler(request({action:'connect',api_key:key},{'x-sync-key':'synthetic-cron-key'}))).status,403);
});

test('prospect filters use real status, normalized mobile and null-last dates',()=>{
 const rows=[{id:'a',client_name:'Alice',mobile:'+852 5555 0001',remarks:'follow up',source_present:true,status:'pending us',next_action_date:null},
 {id:'b',client_name:'Bob',source_present:true,status:'pending payment',next_action_date:'2026-09-18'},
 {id:'c',client_name:'Cathy',source_present:false,status:'confirmed booking',next_action_date:'2026-09-16'}];
 assert.deepEqual(visibleProspects(rows,{}).map(r=>r.id),['b','a']);
 assert.deepEqual(visibleProspects(rows,{query:'55550001'}).map(r=>r.id),['a']);
 assert.deepEqual(visibleProspects(rows,{scope:'archived'}).map(r=>r.id),['c']);
 assert.deepEqual(visibleProspects(rows,{status:'pending payment'}).map(r=>r.id),['b']);
});

test('prospect SQL protects secrets and records; source sync preserves edits and rejects stale runs',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 // Vault API stub is only a local test double. Production uses installed Vault.
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema private;create schema vault;
 create table public.profiles(id uuid primary key,role text);create table auth.sessions(id uuid,user_id uuid,not_after timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.sub',true))$$;
 create table vault.decrypted_secrets(id uuid primary key default gen_random_uuid(),decrypted_secret text);
 create function vault.create_secret(secret text,name text,description text) returns uuid language sql as $$insert into vault.decrypted_secrets(decrypted_secret) values(secret) returning id$$;
 create function vault.update_secret(secret_id uuid,new_secret text) returns void language sql as $$update vault.decrypted_secrets set decrypted_secret=new_secret where id=secret_id$$;
 grant usage on schema public,auth to anon,authenticated,service_role;
 insert into profiles values('11111111-1111-4111-8111-111111111111','admin'),('22222222-2222-4222-8222-222222222222','client'),('33333333-3333-4333-8333-333333333333','teacher');
 insert into auth.sessions select id,id,null from profiles;`);
 await db.exec(await readFile(new URL('../supabase/migrations/20260916152058_sleekflow_prospects.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20260918035715_sleekflow_booking_in_progress.sql',import.meta.url),'utf8'));
 const as=async(role,id='')=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role};`);
 const admin='11111111-1111-4111-8111-111111111111';
 for(const role of ['anon','authenticated']) {await as(role,'22222222-2222-4222-8222-222222222222');await assert.rejects(db.query('select admin_prospect_directory()'),/permission denied|admin_access_required/);await assert.rejects(db.query('select begin_sleekflow_sync()'),/permission denied/);await assert.rejects(db.query('select admin_booking_progress_directory()'),/permission denied|admin_access_required/);await assert.rejects(db.query('select begin_booking_progress_sync()'),/permission denied/);await assert.rejects(db.query("select save_booking_progress('contact-1',1,'',null,'pending us')"),/permission denied|admin_access_required/);await assert.rejects(db.query("select configure_sleekflow('synthetic-key')"),/permission denied|admin_access_required/);}
 await as('authenticated','33333333-3333-4333-8333-333333333333');await assert.rejects(db.query('select admin_prospect_directory()'),/admin_access_required/);await assert.rejects(db.query('select admin_booking_progress_directory()'),/admin_access_required/);
 await as('authenticated',admin);await db.query("select configure_sleekflow('synthetic-key')");
 await assert.rejects(db.query('select * from vault.decrypted_secrets'),/permission denied/);await assert.rejects(db.query('select * from private.sleekflow_connection'),/permission denied/);
 const directory=async()=>(await db.query('select admin_prospect_directory() data')).rows[0].data;
 const bookingDirectory=async()=>(await db.query('select admin_booking_progress_directory() data')).rows[0].data;
 const d=await directory();assert.equal(d.sync.configured,true);assert.equal(JSON.stringify(d).includes('synthetic-key'),false);assert.equal((await bookingDirectory()).sync.configured,true);assert.equal(JSON.stringify(await bookingDirectory()).includes('synthetic-key'),false);await assert.rejects(db.query('select * from private.studio_booking_in_progress'),/permission denied/);
 await as('service_role');const begin=async()=>(await db.query('select begin_sleekflow_sync() data')).rows[0].data;
 const run=await begin();assert.equal(run.api_key,'synthetic-key');assert.equal((await begin()).status,'busy');
 const rows=[{id:'contact-1',client_name:'Synthetic',mobile:'+85255550001',last_message:'Inquiry'}];
 const finish=(id,data,error=null)=>db.query('select finish_sleekflow_sync($1,$2,$3)',[id,data==null?null:JSON.stringify(data),error]);
 await finish(run.run_id,rows);await as('authenticated',admin);
 await db.query("select save_studio_prospect('contact-1',1,'Ask about Tuesday','2026-10-01','pending teacher')");
 await assert.rejects(db.query("select save_studio_prospect('contact-1',1,'Stale overwrite',null,'pending us')"),/prospect_changed/);
 await assert.rejects(db.query("select save_studio_prospect('contact-1',2,'',null,'invalid')"),/invalid_prospect_details/);
 const beginBooking=async()=>(await db.query('select begin_booking_progress_sync() data')).rows[0].data;
 const finishBooking=(id,data,error=null)=>db.query('select finish_booking_progress_sync($1,$2,$3)',[id,data==null?null:JSON.stringify(data),error]);
 const nextBooking=async()=>{await db.exec("reset role;update private.sleekflow_booking_sync set last_attempt_at=null");await as('service_role');return beginBooking();};
 const bookingRun=await nextBooking();assert.equal(bookingRun.api_key,'synthetic-key');assert.equal(bookingRun.label,'Private - Booking in Progress');assert.equal((await beginBooking()).status,'busy');
 await finishBooking(bookingRun.run_id,[{...rows[0],last_message:'Booking inquiry'}]);await as('authenticated',admin);
 await db.query("select save_booking_progress('contact-1',1,'Booking note','2026-10-02','pending payment')");
 await assert.rejects(db.query("select save_booking_progress('contact-1',1,'Stale edit',null,'pending us')"),/prospect_changed/);
 assert.equal((await directory()).rows[0].remarks,'Ask about Tuesday');assert.equal((await directory()).rows[0].last_message,'Inquiry');
 const bookingRun2=await nextBooking();await finishBooking(bookingRun2.run_id,[{...rows[0],last_message:'Booking reply'}]);await as('authenticated',admin);
 assert.equal((await bookingDirectory()).rows[0].remarks,'Booking note');assert.equal((await bookingDirectory()).rows[0].status,'pending payment');
 const bookingFailed=await nextBooking();await finishBooking(bookingFailed.run_id,null,'label_not_found');await as('authenticated',admin);
 assert.equal((await bookingDirectory()).sync.error_code,'label_not_found');assert.equal((await bookingDirectory()).rows[0].source_present,true);assert.equal((await directory()).sync.error_code,null);
 const bookingEmpty=await nextBooking();await finishBooking(bookingEmpty.run_id,[]);await as('authenticated',admin);
 assert.equal((await bookingDirectory()).rows[0].source_present,false);assert.equal((await bookingDirectory()).rows[0].remarks,'Booking note');assert.equal((await directory()).rows[0].source_present,true);
 const bookingStale=await nextBooking();

 const next=async()=>{await db.exec("reset role;update private.sleekflow_connection set last_attempt_at=null");await as('service_role');return begin();};
 const run2=await next();await finish(run2.run_id,[{...rows[0],last_message:'A new reply'}]);
 await as('authenticated',admin);let record=(await directory()).rows[0];assert.equal(record.last_message,'A new reply');assert.equal(record.remarks,'Ask about Tuesday');assert.equal(record.status,'pending teacher');assert.equal(record.version,2);
 const failed=await next();await finish(failed.run_id,null,'private upstream details');await as('authenticated',admin);assert.equal((await directory()).sync.error_code,'sync_unavailable');assert.equal((await directory()).rows[0].source_present,true);
 const run3=await next();await as('authenticated',admin);await db.query("select configure_sleekflow('another-synthetic-key')");await as('service_role');await assert.rejects(finish(run3.run_id,[]),/stale_sync/);await assert.rejects(finishBooking(bookingStale.run_id,[]),/stale_sync/);
 const run4=await next();await finish(run4.run_id,[]);await as('authenticated',admin);record=(await directory()).rows[0];assert.equal(record.source_present,false);assert.equal(record.remarks,'Ask about Tuesday');
 await db.exec("reset role;update auth.sessions set not_after=now()-interval '1 minute'");await as('authenticated',admin);await assert.rejects(directory(),/admin_access_required/);await assert.rejects(bookingDirectory(),/admin_access_required/);
});


test('booking sync uses only its label and scheduled failures are isolated by board',async()=>{
 const bookingLabel={id:'booking-label',hashtag:'Private - Booking in Progress'},calls=[],conditions=[];let missingProspect=false;
 const handler=createHandler({syncKey:'synthetic-cron-key',authorize:async()=>async()=>{},rpc:async(n,a)=>{calls.push({n,a});return n.startsWith('begin_')?{status:'ready',run_id:n,api_key:'synthetic-platform-key'}:a.p_rows.length;},
 fetcher:async(url,options)=>{
  if(url.endsWith('/labels'))return Response.json(missingProspect?[bookingLabel]:[label,bookingLabel]);
  const body=JSON.parse(options.body),name=body.conditions[0].values[0];conditions.push(name);
  return Response.json({totalContact:1,results:[{...contact(0),lables:[name]}]});
 }});
 const request=(body,scheduled=false)=>new Request('https://test.invalid',{method:'POST',headers:scheduled?{'x-sync-key':'synthetic-cron-key'}:{},body:JSON.stringify(body)});
 assert.deepEqual(await (await handler(request({board:'booking_in_progress'}))).json(),{status:'synced',count:1});
 assert.deepEqual(conditions,[bookingLabel.hashtag]);assert.equal(calls[0].n,'begin_booking_progress_sync');assert.equal(calls.at(-1).n,'finish_booking_progress_sync');
 calls.length=0;conditions.length=0;missingProspect=true;
 const response=await handler(request({},true)),body=await response.json();
 assert.equal(response.status,503);assert.equal(body.results.prospects.error,'label_not_found');assert.deepEqual(body.results.booking_in_progress,{status:'synced',count:1});
 assert.ok(calls.some(c=>c.n==='finish_sleekflow_sync'&&c.a.p_rows===null&&c.a.p_error==='label_not_found'));
 assert.ok(calls.some(c=>c.n==='finish_booking_progress_sync'&&c.a.p_rows.length===1));
 for(const invalid of [null,[],{board:'other'},{board:'__proto__'}])assert.equal((await handler(request(invalid))).status,400);
});

test('removing a prospect preserves required names and removes only the target label',async()=>{
 const {removeProspectLabel}=await import('../supabase/functions/sleekflow-prospect-sync/provider.js');
 const calls=[];
 const api=async(path,body)=>{calls.push({path,body});if(path==='/api/labels')return [{id:'label',hashtag:'Private - Prospect'}];if(!body)return {id:'contact',FirstName:'Synthetic',LastName:'Contact'};return {};};
 await removeProspectLabel(api,'contact');
 assert.deepEqual(calls.at(-1),{path:'/api/contact/update/contact',body:{firstName:'Synthetic',lastName:'Contact',removeLabels:['Private - Prospect']}});
 await assert.rejects(removeProspectLabel(async p=>p==='/api/labels'?[{id:'label',hashtag:'Private - Prospect'}]:{id:'contact',FirstName:'Missing last name'},'contact'),/source_format/);
});

test('prospect removal requires an admin confirmation and verifies label absence before archiving',async()=>{
 const writes=[],saved=[];let stale=false,stillLabelled=false;
 const handler=createHandler({syncKey:'cron',authorize:async()=>async()=>({rows:[{id:'contact-0',version:1,source_present:!stale}]}),rpc:async(n,a)=>{saved.push({n,a});return n==='begin_sleekflow_sync'?{status:'ready',run_id:'lease',api_key:'synthetic-key'}:0;},fetcher:async(url,options)=>{
  if(url.endsWith('/labels'))return Response.json([label]);
  if(url.endsWith('/contact/contact-0'))return Response.json({id:'contact-0',FirstName:'Synthetic',LastName:'Contact'});
  if(url.includes('/contact/update/')){writes.push(JSON.parse(options.body));return Response.json({});}
  return Response.json({totalContact:stillLabelled?1:0,results:stillLabelled?[contact(0)]:[]});
 }});
 const request=(overrides={},headers={})=>new Request('https://example.test',{method:'POST',headers,body:JSON.stringify({action:'remove-prospect',board:'prospects',id:'contact-0',version:1,confirmed:true,...overrides})});
 assert.equal((await handler(request({confirmed:false}))).status,400);
 assert.equal((await handler(request({}, {'x-sync-key':'cron'}))).status,403);
 assert.equal((await handler(request({board:'booking_in_progress'}))).status,403);
 stale=true;assert.equal((await handler(request())).status,409);assert.equal(writes.length,0);stale=false;
 assert.deepEqual(await(await handler(request())).json(),{status:'removed'});
 assert.deepEqual(saved.at(-1).a.p_rows,[]);assert.deepEqual(writes[0].removeLabels,['Private - Prospect']);
 stillLabelled=true;assert.equal((await handler(request())).status,503);assert.equal(saved.at(-1).a.p_rows,null);
});
