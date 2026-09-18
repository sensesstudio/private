alter table private.studio_booking_in_progress
 add column last_staff_name text,
 add column last_staff_at timestamptz,
 add column last_staff_kind text check(last_staff_kind in ('message','note')),
 add column last_staff_status text check(last_staff_status in ('confirmed','none','unavailable'));
create or replace function private.finish_booking_progress_sync(p_run_id uuid,p_rows jsonb,p_error text default null) returns integer
language plpgsql security definer set search_path='' as $$
declare c private.sleekflow_booking_sync; v_count integer;
begin
 select * into c from private.sleekflow_booking_sync where id for update;
 if p_run_id is null or c.run_id is distinct from p_run_id or c.locked_until<now() then raise exception 'stale_sync'; end if;
 if p_error is not null then
  update private.sleekflow_booking_sync set error_code=case when p_error in ('invalid_key','rate_limited','label_not_found','source_changed','source_format','too_many_contacts') then p_error else 'sync_unavailable' end,run_id=null,locked_until=null where id;
  return 0;
 end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>10000 then raise exception 'invalid_sync_rows'; end if;
 v_count:=jsonb_array_length(p_rows);
 if exists(select 1 from jsonb_array_elements(p_rows) x where x->>'id' is null or x->>'client_name' is null)
 or (select count(distinct x->>'id') from jsonb_array_elements(p_rows) x)<>v_count then raise exception 'invalid_sync_rows'; end if;
 insert into private.studio_booking_in_progress(id,client_name,mobile,last_message,message_at,channel,conversation_id,last_contact_at,last_staff_name,last_staff_at,last_staff_kind,last_staff_status)
 select x.id,left(x.client_name,300),left(x.mobile,80),left(x.last_message,10000),x.message_at,left(x.channel,80),left(x.conversation_id,200),x.last_contact_at,left(x.last_staff_name,300),x.last_staff_at,x.last_staff_kind,x.last_staff_status
 from jsonb_to_recordset(p_rows) as x(id text,client_name text,mobile text,last_message text,message_at timestamptz,channel text,conversation_id text,last_contact_at timestamptz,last_staff_name text,last_staff_at timestamptz,last_staff_kind text,last_staff_status text)
 on conflict(id) do update set client_name=excluded.client_name,mobile=excluded.mobile,last_message=excluded.last_message,
  message_at=excluded.message_at,channel=excluded.channel,conversation_id=excluded.conversation_id,last_contact_at=excluded.last_contact_at,last_staff_name=excluded.last_staff_name,last_staff_at=excluded.last_staff_at,last_staff_kind=excluded.last_staff_kind,last_staff_status=excluded.last_staff_status,source_present=true,synced_at=now();
 -- Only a complete, successful snapshot may archive contacts that lost the label.
 update private.studio_booking_in_progress p set source_present=false,synced_at=now()
 where p.source_present and not exists(select 1 from jsonb_array_elements(p_rows) x where x->>'id'=p.id);
 update private.sleekflow_booking_sync set last_ok_at=now(),error_code=null,synced_count=v_count,run_id=null,locked_until=null where id;
 return v_count;
end $$;
