import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createCheckoutHandler } from '../supabase/functions/create-checkout/handler.js';
import { createWebhookHandler } from '../supabase/functions/stripe-webhook/handler.js';
import { INTEGRATION, STRIPE_ACCOUNT, PAYMENT_ORIGINS, checkoutParameters } from '../supabase/functions/_shared/payments.js';
const client = '11111111-0000-4000-8000-000000000001', other = '11111111-0000-4000-8000-000000000002';
const orderId = '22222222-0000-4000-8000-000000000001';
const origin = PAYMENT_ORIGINS[0];

test('checkout migration reserves once, rejects mismatches, commits payment/credits once and protects balances', async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;`);
  const file = path => readFile(new URL(`../supabase/${path}`, import.meta.url),'utf8');
  await db.exec((await file('migrations/0001_init.sql')).replace('create extension if not exists pgcrypto;',''));
  await db.exec(await file('seed.sql'));
  await db.exec((await file('migrations/0004_mindbody_rooms.sql')).replace(/create extension if not exists pg_(cron|net);/g,''));
  await db.exec('grant select,insert,update,delete on all tables in schema public to anon,authenticated,service_role;');
  await db.exec(await file('migrations/0005_live_availability.sql'));
  await db.exec(await file('migrations/20260916072203_package_checkout.sql'));
  await db.exec(await file('migrations/20260918120533_update_private_package_prices.sql'));
  await db.exec(`insert into auth.users values('${client}'),('${other}'); insert into public.profiles(id,role,full_name) values('${client}','client','Synthetic Buyer'),('${other}','client','Other Buyer');`);
  const as = (role, id='') => db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`);
  let receiptEmail;
  const reserve = async (pkg='p11-trial', who=client) => ({ rows: (await db.query(receiptEmail === undefined ? 'select prepare_package_checkout($1,$2,$3,true) as o' : 'select prepare_package_checkout($1,$2,$3,true,$4) as o',receiptEmail === undefined ? [who,pkg,origin] : [who,pkg,origin,receiptEmail])).rows.map(r=>r.o) });
  const settle = (id, overrides={}) => { const p = { session:'cs_live_synthetic', who:client, amount:100000, currency:'hkd', paid:'paid', mode:true,...overrides }; return db.query('select fulfill_package_checkout($1,$2,$3,$4,$5,$6,$7) as id',[id,p.session,p.who,p.amount,p.currency,p.paid,p.mode]); };
  await as('anon');
  assert.equal((await db.query('select count(*)::int n from packages where active')).rows[0].n,8);
  await assert.rejects(db.query('select * from credit_balances'), /permission denied/);
  await assert.rejects(db.query('select * from package_checkout_orders'), /permission denied/);
  await assert.rejects(reserve(), /permission denied/);
  await as('service_role');
  await assert.rejects(reserve('trial'), /package_unavailable/);
  const order = (await reserve()).rows[0];
  assert.equal(order.price_hkd,1000); assert.equal(order.validity_months,1);
  assert.deepEqual((await db.query("select id,price_hkd from packages where active and format='1:1' order by sort_order")).rows,[{id:'p11-trial',price_hkd:1000},{id:'p11-single',price_hkd:1200},{id:'p11-5',price_hkd:5250},{id:'p11-10',price_hkd:10000}]);
  assert.equal((await reserve()).rows[0].id,order.id);
  for (const wrong of [{amount:1},{currency:'usd'},{paid:'unpaid'},{who:other},{mode:false}]) await assert.rejects(settle(order.id,wrong), /checkout_mismatch/);
  assert.equal((await db.query('select count(*)::int n from payments')).rows[0].n,0);
  const paid = (await settle(order.id)).rows[0].id;
  assert.equal((await settle(order.id)).rows[0].id,paid);
  assert.equal((await db.query('select count(*)::int n from payments')).rows[0].n,1);
  assert.equal((await db.query('select sum(delta)::int n from credit_ledger')).rows[0].n,1);
  await assert.rejects(reserve(), /trial_already_purchased/);
  const second = (await reserve('p12-5')).rows[0];
  assert.equal(second.price_hkd,6500); assert.equal(second.format,'1:2');
  // A ledger error must roll back the preceding payment insert.
  await as('postgres');
  await db.exec("alter table credit_ledger add constraint synthetic_failure check(delta<>5)");
  await as('service_role');
  await assert.rejects(settle(second.id,{session:'cs_live_synthetic_second',amount:650000}), /synthetic_failure/);
  assert.equal((await db.query('select count(*)::int n from payments')).rows[0].n,1);
  await as('authenticated',other);
  assert.deepEqual((await db.query('select * from package_checkout_orders')).rows,[]);
  assert.deepEqual((await db.query('select * from credit_balances')).rows,[]);
  await assert.rejects(settle(order.id), /permission denied/);
  await as('authenticated',client);
  assert.equal((await db.query('select * from package_checkout_orders')).rows.length,2);
  assert.equal((await db.query('select * from credit_balances')).rows[0].balance,1);
  await assert.rejects(db.query("update package_checkout_orders set status='paid'"), /permission denied/);
  // Existing uncertain orders retain their original Stripe request parameters.
  await as('postgres');
  await db.exec(await file('migrations/20260918125536_client_payment_receipts.sql'));
  await as('service_role');
  assert.equal((await reserve('p12-5')).rows[0].receipt_email,null);
  receiptEmail='buyer@example.test';
  const emailed=(await reserve('p11-5')).rows[0];
  assert.equal(emailed.receipt_email,'buyer@example.test');
  receiptEmail='updated@example.test';
  assert.equal((await reserve('p11-5')).rows[0].receipt_email,'buyer@example.test');
  await as('authenticated',client);await assert.rejects(reserve('p11-5'),/permission denied/);

});

