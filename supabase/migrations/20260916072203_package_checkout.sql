-- Public catalogue, private checkout reservations and atomic fulfillment.
alter table public.packages add column format text not null default '1:1' check (format in ('1:1','1:2'));
alter table public.packages add column is_trial boolean not null default false;
alter table public.packages add column active boolean not null default false;
alter table public.packages add column sort_order integer not null default 0;
insert into public.packages(id,name,credits,price_hkd,validity_months,tag,format,is_trial,active,sort_order) values
 ('p11-trial','Trial session',1,900,1,'Begin','1:1',true,true,1),
 ('p11-single','Single class',1,1200,1,null,'1:1',false,true,2),
 ('p11-5','5-class pack',5,4750,3,null,'1:1',false,true,3),
 ('p11-10','10-class pack',10,9000,6,'Most chosen','1:1',false,true,4),
 ('p12-trial','Trial session',1,1200,1,'Begin','1:2',true,true,1),
 ('p12-single','Single class',1,1600,1,null,'1:2',false,true,2),
 ('p12-5','5-class pack',5,6500,3,null,'1:2',false,true,3),
 ('p12-10','10-class pack',10,12000,6,'Most chosen','1:2',false,true,4)
on conflict(id) do update set name=excluded.name,credits=excluded.credits,price_hkd=excluded.price_hkd,
 validity_months=excluded.validity_months,tag=excluded.tag,format=excluded.format,
 is_trial=excluded.is_trial,active=excluded.active,sort_order=excluded.sort_order;

create table public.package_checkout_orders (
 id uuid primary key default gen_random_uuid(),
 client_id uuid not null references public.profiles(id),
 package_id text not null references public.packages(id),
 package_name text not null,
 format text not null check (format in ('1:1','1:2')),
 is_trial boolean not null,
 credits integer not null check (credits > 0),
 price_hkd integer not null check (price_hkd > 0),
 validity_months integer not null check (validity_months > 0),
 return_origin text not null check (return_origin in ('https://sensesprivate.up.railway.app','https://sensesprivate.com','https://www.sensesprivate.com')),
 livemode boolean not null default true,
 status text not null default 'pending' check (status in ('pending','paid','expired','failed')),
 stripe_session_id text unique,
 payment_id uuid unique references public.payments(id),
 created_at timestamptz not null default now(),
 checkout_expires_at timestamptz not null default date_trunc('second', now()+interval '1 hour'),
 paid_at timestamptz
);
create index package_checkout_client_idx on public.package_checkout_orders(client_id,created_at desc);
create index package_checkout_package_idx on public.package_checkout_orders(package_id);
create unique index package_checkout_pending_idx on public.package_checkout_orders(client_id,package_id) where status='pending';
create unique index payments_stripe_ref_unique on public.payments(stripe_ref) where stripe_ref is not null;
create unique index ledger_purchase_payment_unique on public.credit_ledger(payment_id) where reason='purchase' and payment_id is not null;
alter table public.package_checkout_orders enable row level security;
revoke all on public.package_checkout_orders from public, anon, authenticated;
grant select on public.package_checkout_orders to authenticated;
grant all on public.package_checkout_orders to service_role;
create policy package_checkout_own_read on public.package_checkout_orders for select to authenticated
 using (client_id=(select auth.uid()) or (select public.is_admin()));
-- The old owner-executed view would expose new customer balances publicly.
alter view public.credit_balances set (security_invoker=true);
revoke all on public.credit_balances from public, anon;
grant select on public.credit_balances to authenticated, service_role;

create function public.prepare_package_checkout(p_client_id uuid,p_package_id text,p_origin text,p_livemode boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.packages; o public.package_checkout_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_client_id::text,0));
 if not exists(select 1 from public.profiles where id=p_client_id and role='client') then
   raise exception 'client_account_required' using errcode='42501'; end if;
 select * into p from public.packages where id=p_package_id and active;
 if p.id is null then raise exception 'package_unavailable'; end if;
 if p.is_trial and exists(select 1 from public.package_checkout_orders where client_id=p_client_id
   and format=p.format and is_trial and status='paid' and livemode=p_livemode) then
   raise exception 'trial_already_purchased'; end if;
 select * into o from public.package_checkout_orders where client_id=p_client_id and package_id=p.id and status='pending';
 if o.id is not null then return to_jsonb(o); end if;
 insert into public.package_checkout_orders(client_id,package_id,package_name,format,is_trial,credits,price_hkd,validity_months,return_origin,livemode)
 values(p_client_id,p.id,p.name,p.format,p.is_trial,p.credits,p.price_hkd,p.validity_months,p_origin,p_livemode) returning * into o;
 return to_jsonb(o);
end;
$$;
revoke all on function public.prepare_package_checkout(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.prepare_package_checkout(uuid,text,text,boolean) to service_role;

-- Validate a verified Stripe Session against the immutable order snapshot.
-- Payment and credits commit together, exactly once per Session/order.
create function public.fulfill_package_checkout(p_order_id uuid,p_session_id text,p_client_id uuid,
 p_amount_total integer,p_currency text,p_payment_status text,p_livemode boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare o public.package_checkout_orders; v_payment uuid;
begin
 select * into o from public.package_checkout_orders where id=p_order_id for update;
 if o.id is null then raise exception 'order_not_found'; end if;
 if p_payment_status is distinct from 'paid' or p_currency is distinct from 'hkd'
   or p_amount_total is distinct from o.price_hkd*100 or p_client_id is distinct from o.client_id
   or p_livemode is distinct from o.livemode or p_session_id is null or p_session_id not like 'cs_%'
   or (o.stripe_session_id is not null and o.stripe_session_id<>p_session_id) then
   raise exception 'checkout_mismatch'; end if;
 if o.status='paid' then return o.payment_id; end if;
 insert into public.payments(client_id,package_id,amount_hkd,method,status,stripe_ref)
 values(o.client_id,o.package_id,o.price_hkd,'stripe','paid',p_session_id) returning id into v_payment;
 insert into public.credit_ledger(client_id,delta,reason,payment_id)
 values(o.client_id,o.credits,'purchase',v_payment);
 update public.package_checkout_orders set status='paid',payment_id=v_payment,stripe_session_id=p_session_id,paid_at=now() where id=o.id;
 return v_payment;
end;
$$;
revoke all on function public.fulfill_package_checkout(uuid,text,uuid,integer,text,text,boolean) from public,anon,authenticated;
grant execute on function public.fulfill_package_checkout(uuid,text,uuid,integer,text,text,boolean) to service_role;
