-- Admin Clients showed only CSV/Mindbody packages, so a client who bought a
-- package on the website appeared with no packages and no credits. The
-- directory now returns paid website orders as rows beside the studio records.
-- Same body as the previous definition plus the website rows at the end.
create or replace function public.admin_client_directory() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_import public.admin_client_imports; v_today date := (now() at time zone 'Asia/Hong_Kong')::date;
begin
  if not coalesce(public.is_admin(),false) then raise exception 'admin_access_required' using errcode='42501'; end if;
  perform set_config('response.headers','[{"Cache-Control":"no-store"}]',true);
  select i.* into v_import from public.admin_client_imports i
    where exists(select 1 from public.studio_client_packages p where p.import_id=i.id)
    order by i.imported_at desc,i.id desc limit 1;
  return jsonb_build_object('import',case when v_import.id is not null then to_jsonb(v_import)-'source_sha256' end,
    'as_of',v_today,'sync',(select to_jsonb(s)-'id' from public.mindbody_client_sync_state s where id),
    'last_visit_import',(select to_jsonb(i)-'source_sha256' from public.admin_client_imports i
      where exists(select 1 from public.admin_client_packages a where a.import_id=i.id and a.raw_data ? 'Last_visit_date')
      order by i.imported_at desc,i.id desc limit 1),
    'lifetime_import',(select to_jsonb(i)-'source_sha256' from public.admin_client_imports i
      where exists(select 1 from public.admin_client_packages a where a.import_id=i.id and a.raw_data ? 'Private_sessions_lifetime')
      order by i.imported_at desc,i.id desc limit 1),
    'next_visit_import',(select to_jsonb(i)-'source_sha256' from public.admin_client_imports i
      where exists(select 1 from public.admin_client_packages a where a.import_id=i.id and a.raw_data ? 'Next_visit')
      order by i.imported_at desc,i.id desc limit 1),
    'clients',coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object(
      'portal_profile',(select to_jsonb(cp)-'id' from public.client_profiles cp join public.studio_client_accounts ca on ca.user_id=cp.id where ca.client_id=c.id),
      'waiver_signatures',coalesce((select jsonb_agg(to_jsonb(ws)-array['user_id','client_id'] order by ws.signed_at desc) from public.client_waiver_signatures ws where ws.client_id=c.id),'[]'::jsonb),
      'favourite_teachers',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name)) from public.studio_client_accounts ca join public.client_profiles cp on cp.id=ca.user_id join public.profiles p on p.id=any(cp.favourite_teacher_ids) where ca.client_id=c.id),'[]'::jsonb),
      'private_sessions_lifetime',pv.private_sessions_lifetime,'last_visit_date',v.last_visit_date,'never_attended',coalesce(v.never_attended,false),
      'next_visit_at',nv.next_visit_at,'next_visit_details',nv.next_visit_details,
      'no_upcoming_booking',coalesce(nv.no_upcoming_booking,false)) order by c.client_name,c.id)
      from public.studio_clients c left join lateral (
        select a.last_visit_date,a.never_attended from public.admin_client_packages a
        join public.admin_client_imports i on i.id=a.import_id
        where a.client_id=c.id and a.raw_data ? 'Last_visit_date'
        order by i.imported_at desc,i.id desc,a.source_row limit 1
      ) v on true left join lateral (
        select a.next_visit_at,a.next_visit_details,a.no_upcoming_booking from public.admin_client_packages a
        join public.admin_client_imports i on i.id=a.import_id
        where a.client_id=c.id and a.raw_data ? 'Next_visit'
        order by i.imported_at desc,i.id desc,a.source_row limit 1
      ) nv on true left join lateral (
        select a.private_sessions_lifetime from public.admin_client_packages a
        join public.admin_client_imports i on i.id=a.import_id
        where a.client_id=c.id and a.raw_data ? 'Private_sessions_lifetime'
        order by i.imported_at desc,i.id desc,a.source_row limit 1
      ) pv on true),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg((to_jsonb(p)-'import_id') || jsonb_build_object(
      'client_name',c.client_name,'phone',c.phone,'email',c.email,'visits_since_jun',c.visits_since_jun,
      'recorded',jsonb_build_object('credits_left',p.credits_left,'total_credits',p.total_credits,'expiry_date',p.expiry_date),
      'credits_left',coalesce(l.remaining,p.credits_left),'total_credits',coalesce(l.total,p.total_credits),
      'expiry_date',coalesce(l.expiry_date,p.expiry_date),'days_to_expiry',coalesce(l.expiry_date,p.expiry_date)-v_today,
      'mindbody',case when l.package_id is not null then to_jsonb(l)-'package_id' end
    ) order by p.source_row nulls last,p.id)
    from public.studio_client_packages p join public.studio_clients c on c.id=p.client_id
    left join public.mindbody_package_links l on l.package_id=p.id),'[]'::jsonb) || coalesce((
    -- Paid website purchases sit beside studio records for the same client.
    -- They are Stripe orders, not editable studio rows: remaining credits follow
    -- the client's own account view (full until any booking usage is recorded),
    -- and validity runs from the first booked class, so there is no expiry yet.
    select jsonb_agg(jsonb_build_object(
      'id','website:'||o.id::text,'order_id',o.id,'source','website','client_id',a.client_id,
      'client_name',c.client_name,'phone',c.phone,'email',c.email,'visits_since_jun',c.visits_since_jun,
      'package_name',o.package_name||' - '||o.format,'total_credits',o.credits,
      'credits_left',case when pay.status='refunded' then 0
        when not exists(select 1 from public.credit_ledger cl where cl.client_id=o.client_id and cl.reason<>'purchase') then o.credits end,
      'purchase_amount_hkd',o.price_hkd,'remaining_value_hkd',null,
      'purchase_date',(o.paid_at at time zone 'Asia/Hong_Kong')::date,'expiry_date',null,'days_to_expiry',null,
      'validity_months',o.validity_months,'payment_status',pay.status,'paid_at',o.paid_at,
      'source_row',null,'duplicate_of_row',null,'mindbody',null
    ) order by o.paid_at desc,o.id)
    from public.package_checkout_orders o
    join public.payments pay on pay.id=o.payment_id and pay.client_id=o.client_id
    join public.studio_client_accounts a on a.user_id=o.client_id
    join public.studio_clients c on c.id=a.client_id
    where o.status='paid' and o.livemode),'[]'::jsonb));
end;
$$;
