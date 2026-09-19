-- Durable receipt snapshots and mail outbox. Credentials never enter public tables.
create table private.receipt_email_settings (
 id boolean primary key default true check(id), secret_id uuid references vault.secrets(id),
 sender text not null default 'cs@senses-studio.co', enabled boolean not null default false,
 activated_at timestamptz not null default now()
);
insert into private.receipt_email_settings(id) values(true);
create table private.official_receipts (
 order_id uuid primary key references public.package_checkout_orders(id),
 number bigint generated always as identity unique,
 document jsonb not null,
 created_at timestamptz not null default now(),
 email_status text not null check(email_status in ('not_requested','queued','sending','sent','needs_review')),
 email_payload jsonb, first_attempt_at timestamptz, lease_until timestamptz,
 next_attempt_at timestamptz not null default now(), attempts integer not null default 0,
 provider_id text, sent_at timestamptz, error_code text
);
alter table private.receipt_email_settings enable row level security;
alter table private.official_receipts enable row level security;
revoke all on private.receipt_email_settings,private.official_receipts from public,anon,authenticated;

create function private.ensure_official_receipt(p_order_id uuid,p_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare o public.package_checkout_orders; r private.official_receipts; started timestamptz;
begin
 select * into o from public.package_checkout_orders where id=p_order_id for update;
 if o.id is null or o.status<>'paid' or o.payment_id is null then raise exception 'payment_not_confirmed'; end if;
 if p_snapshot->>'terms_version' is distinct from '2026-09-15' or (p_snapshot->>'amount_hkd')::integer is distinct from o.price_hkd
 or (p_snapshot->>'credits')::integer is distinct from o.credits or p_snapshot->>'package_name' is distinct from o.package_name
 then raise exception 'receipt_mismatch'; end if;
 select activated_at into started from private.receipt_email_settings where id;
 insert into private.official_receipts(order_id,document,email_status)
 values(o.id,p_snapshot,case when o.livemode and o.paid_at>=started then 'queued' else 'not_requested' end)
 on conflict(order_id) do nothing;
 select * into r from private.official_receipts where order_id=o.id;
 return to_jsonb(r)||jsonb_build_object('receipt_number','SS-'||to_char(r.created_at at time zone 'Asia/Hong_Kong','YYYY')||'-'||lpad(r.number::text,8,'0'));
end $$;
create function public.ensure_official_receipt(p_order_id uuid,p_snapshot jsonb) returns jsonb
language sql security invoker set search_path='' as $$select private.ensure_official_receipt(p_order_id,p_snapshot)$$;

create function private.receipt_mail_settings(p_key text default null,p_enabled boolean default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg private.receipt_email_settings; counts jsonb;
begin
 perform private.require_prospect_admin();
 select * into cfg from private.receipt_email_settings where id for update;
 if p_key is not null then
  if p_key !~ '^re_[A-Za-z0-9_-]{10,200}$' then raise exception 'invalid_key'; end if;
  if cfg.secret_id is null then
   select vault.create_secret(p_key,'senses_receipt_resend_api','Senses Official Receipt email delivery') into cfg.secret_id;
  else perform vault.update_secret(cfg.secret_id,p_key); end if;
 end if;
 update private.receipt_email_settings set secret_id=cfg.secret_id,enabled=coalesce(p_enabled,enabled) where id returning * into cfg;
 select jsonb_build_object('queued',count(*) filter(where email_status in ('queued','sending')),
   'sent',count(*) filter(where email_status='sent'),'needs_review',count(*) filter(where email_status='needs_review'),
   'failed',count(*) filter(where error_code is not null and email_status<>'sent')) into counts from private.official_receipts;
 return jsonb_build_object('configured',cfg.secret_id is not null,'enabled',cfg.enabled,'sender',cfg.sender,'counts',counts);
end $$;
create function public.receipt_mail_settings(p_key text default null,p_enabled boolean default null) returns jsonb
language sql security invoker set search_path='' as $$select private.receipt_mail_settings(p_key,p_enabled)$$;

create function private.receipt_worker_jobs() returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg private.receipt_email_settings; key text; jobs jsonb;
begin
 select * into cfg from private.receipt_email_settings where id;
 if not cfg.enabled or cfg.secret_id is null then return jsonb_build_object('configured',false); end if;
 select decrypted_secret into key from vault.decrypted_secrets where id=cfg.secret_id;
 -- Stop uncertain retries before the provider's 24-hour idempotency window ends.
 update private.official_receipts set email_status='needs_review',error_code='delivery_uncertain'
 where email_status in ('queued','sending') and first_attempt_at<now()-interval '23 hours';
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into jobs from (
  select o.* from public.package_checkout_orders o left join private.official_receipts r on r.order_id=o.id
  where o.status='paid' and o.livemode and o.paid_at>=cfg.activated_at and
   (r.order_id is null or (r.email_status in ('queued','sending') and r.next_attempt_at<=now() and (r.lease_until is null or r.lease_until<now())))
  order by o.paid_at limit 5
 )q;
 return jsonb_build_object('configured',true,'key',key,'sender',cfg.sender,'jobs',jobs);
end $$;
create function public.receipt_worker_jobs() returns jsonb language sql security invoker set search_path='' as $$select private.receipt_worker_jobs()$$;

create function private.claim_receipt_email(p_order_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.official_receipts;
begin
 select * into r from private.official_receipts where order_id=p_order_id for update;
 if r.order_id is null or r.email_status not in ('queued','sending') or r.next_attempt_at>now()
 or r.lease_until>now() or r.first_attempt_at<now()-interval '23 hours' then return null; end if;
 update private.official_receipts set email_status='sending',email_payload=coalesce(email_payload,p_payload),
 first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '3 minutes',attempts=attempts+1
 where order_id=p_order_id returning * into r;
 return jsonb_build_object('payload',r.email_payload,'attempt',r.attempts);
end $$;
create function public.claim_receipt_email(p_order_id uuid,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.claim_receipt_email(p_order_id,p_payload)$$;
create function private.finish_receipt_email(p_order_id uuid,p_attempt integer,p_provider_id text,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 update private.official_receipts set email_status=case when p_provider_id is not null then 'sent' else 'queued' end,
 provider_id=p_provider_id,sent_at=case when p_provider_id is not null then now() else null end,
 error_code=case when p_provider_id is not null then null else coalesce(p_error,'delivery_failed') end,
 lease_until=null,next_attempt_at=now()+interval '5 minutes'
 where order_id=p_order_id and attempts=p_attempt and email_status='sending';
end $$;
create function public.finish_receipt_email(p_order_id uuid,p_attempt integer,p_provider_id text,p_error text default null) returns void
language sql security invoker set search_path='' as $$select private.finish_receipt_email(p_order_id,p_attempt,p_provider_id,p_error)$$;

revoke all on function private.ensure_official_receipt(uuid,jsonb),public.ensure_official_receipt(uuid,jsonb),private.receipt_worker_jobs(),public.receipt_worker_jobs(),private.claim_receipt_email(uuid,jsonb),public.claim_receipt_email(uuid,jsonb),private.finish_receipt_email(uuid,integer,text,text),public.finish_receipt_email(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function private.ensure_official_receipt(uuid,jsonb),public.ensure_official_receipt(uuid,jsonb),private.receipt_worker_jobs(),public.receipt_worker_jobs(),private.claim_receipt_email(uuid,jsonb),public.claim_receipt_email(uuid,jsonb),private.finish_receipt_email(uuid,integer,text,text),public.finish_receipt_email(uuid,integer,text,text) to service_role;
revoke all on function private.receipt_mail_settings(text,boolean),public.receipt_mail_settings(text,boolean) from public,anon,authenticated;
grant execute on function private.receipt_mail_settings(text,boolean),public.receipt_mail_settings(text,boolean) to authenticated;
