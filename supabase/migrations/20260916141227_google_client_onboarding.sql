-- New Google customers receive an empty CRM record, never another client's packs.
alter table public.studio_clients
  add column signup_source text not null default 'studio' check (signup_source in ('studio','google')),
  add column profile_completed_at timestamptz;

create function private.current_google_client_email() returns text
language sql stable security definer set search_path='' as $$
  select lower(btrim(u.email)) from auth.users u
  join public.profiles p on p.id=u.id and p.role='client'
  where u.id=auth.uid() and u.email_confirmed_at is not null
    and length(btrim(u.email)) between 3 and 320
    and coalesce(auth.jwt()->'amr','[]'::jsonb) @> '[{"method":"oauth"}]'::jsonb
    and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google'
      and i.identity_data->>'email_verified'='true'
      and lower(btrim(i.identity_data->>'email'))=lower(btrim(u.email)))
    and exists(select 1 from auth.sessions s
      left join public.studio_client_accounts a on a.user_id=s.user_id
      where s.id=nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=u.id
        and (s.not_after is null or s.not_after>now())
        and s.created_at>=coalesce(a.access_not_before,'-infinity'::timestamptz)
        and a.password_operation_id is null)
$$;
revoke all on function private.current_google_client_email() from public,anon,authenticated;

-- Keep the audit trail and admin-only table RLS. The only non-admin writes
-- accepted by this trigger are a verified user's own new Google profile.
create or replace function private.audit_studio_client_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_email text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if TG_TABLE_NAME='studio_clients' then
    -- Serialize email checks with admin edits as well as concurrent sign-ins.
    perform pg_advisory_xact_lock(hashtextextended(lower(btrim(new.email)),0));
  end if;
  if not coalesce(public.is_admin(),false) then
    if TG_TABLE_NAME<>'studio_clients' then raise exception 'admin_access_required' using errcode='42501'; end if;
    v_email:=private.current_google_client_email();
    if v_email is null or new.id<>'google:'||auth.uid()::text
      or new.email<>v_email or new.signup_source<>'google' then
      raise exception 'client_profile_access_required' using errcode='42501'; end if;
    if TG_OP='INSERT' then
      if new.phone<>'' or new.visits_since_jun is not null or new.profile_completed_at is not null then
        raise exception 'empty_client_profile_required' using errcode='42501'; end if;
    elsif old.profile_completed_at is not null or new.profile_completed_at is null
      or not exists(select 1 from public.studio_client_accounts where user_id=auth.uid() and client_id=old.id)
      or (to_jsonb(new)-array['client_name','phone','profile_completed_at','version','updated_at'])
        is distinct from (to_jsonb(old)-array['client_name','phone','profile_completed_at','version','updated_at']) then
      raise exception 'client_profile_access_required' using errcode='42501';
    end if;
  end if;
  new.version:=case when TG_OP='UPDATE' then old.version+1 else 1 end;
  new.updated_at:=clock_timestamp();
  insert into private.studio_client_changes(actor_id,table_name,before_data,after_data)
    values(auth.uid(),TG_TABLE_NAME,case when TG_OP='UPDATE' then to_jsonb(old) end,to_jsonb(new));
  return new;
end;
$$;

create function private.ensure_google_client() returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_email text; v_id text; c public.studio_clients; v_name text;
begin
  if v_user is null or not exists(select 1 from public.profiles where id=v_user and role='client') then
    raise exception 'client_account_required' using errcode='42501'; end if;
  perform set_config('response.headers','[{"Cache-Control":"no-store"}]',true);
  v_email:=private.current_google_client_email();
  if v_email is null then return jsonb_build_object('status','not_applicable'); end if;
  perform pg_advisory_xact_lock(hashtextextended('google-client:'||v_user::text,0));
  perform pg_advisory_xact_lock(hashtextextended(v_email,0));
  select client_id into v_id from public.studio_client_accounts where user_id=v_user;
  if v_id is null then
    if exists(select 1 from public.studio_clients where lower(btrim(email))=v_email)
      or exists(select 1 from public.studio_client_accounts where login_email=v_email) then
      return jsonb_build_object('status','link_required'); end if;
    v_id:='google:'||v_user::text;
    select left(coalesce(nullif(btrim(full_name),''),'New client'),200) into v_name from public.profiles where id=v_user;
    insert into public.studio_clients(id,client_name,email,signup_source) values(v_id,v_name,v_email,'google');
    insert into public.studio_client_accounts(client_id,user_id,login_email,created_by)
      values(v_id,v_user,v_email,v_user);
  end if;
  select * into c from public.studio_clients where id=v_id;
  if c.signup_source='google' and c.id='google:'||v_user::text and c.profile_completed_at is null then
    return jsonb_build_object('status','onboarding_required','name',c.client_name,'email',c.email,'phone',c.phone);
  end if;
  return jsonb_build_object('status','ready');
end;
$$;

create function private.complete_google_client_profile(p_name text,p_phone text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_email text; v_id text; c public.studio_clients; v_name text:=btrim(p_name);
  v_phone text:=regexp_replace(btrim(p_phone),'[[:space:]().-]','','g');
begin
  perform set_config('response.headers','[{"Cache-Control":"no-store"}]',true);
  v_email:=private.current_google_client_email();
  if v_email is null then raise exception 'google_sign_in_required' using errcode='42501'; end if;
  if v_name is null or length(v_name) not between 1 and 200 then raise exception 'valid_name_required'; end if;
  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'valid_phone_required'; end if;
  select client_id into v_id from public.studio_client_accounts where user_id=auth.uid() for update;
  select * into c from public.studio_clients where id=v_id for update;
  if c.id is null or c.id<>'google:'||auth.uid()::text or c.signup_source<>'google' or c.email<>v_email then
    raise exception 'client_profile_access_required' using errcode='42501'; end if;
  if c.profile_completed_at is not null then return jsonb_build_object('status','ready'); end if;
  update public.studio_clients set client_name=v_name,phone=v_phone,profile_completed_at=clock_timestamp() where id=v_id;
  update public.profiles set full_name=v_name where id=auth.uid();
  return jsonb_build_object('status','ready');
end;
$$;

revoke all on function private.ensure_google_client(),private.complete_google_client_profile(text,text) from public,anon,authenticated;
grant execute on function private.ensure_google_client(),private.complete_google_client_profile(text,text) to authenticated;
create function public.ensure_my_client_profile() returns jsonb
language sql security invoker set search_path='' as $$ select private.ensure_google_client() $$;
create function public.complete_my_client_profile(p_name text,p_phone text) returns jsonb
language sql security invoker set search_path='' as $$ select private.complete_google_client_profile(p_name,p_phone) $$;
revoke all on function public.ensure_my_client_profile(),public.complete_my_client_profile(text,text) from public,anon,authenticated;
grant execute on function public.ensure_my_client_profile(),public.complete_my_client_profile(text,text) to authenticated;
