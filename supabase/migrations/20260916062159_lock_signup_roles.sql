-- Public sign-up metadata is user-controlled. New accounts must never select
-- admin/teacher privileges. Trusted operations can provision staff separately.
begin;
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  insert into public.profiles (id, role, full_name, email)
  values (new.id, 'client',
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1), 'Client'), new.email)
  on conflict (id) do nothing;
  insert into public.client_profiles (id)
  select new.id where exists (select 1 from public.profiles where id = new.id and role = 'client')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
-- The production trigger already uses this function. Also make fresh installs
-- reproducible: earlier migrations did not include the original Auth trigger.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
commit;
