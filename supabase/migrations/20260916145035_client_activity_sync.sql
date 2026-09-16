-- Both portals read the same records through the explicit CRM/account mapping.
-- Keep histories out of the directory response and page them on demand.
create index if not exists session_notes_client_created_idx on public.session_notes(client_id,created_at desc,id);
create index if not exists payments_client_created_idx on public.payments(client_id,created_at desc,id);

create function private.client_activity(p_client_id text,p_kind text,p_offset integer,p_limit integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_client text; v_user uuid; v_items jsonb; v_total bigint;
begin
 if p_client_id is null then
   v_client:=private.active_studio_client_id();
 else
   if not public.is_admin() then raise exception 'admin_access_required' using errcode='42501'; end if;
   v_client:=p_client_id;
   if not exists(select 1 from public.studio_clients where id=v_client) then raise exception 'client_not_found'; end if;
 end if;
 if p_kind is null or p_kind not in ('progress','payments','packages')
   or p_offset is null or p_offset<0 or p_limit is null or p_limit<1 or p_limit>50 then
   raise exception 'invalid_activity_request';
 end if;
 select user_id into v_user from public.studio_client_accounts where client_id=v_client;
 if p_kind='progress' then
   select count(*) into v_total from public.session_notes n where n.client_id=v_user;
   select coalesce(jsonb_agg(item order by created_at desc,id desc),'[]'::jsonb) into v_items from (
     select n.id,n.created_at,jsonb_build_object('id',n.id,'created_at',n.created_at,'focus',n.focus,'note',n.note,
       'teacher_name',t.full_name,'session_at',b.starts_at,'studio_name',s.name,
       'photos',coalesce((select jsonb_agg(jsonb_build_object('id',ph.id,'storage_path',ph.storage_path) order by ph.created_at,ph.id)
         from public.session_photo ph where ph.note_id=n.id and ph.client_id=n.client_id
         and ph.teacher_id=n.teacher_id and (ph.booking_id is null or ph.booking_id=n.booking_id)
         and split_part(ph.storage_path,'/',1)=n.client_id::text
         and split_part(ph.storage_path,'/',2)=n.id::text),'[]'::jsonb)) item
     from public.session_notes n left join public.profiles t on t.id=n.teacher_id
     left join public.bookings b on b.id=n.booking_id and b.client_id=n.client_id
     left join public.studios s on s.id=b.studio_id
     where n.client_id=v_user order by n.created_at desc,n.id desc limit p_limit offset p_offset
   ) records;
 elsif p_kind='payments' then
   select count(*) into v_total from public.payments p
     left join public.package_checkout_orders o on o.payment_id=p.id
     where p.client_id=v_user and (o.id is null or (o.client_id=v_user and o.livemode));
   select coalesce(jsonb_agg(item order by created_at desc,id desc),'[]'::jsonb) into v_items from (
     select p.id,p.created_at,jsonb_build_object('id',p.id,'created_at',p.created_at,'amount_hkd',p.amount_hkd,
       'method',p.method,'status',p.status,'package_name',coalesce(o.package_name,pk.name),'format',o.format) item
     from public.payments p left join public.package_checkout_orders o on o.payment_id=p.id
     left join public.packages pk on pk.id=p.package_id
     where p.client_id=v_user and (o.id is null or (o.client_id=v_user and o.livemode))
     order by p.created_at desc,p.id desc limit p_limit offset p_offset
   ) records;
 else
   select count(*) into v_total from public.package_checkout_orders where client_id=v_user and status='paid' and livemode;
   select coalesce(jsonb_agg(item order by paid_at desc,id desc),'[]'::jsonb) into v_items from (
     select o.id,o.paid_at,jsonb_build_object('id',o.id,'package_name',o.package_name,'format',o.format,
       'credits',o.credits,'price_hkd',o.price_hkd,'validity_months',o.validity_months,'paid_at',o.paid_at,
       'payment_status',p.status) item
     from public.package_checkout_orders o left join public.payments p on p.id=o.payment_id and p.client_id=o.client_id
     where o.client_id=v_user and o.status='paid' and o.livemode
     order by o.paid_at desc,o.id desc limit p_limit offset p_offset
   ) records;
 end if;
 return jsonb_build_object('linked',v_user is not null,'items',v_items,'total',v_total,'as_of',now());
end $$;
revoke all on function private.client_activity(text,text,integer,integer) from public,anon,authenticated;
grant execute on function private.client_activity(text,text,integer,integer) to authenticated;
create function public.my_client_activity(p_kind text,p_offset integer default 0,p_limit integer default 20)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.client_activity(null,p_kind,p_offset,p_limit);
$$;
create function public.admin_client_activity(p_client_id text,p_kind text,p_offset integer default 0,p_limit integer default 20)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.client_activity(p_client_id,p_kind,p_offset,p_limit);
$$;
revoke all on function public.my_client_activity(text,integer,integer),public.admin_client_activity(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.my_client_activity(text,integer,integer),public.admin_client_activity(text,text,integer,integer) to authenticated;

-- Private progress photos require a matching note and a current client session.
-- Teachers may read only their own notes, rather than every client's folder.
create function private.can_read_session_photo(p_path text) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_role public.user_role;
begin
 select role into v_role from public.profiles where id=auth.uid();
 if v_role='client' then
   perform private.active_studio_client_id();
 elsif v_role is null or v_role not in ('admin','teacher') then return false;
 end if;
 return exists(select 1 from public.session_photo ph join public.session_notes n on n.id=ph.note_id
   where ph.storage_path=p_path and ph.client_id=n.client_id and ph.teacher_id=n.teacher_id
   and (ph.booking_id is null or ph.booking_id=n.booking_id)
   and split_part(p_path,'/',1)=n.client_id::text and split_part(p_path,'/',2)=n.id::text
   and (v_role='admin' or (v_role='client' and n.client_id=auth.uid()) or (v_role='teacher' and n.teacher_id=auth.uid())));
exception when insufficient_privilege then return false;
end $$;
revoke all on function private.can_read_session_photo(text) from public,anon,authenticated;
grant execute on function private.can_read_session_photo(text) to authenticated;
do $$ begin
 if exists(select 1 from information_schema.tables where table_schema='storage' and table_name='objects') then
   drop policy if exists "session photos read own" on storage.objects;
   create policy "session photos read own" on storage.objects for select to authenticated
     using(bucket_id='session-photos' and private.can_read_session_photo(name));
 end if;
end $$;
