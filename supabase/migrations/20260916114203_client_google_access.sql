-- Google OAuth reads remain scoped to the existing explicit CRM mapping.
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
  -- Only an OAuth-authenticated session with a verified Google identity may
  -- skip the temporary password gate. Linking an identity must never activate
  -- the shared temporary password for a later password-authenticated session.
  -- JWT AMR is issued by Auth; user_metadata is deliberately not trusted.
  if a.password_operation_id is not null or (a.password_changed_at is null and not (
    coalesce(auth.jwt()->'amr','[]'::jsonb) @> '[{"method":"oauth"}]'::jsonb
    and exists(select 1 from auth.identities i
      where i.user_id=v_client and i.provider='google'
        and i.identity_data->>'email_verified'='true'
        and lower(btrim(i.identity_data->>'email'))=lower(btrim(a.login_email)))
  )) then return jsonb_build_object('status','password_required'); end if;
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

revoke all on function private.client_account_snapshot() from public,anon;
grant execute on function private.client_account_snapshot() to authenticated;
