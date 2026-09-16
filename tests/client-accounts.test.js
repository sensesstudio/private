import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { rawClientRows } from './fixtures/client-import.js';
import { clientAccountsHandler } from '../supabase/functions/client-accounts/handler.js';
import { temporaryPassword, validNewPassword } from '../supabase/functions/client-accounts/password.js';

test('client account ownership is explicit; password gate, role checks and raw CRM isolation hold in SQL',async t=>{
  const db=new PGlite();t.after(()=>db.close());
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create table auth.users(id uuid primary key);create table auth.identities(user_id uuid,provider text,identity_data jsonb);create table auth.sessions(id uuid primary key,user_id uuid,created_at timestamptz default clock_timestamp(),not_after timestamptz);
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('session_id',current_setting('request.jwt.claim.session_id',true),'amr',coalesce(nullif(current_setting('request.jwt.claim.amr',true),'')::jsonb,'[]'::jsonb)) $$;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;`);
  const migration=async name=>(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8')).replace(/create extension if not exists (pgcrypto|pg_cron|pg_net);/g,'');
  await db.exec(await migration('0001_init.sql'));
  await db.exec(await readFile(new URL('../supabase/seed.sql',import.meta.url),'utf8'));
  await db.exec(await migration('0004_mindbody_rooms.sql'));
  await db.exec('grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;');
  await db.exec(await migration('0005_live_availability.sql'));
  await db.exec(await migration('20260916070412_admin_client_csv.sql'));
  const ids={admin:'11111111-0000-4000-8000-000000000001',one:'11111111-0000-4000-8000-000000000002',two:'11111111-0000-4000-8000-000000000003',teacher:'11111111-0000-4000-8000-000000000004'};
  for (const [kind,id] of Object.entries(ids)) {
    await db.query('insert into auth.users values($1)',[id]);await db.query('insert into auth.sessions(id,user_id) values($1,$1)',[id]);
    await db.query('insert into profiles(id,role,full_name,email) values($1,$2,$3,$4)',[id,kind==='one'||kind==='two' ? 'client' : kind,`Synthetic ${kind}`,kind==='one' ? 'holder@example.test' : `${kind}@example.test`]);
  }
  const as=async(role,id='')=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);select set_config('request.jwt.claim.session_id','${id}',false);set role ${role};`);
  await as('service_role');
  await db.query('select import_admin_client_packages($1,$2,$3,$4)', ['synthetic.csv','c'.repeat(64),'2026-09-30',JSON.stringify(rawClientRows)]);
  await db.exec('reset role');
  for (const name of ['20260916081040_admin_client_editing.sql','20260916081703_mindbody_client_packages.sql','20260916091926_admin_client_last_visit.sql','20260916094547_admin_client_next_visit.sql','20260916101325_client_account_access.sql','20260916102320_admin_client_private_lifetime.sql','20260916105918_client_password_reset.sql','20260916114203_client_google_access.sql']) await db.exec(await migration(name));
  const first=rawClientRows[0].ClientId,second=rawClientRows[3].ClientId;
  await db.query("update admin_client_packages set private_sessions_lifetime=case when client_id=$1 then 14 else 0 end, raw_data=raw_data || jsonb_build_object('Private_sessions_lifetime',case when client_id=$1 then '14' else '0' end)",[first]);
  await as('authenticated',ids.admin);
  const directory=(await db.query('select admin_client_directory() data')).rows[0].data;
  assert.equal(directory.clients.find(c=>c.id===first).private_sessions_lifetime,14);
  assert.equal(directory.clients.find(c=>c.id===second).private_sessions_lifetime,0);
  await db.query('select save_studio_client($1,1,$2)',[second,JSON.stringify({client_name:'Other Client',email:'two@example.test',phone:'',visits_since_jun:null})]);
  const bind=(client=first,user=ids.one,email='holder@example.test',version=1,actor=ids.admin)=>db.query('select bind_studio_client_account($1,$2,$3,$4,$5)',[client,version,user,email,actor]);
  for (const role of ['anon','authenticated']) {
    await as(role,role==='authenticated' ? ids.one : '');
    await assert.rejects(bind(),/permission denied/);
  }
  await as('service_role');
  await assert.rejects(bind(first,ids.one,'wrong@example.test'),/client_changed_reload/);
  await assert.rejects(bind(first,ids.one,'holder@example.test',999),/client_changed_reload/);
  await assert.rejects(bind(first,ids.one,'holder@example.test',1,ids.one),/admin_access_required/);
  await assert.rejects(bind(first,ids.teacher),/client_account_required/);
  await bind();await bind(second,ids.two,'two@example.test',2);
  await assert.rejects(bind(),/duplicate key/);
  const snapshot=async()=>(await db.query('select my_client_account() data')).rows[0].data;
  await as('anon');await assert.rejects(snapshot(),/permission denied/);
  await assert.rejects(db.query('select private.client_account_snapshot()'),/permission denied/);
  for (const id of [ids.admin,ids.teacher]) {
    await as('authenticated',id);await assert.rejects(snapshot(),/client_account_required/);
  }
  await as('authenticated',ids.one);
  assert.deepEqual(await snapshot(),{status:'password_required'});
  assert.deepEqual((await db.query('select * from studio_client_accounts')).rows,[]);
  await assert.rejects(db.query('update studio_client_accounts set password_changed_at=now()'),/permission denied/);
  await assert.rejects(db.query("update profiles set role='admin' where id=auth.uid()"),/permission denied/);
  // OAuth is session-specific: unverified/mismatched identities, missing AMR,
  // password sessions and Google identities owned by another user stay gated.
  await db.exec('reset role');
  await db.query('insert into auth.identities values($1,$2,$3)',[ids.two,'google',JSON.stringify({email:'holder@example.test',email_verified:true})]);
  const amr=async method=>db.query("select set_config('request.jwt.claim.amr',$1,false)",[JSON.stringify([{method}])]);
  await as('authenticated',ids.one);await amr('oauth');
  assert.equal((await snapshot()).status,'password_required');
  await db.exec('reset role');
  await db.query('insert into auth.identities values($1,$2,$3)',[ids.one,'google',JSON.stringify({email:'holder@example.test',email_verified:false})]);
  await as('authenticated',ids.one);assert.equal((await snapshot()).status,'password_required');
  await db.exec('reset role');
  await db.query("update auth.identities set identity_data=$1 where user_id=$2",[JSON.stringify({email:'wrong@example.test',email_verified:true}),ids.one]);
  await as('authenticated',ids.one);assert.equal((await snapshot()).status,'password_required');
  await db.exec('reset role');
  await db.query("update auth.identities set identity_data=$1 where user_id=$2",[JSON.stringify({email:'holder@example.test',email_verified:true}),ids.one]);
  await as('authenticated',ids.one);
  assert.equal((await snapshot()).status,'active');
  assert.equal((await snapshot()).name,'Example Package Holder');
  await amr('password');assert.equal((await snapshot()).status,'password_required');
  await as('service_role');
  assert.equal((await db.query('select password_changed_at from studio_client_accounts where user_id=$1',[ids.one])).rows[0].password_changed_at,null);
  await db.query('update studio_client_accounts set password_operation_id=$1 where user_id=$1',[ids.one]);
  await as('authenticated',ids.one);await amr('oauth');assert.equal((await snapshot()).status,'password_required');
  await as('service_role');await db.exec('update studio_client_accounts set password_operation_id=null');
  await db.exec('reset role');
  await db.query("update auth.sessions set not_after=now()-interval '1 minute' where id=$1",[ids.one]);
  await as('authenticated',ids.one);assert.equal((await snapshot()).status,'sign_in_required');
  await db.exec('reset role');await db.query('update auth.sessions set not_after=null where id=$1',[ids.one]);
  await amr('password');
  await as('service_role');await db.exec('update studio_client_accounts set password_changed_at=now()');
  await as('authenticated',ids.one);
  const own=await snapshot();assert.equal(own.status,'active');assert.equal(own.packages.length,3);assert.equal(own.name,'Example Package Holder');
  assert.equal(own.private_lifetime.sessions,14);
  for (const table of ['studio_clients','studio_client_packages','admin_client_packages','mindbody_package_links']) assert.deepEqual((await db.query(`select * from ${table}`)).rows,[]);
  const text=JSON.stringify(own);for (const forbidden of ['Other Client','two@example.test','raw_data','source_row','client_id','phone','purchase_amount','holder@example.test']) assert.equal(text.includes(forbidden),false);
  await assert.rejects(db.query('select admin_client_directory()'),/admin_access_required/);
  await as('authenticated',ids.two);const other=await snapshot();assert.equal(other.name,'Other Client');assert.equal(other.packages.length,1);
  assert.equal(JSON.stringify(other).includes('Example Package Holder'),false);
  await as('authenticated',ids.admin);assert.equal((await db.query('select * from studio_client_accounts')).rows.length,2);
  const begin=(reset=true,actor=ids.admin,user=ids.one)=>db.query('select begin_client_password_operation($1,$2,$3) op',[user,actor,reset]);
  const finish=(op,ok=true,actor=ids.admin)=>db.query('select finish_client_password_operation($1,$2,$3,$4)',[ids.one,actor,op,ok]);
  await assert.rejects(begin(),/permission denied/);
  await as('service_role');
  await assert.rejects(begin(true,ids.one),/admin_access_required/);
  await assert.rejects(begin(true,ids.admin,ids.teacher),/client_account_required/);
  const op=(await begin()).rows[0].op;
  await assert.rejects(begin(),/password_operation_in_progress/);
  await assert.rejects(finish(ids.two),/password_operation_changed/);
  await finish(op);
  await as('authenticated',ids.one);assert.equal((await snapshot()).status,'sign_in_required');
  await amr('oauth');assert.equal((await snapshot()).status,'sign_in_required');await amr('password');
  await as('service_role');const change=(await begin(false,ids.one)).rows[0].op;await finish(change,true,ids.one);
  await as('authenticated',ids.one);assert.equal((await snapshot()).status,'sign_in_required');
  await db.exec('reset role');await db.query('update auth.sessions set created_at=clock_timestamp() where id=$1',[ids.one]);
  await as('authenticated',ids.one);assert.equal((await snapshot()).status,'active');
  await db.exec('reset role');await db.query("update auth.sessions set not_after=now()-interval '1 minute' where id=$1",[ids.one]);
  await as('authenticated',ids.one);assert.equal((await snapshot()).status,'sign_in_required');
});

