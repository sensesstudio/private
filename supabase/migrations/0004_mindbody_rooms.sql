-- Mindbody room-availability integration (Phase 1: 3 client-bookable rooms).
-- room_busy mirrors when each room is occupied in Mindbody — times only,
-- never client data. Written exclusively by the mindbody-sync edge function
-- (service role); readable by everyone (a busy block is not sensitive).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Which Mindbody room (resource) backs which app studio. resource_id is
-- resolved automatically by mindbody-sync from match_pattern, so a rename
-- in Mindbody heals itself on the next run.
create table if not exists mindbody_rooms (
  studio_id     text primary key references studios(id),
  match_pattern text not null,
  resource_id   integer,
  resource_name text,
  active        boolean not null default true,
  updated_at    timestamptz not null default now()
);

insert into mindbody_rooms (studio_id, match_pattern) values
  ('kt',      'KT - 30/F Private Pilates'),
  ('cwb',     'CWB - Private Pilates'),
  ('central', 'Central - Private Pilates')
on conflict (studio_id) do update set match_pattern = excluded.match_pattern;

create table if not exists room_busy (
  id           bigint generated always as identity primary key,
  studio_id    text not null references studios(id),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  source       text not null default 'mindbody',
  mindbody_ref text,
  synced_at    timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists room_busy_studio_start_idx on room_busy (studio_id, starts_at);

create table if not exists sync_state (
  id          text primary key,
  last_run_at timestamptz,
  last_ok_at  timestamptz,
  detail      jsonb
);

alter table mindbody_rooms enable row level security;
alter table room_busy      enable row level security;
alter table sync_state     enable row level security;

-- Read-only to the world; no insert/update policies means only the
-- service role (which bypasses RLS) can write.
drop policy if exists mindbody_rooms_read on mindbody_rooms;
create policy mindbody_rooms_read on mindbody_rooms for select using (true);
drop policy if exists room_busy_read on room_busy;
create policy room_busy_read on room_busy for select using (true);
drop policy if exists sync_state_read on sync_state;
create policy sync_state_read on sync_state for select using (true);

-- Atomic swap of the mindbody-sourced busy window (delete + insert in one tx).
create or replace function replace_room_busy(p_rows jsonb, p_from timestamptz, p_until timestamptz)
returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  delete from room_busy
    where source = 'mindbody' and starts_at >= p_from and starts_at < p_until;
  insert into room_busy (studio_id, starts_at, ends_at, source, mindbody_ref)
  select r->>'studio_id', (r->>'starts_at')::timestamptz, (r->>'ends_at')::timestamptz,
         'mindbody', r->>'ref'
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) r;
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function replace_room_busy(jsonb, timestamptz, timestamptz) from public;
revoke all on function replace_room_busy(jsonb, timestamptz, timestamptz) from anon;
revoke all on function replace_room_busy(jsonb, timestamptz, timestamptz) from authenticated;

-- Realtime: the client app can subscribe to busy-block changes.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      execute 'alter publication supabase_realtime add table room_busy';
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- NOTE: the pg_cron job that calls mindbody-sync every 5 minutes is
-- (re)scheduled by CI (.github/workflows/supabase.yml), because the job
-- carries the rotating x-sync-key header which must never live in this
-- public repository.
