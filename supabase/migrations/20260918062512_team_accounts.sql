-- Staff account administration is server-only; ordinary signup remains client-only.
create table private.team_account_audit (
 id bigint generated always as identity primary key,
 actor uuid not null, target uuid, action text not null,
 created_at timestamptz not null default now()
);
alter table private.team_account_audit enable row level security;
revoke all on private.team_account_audit from public,anon,authenticated;
create function private.team_accounts_operation(p_actor uuid,p_session uuid,p_action text,p_target uuid default null,p_role text default null,p_name text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform pg_advisory_xact_lock(9182601);
 if not exists(select 1 from public.profiles p join auth.users u on u.id=p.id where p.id=p_actor and p.role='admin' and (u.banned_until is null or u.banned_until<now()))
 or not exists(select 1 from auth.sessions s where s.user_id=p_actor and s.id=p_session and (s.not_after is null or s.not_after>now())) then
  raise exception 'admin_access_required' using errcode='42501';
 end if;
 if p_action='check' then return 'true'::jsonb; end if;
 if p_action='list' then
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'full_name',p.full_name,'email',u.email,'role',p.role,'created_at',p.created_at,'last_sign_in_at',u.last_sign_in_at) order by p.full_name,p.id),'[]'::jsonb)
  into result from public.profiles p join auth.users u on u.id=p.id where p.role in ('admin','teacher');
  return result;
 elsif p_action='provision' then
  if p_role is null or p_role not in ('admin','teacher') or p_target is null or p_target=p_actor or p_name is null or length(trim(p_name)) not between 1 and 150 then raise exception 'invalid_team_account'; end if;
  if not exists(select 1 from public.profiles where id=p_target and role='client')
  or exists(select 1 from public.studio_client_accounts where user_id=p_target) then raise exception 'account_already_linked'; end if;
  update public.profiles set role=p_role::public.user_role,full_name=trim(p_name) where id=p_target;
  if p_role='teacher' then
   insert into public.teacher_profiles(id,active) values(p_target,false) on conflict(id) do nothing;
  end if;
 elsif p_action='reset' then
  if p_target is null or p_target=p_actor or not exists(select 1 from public.profiles where id=p_target and role in ('admin','teacher')) then raise exception 'invalid_team_target'; end if;
  delete from auth.sessions where user_id=p_target;
 else raise exception 'invalid_team_action';
 end if;
 insert into private.team_account_audit(actor,target,action) values(p_actor,p_target,p_action);
 return 'true'::jsonb;
end $$;
create function public.team_accounts_operation(p_actor uuid,p_session uuid,p_action text,p_target uuid default null,p_role text default null,p_name text default null)
returns jsonb language sql security invoker set search_path='' as $$
 select private.team_accounts_operation(p_actor,p_session,p_action,p_target,p_role,p_name)
$$;
revoke all on function private.team_accounts_operation(uuid,uuid,text,uuid,text,text),public.team_accounts_operation(uuid,uuid,text,uuid,text,text) from public,anon,authenticated;
grant execute on function private.team_accounts_operation(uuid,uuid,text,uuid,text,text),public.team_accounts_operation(uuid,uuid,text,uuid,text,text) to service_role;
