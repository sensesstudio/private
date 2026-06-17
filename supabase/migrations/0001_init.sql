-- Senses Studio — initial schema (Supabase / PostgreSQL)
-- Slice 1 of the backend: relational core with integrity guarantees.
-- Apply in the Supabase SQL editor or via `supabase db push`.

-- Supabase provides pgcrypto (gen_random_uuid) and the auth schema.
create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────────────────────
create type user_role      as enum ('client', 'teacher', 'admin');
create type slot_status     as enum ('open', 'held', 'booked');
create type booking_status  as enum ('confirmed', 'completed', 'cancelled', 'no_show');
create type ledger_reason   as enum ('purchase', 'booking', 'refund', 'expiry', 'adjustment');
create type payment_status  as enum ('paid', 'refunded', 'failed', 'pending');

-- ─── Identity ───────────────────────────────────────────────────────────────
-- One row per auth user; role-specific data lives in teacher_profiles / client_profiles.
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'client',
  full_name   text not null,
  email       text,
  created_at  timestamptz not null default now()
);

create table studios (
  id      text primary key,
  name    text not null,
  blurb   text,
  note    text,
  address text,
  sea     boolean not null default false
);

create table teacher_profiles (
  id               uuid primary key references profiles(id) on delete cascade,
  headline         text,
  specs            text[] not null default '{}',
  rate_hkd         integer not null default 0,
  home_studio_id   text references studios(id),
  experience_years integer,
  langs            text[] not null default '{}',
  certs            text[] not null default '{}',
  bio              text,
  style            text,
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Client intake + health declaration + waiver (the "About me" record).
create table client_profiles (
  id                  uuid primary key references profiles(id) on delete cascade,
  goals               text[] not null default '{}',
  age_band            text,
  level               text,
  injuries            text[] not null default '{}',
  schedule_prefs      text[] not null default '{}',
  preferred_studio_ids text[] not null default '{}',  -- one or more studios; empty = no preference
  languages           text[] not null default '{}',
  notes               text,
  -- health declaration
  pregnant            boolean,
  edd                 date,   -- estimated due date (trimester is derived, never stored)
  recent_surgery      boolean,
  doctor_cleared      boolean,
  -- liability waiver
  waiver_signed_at    timestamptz,
  waiver_signed_name  text,
  waiver_version      text,
  updated_at          timestamptz not null default now()
);

-- ─── Catalogue & money ──────────────────────────────────────────────────────
create table packages (
  id              text primary key,
  name            text not null,
  credits         integer not null,
  price_hkd       integer not null,
  validity_months integer,
  tag             text
);

create table payments (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references profiles(id) on delete cascade,
  package_id  text references packages(id),
  amount_hkd  integer not null,
  method      text,
  status      payment_status not null default 'paid',
  stripe_ref  text,
  created_at  timestamptz not null default now()
);

-- ─── Availability ───────────────────────────────────────────────────────────
create table slots (
  id              uuid primary key default gen_random_uuid(),
  teacher_id      uuid not null references profiles(id) on delete cascade,
  studio_id       text references studios(id),
  starts_at       timestamptz not null,
  status          slot_status not null default 'open',
  hold_expires_at timestamptz,
  held_by         uuid references profiles(id),
  unique (teacher_id, starts_at)
);
create index slots_teacher_start_idx on slots (teacher_id, starts_at);
create index slots_open_idx on slots (starts_at) where status = 'open';

-- ─── Bookings ───────────────────────────────────────────────────────────────
create table bookings (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references profiles(id) on delete cascade,
  teacher_id  uuid not null references profiles(id),
  studio_id   text references studios(id),
  slot_id     uuid unique references slots(id),
  starts_at   timestamptz not null,
  type        text not null default 'Private',
  status      booking_status not null default 'confirmed',
  rate_hkd    integer,
  created_at  timestamptz not null default now()
);

-- Append-only credit ledger — the source of truth for a client's balance.
-- Never UPDATE a balance; only INSERT deltas. Balance = sum(delta).
create table credit_ledger (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references profiles(id) on delete cascade,
  delta       integer not null,
  reason      ledger_reason not null,
  payment_id  uuid references payments(id),
  booking_id  uuid references bookings(id),
  created_at  timestamptz not null default now()
);
create index credit_ledger_client_idx on credit_ledger (client_id);

create view credit_balances as
  select client_id, coalesce(sum(delta), 0)::int as balance
  from credit_ledger
  group by client_id;

-- ─── Sessions, reviews, applications ─────────────────────────────────────────
create table session_notes (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id) on delete set null,
  client_id   uuid not null references profiles(id) on delete cascade,
  teacher_id  uuid not null references profiles(id),
  focus       text,
  note        text,
  created_at  timestamptz not null default now()
);

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid unique references bookings(id) on delete set null,
  client_id   uuid references profiles(id),
  teacher_id  uuid references profiles(id),
  stars       integer not null check (stars between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

create table teacher_applications (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  headline         text,
  experience_years integer,
  studio_id        text references studios(id),
  certs            text[] not null default '{}',
  status           text not null default 'pending',
  applied_at       timestamptz not null default now()
);

-- ─── Transactional booking (integrity-critical) ──────────────────────────────
-- Atomically: lock the slot, verify a credit is available, book the slot,
-- create the booking, and debit exactly one credit — all or nothing.
create or replace function book_with_credit(p_client uuid, p_slot uuid)
returns bookings
language plpgsql
as $$
declare
  s   slots;
  b   bookings;
  bal integer;
begin
  select * into s from slots where id = p_slot for update;       -- row lock
  if not found then raise exception 'slot_not_found'; end if;
  if s.status = 'booked' then raise exception 'slot_already_booked'; end if;

  select coalesce(sum(delta), 0) into bal from credit_ledger where client_id = p_client;
  if bal < 1 then raise exception 'insufficient_credits'; end if;

  update slots set status = 'booked', hold_expires_at = null, held_by = null where id = p_slot;

  insert into bookings (client_id, teacher_id, studio_id, slot_id, starts_at, rate_hkd, status)
  values (p_client, s.teacher_id, s.studio_id, s.id, s.starts_at,
          (select rate_hkd from teacher_profiles where id = s.teacher_id), 'confirmed')
  returning * into b;

  insert into credit_ledger (client_id, delta, reason, booking_id)
  values (p_client, -1, 'booking', b.id);

  return b;
end;
$$;

-- ─── Row-Level Security ──────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table profiles         enable row level security;
alter table client_profiles  enable row level security;
alter table teacher_profiles enable row level security;
alter table studios          enable row level security;
alter table packages         enable row level security;
alter table slots            enable row level security;
alter table bookings         enable row level security;
alter table credit_ledger    enable row level security;
alter table payments         enable row level security;
alter table session_notes    enable row level security;
alter table reviews          enable row level security;
alter table teacher_applications enable row level security;

-- Reference data is world-readable to authenticated users.
create policy studios_read   on studios   for select using (true);
create policy packages_read  on packages  for select using (true);
create policy teachers_read  on teacher_profiles for select using (true);
create policy slots_read     on slots     for select using (true);

-- Profiles: read your own (or admin); manage your own.
create policy profiles_self_read  on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_self_write on profiles for update using (id = auth.uid());

-- Client record: the client owns it; admin can read all.
create policy client_self on client_profiles for all
  using (id = auth.uid() or is_admin()) with check (id = auth.uid() or is_admin());

-- Teacher record: the teacher owns it; admin can write.
create policy teacher_self on teacher_profiles for update using (id = auth.uid() or is_admin());

-- Bookings: client sees own; teacher sees theirs; admin sees all.
create policy bookings_read on bookings for select
  using (client_id = auth.uid() or teacher_id = auth.uid() or is_admin());

-- Credit ledger & payments: the client owns them; admin can read.
create policy ledger_read   on credit_ledger for select using (client_id = auth.uid() or is_admin());
create policy payments_read on payments      for select using (client_id = auth.uid() or is_admin());

-- Session notes: client + the authoring teacher + admin.
create policy notes_read on session_notes for select
  using (client_id = auth.uid() or teacher_id = auth.uid() or is_admin());

-- Applications: admin only.
create policy applications_admin on teacher_applications for all using (is_admin()) with check (is_admin());
