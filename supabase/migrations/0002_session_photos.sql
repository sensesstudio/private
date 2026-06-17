-- Senses Studio — progress-log photos (optional, max 3 per session, 5MB each).
-- Photos live in Supabase Storage (object storage); this table only holds
-- lightweight references, so the relational DB stays small and fast.

create table session_photo (
  id           uuid primary key default gen_random_uuid(),
  note_id      uuid not null references session_notes(id) on delete cascade,
  booking_id   uuid references bookings(id) on delete set null,
  client_id    uuid not null references profiles(id) on delete cascade,
  teacher_id   uuid not null references profiles(id),
  storage_path text not null,                       -- path within the private bucket
  content_type text not null default 'image/jpeg',
  size_bytes   integer not null check (size_bytes > 0 and size_bytes <= 5242880), -- 5MB hard cap
  created_at   timestamptz not null default now()
);
create index session_photo_note_idx   on session_photo (note_id);
create index session_photo_client_idx on session_photo (client_id);

-- Enforce "max 3 photos per session note" at the database level (defence in depth;
-- the client also limits to 3 before upload).
create or replace function enforce_max_photos()
returns trigger language plpgsql as $$
begin
  if (select count(*) from session_photo where note_id = new.note_id) >= 3 then
    raise exception 'max_3_photos_per_session';
  end if;
  return new;
end;
$$;
create trigger session_photo_max
  before insert on session_photo
  for each row execute function enforce_max_photos();

-- Row-Level Security: student sees photos from their own sessions, the authoring
-- teacher sees theirs, admin sees all.
alter table session_photo enable row level security;

create policy session_photo_read on session_photo for select
  using (client_id = auth.uid() or teacher_id = auth.uid() or is_admin());

create policy session_photo_write on session_photo for insert
  with check (teacher_id = auth.uid() or is_admin());

create policy session_photo_delete on session_photo for delete
  using (teacher_id = auth.uid() or client_id = auth.uid() or is_admin());

-- Realtime: let the student & admin portals receive new photos instantly.
-- (Supabase ships the supabase_realtime publication; skip cleanly if absent, e.g. local tests.)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table session_photo';
  end if;
end $$;

-- ─── Supabase Storage: private bucket for progress photos ────────────────────
-- Server-side 5MB limit + image-only MIME allowlist (belt-and-braces with the
-- client-side compress/convert step). Runs on Supabase, where the storage schema
-- exists; harmless to skip elsewhere.
do $$ begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('session-photos', 'session-photos', false, 5242880,
            array['image/jpeg','image/png','image/webp'])
    on conflict (id) do update
      set file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;

    -- Paths are namespaced by client id: "<client_id>/<note_id>/<file>".
    -- Students read their own folder; teachers/admins upload & manage.
    execute $p$
      create policy "session photos read own" on storage.objects for select
        using (bucket_id = 'session-photos'
               and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin()
                    or exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')));
    $p$;
    execute $p$
      create policy "session photos write" on storage.objects for insert
        with check (bucket_id = 'session-photos'
                    and (public.is_admin()
                         or exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')));
    $p$;
    execute $p$
      create policy "session photos delete" on storage.objects for delete
        using (bucket_id = 'session-photos'
               and (split_part(name, '/', 1) = auth.uid()::text or public.is_admin()
                    or exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')));
    $p$;
  end if;
end $$;
