-- Password changes use a short operation lease so a concurrent reset cannot
-- accidentally activate access using an older credential change.
alter table public.studio_client_accounts
  add column access_not_before timestamptz not null default '-infinity',
  add column password_operation_id uuid,
  add column password_operation_started_at timestamptz,
  add column password_operation_reset boolean,
  add column last_reset_at timestamptz,
  add column last_reset_by uuid references public.profiles(id);

create table private.studio_client_access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  actor_id uuid not null references public.profiles(id),
  operation_id uuid not null,
  action text not null check(action in ('reset_started','change_started','reset_finished','change_finished','operation_failed')),
  created_at timestamptz not null default now()
);
alter table private.studio_client_access_events enable row level security;
revoke all on private.studio_client_access_events from public,anon,authenticated;
grant usage on schema private to service_role;
grant select,insert on private.studio_client_access_events to service_role;
create policy access_events_service on private.studio_client_access_events for all to service_role using(true) with check(true);

create function public.begin_client_password_operation(p_user_id uuid,p_actor uuid,p_reset boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.studio_client_accounts; v_op uuid:=gen_random_uuid(); v_now timestamptz:=clock_timestamp();
begin
  if p_reset is null or not exists(select 1 from public.profiles where id=p_user_id and role='client') then
    raise exception 'client_account_required' using errcode='42501'; end if;
  if p_reset then
    if not exists(select 1 from public.profiles where id=p_actor and role='admin') then
      raise exception 'admin_access_required' using errcode='42501'; end if;
  elsif p_actor is distinct from p_user_id then
    raise exception 'client_account_required' using errcode='42501';
  end if;
  select * into a from public.studio_client_accounts where user_id=p_user_id for update;
  if a.user_id is null then raise exception 'account_not_linked'; end if;
  if a.password_operation_id is not null and a.password_operation_started_at>v_now-interval '5 minutes' then
    raise exception 'password_operation_in_progress'; end if;
  if not p_reset and a.password_changed_at is not null then raise exception 'password_already_set'; end if;
  update public.studio_client_accounts set password_operation_id=v_op,password_operation_started_at=v_now,
    password_operation_reset=p_reset,password_changed_at=null,
    access_not_before=case when p_reset then v_now else access_not_before end,
    last_reset_at=case when p_reset then v_now else last_reset_at end,
    last_reset_by=case when p_reset then p_actor else last_reset_by end
    where user_id=p_user_id;
  insert into private.studio_client_access_events(user_id,actor_id,operation_id,action)
    values(p_user_id,p_actor,v_op,case when p_reset then 'reset_started' else 'change_started' end);
  return v_op;
end;
$$;

create function public.finish_client_password_operation(p_user_id uuid,p_actor uuid,p_operation uuid,p_success boolean)
returns boolean language plpgsql security invoker set search_path='' as $$
declare a public.studio_client_accounts;
begin
  select * into a from public.studio_client_accounts where user_id=p_user_id for update;
  if a.user_id is null or a.password_operation_id is distinct from p_operation or p_operation is null then
    raise exception 'password_operation_changed'; end if;
  if a.password_operation_reset then
    if not exists(select 1 from public.profiles where id=p_actor and role='admin') or a.last_reset_by is distinct from p_actor then
      raise exception 'admin_access_required' using errcode='42501'; end if;
  elsif p_actor is distinct from p_user_id then raise exception 'client_account_required' using errcode='42501';
  end if;
  update public.studio_client_accounts set password_changed_at=case when p_success and not a.password_operation_reset then clock_timestamp() else null end,
    access_not_before=case when p_success then clock_timestamp() else access_not_before end,
    password_operation_id=null,password_operation_started_at=null,password_operation_reset=null where user_id=p_user_id;
  insert into private.studio_client_access_events(user_id,actor_id,operation_id,action)
    values(p_user_id,p_actor,p_operation,case when not coalesce(p_success,false) then 'operation_failed' when a.password_operation_reset then 'reset_finished' else 'change_finished' end);
  return true;
end;
$$;
revoke all on function public.begin_client_password_operation(uuid,uuid,boolean),public.finish_client_password_operation(uuid,uuid,uuid,boolean) from public,anon,authenticated;
grant execute on function public.begin_client_password_operation(uuid,uuid,boolean),public.finish_client_password_operation(uuid,uuid,uuid,boolean) to service_role;

create or replace function private.client_account_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.studio_client_accounts; v_client uuid:=auth.uid();
begin
  if v_client is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=v_client and role='client') then
    raise exception 'client_account_required' using errcode='42501'; end if;
  perform set_config('response.headers','[{"Cache-Control":"no-store"}]',true);
  select * into a from public.studio_client_accounts where user_id=v_client;
  if a.user_id is null then return jsonb_build_object('status','not_linked'); end if;
  -- A reset invalidates old sessions immediately, even while their JWT has
  -- not expired. A refreshed token for the same old session is still denied.
  if not exists(select 1 from auth.sessions s
    where s.id=nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=v_client
      and s.created_at>=a.access_not_before and (s.not_after is null or s.not_after>now())) then
    return jsonb_build_object('status','sign_in_required'); end if;
  if a.password_operation_id is not null or a.password_changed_at is null then return jsonb_build_object('status','password_required'); end if;
  return jsonb_build_object('status','active',
    'name',(select client_name from public.studio_clients where id=a.client_id),
    'private_lifetime',(select jsonb_build_object('sessions',p.private_sessions_lifetime,'as_of',i.as_of)
      from public.admin_client_packages p join public.admin_client_imports i on i.id=p.import_id
      where p.client_id=a.client_id and p.raw_data ? 'Private_sessions_lifetime'
      order by i.imported_at desc,i.id desc,p.source_row limit 1),
    'last_visit',(select jsonb_build_object('date',p.last_visit_date,'never_attended',p.never_attended,'as_of',i.as_of)
      from public.admin_client_packages p join public.admin_client_imports i on i.id=p.import_id
      where p.client_id=a.client_id and p.raw_data ? 'Last_visit_date'
      order by i.imported_at desc,i.id desc,p.source_row limit 1),
    'next_visit',(select jsonb_build_object('at',p.next_visit_at,'details',p.next_visit_details,'no_booking',p.no_upcoming_booking,'as_of',i.as_of)
      from public.admin_client_packages p join public.admin_client_imports i on i.id=p.import_id
      where p.client_id=a.client_id and p.raw_data ? 'Next_visit'
      order by i.imported_at desc,i.id desc,p.source_row limit 1),
    'packages',coalesce((select jsonb_agg(jsonb_build_object(
      'id',p.id,'name',p.package_name,'remaining',coalesce(l.remaining,p.credits_left),
      'total',coalesce(l.total,p.total_credits),'purchased_on',p.purchase_date,
      'expires_on',coalesce(l.expiry_date,p.expiry_date),'sync_status',l.status,
      'synced_at',l.last_ok_at,'current',l.current,'needs_review',p.duplicate_of_row is not null
    ) order by p.purchase_date desc nulls last,p.id)
    from public.studio_client_packages p left join public.mindbody_package_links l on l.package_id=p.id
    where p.client_id=a.client_id),'[]'::jsonb));
end;
$$;