function fixture({role='admin',linked=false,createError=false,bindError=false,verify=true,passwordError=false,lockError=false}={}) {
  const calls=[];
  const admin={auth:{getUser:async token=>token==='valid' ? {data:{user:{id:'caller',email:'holder@example.test'}}} : {error:{}},admin:{
    getUserById:async id=>({data:{user:{id,email:'holder@example.test'}}}),
    createUser:async input=>{calls.push(['create',input]);return createError ? {error:{}} : {data:{user:{id:'new-user'}}};},
    deleteUser:async id=>{calls.push(['delete',id]);return {};},
    updateUserById:async(id,input)=>{calls.push(['password',id,input]);return passwordError ? {error:{}} : {};},
  }},rpc:async(name,input)=>{calls.push(['rpc',name,input]);return bindError || (lockError && name==='begin_client_password_operation') ? {error:{}} : {data:name==='begin_client_password_operation' ? 'operation' : true};},
  from(table){let update=false;const query={select(){return query;},eq(){return query;},is(){return query;},update(input){update=true;calls.push(['activate',input]);return query;},
    single:async()=>({data:table==='profiles' ? {role} : {id:'crm-one',client_name:'Synthetic Client',email:'holder@example.test',version:1}}),
    maybeSingle:async()=>({data:linked ? {user_id:'caller',login_email:'holder@example.test',password_changed_at:null} : null}),
    then(resolve,reject){return Promise.resolve(update ? {} : {data:[]}).then(resolve,reject);}};return query;}};
  return {calls,handler:clientAccountsHandler({admin,verifyPassword:async(...args)=>{calls.push(['verify',...args]);return verify;}})};
}
const request=(body,token='valid',origin='https://sensesprivate.up.railway.app')=>new Request('https://example.test/client-accounts',{method:'POST',headers:{Authorization:`Bearer ${token}`,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const create={action:'create',clientId:'crm-one',email:'holder@example.test',confirmedEmail:true};
test('account provisioning requires verified admin token and email, never overwrites existing accounts',async()=>{
  for (const role of ['client','teacher']) { const f=fixture({role});assert.equal((await f.handler(request(create))).status,403);assert.deepEqual(f.calls,[]); }
  const bad=fixture();assert.equal((await bad.handler(request(create,'invalid'))).status,401);assert.equal((await bad.handler(request(create,'valid','https://bad.example'))).status,403);assert.deepEqual(bad.calls,[]);
  for (const body of [{...create,confirmedEmail:false},{...create,email:'changed@example.test'}]) {const f=fixture();assert.ok((await f.handler(request(body))).status>=400);assert.deepEqual(f.calls,[]);}
  const existing=fixture({linked:true});assert.equal((await existing.handler(request(create))).status,409);assert.deepEqual(existing.calls,[]);
  const duplicate=fixture({createError:true});assert.equal((await duplicate.handler(request(create))).status,409);assert.equal(duplicate.calls.length,1);
  const rollback=fixture({bindError:true});assert.equal((await rollback.handler(request(create))).status,409);assert.deepEqual(rollback.calls.at(-1),['delete','new-user']);
  const f=fixture();const res=await f.handler(request(create));assert.equal(res.status,200);assert.equal(res.headers.get('Cache-Control'),'no-store');
  const body=await res.json();assert.equal(body.email,'holder@example.test');assert.match(body.temporary_password,/^(?:[A-Z][a-z]+){3}\d{4}$/);
  assert.equal(f.calls[0][1].password,body.temporary_password);assert.equal(f.calls[1][2].p_actor,'caller');
});
test('first password change is authenticated, verifies current password, changes only self and gates data until saved',async()=>{
  const body={action:'change-password',currentPassword:'TemporaryTea4826',password:'MyNewPassword2468',userId:'someone-else'};
  for(const options of [{role:'teacher',linked:true},{role:'client'},{role:'client',linked:true,verify:false}]) {
    const f=fixture(options);assert.ok((await f.handler(request(body))).status>=400);assert.equal(f.calls.some(c=>c[0]==='password'||c[0]==='activate'),false);
  }
  const f=fixture({role:'client',linked:true});assert.equal((await f.handler(request({...body,password:body.currentPassword}))).status,400);assert.equal((await f.handler(request(body))).status,200);
  assert.deepEqual(f.calls.map(c=>c[0]),['rpc','verify','password','rpc']);assert.equal(f.calls[2][1],'caller');
  assert.equal(validNewPassword('123456789012','something'),false);assert.equal(validNewPassword('a'.repeat(73)+'1','something'),false);
  const passwords=new Set(Array.from({length:100},()=>temporaryPassword()));assert.equal(passwords.size,100);
});

test('admin reset requires confirmation and targets the linked account; failures never activate access',async()=>{
  const reset={action:'reset-password',clientId:'crm-one',email:'holder@example.test',confirmReset:true,temporaryPassword:'Sample123*',userId:'someone-else'};
  for(const options of [{role:'client',linked:true},{role:'teacher',linked:true},{linked:false},{linked:true,lockError:true}]) {
    const f=fixture(options);assert.ok((await f.handler(request(reset))).status>=400);assert.equal(f.calls.some(c=>c[0]==='password'),false);
  }
  const f=fixture({linked:true});assert.equal((await f.handler(request({...reset,confirmReset:false}))).status,400);
  assert.equal((await f.handler(request({...reset,email:'other@example.test'}))).status,409);
  const res=await f.handler(request(reset));assert.equal(res.status,200);assert.equal((await res.json()).temporary_password,'Sample123*');
  assert.equal(f.calls.find(c=>c[0]==='password')[1],'caller');assert.equal(f.calls[0][2].p_reset,true);
  const fail=fixture({linked:true,passwordError:true});assert.equal((await fail.handler(request(reset))).status,400);assert.equal(fail.calls.at(-1)[2].p_success,false);
  const custom=fixture();assert.equal((await custom.handler(request({...create,temporaryPassword:'Sample123*'}))).status,200);assert.equal(custom.calls[0][1].password,'Sample123*');
});
