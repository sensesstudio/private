-- Read-only CRM snapshots. These records do not create Auth accounts or
-- change credit_ledger, payments, bookings, or the public availability feed.
create table public.admin_client_imports (
  id uuid primary key default gen_random_uuid(),
  source_file text not null,
  source_sha256 text not null unique check (source_sha256 ~ '^[a-f0-9]{64}$'),
  as_of date not null,
  imported_at timestamptz not null default now(),
  row_count integer not null check (row_count > 0)
);

create table public.admin_client_packages (
  import_id uuid not null references public.admin_client_imports(id),
  source_row integer not null check (source_row >= 2),
  client_id text not null check (length(btrim(client_id)) > 0),
  client_name text not null check (length(btrim(client_name)) > 0),
  phone text not null,
  email text not null,
  package_name text not null check (length(btrim(package_name)) > 0),
  credits_left integer not null check (credits_left >= 0),
  total_credits integer not null check (total_credits >= credits_left),
  purchase_amount_hkd numeric(12,2) not null check (purchase_amount_hkd >= 0),
  remaining_value_hkd numeric(12,2) not null check (remaining_value_hkd >= 0),
  purchase_date date not null,
  expiry_date date not null,
  days_to_expiry integer not null,
  visits_since_jun integer check (visits_since_jun >= 0),
  duplicate_of_row integer,
  raw_data jsonb not null,
  primary key (import_id, source_row),
  foreign key (import_id, duplicate_of_row) references public.admin_client_packages(import_id, source_row)
);

alter table public.admin_client_imports enable row level security;
alter table public.admin_client_packages enable row level security;
revoke all on public.admin_client_imports, public.admin_client_packages from public, anon, authenticated;
grant select on public.admin_client_imports, public.admin_client_packages to authenticated;
grant all on public.admin_client_imports, public.admin_client_packages to service_role;
create policy admin_client_imports_read on public.admin_client_imports
  for select to authenticated using ((select public.is_admin()));
create policy admin_client_packages_read on public.admin_client_packages
  for select to authenticated using ((select public.is_admin()));

-- Only trusted server-side imports can write. All source rows, including
-- identical rows, are preserved. Re-importing the same file is idempotent.
create function public.import_admin_client_packages(
  p_source_file text, p_source_sha256 text, p_as_of date, p_rows jsonb
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_id uuid;
  v_keys text[] := array['ClientId','Name','Phone','Email','Package','Credits_left',
    'Total_credits','Purchase_amount_HK$','Remaining_value_HK$','Purchase_date',
    'Expiry_date','Days_to_expiry','Visits_since_Jun'];
begin
  if jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'rows_must_be_an_array';
  end if;
  if jsonb_array_length(p_rows) = 0 then raise exception 'empty_import'; end if;
  if exists (select 1 from jsonb_array_elements(p_rows) x where
    jsonb_typeof(x) is distinct from 'object') then raise exception 'invalid_row'; end if;
  if exists (select 1 from jsonb_array_elements(p_rows) x where
    not (x ?& v_keys) or (select count(*) from jsonb_object_keys(x)) <> 13
    or exists (select 1 from jsonb_each(x) e where jsonb_typeof(e.value) <> 'string')) then
    raise exception 'unexpected_csv_columns';
  end if;
  if exists (select 1 from jsonb_array_elements(p_rows) x where
    (x->>'Expiry_date')::date - (x->>'Days_to_expiry')::integer <> p_as_of) then
    raise exception 'inconsistent_snapshot_date';
  end if;
  insert into public.admin_client_imports(source_file, source_sha256, as_of, row_count)
    values (p_source_file, p_source_sha256, p_as_of, jsonb_array_length(p_rows))
    on conflict (source_sha256) do nothing returning id into v_id;
  if v_id is null then
    select id into v_id from public.admin_client_imports where source_sha256 = p_source_sha256;
    return v_id;
  end if;
  insert into public.admin_client_packages
    (import_id, source_row, client_id, client_name, phone, email, package_name,
     credits_left, total_credits, purchase_amount_hkd, remaining_value_hkd,
     purchase_date, expiry_date, days_to_expiry, visits_since_jun, duplicate_of_row, raw_data)
  select v_id, (n+1)::integer, x->>'ClientId', x->>'Name', x->>'Phone', x->>'Email', x->>'Package',
    (x->>'Credits_left')::integer, (x->>'Total_credits')::integer,
    (x->>'Purchase_amount_HK$')::numeric, (x->>'Remaining_value_HK$')::numeric,
    (x->>'Purchase_date')::date, (x->>'Expiry_date')::date,
    (x->>'Days_to_expiry')::integer, nullif(x->>'Visits_since_Jun','')::integer,
    case when n > min(n) over (partition by x) then (min(n) over (partition by x)+1)::integer end, x
  from jsonb_array_elements(p_rows) with ordinality as source(x,n);
  return v_id;
end;
$$;
revoke all on function public.import_admin_client_packages(text,text,date,jsonb) from public, anon, authenticated;
grant execute on function public.import_admin_client_packages(text,text,date,jsonb) to service_role;

-- One consistent, complete snapshot (not a default 1,000-row REST page).
-- Invoker security preserves table RLS as a second check.
create function public.admin_client_directory() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_import public.admin_client_imports;
begin
  if not coalesce(public.is_admin(), false) then
    raise exception 'admin_access_required' using errcode = '42501';
  end if;
  perform set_config('response.headers', '[{"Cache-Control":"no-store"}]', true);
  select * into v_import from public.admin_client_imports order by imported_at desc, id desc limit 1;
  if v_import.id is null then return jsonb_build_object('import',null,'rows','[]'::jsonb); end if;
  return jsonb_build_object(
    'import', to_jsonb(v_import) - 'source_sha256',
    'rows', coalesce((select jsonb_agg(to_jsonb(r) - 'raw_data' - 'import_id' order by source_row)
      from public.admin_client_packages r where import_id = v_import.id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.admin_client_directory() from public, anon, authenticated;
grant execute on function public.admin_client_directory() to authenticated;
