create table private.waiver_email_settings (
 id boolean primary key default true check(id), secret_id uuid references vault.secrets(id),
 sender text not null default 'cs@senses-studio.co', enabled boolean not null default false
);
insert into private.waiver_email_settings(id) values(true);
create table private.waiver_emails (
 signature_id uuid primary key references public.client_waiver_signatures(id), user_id uuid not null,
 document jsonb not null, email_status text not null default 'queued', email_payload jsonb,
 first_attempt_at timestamptz, lease_until timestamptz, next_attempt_at timestamptz not null default now(),
 attempts integer not null default 0,provider_id text,sent_at timestamptz,error_code text
);
alter table private.waiver_email_settings enable row level security;
alter table private.waiver_emails enable row level security;
revoke all on private.waiver_email_settings,private.waiver_emails from public,anon,authenticated;
create function private.queue_waiver_email() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.client_waiver_documents; recipient text;
begin
 select * into d from public.client_waiver_documents where version=new.version;
 select email into recipient from auth.users where id=new.user_id and email_confirmed_at is not null;
 insert into private.waiver_emails(signature_id,user_id,document,email_status,error_code)
 values(new.id,new.user_id,jsonb_build_object('email',recipient,'title',d.title,'body',d.body,
 'version',new.version,'sha256',new.document_sha256,'signed_name',new.signed_name,'participant_name',new.participant_name,
 'capacity',new.signer_capacity,'signed_at',new.signed_at),case when recipient is null then 'needs_review' else 'queued' end,
 case when recipient is null then 'missing_verified_email' end) on conflict do nothing;
 return new;
end $$;
revoke all on function private.queue_waiver_email() from public,anon,authenticated;
create trigger queue_waiver_confirmation after insert on public.client_waiver_signatures for each row execute function private.queue_waiver_email();
create function private.waiver_mail_settings(p_key text default null,p_enabled boolean default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg private.waiver_email_settings; counts jsonb;
begin
 perform private.require_prospect_admin();
 select * into cfg from private.waiver_email_settings where id for update;
 if p_key is not null then
  if p_key !~ '^re_[A-Za-z0-9_-]{10,200}$' then raise exception 'invalid_key'; end if;
  if cfg.secret_id is null then
   select vault.create_secret(p_key,'senses_waiver_resend_api','Senses signed waiver email delivery') into cfg.secret_id;
  else perform vault.update_secret(cfg.secret_id,p_key); end if;
 end if;
 update private.waiver_email_settings set secret_id=cfg.secret_id,enabled=coalesce(p_enabled,enabled) where id returning * into cfg;
 select jsonb_build_object('queued',count(*) filter(where email_status in ('queued','sending')),
   'sent',count(*) filter(where email_status='sent'),'needs_review',count(*) filter(where email_status='needs_review'),
   'failed',count(*) filter(where error_code is not null and email_status<>'sent')) into counts from private.waiver_emails;
 return jsonb_build_object('configured',cfg.secret_id is not null,'enabled',cfg.enabled,'sender',cfg.sender,'counts',counts);
end $$;
create function public.waiver_mail_settings(p_key text default null,p_enabled boolean default null) returns jsonb
language sql security invoker set search_path='' as $$select private.waiver_mail_settings(p_key,p_enabled)$$;

create function private.waiver_worker_jobs() returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.waiver_email_settings; key text; jobs jsonb;
begin
 select * into cfg from private.waiver_email_settings where id;
 if not cfg.enabled or cfg.secret_id is null then return jsonb_build_object('configured',false); end if;
 select decrypted_secret into key from vault.decrypted_secrets where id=cfg.secret_id;
 update private.waiver_emails set email_status='needs_review',error_code='delivery_uncertain'
 where email_status in ('queued','sending') and first_attempt_at<now()-interval '23 hours';
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into jobs from (
 select signature_id,document from private.waiver_emails where email_status in ('queued','sending')
 and next_attempt_at<=now() and (lease_until is null or lease_until<now()) order by next_attempt_at limit 5)q;
 return jsonb_build_object('configured',true,'key',key,'sender',cfg.sender,'jobs',jobs);
end $$;
create function public.waiver_worker_jobs() returns jsonb language sql security invoker set search_path='' as $$select private.waiver_worker_jobs()$$;
create function private.claim_waiver_email(p_signature_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.waiver_emails;
begin
 select * into r from private.waiver_emails where signature_id=p_signature_id for update;
 if r.signature_id is null or r.email_status not in ('queued','sending') or r.next_attempt_at>now()
 or r.lease_until>now() or r.first_attempt_at<now()-interval '23 hours' then return null; end if;
 update private.waiver_emails set email_status='sending',email_payload=coalesce(email_payload,p_payload),
 first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '3 minutes',attempts=attempts+1
 where signature_id=p_signature_id returning * into r;
 return jsonb_build_object('payload',r.email_payload,'attempt',r.attempts);
end $$;
create function public.claim_waiver_email(p_signature_id uuid,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.claim_waiver_email(p_signature_id,p_payload)$$;
create function private.finish_waiver_email(p_signature_id uuid,p_attempt integer,p_provider_id text,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 update private.waiver_emails set email_status=case when p_provider_id is not null then 'sent' else 'queued' end,
 provider_id=p_provider_id,sent_at=case when p_provider_id is not null then now() else null end,
 error_code=case when p_provider_id is not null then null else coalesce(p_error,'delivery_failed') end,
 lease_until=null,next_attempt_at=now()+interval '5 minutes'
 where signature_id=p_signature_id and attempts=p_attempt and email_status='sending';
end $$;
create function public.finish_waiver_email(p_signature_id uuid,p_attempt integer,p_provider_id text,p_error text default null) returns void
language sql security invoker set search_path='' as $$select private.finish_waiver_email(p_signature_id,p_attempt,p_provider_id,p_error)$$;

create function private.my_waiver_email_status(p_signature_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.active_studio_client_id();
 return (select jsonb_build_object('status',case when w.email_status='queued' and not(c.enabled and c.secret_id is not null) then 'not_connected' else w.email_status end,'sent_at',w.sent_at)
 from private.waiver_emails w cross join private.waiver_email_settings c where w.signature_id=p_signature_id and w.user_id=auth.uid());
end $$;
create function public.my_waiver_email_status(p_signature_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.my_waiver_email_status(p_signature_id)$$;
revoke all on function private.waiver_worker_jobs(),public.waiver_worker_jobs() from public,anon,authenticated;
grant execute on function private.waiver_worker_jobs(),public.waiver_worker_jobs() to service_role;
revoke all on function private.claim_waiver_email(uuid,jsonb),public.claim_waiver_email(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.claim_waiver_email(uuid,jsonb),public.claim_waiver_email(uuid,jsonb) to service_role;
revoke all on function private.finish_waiver_email(uuid,integer,text,text),public.finish_waiver_email(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function private.finish_waiver_email(uuid,integer,text,text),public.finish_waiver_email(uuid,integer,text,text) to service_role;
revoke all on function private.waiver_mail_settings(text,boolean),public.waiver_mail_settings(text,boolean) from public,anon,authenticated;
grant execute on function private.waiver_mail_settings(text,boolean),public.waiver_mail_settings(text,boolean) to authenticated;
revoke all on function private.my_waiver_email_status(uuid),public.my_waiver_email_status(uuid) from public,anon,authenticated;
grant execute on function private.my_waiver_email_status(uuid),public.my_waiver_email_status(uuid) to authenticated;
