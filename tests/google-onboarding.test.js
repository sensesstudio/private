import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { groupClients, filterClients } from '../src/admin/clients.js';

test('Google onboarding creates one owned, empty client; validates contact details and preserves CRM isolation', async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create table auth.identities(user_id uuid,provider text,identity_data jsonb);
    create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default clock_timestamp(),not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('session_id',current_setting('request.jwt.claim.session_id',true),'amr',coalesce(nullif(current_setting('request.jwt.claim.amr',true),'')::jsonb,'[]'::jsonb)) $$;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;`);
  const migration = async name => (await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8')).replace(/create extension if not exists (pgcrypto|pg_cron|pg_net);/g, '');
  await db.exec(await migration('0001_init.sql'));
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
  await db.exec(await migration('0004_mindbody_rooms.sql'));
  await db.exec('grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;');
  for (const name of ['0005_live_availability.sql','20260916070412_admin_client_csv.sql','20260916081040_admin_client_editing.sql','20260916081703_mindbody_client_packages.sql','20260916091926_admin_client_last_visit.sql','20260916094547_admin_client_next_visit.sql','20260916101325_client_account_access.sql','20260916102320_admin_client_private_lifetime.sql','20260916105918_client_password_reset.sql','20260916114203_client_google_access.sql','20260916141227_google_client_onboarding.sql','20260916141926_client_profile_records.sql','20260919030000_client_waiver_drawn_signature.sql']) await db.exec(await migration(name));
  // Mail settings normally come from the receipts migration; a stand-in decides whether copies are queued.
  await db.exec(`create table private.receipt_email_settings(id boolean primary key default true check(id),secret_id uuid,sender text not null default 'cs@senses-studio.co',enabled boolean not null default false,activated_at timestamptz not null default now());insert into private.receipt_email_settings(id) values(true);`);
  await db.exec(await migration('20260919050000_waiver_copy_emails.sql'));
  await db.exec(await migration('20260916072203_package_checkout.sql'));
  await db.exec(await migration('20260919060000_admin_directory_website_packages.sql'));
  const ids = { admin:'11111111-0000-4000-8000-000000000001', one:'11111111-0000-4000-8000-000000000002', two:'11111111-0000-4000-8000-000000000003', teacher:'11111111-0000-4000-8000-000000000004', conflict:'11111111-0000-4000-8000-000000000005' };
  for (const [kind,id] of Object.entries(ids)) {
    await db.query('insert into auth.users values($1,$2,now())', [id,`${kind}@example.test`]);
    await db.query('insert into auth.sessions(id,user_id) values($1,$1)', [id]);
    await db.query('insert into auth.identities values($1,$2,$3)', [id,'google',JSON.stringify({email:`${kind}@example.test`,email_verified:true})]);
    await db.query('insert into profiles(id,role,full_name,email) values($1,$2,$3,$4)', [id,['admin','teacher'].includes(kind)?kind:'client',`Synthetic ${kind}`,`${kind}@example.test`]);
  }
  const as = async (kind,method='oauth') => db.exec(`reset role;select set_config('request.jwt.claim.sub','${ids[kind] || ''}',false);select set_config('request.jwt.claim.session_id','${ids[kind] || ''}',false);select set_config('request.jwt.claim.amr','[{"method":"${method}"}]',false);set role ${kind==='anon'?'anon':'authenticated'};`);
  const ensure = async () => (await db.query('select ensure_my_client_profile() data')).rows[0].data;
  const complete = async (name='New customer',phone='+852 5555 0001') => (await db.query('select complete_my_client_profile($1,$2) data',[name,phone])).rows[0].data;
  await as('anon'); await assert.rejects(ensure(), /permission denied/);
  for (const kind of ['admin','teacher']) { await as(kind); await assert.rejects(ensure(), /client_account_required/); }
  await as('one','password'); assert.equal((await ensure()).status,'not_applicable');
  await assert.rejects(complete(), /google_sign_in_required/);
  await db.exec('reset role'); await db.query('update auth.users set email_confirmed_at=null where id=$1',[ids.one]);
  await as('one'); assert.equal((await ensure()).status,'not_applicable');
  await db.exec('reset role'); await db.query('update auth.users set email_confirmed_at=now() where id=$1',[ids.one]);
  for (const identity of [{email:'wrong@example.test',email_verified:true},{email:'one@example.test',email_verified:false}]) {
    await db.exec('reset role');await db.query('update auth.identities set identity_data=$1 where user_id=$2',[JSON.stringify(identity),ids.one]);
    await as('one');assert.equal((await ensure()).status,'not_applicable');
  }
  await db.exec('reset role');await db.query('update auth.identities set identity_data=$1 where user_id=$2',[JSON.stringify({email:'one@example.test',email_verified:true}),ids.one]);
  await as('one');
  const first=await ensure();assert.deepEqual(first,{status:'onboarding_required',name:'Synthetic one',email:'one@example.test',phone:''});
  assert.deepEqual(await ensure(),first);
  for (const table of ['studio_clients','studio_client_accounts','studio_client_packages']) assert.deepEqual((await db.query(`select * from ${table}`)).rows,[]);
  await assert.rejects(db.query('select private.current_google_client_email()'),/permission denied/);
  await assert.rejects(db.query('select admin_client_directory()'),/admin_access_required/);
  await assert.rejects(db.query("insert into studio_clients(client_name,email) values('Spoof','one@example.test')"),/client_profile_access_required|row-level security/);
  await assert.rejects(complete(' '),/valid_name_required/);await assert.rejects(complete('New customer','5555'),/valid_phone_required/);
  // A second customer's completion cannot affect the first user's incomplete record.
  await as('two');await ensure();await complete('Second customer','+44 7700 900123');
  await as('one');assert.equal((await ensure()).status,'onboarding_required');
  // Expired, reset, missing, or currently locked sessions cannot finish onboarding.
  for (const statement of ["update auth.sessions set not_after=now()-interval '1 minute' where id=$1","update studio_client_accounts set access_not_before=now()+interval '1 minute' where user_id=$1","update studio_client_accounts set password_operation_id=user_id where user_id=$1"]) {
    await db.exec('reset role');await db.query(statement,[ids.one]);await as('one');await assert.rejects(complete(),/google_sign_in_required/);
    await db.exec('reset role');await db.query('update auth.sessions set not_after=null where id=$1',[ids.one]);await db.query("update studio_client_accounts set access_not_before='-infinity',password_operation_id=null where user_id=$1",[ids.one]);
  }
  await as('one');await db.query("select set_config('request.jwt.claim.session_id','99999999-0000-4000-8000-000000000000',false)");await assert.rejects(complete(),/google_sign_in_required/);
  await as('one');assert.deepEqual(await complete(),{status:'ready'});assert.deepEqual(await ensure(),{status:'ready'});
  const own=(await db.query('select my_client_account() data')).rows[0].data;
  assert.equal(own.name,'New customer');assert.deepEqual(own.packages,[]);assert.equal(own.next_visit,null);assert.equal(own.private_lifetime,null);
  await as('one','password');assert.equal((await db.query('select my_client_account() data')).rows[0].data.status,'password_required');
  await as('admin');
  let directory=(await db.query('select admin_client_directory() data')).rows[0].data;
  assert.equal(directory.clients.length,2);assert.equal(directory.rows.length,0);
  const client=directory.clients.find(c=>c.id===`google:${ids.one}`);
  assert.equal(client.phone,'+85255550001');assert.equal(client.signup_source,'google');assert.ok(client.profile_completed_at);
  const grouped=groupClients(directory.rows,directory.clients);
  assert.equal(filterClients(grouped,'','google',directory.as_of).length,2);
  assert.equal(filterClients(grouped,'','incomplete',directory.as_of).length,0);
  await db.query('select save_studio_client($1,$2,$3)',[client.id,client.version,JSON.stringify({client_name:'Admin corrected',phone:'+85255550002',email:client.email,visits_since_jun:null})]);
  await as('one');await complete('Overwrite attempt');
  await as('admin');directory=(await db.query('select admin_client_directory() data')).rows[0].data;
  assert.equal(directory.clients.find(c=>c.id===client.id).client_name,'Admin corrected');
  // An email collision must never attach or expose an existing CRM record.
  await db.query('select save_studio_client(null,null,$1)',[JSON.stringify({client_name:'Existing studio customer',phone:'',email:'CONFLICT@example.test',visits_since_jun:null})]);
  await as('conflict');assert.deepEqual(await ensure(),{status:'link_required'});await assert.rejects(complete(),/client_profile_access_required/);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int n from studio_client_accounts')).rows[0].n,2);
  assert.equal((await db.query('select password_changed_at from studio_client_accounts where user_id=$1',[ids.one])).rows[0].password_changed_at,null);
  assert.equal((await db.query('select count(*)::int n from private.studio_client_changes where actor_id=$1',[ids.one])).rows[0].n,2);
  // Profile fields are session-gated, typed and visible to admins only.
  const details=async()=>(await db.query('select my_client_profile() data')).rows[0].data;
  const save=async(section,input,version)=>(await db.query('select save_my_client_profile($1,$2,$3) data',[section,JSON.stringify(input),version])).rows[0].data;
  // A 1x1 PNG stands in for the drawn signature; only its header is inspected server-side.
  const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const sign=async(version='2026-09-16',name='Client signer',capacity='self',agreed=true,signature=PNG)=>(await db.query('select sign_my_client_waiver($1,$2,$3,$4,$5) data',[version,name,capacity,agreed,signature])).rows[0].data;
  await db.query('insert into teacher_profiles(id) values($1)',[ids.teacher]);
  for(const kind of ['anon','teacher','admin','conflict']) {await as(kind);await assert.rejects(details(),/permission denied|client_account_required|active_client_account_required/);}
  await as('one','password');await assert.rejects(details(),/active_client_account_required/);
  await as('one');let portal=await details();assert.equal(portal.profile,null);assert.equal(portal.contact.phone,'+85255550002');
  assert.equal(portal.waiver_document.version,'2026-09-16');assert.ok(portal.waiver_document.sha256);assert.deepEqual(portal.waiver_signatures,[]);
  const intake={name:'Client updated',phone:'+852 5555 0099',goals:['strength','rehab'],age_band:'35–44',level:'some',injuries:['Knees'],schedule_prefs:['am'],preferred_studio_ids:['central'],languages:['English'],notes:'Synthetic personal note',pregnant:false,edd:null,recent_surgery:true,doctor_cleared:false};
  await assert.rejects(save('about',{...intake,waiver_signed_at:'2020-01-01'},1),/invalid_profile_field/);
  await assert.rejects(save('about',{...intake,goals:['fake']},1),/complete_valid_intake_required/);
  await assert.rejects(save('about',{...intake,doctor_cleared:null},1),/complete_valid_intake_required/);
  await assert.rejects(save('about',{...intake,pregnant:true},1),/valid_due_date_required/);
  portal=await save('about',intake,1);assert.equal(portal.profile.profile_version,2);assert.equal(portal.contact.name,'Client updated');assert.equal(portal.profile.doctor_cleared,false);
  await assert.rejects(save('about',intake,1),/profile_changed_reload/);
  await assert.rejects(db.query("update client_profiles set waiver_signed_at=now()"),/permission denied/);
  assert.deepEqual((await db.query('select * from client_profiles')).rows,[]);
  assert.deepEqual((await db.query('select * from client_waiver_signatures')).rows,[]);
  await assert.rejects(save('favourites',{favourite_teacher_ids:[ids.admin]},2),/invalid_instructor/);
  portal=await save('favourites',{favourite_teacher_ids:[ids.teacher]},2);
  await assert.rejects(save('preferences',{notification_preferences:{promotions:'yes'}},3),/invalid_notification_preferences/);
  portal=await save('preferences',{notification_preferences:{booking_reminders:true,availability_alerts:false,promotions:false}},3);
  await assert.rejects(sign('2026-09-16','Client signer','self',false),/waiver_consent_required/);
  await assert.rejects(sign('wrong'),/waiver_changed_reload/);
  await assert.rejects(sign('2026-09-16','Client signer','invalid'),/waiver_consent_required/);
  for(const bad of [null,'','data:image/jpeg;base64,'+PNG.slice(22),'data:image/png;base64,'+'AAAA'.repeat(30),'data:image/png;base64,'+'not base64!'.repeat(12),'data:image/png;base64,'+'A'.repeat(200001)]) await assert.rejects(sign('2026-09-16','Client signer','self',true,bad),/waiver_signature_required/);
  assert.deepEqual((await db.query('select * from client_waiver_signature_images')).rows,[]);
  portal=await sign();assert.equal(portal.waiver_signatures.length,1);assert.equal(portal.waiver_signatures[0].participant_name,'Client updated');
  assert.equal(portal.waiver_signatures[0].copy_email_status,'not_requested'); // email delivery is not switched on
  await db.exec('reset role');await db.exec(`delete from private.waiver_copy_emails;delete from client_waiver_signature_images;delete from client_waiver_signatures;update client_profiles set waiver_version=null,waiver_signed_at=null,waiver_signed_name=null;update private.receipt_email_settings set enabled=true,secret_id=gen_random_uuid()`);
  await as('one');portal=await sign();assert.equal(portal.waiver_signatures.length,1);assert.equal(portal.waiver_signatures[0].copy_email_status,'queued');
  await db.exec('reset role');assert.deepEqual((await db.query('select email_status,attempts from private.waiver_copy_emails')).rows,[{email_status:'queued',attempts:0}]);await as('one');
  const signature=portal.waiver_signatures[0];assert.equal(signature.image,undefined);
  const image=async()=>(await db.query('select image from client_waiver_signature_images where signature_id=$1',[signature.id])).rows;
  assert.deepEqual(await image(),[{image:PNG}]);
  const other='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P//PwAF/gL+3MxZ5wAAAABJRU5ErkJggg==';
  portal=await sign('2026-09-16','Overwrite signer','self',true,other);assert.deepEqual(portal.waiver_signatures[0],signature);
  assert.deepEqual(await image(),[{image:PNG}]); // a retry never replaces the first drawing
  await assert.rejects(db.query('update client_waiver_signature_images set image=$1',[other]),/permission denied/);
  await assert.rejects(db.query('insert into client_waiver_signature_images(signature_id,user_id,image) values($1,$2,$3)',[signature.id,ids.one,other]),/permission denied/);
  await assert.rejects(db.query("update client_waiver_signatures set signed_name='forged'"),/permission denied/);
  await as('two');assert.deepEqual(await image(),[]); // another client cannot read the drawing
  await as('two');portal=await details();assert.deepEqual(portal.waiver_signatures,[]);assert.equal(portal.profile,null);assert.equal(JSON.stringify(portal).includes('Synthetic personal note'),false);
  await db.exec('reset role');await db.query("update studio_client_accounts set access_not_before=now()+interval '1 minute' where user_id=$1",[ids.one]);
  await as('one');await assert.rejects(details(),/active_client_account_required/);await assert.rejects(sign(),/active_client_account_required/);await assert.rejects(save('about',intake,5),/active_client_account_required/);
  await as('admin');directory=(await db.query('select admin_client_directory() data')).rows[0].data;
  const adminRecord=directory.clients.find(c=>c.id===client.id);
  assert.equal(adminRecord.phone,'+85255550099');assert.equal(adminRecord.portal_profile.notes,intake.notes);assert.deepEqual(adminRecord.portal_profile.goals,intake.goals);assert.equal(adminRecord.portal_profile.recent_surgery,true);
  assert.equal(adminRecord.portal_profile.notification_preferences.booking_reminders,true);assert.equal(adminRecord.favourite_teachers[0].name,'Synthetic teacher');assert.equal(adminRecord.waiver_signatures[0].signed_name,'Client signer');
  assert.deepEqual(await image(),[{image:PNG}]); // admins can
  // A paid website package shows in Admin Clients beside studio records; test-mode and unpaid orders never do.
  await db.exec('reset role');
  const payment='44444444-0000-4000-8000-000000000001',order='44444444-0000-4000-8000-000000000002',testOrder='44444444-0000-4000-8000-000000000003';
  await db.query(`insert into payments(id,client_id,package_id,amount_hkd,method,status,stripe_ref) values($1,$2,'studio',9000,'card','paid','pi_synthetic')`,[payment,ids.one]);
  await db.query(`insert into package_checkout_orders(id,client_id,package_id,package_name,format,is_trial,credits,price_hkd,validity_months,return_origin,livemode,status,stripe_session_id,payment_id,paid_at)
    values($1,$2,'studio','10-class pack','1:1',false,10,9000,6,'https://sensesprivate.com',true,'paid','cs_synthetic',$3,now()),
           ($4,$2,'trial','First session','1:1',true,1,900,3,'https://sensesprivate.com',false,'paid','cs_synthetic_test',null,now())`,[order,ids.one,payment,testOrder]);
  await as('admin');const withWeb=(await db.query('select admin_client_directory() data')).rows[0].data;
  const webRows=withWeb.rows.filter(r=>r.source==='website');assert.equal(webRows.length,1);
  const web=webRows[0];assert.equal(web.id,'website:'+order);assert.equal(web.client_id,adminRecord.id);assert.equal(web.client_name,'Client updated');
  assert.equal(web.package_name,'10-class pack - 1:1');assert.equal(web.credits_left,10);assert.equal(web.total_credits,10);assert.equal(web.purchase_amount_hkd,9000);
  assert.equal(web.expiry_date,null);assert.equal(web.validity_months,6);assert.equal(web.payment_status,'paid');
  const webClient=groupClients(withWeb.rows,withWeb.clients).find(c=>c.id===adminRecord.id);assert.equal(webClient.credits,10);assert.equal(webClient.packages.length,1);
  await db.exec('reset role');await db.query(`insert into credit_ledger(client_id,delta,reason) values($1,-1,'booking')`,[ids.one]);
  await as('admin');assert.equal((await db.query('select admin_client_directory() data')).rows[0].data.rows.find(r=>r.source==='website').credits_left,null); // usage recorded: balance lives in the ledger
  assert.equal(adminRecord.waiver_signatures[0].document_sha256,portal.waiver_document.sha256);

});
