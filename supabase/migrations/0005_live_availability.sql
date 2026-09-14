-- Phase 2a: live read path + authenticated teacher availability.
-- Apply through the existing main-branch CI only, after branch acceptance.
begin;

alter table public.slots add column ends_at timestamptz;
update public.slots set ends_at = starts_at + interval '1 hour';
alter table public.slots alter column ends_at set not null;
alter table public.slots add constraint slots_positive_duration check (ends_at > starts_at);
-- Keep compatibility for trusted writers using the original 60-minute slot schema.
create function public.default_slot_end() returns trigger language plpgsql
set search_path = public, pg_temp as $$
begin
  if new.ends_at is null then new.ends_at := new.starts_at + interval '1 hour'; end if;
  return new;
end $$;
create trigger slots_default_end before insert on public.slots
for each row execute function public.default_slot_end();

alter table public.teacher_profiles add column studio_ids text[] not null default '{}';
update public.teacher_profiles set studio_ids = array[home_studio_id] where home_studio_id is not null;

-- The original is_admin recursively queried the profiles policy. Resolve roles
-- with a fixed-path definer, while preventing self-service role/activation changes.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke update on public.profiles from anon, authenticated;
grant update (full_name, email) on public.profiles to authenticated;
revoke update on public.teacher_profiles from anon, authenticated;
grant update (headline, specs, langs, certs, bio, style) on public.teacher_profiles to authenticated;

-- Public responses contain teacher display information and occupied times only.
-- No client IDs, contact details, health data, held_by or Mindbody references.
-- One SQL statement gives a consistent snapshot across the atomic room sync.
create function public.availability_snapshot() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
with bounds as (
  select (date_trunc('day', now() at time zone 'Asia/Hong_Kong') at time zone 'Asia/Hong_Kong') as lo
), availability_window as (
  select lo, lo + interval '14 days' as hi from bounds
)
select jsonb_build_object(
  'studios', (select coalesce(jsonb_agg(s order by s.id), '[]'::jsonb) from public.studios s where s.id in ('kt', 'cwb', 'central')),
  'teachers', (select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'full_name', p.full_name, 'headline', t.headline, 'specs', t.specs,
    'rate_hkd', t.rate_hkd, 'home_studio_id', t.home_studio_id, 'studio_ids', t.studio_ids,
    'experience_years', t.experience_years, 'langs', t.langs, 'certs', t.certs, 'style', t.style
  ) order by p.full_name), '[]'::jsonb) from public.teacher_profiles t join public.profiles p on p.id = t.id
    where t.active and p.role = 'teacher'),
  'slots', (select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'teacher_id', s.teacher_id, 'studio_id', s.studio_id,
    'starts_at', s.starts_at, 'ends_at', s.ends_at, 'status', s.status, 'hold_expires_at', s.hold_expires_at
  ) order by s.starts_at, s.id), '[]'::jsonb) from public.slots s, availability_window w
    where s.starts_at < w.hi and s.ends_at > w.lo and s.studio_id in ('kt', 'cwb', 'central')),
  'room_busy', (select coalesce(jsonb_agg(jsonb_build_object(
    'studio_id', b.studio_id, 'starts_at', b.starts_at, 'ends_at', b.ends_at
  )), '[]'::jsonb) from public.room_busy b, availability_window w where b.starts_at < w.hi and b.ends_at > w.lo),
  'reservations', (select coalesce(jsonb_agg(jsonb_build_object(
    'teacher_id', b.teacher_id, 'studio_id', b.studio_id, 'starts_at', b.starts_at,
    'ends_at', coalesce(s.ends_at, b.starts_at + interval '1 hour')
  )), '[]'::jsonb) from public.bookings b left join public.slots s on s.id = b.slot_id, availability_window w
    where b.status in ('confirmed', 'completed') and b.starts_at < w.hi
      and coalesce(s.ends_at, b.starts_at + interval '1 hour') > w.lo),
  'rooms', (select coalesce(jsonb_agg(jsonb_build_object(
    'studio_id', r.studio_id, 'resource_id', r.resource_id, 'active', r.active
  )), '[]'::jsonb) from public.mindbody_rooms r),
  'sync', (select jsonb_build_object('last_ok_at', st.last_ok_at,
    'from', st.detail->'window'->>'from', 'until', st.detail->'window'->>'until')
    from public.sync_state st where st.id = 'mindbody')
);
$$;
revoke all on function public.availability_snapshot() from public;
grant execute on function public.availability_snapshot() to anon, authenticated, service_role;

