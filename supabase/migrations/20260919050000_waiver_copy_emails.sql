-- A signed waiver is emailed back to the client as a copy for their records.
-- Same outbox design as Official Receipts: the Resend key stays in Vault via
-- receipt_email_settings, jobs are claimed under a lease, each signature has one
-- provider idempotency key, and uncertain attempts stop before Resend's 24-hour
-- deduplication window. Only signatures made while delivery is switched on are
-- queued; earlier records are never mailed retroactively.
create table private.waiver_copy_emails (
 signature_id uuid primary key references public.client_waiver_signatures(id),
 email_status text not null check(email_status in ('not_requested','queued','sending','sent','needs_review')),
 email_payload jsonb, first_attempt_at timestamptz, lease_until timestamptz,
 next_attempt_at timestamptz not null default now(), attempts integer not null default 0,
 provider_id text, sent_at timestamptz, error_code text,
 created_at timestamptz not null default now()
);
alter table private.waiver_copy_emails enable row level security;
revoke all on private.waiver_copy_emails from public,anon,authenticated;

create or replace function private.sign_client_waiver(p_version text,p_name text,p_capacity text,p_agreed boolean,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id text:=private.active_studio_client_id(); d public.client_waiver_documents; s public.client_waiver_signatures; v_png bytea; v_new uuid; v_mail boolean;
begin
 if p_agreed is distinct from true or length(btrim(coalesce(p_name,''))) not between 1 and 200
  or p_capacity is null or p_capacity not in ('self','parent_guardian') then raise exception 'waiver_consent_required'; end if;
 -- The drawing must be a real PNG data URL: prefix, decodable base64 and the PNG file header.
 if p_signature is null or p_signature not like 'data:image/png;base64,%' or length(p_signature) not between 100 and 200000 then raise exception 'waiver_signature_required'; end if;
 begin v_png:=decode(substr(p_signature,23),'base64'); exception when others then raise exception 'waiver_signature_required'; end;
 if substr(v_png,1,8) is distinct from '\x89504e470d0a1a0a'::bytea then raise exception 'waiver_signature_required'; end if;
 select * into d from public.client_waiver_documents where version=p_version and active;
 if d.version is null then raise exception 'waiver_changed_reload'; end if;
 perform pg_advisory_xact_lock(hashtextextended('waiver:'||auth.uid()::text,0));
 insert into public.client_waiver_signatures(user_id,client_id,version,signed_name,participant_name,signer_capacity,document_sha256)
  select auth.uid(),v_id,d.version,btrim(p_name),c.client_name,p_capacity,d.sha256 from public.studio_clients c where c.id=v_id
  on conflict(user_id,version) do nothing returning id into v_new;
 select * into s from public.client_waiver_signatures where user_id=auth.uid() and version=d.version;
 -- A retry returns the original signature, drawing included; nothing is replaced.
 insert into public.client_waiver_signature_images(signature_id,user_id,image) values(s.id,auth.uid(),p_signature) on conflict(signature_id) do nothing;
 if v_new is not null then
  v_mail:=coalesce((select enabled and secret_id is not null from private.receipt_email_settings where id),false);
  insert into private.waiver_copy_emails(signature_id,email_status) values(v_new,case when v_mail then 'queued' else 'not_requested' end) on conflict do nothing;
 end if;
 insert into public.client_profiles(id) values(auth.uid()) on conflict(id) do nothing;
 update public.client_profiles set waiver_signed_at=s.signed_at,waiver_signed_name=s.signed_name,waiver_version=s.version,
  updated_at=clock_timestamp(),profile_version=profile_version+1 where id=auth.uid() and waiver_version is distinct from s.version;
 return private.client_portal_profile();
end; $$;

-- The client sees whether their copy is queued or delivered.
create or replace function private.client_portal_profile() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_id text:=private.active_studio_client_id();
begin
 perform set_config('response.headers','[{"Cache-Control":"no-store"}]',true);
 return jsonb_build_object('profile',(select to_jsonb(p)-'id' from public.client_profiles p where p.id=auth.uid()),
 'contact',(select jsonb_build_object('name',c.client_name,'phone',c.phone,'email',a.login_email) from public.studio_clients c join public.studio_client_accounts a on a.client_id=c.id where c.id=v_id),
 'waiver_document',(select to_jsonb(d) from public.client_waiver_documents d where active),
 'waiver_signatures',coalesce((select jsonb_agg((to_jsonb(s)-array['user_id','client_id'])||jsonb_build_object('copy_email_status',w.email_status,'copy_email_sent_at',w.sent_at) order by s.signed_at desc)
   from public.client_waiver_signatures s left join private.waiver_copy_emails w on w.signature_id=s.id where s.user_id=auth.uid()),'[]'::jsonb));
end; $$;

create function private.waiver_copy_jobs() returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg private.receipt_email_settings; key text; jobs jsonb;
begin
 select * into cfg from private.receipt_email_settings where id;
 if cfg.id is null or not cfg.enabled or cfg.secret_id is null then return jsonb_build_object('configured',false); end if;
 select decrypted_secret into key from vault.decrypted_secrets where id=cfg.secret_id;
 update private.waiver_copy_emails set email_status='needs_review',error_code='delivery_uncertain'
 where email_status in ('queued','sending') and first_attempt_at<now()-interval '23 hours';
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into jobs from (
  select s.id as signature_id,s.signed_name,s.participant_name,s.signer_capacity,s.signed_at,s.version,s.document_sha256,
   a.login_email as email,c.client_name,d.title as document_title,d.body as document_body,i.image as signature_image
  from private.waiver_copy_emails w
  join public.client_waiver_signatures s on s.id=w.signature_id
  join public.studio_client_accounts a on a.client_id=s.client_id
  join public.studio_clients c on c.id=s.client_id
  join public.client_waiver_documents d on d.version=s.version
  left join public.client_waiver_signature_images i on i.signature_id=s.id
  where w.email_status in ('queued','sending') and w.next_attempt_at<=now() and (w.lease_until is null or w.lease_until<now())
  order by s.signed_at limit 5
 )q;
 return jsonb_build_object('configured',true,'key',key,'sender',cfg.sender,'jobs',jobs);
end $$;
create function public.waiver_copy_jobs() returns jsonb language sql security invoker set search_path='' as $$select private.waiver_copy_jobs()$$;

create function private.claim_waiver_copy_email(p_signature_id uuid,p_payload jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare w private.waiver_copy_emails;
begin
 select * into w from private.waiver_copy_emails where signature_id=p_signature_id for update;
 if w.signature_id is null or w.email_status not in ('queued','sending') or w.next_attempt_at>now()
 or w.lease_until>now() or w.first_attempt_at<now()-interval '23 hours' then return null; end if;
 update private.waiver_copy_emails set email_status='sending',email_payload=coalesce(email_payload,p_payload),
 first_attempt_at=coalesce(first_attempt_at,now()),lease_until=now()+interval '3 minutes',attempts=attempts+1
 where signature_id=p_signature_id returning * into w;
 return jsonb_build_object('payload',w.email_payload,'attempt',w.attempts);
end $$;
create function public.claim_waiver_copy_email(p_signature_id uuid,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.claim_waiver_copy_email(p_signature_id,p_payload)$$;
create function private.finish_waiver_copy_email(p_signature_id uuid,p_attempt integer,p_provider_id text,p_error text default null) returns void
language plpgsql security definer set search_path='' as $$
begin
 update private.waiver_copy_emails set email_status=case when p_provider_id is not null then 'sent' else 'queued' end,
 provider_id=p_provider_id,sent_at=case when p_provider_id is not null then now() else null end,
 error_code=case when p_provider_id is not null then null else coalesce(p_error,'delivery_failed') end,
 lease_until=null,next_attempt_at=now()+interval '5 minutes'
 where signature_id=p_signature_id and attempts=p_attempt and email_status='sending';
end $$;
create function public.finish_waiver_copy_email(p_signature_id uuid,p_attempt integer,p_provider_id text,p_error text default null) returns void
language sql security invoker set search_path='' as $$select private.finish_waiver_copy_email(p_signature_id,p_attempt,p_provider_id,p_error)$$;

revoke all on function private.waiver_copy_jobs(),public.waiver_copy_jobs(),private.claim_waiver_copy_email(uuid,jsonb),public.claim_waiver_copy_email(uuid,jsonb),private.finish_waiver_copy_email(uuid,integer,text,text),public.finish_waiver_copy_email(uuid,integer,text,text) from public,anon,authenticated;
grant execute on function private.waiver_copy_jobs(),public.waiver_copy_jobs(),private.claim_waiver_copy_email(uuid,jsonb),public.claim_waiver_copy_email(uuid,jsonb),private.finish_waiver_copy_email(uuid,integer,text,text),public.finish_waiver_copy_email(uuid,integer,text,text) to service_role;

-- Email settings report waiver copies beside receipts so admins see failures.
create or replace function private.receipt_mail_settings(p_key text default null,p_enabled boolean default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare cfg private.receipt_email_settings; counts jsonb; waivers jsonb;
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
 select jsonb_build_object('queued',count(*) filter(where email_status in ('queued','sending')),
   'sent',count(*) filter(where email_status='sent'),'needs_review',count(*) filter(where email_status='needs_review'),
   'failed',count(*) filter(where error_code is not null and email_status<>'sent')) into waivers from private.waiver_copy_emails;
 return jsonb_build_object('configured',cfg.secret_id is not null,'enabled',cfg.enabled,'sender',cfg.sender,'counts',counts,'waiver_counts',waivers);
end $$;
