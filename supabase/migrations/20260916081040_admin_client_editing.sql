-- Editable studio records, separate from immutable CSV evidence and payment credits.
create table public.studio_clients (
  id text primary key default ('manual:' || gen_random_uuid()::text),
  client_name text not null check (length(btrim(client_name)) between 1 and 200),
  phone text not null default '' check (length(phone) <= 80),
  email text not null default '' check (length(email) <= 320),
  visits_since_jun integer check (visits_since_jun >= 0),
  version integer not null default 1,
  updated_at timestamptz not null default now()
);
create table public.studio_client_packages (
  id uuid primary key default gen_random_uuid(),
  client_id text not null references public.studio_clients(id),
  package_name text not null check (length(btrim(package_name)) between 1 and 300),
  credits_left integer not null check (credits_left >= 0),
  total_credits integer not null check (total_credits >= credits_left),
  purchase_amount_hkd numeric(12,2) not null check (purchase_amount_hkd >= 0),
  remaining_value_hkd numeric(12,2) not null check (remaining_value_hkd >= 0),
  purchase_date date not null,
  expiry_date date not null check (expiry_date >= purchase_date),
  import_id uuid,
  source_row integer,
  duplicate_of_row integer,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  foreign key (import_id, source_row) references public.admin_client_packages(import_id, source_row),
  unique (import_id, source_row)
);
create index studio_client_packages_client_idx on public.studio_client_packages(client_id);

-- Backfill once. Future source imports remain evidence and require explicit
-- reconciliation, so re-imports cannot overwrite staff edits or duplicate packs.
insert into public.studio_clients(id,client_name,phone,email,visits_since_jun)
select distinct on (client_id) client_id,client_name,phone,email,visits_since_jun
from public.admin_client_packages
where import_id = (select id from public.admin_client_imports order by imported_at desc,id desc limit 1)
order by client_id,source_row;
insert into public.studio_client_packages(client_id,package_name,credits_left,total_credits,
  purchase_amount_hkd,remaining_value_hkd,purchase_date,expiry_date,import_id,source_row,duplicate_of_row)
select client_id,package_name,credits_left,total_credits,purchase_amount_hkd,remaining_value_hkd,
  purchase_date,expiry_date,import_id,source_row,duplicate_of_row from public.admin_client_packages
where import_id = (select id from public.admin_client_imports order by imported_at desc,id desc limit 1);

alter table public.studio_clients enable row level security;
alter table public.studio_client_packages enable row level security;
revoke all on public.studio_clients,public.studio_client_packages from public,anon,authenticated;
grant select on public.studio_clients,public.studio_client_packages to authenticated;
grant insert(client_name,phone,email,visits_since_jun), update(client_name,phone,email,visits_since_jun)
  on public.studio_clients to authenticated;
grant insert(client_id,package_name,credits_left,total_credits,purchase_amount_hkd,remaining_value_hkd,purchase_date,expiry_date),
  update(package_name,credits_left,total_credits,purchase_amount_hkd,remaining_value_hkd,purchase_date,expiry_date)
  on public.studio_client_packages to authenticated;
grant all on public.studio_clients,public.studio_client_packages to service_role;
create policy studio_clients_read on public.studio_clients for select to authenticated using ((select public.is_admin()));
create policy studio_clients_add on public.studio_clients for insert to authenticated with check ((select public.is_admin()));
create policy studio_clients_edit on public.studio_clients for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy studio_packages_read on public.studio_client_packages for select to authenticated using ((select public.is_admin()));
create policy studio_packages_add on public.studio_client_packages for insert to authenticated with check ((select public.is_admin()));
create policy studio_packages_edit on public.studio_client_packages for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Trigger owns the append-only history. Definer is needed only to append to
-- an unexposed schema; callers cannot alter history, version, IDs or provenance.
create schema if not exists private;
create table private.studio_client_changes (
  id uuid primary key default gen_random_uuid(), actor_id uuid not null,
  changed_at timestamptz not null default now(), table_name text not null,
  before_data jsonb, after_data jsonb not null
);
alter table private.studio_client_changes enable row level security;
revoke all on private.studio_client_changes from public,anon,authenticated;
create function private.audit_studio_client_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not coalesce(public.is_admin(),false) then
    raise exception 'admin_access_required' using errcode='42501';
  end if;
  new.version := case when TG_OP='UPDATE' then old.version+1 else 1 end;
  new.updated_at := clock_timestamp();
  insert into private.studio_client_changes(actor_id,table_name,before_data,after_data)
  values(auth.uid(),TG_TABLE_NAME,case when TG_OP='UPDATE' then to_jsonb(old) end,to_jsonb(new));
  return new;
