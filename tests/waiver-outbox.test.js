import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const admin='11111111-0000-4000-8000-000000000001',client='11111111-0000-4000-8000-000000000002',signature='33333333-0000-4000-8000-000000000001';
const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
test('waiver copy outbox reuses the receipt mail settings, joins the signed document, claims once and bounds uncertain retries',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 // Stand-ins for the tables the migration joins; the real schema is exercised by the onboarding test.
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema private;create schema auth;create schema vault;
 grant usage on schema private,auth,public to authenticated,service_role;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function private.require_prospect_admin() returns void language plpgsql as $$begin if auth.uid() is distinct from '${admin}'::uuid then raise exception 'admin_access_required';end if;end$$;
 create table vault.secrets(id uuid primary key default gen_random_uuid(),name text,decrypted_secret text);
 create view vault.decrypted_secrets as select * from vault.secrets;
 create function vault.create_secret(k text,n text,d text) returns uuid language sql as $$insert into vault.secrets(name,decrypted_secret) values(n,k) returning id$$;
 create function vault.update_secret(i uuid,k text) returns void language sql as $$update vault.secrets set decrypted_secret=k where id=i$$;
 create table private.receipt_email_settings(id boolean primary key default true check(id),secret_id uuid references vault.secrets(id),sender text not null default 'cs@senses-studio.co',enabled boolean not null default false,activated_at timestamptz not null default now());
 insert into private.receipt_email_settings(id) values(true);
 create table private.official_receipts(email_status text,error_code text);
 create table public.client_waiver_documents(version text primary key,title text,body jsonb,sha256 text,active boolean);
 create table public.studio_clients(id text primary key,client_name text);
 create table public.studio_client_accounts(client_id text primary key references public.studio_clients(id),user_id uuid,login_email text);
 create table public.client_waiver_signatures(id uuid primary key,user_id uuid,client_id text references public.studio_clients(id),version text references public.client_waiver_documents(version),signed_name text,participant_name text,signer_capacity text,signed_at timestamptz default now(),document_sha256 text);
 create table public.client_waiver_signature_images(signature_id uuid primary key references public.client_waiver_signatures(id),user_id uuid,image text);
 insert into public.client_waiver_documents values('2026-09-16','Waiver and Release of Liability','{"sections":[{"h":"Assumption of Risk","paras":["Synthetic clause."]}]}','abc123',true);
 insert into public.studio_clients values('c-1','Synthetic Client');insert into public.studio_client_accounts values('c-1','${client}','client@example.test');
 insert into public.client_waiver_signatures values('${signature}','${client}','c-1','2026-09-16','Synthetic Signer','Synthetic Client','self',now(),'abc123');
 insert into public.client_waiver_signature_images values('${signature}','${client}','${PNG}');`);
 await db.exec(await readFile(new URL('../supabase/migrations/20260919050000_waiver_copy_emails.sql',import.meta.url),'utf8'));
 // The receipts migration owns this public wrapper; the stand-in mirrors it.
 await db.exec(`create function public.receipt_mail_settings(p_key text default null,p_enabled boolean default null) returns jsonb language sql security invoker set search_path='' as $$select private.receipt_mail_settings(p_key,p_enabled)$$;`);
 await db.exec(`insert into private.waiver_copy_emails(signature_id,email_status) values('${signature}','queued')`);
 const role=async r=>db.exec(`reset role;set role ${r}`);
 const jobs=async()=>(await db.query('select waiver_copy_jobs() d')).rows[0].d;
 const claim=async()=>(await db.query('select claim_waiver_copy_email($1,$2) d',[signature,{to:['client@example.test']}])).rows[0].d;
 await role('anon');await assert.rejects(jobs(),/permission denied/);await assert.rejects(claim(),/permission denied/);
 await role('authenticated');await assert.rejects(jobs(),/permission denied/);await assert.rejects(db.query('select * from private.waiver_copy_emails'),/permission denied/);
 await role('service_role');assert.deepEqual(await jobs(),{configured:false}); // no key yet: nothing leaves
 await role('authenticated');await db.exec(`select set_config('request.jwt.claim.sub','${admin}',false)`);
 const settings=(await db.query("select receipt_mail_settings('re_synthetic_test_key',true) d")).rows[0].d;
 assert.deepEqual(settings.waiver_counts,{queued:1,sent:0,needs_review:0,failed:0});assert.equal(JSON.stringify(settings).includes('re_synthetic'),false);
 await role('service_role');const config=await jobs();
 assert.equal(config.configured,true);assert.equal(config.key,'re_synthetic_test_key');assert.equal(config.sender,'cs@senses-studio.co');assert.equal(config.jobs.length,1);
 const job=config.jobs[0];assert.equal(job.signature_id,signature);assert.equal(job.email,'client@example.test');assert.equal(job.signed_name,'Synthetic Signer');
 assert.equal(job.document_title,'Waiver and Release of Liability');assert.equal(job.document_body.sections[0].h,'Assumption of Risk');assert.equal(job.signature_image,PNG);
 const first=await claim();assert.equal(first.attempt,1);assert.deepEqual(first.payload,{to:['client@example.test']});assert.equal(await claim(),null); // leased
 assert.equal((await jobs()).jobs.length,0);
 await db.query("select finish_waiver_copy_email($1,1,null,'delivery_failed')",[signature]);
 await role('postgres');assert.equal((await db.query('select email_status,error_code from private.waiver_copy_emails')).rows[0].email_status,'queued');
 await db.exec('update private.waiver_copy_emails set next_attempt_at=now()');
 await role('service_role');const second=await claim();assert.equal(second.attempt,2);assert.deepEqual(second.payload,{to:['client@example.test']}); // the first payload is kept
 await db.query("select finish_waiver_copy_email($1,2,'provider-id')",[signature]);assert.equal(await claim(),null);assert.equal((await jobs()).jobs.length,0);
 await role('postgres');const row=(await db.query('select * from private.waiver_copy_emails')).rows[0];assert.equal(row.email_status,'sent');assert.equal(row.provider_id,'provider-id');assert.ok(row.sent_at);
 await db.exec(`update private.waiver_copy_emails set email_status='sending',first_attempt_at=now()-interval '24 hours',lease_until=now()-interval '5 minutes',next_attempt_at=now()`);
 await role('service_role');assert.equal((await jobs()).jobs.length,0);
 await role('postgres');assert.equal((await db.query('select email_status,error_code from private.waiver_copy_emails')).rows[0].error_code,'delivery_uncertain');
});
