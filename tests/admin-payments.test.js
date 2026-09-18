import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('admin payment reporting pages only live website orders and requires an active admin session',async t=>{
 const db=new PGlite();t.after(()=>db.close());
 await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;
 create table profiles(id uuid primary key,role text,full_name text,email text);
 create table auth.sessions(id uuid,user_id uuid,not_after timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create function auth.jwt() returns jsonb language sql stable as $$select jsonb_build_object('session_id',current_setting('request.jwt.claim.sub',true))$$;
 create table public.payments(id uuid primary key default gen_random_uuid(),client_id uuid,status text);
 create table public.package_checkout_orders(id uuid primary key default gen_random_uuid(),client_id uuid,payment_id uuid,created_at timestamptz default now(),paid_at timestamptz,package_name text,format text,credits int,price_hkd int,status text,stripe_session_id text,livemode boolean);
 insert into profiles values('11111111-1111-4111-8111-111111111111','admin','Admin',null),('22222222-2222-4222-8222-222222222222','client','Synthetic Client','client@example.test'),('33333333-3333-4333-8333-333333333333','teacher','Teacher',null);
 insert into auth.sessions select id,id,null from profiles;grant usage on schema public,private,auth to anon,authenticated;
 insert into package_checkout_orders(client_id,package_name,format,credits,price_hkd,status,stripe_session_id,livemode,created_at)
 select '22222222-2222-4222-8222-222222222222','Private pack','1:1',5,5000,case when i=2 then 'pending' else 'paid' end,'cs_synthetic_'||i,i<>3,'2026-09-18T00:00Z'::timestamptz+i*interval '1 minute' from generate_series(1,3)i;
 insert into public.payments(client_id,status) values('22222222-2222-4222-8222-222222222222','paid');`);
 const original=await readFile(new URL('../supabase/migrations/20260916152058_sleekflow_prospects.sql',import.meta.url),'utf8');
 await db.exec(original.match(/create function private.require_prospect_admin\(\)[\s\S]*?end \$\$;/)[0]);
 await db.exec(await readFile(new URL('../supabase/migrations/20260918040354_admin_website_payments.sql',import.meta.url),'utf8'));
 const as=async(role,id)=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role};`);
 const read=async(query='',status='all',offset=0,limit=25)=>(await db.query('select admin_website_payments($1,$2,$3,$4) data',[query,status,offset,limit])).rows[0].data;
 for(const [role,id] of [['anon',''],['authenticated','22222222-2222-4222-8222-222222222222'],['authenticated','33333333-3333-4333-8333-333333333333']]){await as(role,id);await assert.rejects(read(),/permission denied|admin_access_required/);}
 await as('authenticated','11111111-1111-4111-8111-111111111111');
 let data=await read();assert.equal(data.total,2);assert.deepEqual(data.items.map(r=>r.status),['pending','paid']);assert.equal(data.items[0].client_email,'client@example.test');
 data=await read('CLIENT@example.test','paid');assert.equal(data.total,1);assert.equal(data.items[0].stripe_session_id,'cs_synthetic_1');
 assert.equal((await read('missing')).total,0);assert.equal((await read('', 'all',1,1)).items[0].stripe_session_id,'cs_synthetic_1');
 await assert.rejects(read('', 'invalid'),/invalid_payment_query/);await assert.rejects(read('', 'all',-1),/invalid_payment_query/);
 await db.exec("reset role;update auth.sessions set not_after=now()-interval '1 minute'");await as('authenticated','11111111-1111-4111-8111-111111111111');await assert.rejects(read(),/admin_access_required/);
});
