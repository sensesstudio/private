-- SleekFlow source fields and local follow-up fields have separate ownership.
-- The provider key is encrypted by Supabase Vault; no key is returned to browsers.
begin;
create table private.sleekflow_connection (
 id boolean primary key default true check(id), secret_id uuid,
 label text not null default 'Private - Prospect',
 configured_at timestamptz, last_attempt_at timestamptz, last_ok_at timestamptz,
 error_code text, synced_count integer not null default 0,
 run_id uuid, locked_until timestamptz
);
insert into private.sleekflow_connection(id) values(true);
create table private.studio_prospects (
 id text primary key check(length(id) between 1 and 200),
 client_name text not null, mobile text,
 last_message text, message_at timestamptz, channel text, conversation_id text,
 last_contact_at timestamptz,
 source_present boolean not null default true, synced_at timestamptz not null default now(),
 remarks text not null default '' check(length(remarks)<=10000),
 next_action_date date,
 status text not null default 'pending us' check(status in ('matching teacher','pending teacher','pending payment','pending us','confirmed booking')),
 version integer not null default 1, updated_at timestamptz not null default now(), updated_by uuid
);
create index studio_prospects_followup_idx on private.studio_prospects(source_present,next_action_date,id);
alter table private.sleekflow_connection enable row level security;
alter table private.studio_prospects enable row level security;
revoke all on private.sleekflow_connection,private.studio_prospects from public,anon,authenticated;

create function private.require_prospect_admin() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and role='admin')
 or not exists(select 1 from auth.sessions s where s.user_id=auth.uid()
   and s.id=nullif(auth.jwt()->>'session_id','')::uuid and (s.not_after is null or s.not_after>now()))
 then raise exception 'admin_access_required' using errcode='42501'; end if;
end $$;

create function private.admin_prospect_directory() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.sleekflow_connection;
begin
 perform private.require_prospect_admin();
 select * into c from private.sleekflow_connection where id;
 return jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(p) - 'updated_by' order by p.next_action_date nulls last,p.id) from private.studio_prospects p),'[]'::jsonb),
  'sync',jsonb_build_object('configured',c.secret_id is not null,'label',c.label,'last_ok_at',c.last_ok_at,
   'last_attempt_at',c.last_attempt_at,'error_code',c.error_code,'count',c.synced_count,'running',coalesce(c.locked_until>now(),false)));
end $$;
create function public.admin_prospect_directory() returns jsonb language sql security invoker set search_path='' as $$select private.admin_prospect_directory()$$;