end;
$$;
revoke all on function private.audit_studio_client_change() from public,anon,authenticated;
create trigger studio_clients_audit before insert or update on public.studio_clients
  for each row execute function private.audit_studio_client_change();
create trigger studio_packages_audit before insert or update on public.studio_client_packages
  for each row execute function private.audit_studio_client_change();

create function public.save_studio_client(p_id text,p_version integer,p_details jsonb) returns text
language plpgsql security invoker set search_path = '' as $$
declare v public.studio_clients; v_id text;
begin
  if not coalesce(public.is_admin(),false) then raise exception 'admin_access_required' using errcode='42501'; end if;
  select * into v from jsonb_populate_record(null::public.studio_clients,p_details);
  v.client_name := btrim(v.client_name); v.phone := btrim(coalesce(v.phone,'')); v.email := btrim(coalesce(v.email,''));
  if p_id is null then
    insert into public.studio_clients(client_name,phone,email,visits_since_jun)
    values(v.client_name,v.phone,v.email,v.visits_since_jun) returning id into v_id;
  else
    update public.studio_clients set client_name=v.client_name,phone=v.phone,email=v.email,visits_since_jun=v.visits_since_jun
    where id=p_id and version=p_version returning id into v_id;
    if v_id is null then raise exception 'record_changed_reload' using errcode='40001'; end if;
  end if;
  return v_id;
end;
$$;
create function public.save_studio_client_package(p_id uuid,p_version integer,p_client_id text,p_details jsonb) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare v public.studio_client_packages; v_id uuid;
begin
  if not coalesce(public.is_admin(),false) then raise exception 'admin_access_required' using errcode='42501'; end if;
  select * into v from jsonb_populate_record(null::public.studio_client_packages,p_details);
  v.package_name := btrim(v.package_name);
  if p_id is null then
    insert into public.studio_client_packages(client_id,package_name,credits_left,total_credits,purchase_amount_hkd,remaining_value_hkd,purchase_date,expiry_date)
    values(p_client_id,v.package_name,v.credits_left,v.total_credits,v.purchase_amount_hkd,v.remaining_value_hkd,v.purchase_date,v.expiry_date) returning id into v_id;
  else
    update public.studio_client_packages set package_name=v.package_name,credits_left=v.credits_left,total_credits=v.total_credits,
      purchase_amount_hkd=v.purchase_amount_hkd,remaining_value_hkd=v.remaining_value_hkd,purchase_date=v.purchase_date,expiry_date=v.expiry_date
    where id=p_id and client_id=p_client_id and version=p_version returning id into v_id;
    if v_id is null then raise exception 'record_changed_reload' using errcode='40001'; end if;
  end if;
  return v_id;
end;
$$;
revoke all on function public.save_studio_client(text,integer,jsonb),public.save_studio_client_package(uuid,integer,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_studio_client(text,integer,jsonb),public.save_studio_client_package(uuid,integer,text,jsonb) to authenticated;

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
    'as_of',v_today,
    'clients',coalesce((select jsonb_agg(to_jsonb(c) order by c.client_name,c.id) from public.studio_clients c),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg((to_jsonb(p)-'import_id') || jsonb_build_object(
      'client_name',c.client_name,'phone',c.phone,'email',c.email,'visits_since_jun',c.visits_since_jun,
      'days_to_expiry',p.expiry_date-v_today) order by p.source_row nulls last,p.id)
      from public.studio_client_packages p join public.studio_clients c on c.id=p.client_id),'[]'::jsonb));
end;
$$;
