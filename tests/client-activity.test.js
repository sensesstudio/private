import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('client and admin share real histories with pagination, session gates and private photo ownership', async t => {
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
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;grant select on storage.objects to authenticated;`);
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
  await db.exec(await migration('0004_mindbody_rooms.sql'));
  await db.exec('grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;');
  for (const name of ['0002_session_photos.sql','0005_live_availability.sql','20260916072203_package_checkout.sql','20260916070412_admin_client_csv.sql','20260916081040_admin_client_editing.sql','20260916081703_mindbody_client_packages.sql','20260916091926_admin_client_last_visit.sql','20260916094547_admin_client_next_visit.sql','20260916101325_client_account_access.sql','20260916102320_admin_client_private_lifetime.sql','20260916105918_client_password_reset.sql','20260916114203_client_google_access.sql','20260916141227_google_client_onboarding.sql','20260916141926_client_profile_records.sql','20260916145035_client_activity_sync.sql']) await db.exec(await migration(name));

  const ids={admin:'11111111-0000-4000-8000-000000000001',one:'11111111-0000-4000-8000-000000000002',two:'11111111-0000-4000-8000-000000000003',teacher:'11111111-0000-4000-8000-000000000004',otherTeacher:'11111111-0000-4000-8000-000000000005'};
  for(const [kind,id] of Object.entries(ids)) {
    await db.query('insert into auth.users values($1,$2,now())',[id,`${kind}@example.test`]);
    await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[id]);
    await db.query('insert into auth.identities values($1,$2,$3)',[id,'google',JSON.stringify({email:`${kind}@example.test`,email_verified:true})]);
    await db.query('insert into profiles(id,role,full_name,email) values($1,$2,$3,$4)',[id,kind==='admin'?'admin':kind.toLowerCase().includes('teacher')?'teacher':'client',`Synthetic ${kind}`,`${kind}@example.test`]);
  }
  const as=async(kind,method='oauth')=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${ids[kind]||''}',false);select set_config('request.jwt.claim.session_id','${ids[kind]||''}',false);select set_config('request.jwt.claim.amr','[{"method":"${method}"}]',false);set role ${kind==='anon'?'anon':'authenticated'};`);
  const mine=async(kind='progress',offset=0,limit=20)=>(await db.query('select my_client_activity($1,$2,$3) data',[kind,offset,limit])).rows[0].data;
  const admin=async(client=`google:${ids.one}`,kind='progress',offset=0,limit=20)=>(await db.query('select admin_client_activity($1,$2,$3,$4) data',[client,kind,offset,limit])).rows[0].data;
  for(const kind of ['one','two']) {await as(kind);await db.query('select ensure_my_client_profile()');await db.query('select complete_my_client_profile($1,$2)',[`Synthetic ${kind}`,'+85255550001']);}
  await db.exec('reset role');
  const booking=(await db.query("insert into bookings(client_id,teacher_id,studio_id,starts_at) values($1,$2,'central','2026-09-01T02:00Z') returning id",[ids.two,ids.teacher])).rows[0].id;
  const notes=[];
  for(let i=0;i<23;i++)notes.push((await db.query("insert into session_notes(client_id,teacher_id,booking_id,focus,note,created_at) values($1,$2,$3,$4,$5,$6) returning id",[ids.one,ids.teacher,i===22?booking:null,`Focus ${i}`,'Real persisted test note',new Date(Date.UTC(2026,8,1+i)).toISOString()])).rows[0].id);
  const foreign=(await db.query("insert into session_notes(client_id,teacher_id,note) values($1,$2,'Other private note') returning id",[ids.two,ids.otherTeacher])).rows[0].id;
  const path=`${ids.one}/${notes[22]}/posture.jpg`;
  const badPath=`${ids.two}/${notes[22]}/bad.jpg`;
  for(const [client,note,teacher,storagePath] of [[ids.one,notes[22],ids.teacher,path],[ids.two,notes[22],ids.teacher,badPath],[ids.two,foreign,ids.otherTeacher,`${ids.two}/${foreign}/other.jpg`]]) {
    await db.query('insert into session_photo(client_id,note_id,teacher_id,storage_path,size_bytes) values($1,$2,$3,$4,1200)',[client,note,teacher,storagePath]);
    await db.query("insert into storage.objects(bucket_id,name) values('session-photos',$1)",[storagePath]);
  }
  // Real and test checkout orders use the same atomic fulfillment path.
  for(const [client,live] of [[ids.one,true],[ids.one,false],[ids.two,true]]) {
    const order=(await db.query("select prepare_package_checkout($1,'p11-5','https://sensesprivate.up.railway.app',$2) data",[client,live])).rows[0].data;
    await db.query("select fulfill_package_checkout($1,$2,$3,475000,'hkd','paid',$4)",[order.id,`cs_${live?'live':'test'}_${order.id}`,client,live]);
  }
  await as('admin');await db.exec('reset role');
  await db.exec("update packages set name='Renamed catalogue entry' where id='p11-5';insert into studio_clients(id,client_name,email) values('unlinked','Unlinked CRM','one@example.test')");
  await as('anon');await assert.rejects(mine(),/permission denied/);
  for(const kind of ['teacher','admin']) {await as(kind);await assert.rejects(mine(),/client_account_required|active_client_account_required/);}
  await as('one');
  for(const args of [['fake',0,20],['progress',-1,20],['progress',0,51],['progress',0,null]])await assert.rejects(mine(...args),/invalid_activity_request/);
  await assert.rejects(admin(`google:${ids.two}`),/admin_access_required/);
  await assert.rejects(db.query('select private.client_activity($1,$2,0,20)',[`google:${ids.two}`,'progress']),/admin_access_required/);
  const own=await mine();assert.equal(own.total,23);assert.equal(own.items.length,20);assert.equal(own.items[0].focus,'Focus 22');
  assert.equal(own.items[0].session_at,null);assert.equal(own.items[0].studio_name,null); // mismatched booking cannot disclose another client's visit
  assert.deepEqual(own.items[0].photos.map(p=>p.storage_path),[path]);
  const next=await mine('progress',20);assert.equal(next.items.length,3);assert.equal(new Set([...own.items,...next.items].map(n=>n.id)).size,23);
  assert.deepEqual((await db.query('select name from storage.objects')).rows.map(r=>r.name),[path]);
  const payments=await mine('payments');assert.equal(payments.total,1);assert.equal(payments.items[0].amount_hkd,4750);assert.equal(payments.items[0].package_name,'5-class pack');
  const packages=await mine('packages');assert.equal(packages.total,1);assert.equal(packages.items[0].credits,5);assert.equal(packages.items[0].payment_status,'paid');assert.equal('remaining' in packages.items[0],false);
  await as('admin');
  for(const [kind,expected] of [['progress',own],['payments',payments],['packages',packages]])assert.deepEqual((await admin(undefined,kind)).items,expected.items);
  assert.deepEqual((await admin('unlinked')).items,[]);assert.equal((await admin('unlinked')).linked,false);
  await assert.rejects(admin('does-not-exist'),/client_not_found/);
  assert.equal((await db.query('select name from storage.objects')).rows.length,2); // inconsistent photo metadata excluded even for admins
  await as('two');assert.equal((await mine()).items[0].note,'Other private note');assert.equal((await mine()).total,1);
  await as('teacher');assert.deepEqual((await db.query('select name from storage.objects')).rows.map(r=>r.name),[path]);
  await as('otherTeacher');assert.equal((await db.query('select name from storage.objects')).rows.length,1);
  await as('one','password');await assert.rejects(mine(),/active_client_account_required/);assert.equal((await db.query('select name from storage.objects')).rows.length,0);
  // Reset/expired sessions cannot read financial, progress or photo data.
  for(const statement of ["update auth.sessions set not_after=now()-interval '1 minute' where id=$1","update studio_client_accounts set access_not_before=now()+interval '1 minute' where user_id=$1","update studio_client_accounts set password_operation_id=user_id where user_id=$1"]) {
    await db.exec('reset role');await db.query(statement,[ids.one]);await as('one');
    for(const kind of ['progress','payments','packages'])await assert.rejects(mine(kind),/active_client_account_required/);
    assert.equal((await db.query('select name from storage.objects')).rows.length,0);
    await db.exec('reset role');await db.query('update auth.sessions set not_after=null where id=$1',[ids.one]);await db.query("update studio_client_accounts set access_not_before='-infinity',password_operation_id=null where user_id=$1",[ids.one]);
  }
  await as('one');assert.equal((await mine()).total,23);
  // A payment's refund state is shared by both package and payment views.
  await db.exec('reset role');await db.query("update payments set status='refunded' where id=$1",[payments.items[0].id]);
  await as('one');assert.equal((await mine('packages')).items[0].payment_status,'refunded');assert.equal((await mine('payments')).items[0].status,'refunded');
});