create function private.save_studio_prospect(p_id text,p_version integer,p_remarks text,p_next_action_date date,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.require_prospect_admin();
 if p_remarks is null or length(p_remarks)>10000 or p_status is null or p_status not in ('matching teacher','pending teacher','pending payment','pending us','confirmed booking')
 or (p_next_action_date is not null and (p_next_action_date<'2000-01-01' or p_next_action_date>'2100-12-31')) then raise exception 'invalid_prospect_details'; end if;
 update private.studio_prospects set remarks=p_remarks,next_action_date=p_next_action_date,status=p_status,version=version+1,updated_at=now(),updated_by=auth.uid()
 where id=p_id and version=p_version;
 if not found then raise exception 'prospect_changed' using errcode='40001'; end if;
end $$;
create function public.save_studio_prospect(p_id text,p_version integer,p_remarks text,p_next_action_date date,p_status text) returns void
language sql security invoker set search_path='' as $$select private.save_studio_prospect(p_id,p_version,p_remarks,p_next_action_date,p_status)$$;

create function private.configure_sleekflow(p_key text) returns void
language plpgsql security definer set search_path='' as $$
declare v_secret uuid;
begin
 perform private.require_prospect_admin();
 if p_key is null or length(p_key) not between 10 and 4096 or p_key ~ '[[:space:]]' then raise exception 'invalid_api_key'; end if;
 select secret_id into v_secret from private.sleekflow_connection where id for update;
 if v_secret is null then select vault.create_secret(p_key,'senses_sleekflow_platform_api','SleekFlow prospect read sync') into v_secret;
 else perform vault.update_secret(v_secret,p_key); end if;
 update private.sleekflow_connection set secret_id=v_secret,configured_at=now(),error_code=null,run_id=null,locked_until=null,last_attempt_at=null where id;
end $$;
create function public.configure_sleekflow(p_key text) returns void language sql security invoker set search_path='' as $$select private.configure_sleekflow(p_key)$$;

-- Worker RPCs are callable only with the backend service role.
create function private.begin_sleekflow_sync() returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.sleekflow_connection; v_run uuid:=gen_random_uuid(); v_key text;
begin
 select * into c from private.sleekflow_connection where id for update;
 if c.secret_id is null then return jsonb_build_object('status','not_configured'); end if;
 if c.locked_until>now() or c.last_attempt_at>now()-interval '1 minute' then return jsonb_build_object('status','busy'); end if;
 select decrypted_secret into v_key from vault.decrypted_secrets where id=c.secret_id;
 if v_key is null then raise exception 'connection_unavailable'; end if;
 update private.sleekflow_connection set run_id=v_run,locked_until=now()+interval '5 minutes',last_attempt_at=now() where id;
 return jsonb_build_object('status','ready','run_id',v_run,'api_key',v_key,'label',c.label);
end $$;
create function public.begin_sleekflow_sync() returns jsonb language sql security invoker set search_path='' as $$select private.begin_sleekflow_sync()$$;

create function private.finish_sleekflow_sync(p_run_id uuid,p_rows jsonb,p_error text default null) returns integer
language plpgsql security definer set search_path='' as $$
declare c private.sleekflow_connection; v_count integer;
begin
 select * into c from private.sleekflow_connection where id for update;
 if p_run_id is null or c.run_id is distinct from p_run_id or c.locked_until<now() then raise exception 'stale_sync'; end if;
 if p_error is not null then
  update private.sleekflow_connection set error_code=case when p_error in ('invalid_key','rate_limited','label_not_found','source_changed','source_format','too_many_contacts') then p_error else 'sync_unavailable' end,run_id=null,locked_until=null where id;
  return 0;
 end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 then raise exception 'invalid_sync_rows'; end if;
 v_count:=jsonb_array_length(p_rows);
 if exists(select 1 from jsonb_array_elements(p_rows) x where x->>'id' is null or x->>'client_name' is null)
 or (select count(distinct x->>'id') from jsonb_array_elements(p_rows) x)<>v_count then raise exception 'invalid_sync_rows'; end if;
 insert into private.studio_prospects(id,client_name,mobile,last_message,message_at,channel,conversation_id,last_contact_at)
 select x.id,left(x.client_name,300),left(x.mobile,80),left(x.last_message,10000),x.message_at,left(x.channel,80),left(x.conversation_id,200),x.last_contact_at
 from jsonb_to_recordset(p_rows) as x(id text,client_name text,mobile text,last_message text,message_at timestamptz,channel text,conversation_id text,last_contact_at timestamptz)
 on conflict(id) do update set client_name=excluded.client_name,mobile=excluded.mobile,last_message=excluded.last_message,
  message_at=excluded.message_at,channel=excluded.channel,conversation_id=excluded.conversation_id,last_contact_at=excluded.last_contact_at,source_present=true,synced_at=now();
 -- Only a complete, successful snapshot may archive contacts that lost the label.
 update private.studio_prospects p set source_present=false,synced_at=now()
 where p.source_present and not exists(select 1 from jsonb_array_elements(p_rows) x where x->>'id'=p.id);
 update private.sleekflow_connection set last_ok_at=now(),error_code=null,synced_count=v_count,run_id=null,locked_until=null where id;
 return v_count;
end $$;
create function public.finish_sleekflow_sync(p_run_id uuid,p_rows jsonb,p_error text default null) returns integer
language sql security invoker set search_path='' as $$select private.finish_sleekflow_sync(p_run_id,p_rows,p_error)$$;

revoke all on function private.require_prospect_admin(),private.admin_prospect_directory(),public.admin_prospect_directory(),private.save_studio_prospect(text,integer,text,date,text),public.save_studio_prospect(text,integer,text,date,text),private.configure_sleekflow(text),public.configure_sleekflow(text),private.begin_sleekflow_sync(),public.begin_sleekflow_sync(),private.finish_sleekflow_sync(uuid,jsonb,text),public.finish_sleekflow_sync(uuid,jsonb,text) from public,anon,authenticated;
grant usage on schema private to authenticated,service_role;
grant execute on function private.admin_prospect_directory(),public.admin_prospect_directory(),private.save_studio_prospect(text,integer,text,date,text),public.save_studio_prospect(text,integer,text,date,text),private.configure_sleekflow(text),public.configure_sleekflow(text) to authenticated;
grant execute on function private.begin_sleekflow_sync(),public.begin_sleekflow_sync(),private.finish_sleekflow_sync(uuid,jsonb,text),public.finish_sleekflow_sync(uuid,jsonb,text) to service_role;
commit;