function mocks() {
  const calls = [], updates = [], filters = [];
  const order = { status:'pending',livemode:true,receipt_email:'buyer@example.test',id:orderId,client_id:client,package_id:'p11-5',package_name:'5-class pack',format:'1:1',credits:5,price_hkd:4750,validity_months:3,return_origin:origin,checkout_expires_at:new Date(Date.now()+3600000).toISOString(),stripe_session_id:null };
  const session = { id:'cs_live_synthetic',url:'https://checkout.stripe.com/c/pay/cs_live_synthetic',status:'open',payment_status:'unpaid',mode:'payment',livemode:true,currency:'hkd',amount_total:475000,client_reference_id:client,metadata:{integration:INTEGRATION,order_id:orderId} };
  let auth=true, lookup=true, fail=false;
  const admin = {
    auth:{ getUser:async()=>({data:{user:auth ? {id:client,email:'buyer@example.test'} : null},error:null}) },
    rpc:async(name,args)=> { calls.push({name,args}); return {data:name==='prepare_package_checkout' ? order : 'payment-synthetic',error:fail ? {message:'private database detail'} : null}; },
    from:()=> { const chain={select:()=>chain,eq:(key,value)=>{filters.push([key,value]);return chain;},update:value=>{updates.push(value);return chain;},maybeSingle:async()=>({data:lookup?order:null,error:null}),then:fn=>Promise.resolve({error:null}).then(fn)};return chain; },
  };
  const stripe = { accounts:{retrieve:async()=>({id:STRIPE_ACCOUNT,charges_enabled:true})},checkout:{sessions:{create:async(params,options)=>{calls.push({params,options});return session;},retrieve:async(id,params)=>{calls.push({retrieve:id,params});return session;}}} };
  return {admin,stripe,order,session,calls,updates,filters,setAuth:v=>{auth=v;},setLookup:v=>{lookup=v;},setFailure:v=>{fail=v;}};
}
const request = (body, token='valid', requestOrigin=origin) => new Request('https://example.test/create-checkout',{method:'POST',headers:{Origin:requestOrigin,...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify(body)});

test('checkout authenticates, rejects redirect injection and uses server price with idempotency', async()=>{
  const m=mocks(), handle=createCheckoutHandler({...m,configured:true,livemode:true});
  assert.equal((await handle(request({packageId:'p11-5',origin},null))).status,401);
  m.setAuth(false); assert.equal((await handle(request({packageId:'p11-5',origin}))).status,401); m.setAuth(true);
  assert.equal((await handle(request({packageId:'p11-5',origin:'https://evil.test'}))).status,400);
  assert.equal((await handle(request({packageId:'p11-5',origin},'valid','https://evil.test'))).status,403);
  const result=await handle(request({packageId:'p11-5',origin,price:1,credits:999,clientId:other,receipt_email:'attacker@example.test'}));
  assert.equal(result.status,200);assert.match(result.headers.get('Cache-Control'),/no-store/);
  const creation=m.calls.find(c=>c.options);
  assert.equal(creation.params.line_items[0].price_data.unit_amount,475000);
  assert.equal(creation.params.client_reference_id,client);
  assert.equal(m.calls.find(c=>c.name==='prepare_package_checkout').args.p_receipt_email,'buyer@example.test');
  assert.equal(creation.params.customer_email,'buyer@example.test');
  assert.equal(creation.params.payment_intent_data.receipt_email,'buyer@example.test');
  assert.match(creation.params.payment_intent_data.description,/5-class pack \(1:1\), 5 sessions/);
  assert.equal('payment_intent_data' in checkoutParameters({...m.order,receipt_email:null}),false);
  assert.equal(creation.options.idempotencyKey,`package-order-${orderId}`);
  assert.equal('payment_method_types' in creation.params,false);
  assert.match(creation.params.success_url,/\{CHECKOUT_SESSION_ID\}/);
  m.setLookup(false);
  assert.equal((await handle(request({action:'status',sessionId:'cs_live_other'}))).status,404);
  m.setFailure(true);
  assert.equal(JSON.stringify(await (await handle(request({packageId:'p11-5',origin}))).json()).includes('private database detail'),false);
});

test('signed webhook credits only paid sessions and returns failure for database retries',async()=>{
  const m=mocks();let valid=true;
  const event={type:'checkout.session.completed',data:{object:m.session}};
  const handle=createWebhookHandler({...m,secret:'synthetic-secret',verify:async()=>{if(!valid)throw new Error('bad signature');return event;}});
  const req=()=>new Request('https://example.test/stripe-webhook',{method:'POST',headers:{'stripe-signature':'synthetic'},body:'{}'});
  valid=false;assert.equal((await handle(req())).status,400);assert.equal(m.calls.length,0);
  valid=true;assert.equal((await handle(req())).status,200);assert.equal(m.calls.filter(c=>c.name).length,0);
  event.type='checkout.session.async_payment_succeeded';m.session.payment_status='paid';m.session.status='complete';
  assert.equal((await handle(req())).status,200);assert.equal(m.calls.find(c=>c.name).name,'fulfill_package_checkout');
  assert.equal(m.calls.find(c=>c.name).args.p_amount_total,475000);
  m.setFailure(true);assert.equal((await handle(req())).status,500);
  assert.equal(JSON.stringify(checkoutParameters(m.order)).includes('payment_method_types'),false);
});


test('receipts require ownership and a verified paid Stripe session without changing payments',async()=>{
  const m=mocks(),handle=createCheckoutHandler({...m,configured:true,livemode:true});
  const input={action:'receipt',orderId};
  assert.equal((await handle(request(input,null))).status,401);
  assert.equal((await handle(request({...input,orderId:'bad'}))).status,400);
  m.setLookup(false);assert.equal((await handle(request(input))).status,404);m.setLookup(true);
  m.order.client_id=other;assert.equal((await handle(request(input))).status,404);m.order.client_id=client;
  assert.equal((await handle(request(input))).status,409);
  Object.assign(m.order,{status:'paid',stripe_session_id:m.session.id,price_hkd:900});
  Object.assign(m.session,{status:'complete',payment_status:'paid',amount_total:90000,payment_intent:{status:'succeeded',latest_charge:{paid:true,status:'succeeded',amount:90000,currency:'hkd',livemode:true,receipt_url:'https://pay.stripe.com/receipts/payment/synthetic'}}});
  let response=await handle(request(input));assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/no-store/);
  assert.deepEqual(await response.json(),{url:'https://pay.stripe.com/receipts/payment/synthetic'});
  assert.ok(m.filters.some(([k,v])=>k==='client_id'&&v===client));
  assert.deepEqual(m.calls.at(-1).params,{expand:['payment_intent.latest_charge']});
  for(const changed of [{amount_total:100000},{client_reference_id:other},{livemode:false},{metadata:{integration:'another-app',order_id:orderId}},{payment_status:'unpaid'}]) {
    const saved={...m.session};Object.assign(m.session,changed);assert.equal((await handle(request(input))).status,409);Object.assign(m.session,saved);
  }
  const charge=m.session.payment_intent.latest_charge;
  for(const unsafe of ['https://evil.test/receipt','https://pay.stripe.com.evil.test/receipt','http://pay.stripe.com/receipt','https://attacker@pay.stripe.com/receipt']) {
    charge.receipt_url=unsafe;assert.equal((await handle(request(input))).status,503);
  }
  charge.receipt_url=null;assert.equal((await handle(request(input))).status,409);
  assert.equal(m.calls.filter(c=>c.name||c.options).length,0);assert.deepEqual(m.updates,[]);
});
