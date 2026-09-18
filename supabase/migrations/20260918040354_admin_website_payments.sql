-- Read-only reporting of this website's live Stripe checkout records.
begin;
create index package_checkout_live_created_idx on public.package_checkout_orders(created_at desc,id desc) where livemode;
create function private.admin_website_payments(p_query text default '',p_status text default 'all',p_offset integer default 0,p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_result jsonb;
begin
 perform private.require_prospect_admin();
 if p_query is null or length(p_query)>200 or p_status is null or p_status not in ('all','paid','pending','failed','expired','refunded')
 or p_offset is null or p_offset<0 or p_limit is null or p_limit<1 or p_limit>100 then raise exception 'invalid_payment_query'; end if;
 with website_orders as (
   select o.id,o.created_at,o.paid_at,pr.full_name as client_name,pr.email as client_email,
     o.package_name,o.format,o.credits,o.price_hkd,coalesce(p.status::text,o.status) as status,o.stripe_session_id
   from public.package_checkout_orders o join public.profiles pr on pr.id=o.client_id
   left join public.payments p on p.id=o.payment_id and p.client_id=o.client_id
   where o.livemode
 ), filtered as (
   select * from website_orders w where (p_status='all' or w.status=p_status)
   and (trim(p_query)='' or strpos(lower(concat_ws(' ',w.client_name,w.client_email,w.package_name,w.stripe_session_id,w.id)),lower(trim(p_query)))>0)
 ), page as (select * from filtered order by created_at desc,id desc limit p_limit offset p_offset)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id desc) from page),'[]'::jsonb),
   'total',(select count(*) from filtered),'as_of',now()) into v_result;
 return v_result;
end $$;
create function public.admin_website_payments(p_query text default '',p_status text default 'all',p_offset integer default 0,p_limit integer default 25)
returns jsonb language sql stable security invoker set search_path='' as $$select private.admin_website_payments(p_query,p_status,p_offset,p_limit)$$;
revoke all on function private.admin_website_payments(text,text,integer,integer),public.admin_website_payments(text,text,integer,integer) from public,anon,authenticated;
grant execute on function private.admin_website_payments(text,text,integer,integer),public.admin_website_payments(text,text,integer,integer) to authenticated;
commit;
