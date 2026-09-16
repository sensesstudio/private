-- Mindbody-owned readings stay separate from editable studio records.
create table public.mindbody_package_links (
  package_id uuid primary key references public.studio_client_packages(id),
  service_id text,
  remaining integer check (remaining >= 0),
  total integer check (total >= remaining),
  expiry_date date,
  current boolean,
  status text not null check (status in ('synced','needs_review','not_found')),
  last_attempt_at timestamptz not null,
  last_ok_at timestamptz
);
create table public.mindbody_client_sync_state (
  id boolean primary key default true check (id),
  last_attempt_at timestamptz not null,
  last_ok_at timestamptz,
  failed boolean not null default false,
  matched integer not null default 0,
  pending integer not null default 0
);
alter table public.mindbody_package_links enable row level security;
alter table public.mindbody_client_sync_state enable row level security;
revoke all on public.mindbody_package_links,public.mindbody_client_sync_state from public,anon,authenticated;
grant select on public.mindbody_package_links,public.mindbody_client_sync_state to authenticated;
grant all on public.mindbody_package_links,public.mindbody_client_sync_state to service_role;
create policy mindbody_package_links_admin on public.mindbody_package_links for select to authenticated using ((select public.is_admin()));
create policy mindbody_client_sync_admin on public.mindbody_client_sync_state for select to authenticated using ((select public.is_admin()));

create function public.apply_mindbody_client_sync(p_started timestamptz,p_results jsonb,p_error boolean) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_matched integer; v_pending integer;
begin
  perform pg_advisory_xact_lock(9181626);
  if exists(select 1 from public.mindbody_client_sync_state where last_attempt_at > p_started) then
    return jsonb_build_object('skipped',true);
  end if;
  if not p_error then
    insert into public.mindbody_package_links as previous(package_id,service_id,remaining,total,expiry_date,current,status,last_attempt_at,last_ok_at)
    select p.id,x.service_id,x.remaining,x.total,x.expiry_date,x.current,x.status,p_started,
      case when x.status='synced' then p_started end
    from jsonb_to_recordset(p_results) as x(package_id uuid,version integer,service_id text,remaining integer,total integer,expiry_date date,current boolean,status text)
    join public.studio_client_packages p on p.id=x.package_id and p.version=x.version
    on conflict(package_id) do update set
      service_id=coalesce(excluded.service_id,previous.service_id),
      remaining=case when excluded.status='synced' then excluded.remaining else previous.remaining end,
      total=case when excluded.status='synced' then excluded.total else previous.total end,
      expiry_date=case when excluded.status='synced' then excluded.expiry_date else previous.expiry_date end,
      current=case when excluded.status='synced' then excluded.current else previous.current end,
      status=excluded.status,last_attempt_at=p_started,last_ok_at=coalesce(excluded.last_ok_at,previous.last_ok_at);
  end if;
  select count(*) filter(where l.status='synced')::integer, count(*) filter(where l.status is distinct from 'synced')::integer
  into v_matched,v_pending from public.studio_client_packages p left join public.mindbody_package_links l on l.package_id=p.id where p.import_id is not null;
  insert into public.mindbody_client_sync_state(id,last_attempt_at,last_ok_at,failed,matched,pending)
  values(true,p_started,case when not p_error then p_started end,p_error,v_matched,v_pending)
  on conflict(id) do update set last_attempt_at=p_started,last_ok_at=coalesce(excluded.last_ok_at,mindbody_client_sync_state.last_ok_at),failed=p_error,matched=v_matched,pending=v_pending;
  return jsonb_build_object('matched',v_matched,'pending',v_pending,'failed',p_error);
end;
$$;
revoke all on function public.apply_mindbody_client_sync(timestamptz,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.apply_mindbody_client_sync(timestamptz,jsonb,boolean) to service_role;

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
    'clients',coalesce((select jsonb_agg(to_jsonb(c) order by c.client_name,c.id) from public.studio_clients c),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg((to_jsonb(p)-'import_id') || jsonb_build_object(
      'client_name',c.client_name,'phone',c.phone,'email',c.email,'visits_since_jun',c.visits_since_jun,
      'recorded',jsonb_build_object('credits_left',p.credits_left,'total_credits',p.total_credits,'expiry_date',p.expiry_date),
      'credits_left',coalesce(l.remaining,p.credits_left),'total_credits',coalesce(l.total,p.total_credits),
      'expiry_date',coalesce(l.expiry_date,p.expiry_date),'days_to_expiry',coalesce(l.expiry_date,p.expiry_date)-v_today,
      'mindbody',case when l.package_id is not null then to_jsonb(l)-'package_id' end
    ) order by p.source_row nulls last,p.id)
    from public.studio_client_packages p join public.studio_clients c on c.id=p.client_id
    left join public.mindbody_package_links l on l.package_id=p.id),'[]'::jsonb));
end;
$$;

create function private.protect_linked_package_identity() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if exists(select 1 from public.mindbody_package_links where package_id=old.id and service_id is not null)
    and (new.package_name,new.purchase_date,new.credits_left,new.total_credits,new.expiry_date)
      is distinct from (old.package_name,old.purchase_date,old.credits_left,old.total_credits,old.expiry_date) then
    raise exception 'edit_linked_package_in_mindbody' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_linked_package_identity() from public,anon,authenticated;
create trigger studio_package_mindbody_identity before update on public.studio_client_packages
for each row execute function private.protect_linked_package_identity();