-- Teacher identity comes solely from auth.uid(); clients cannot choose a teacher.
-- Serialize all edits for one teacher to prevent overlapping cross-studio opens.
create function public.set_teacher_availability(p_studio text, p_starts_at timestamptz, p_open boolean)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare
  who uuid := auth.uid();
  teacher public.teacher_profiles;
  existing public.slots;
  created_slot_id uuid;
  window_start timestamptz := date_trunc('day', now() at time zone 'Asia/Hong_Kong') at time zone 'Asia/Hong_Kong';
begin
  if who is null then raise exception 'authentication_required'; end if;
  select t.* into teacher from public.teacher_profiles t join public.profiles p on p.id = t.id
    where t.id = who and t.active and p.role = 'teacher' for update of t;
  if not found then raise exception 'teacher_access_required'; end if;
  if p_studio is null or p_studio not in ('kt', 'cwb', 'central')
    or not (p_studio = any(teacher.studio_ids) or p_studio is not distinct from teacher.home_studio_id)
    or not exists (select 1 from public.mindbody_rooms where studio_id = p_studio and active and resource_id is not null)
    then raise exception 'studio_not_assigned'; end if;
  if p_open is null or p_starts_at is null or p_starts_at <= now()
    or p_starts_at < window_start or p_starts_at + interval '1 hour' > window_start + interval '14 days'
    then raise exception 'outside_availability_window'; end if;
  if p_starts_at <> date_trunc('hour', p_starts_at)
    or extract(hour from p_starts_at at time zone 'Asia/Hong_Kong') not between 7 and 21
    then raise exception 'invalid_session_time'; end if;

  select * into existing from public.slots where teacher_id = who and starts_at = p_starts_at for update;
  if found then
    if existing.studio_id <> p_studio then raise exception 'teacher_time_conflict'; end if;
    if existing.status = 'booked' or (existing.status = 'held' and (existing.hold_expires_at is null or existing.hold_expires_at > now()))
      then raise exception 'slot_reserved'; end if;
    if exists (select 1 from public.bookings where slot_id = existing.id)
      then raise exception 'slot_has_booking_history'; end if;
    if p_open then return existing.id; end if;
    delete from public.slots where id = existing.id;
    return existing.id;
  end if;
  if not p_open then return null; end if;
  if exists (select 1 from public.slots where teacher_id = who
      and starts_at < p_starts_at + interval '1 hour' and ends_at > p_starts_at)
    or exists (select 1 from public.bookings where teacher_id = who and status in ('confirmed', 'completed')
      and starts_at < p_starts_at + interval '1 hour' and starts_at + interval '1 hour' > p_starts_at)
    then raise exception 'teacher_time_conflict'; end if;
  insert into public.slots (teacher_id, studio_id, starts_at, ends_at)
    values (who, p_studio, p_starts_at, p_starts_at + interval '1 hour') returning id into created_slot_id;
  return created_slot_id;
end $$;
revoke all on function public.set_teacher_availability(text, timestamptz, boolean) from public, anon;
grant execute on function public.set_teacher_availability(text, timestamptz, boolean) to authenticated, service_role;

-- Direct client-side writes cannot bypass the guarded RPC.
revoke insert, update, delete on public.slots from anon, authenticated;

do $$ declare tbl text; begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach tbl in array array['slots', 'sync_state', 'mindbody_rooms', 'teacher_profiles', 'studios'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = tbl) then
        execute format('alter publication supabase_realtime add table public.%I', tbl);
      end if;
    end loop;
  end if;
end $$;
commit;
