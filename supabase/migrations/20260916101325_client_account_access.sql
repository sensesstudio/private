-- Explicit CRM-to-Auth ownership. No automatic linking by an email supplied
-- during public signup, and no change to the admin-only CRM table policies.
create table public.studio_client_accounts (
  client_id text primary key references public.studio_clients(id),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  login_email text not null unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  password_changed_at timestamptz,
  constraint client_login_email_normalized check (login_email=lower(trim(login_email)))
);
alter table public.studio_client_accounts enable row level security;
revoke all on public.studio_client_accounts from public, anon, authenticated;
grant select on public.studio_client_accounts to authenticated;
grant select, insert, update, delete on public.studio_client_accounts to service_role;
create policy client_accounts_admin_read on public.studio_client_accounts for select to authenticated
  using (public.is_admin());

-- Only the server function may bind a newly created Auth account. Recheck
-- identity and optimistic version after the external Auth API call.
create function public.bind_studio_client_account(p_client_id text,p_version integer,p_user_id uuid,p_email text,p_actor uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare c public.studio_clients;
begin
  if not exists(select 1 from public.profiles where id=p_actor and role='admin') then
    raise exception 'admin_access_required' using errcode='42501'; end if;
  select * into c from public.studio_clients where id=p_client_id for update;
  if c.id is null or c.version<>p_version or lower(trim(c.email)) is distinct from p_email then
    raise exception 'client_changed_reload'; end if;
  if p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or
    exists(select 1 from public.studio_clients where id<>c.id and lower(trim(email))=p_email) then
    raise exception 'unique_email_required'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id and role='client' and lower(email)=p_email) then
    raise exception 'client_account_required'; end if;
  insert into public.studio_client_accounts(client_id,user_id,login_email,created_by)
    values(c.id,p_user_id,p_email,p_actor);
end;
$$;
revoke all on function public.bind_studio_client_account(text,integer,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.bind_studio_client_account(text,integer,uuid,text,uuid) to service_role;

-- A deliberately narrow projection of admin-only data. The definer lives in
-- an unexposed schema and derives ownership only from the authenticated UID.
create function private.client_account_snapshot() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a public.studio_client_accounts; v_client uuid:=auth.uid();
begin
  if v_client is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if not exists(select 1 from public.profiles where id=v_client and role='client') then
    raise exception 'client_account_required' using errcode='42501'; end if;
  perform set_config('response.headers','[{"Cache-Control":"no-store"}]',true);
  select * into a from public.studio_client_accounts where user_id=v_client;
  if a.user_id is null then return jsonb_build_object('status','not_linked'); end if;
  if a.password_changed_at is null then return jsonb_build_object('status','password_required'); end if;
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
revoke all on function private.client_account_snapshot() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.client_account_snapshot() to authenticated;
create function public.my_client_account() returns jsonb
language sql stable security invoker set search_path='' as $$ select private.client_account_snapshot() $$;
revoke all on function public.my_client_account() from public,anon,authenticated;
grant execute on function public.my_client_account() to authenticated;
