-- availability_snapshot() reads a 14-day window of slots and confirmed bookings
-- on every call. The existing slots indexes lead on teacher_id or cover only
-- status = 'open'; bookings has no index on starts_at at all, so both scans
-- were sequential.
create index if not exists slots_start_idx on public.slots (starts_at);
create index if not exists bookings_active_start_idx on public.bookings (starts_at)
  where status in ('confirmed', 'completed');
