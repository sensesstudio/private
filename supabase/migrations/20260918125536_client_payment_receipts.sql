-- Keep legacy orders untouched so an uncertain Stripe request can retry with
-- identical parameters. New orders snapshot the account email for receipts.
alter table public.package_checkout_orders add column receipt_email text;

create or replace function public.prepare_package_checkout(p_client_id uuid,p_package_id text,p_origin text,p_livemode boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare p public.packages; o public.package_checkout_orders;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_client_id::text,0));
 if not exists(select 1 from public.profiles where id=p_client_id and role='client') then
   raise exception 'client_account_required' using errcode='42501'; end if;
 select * into p from public.packages where id=p_package_id and active;
 if p.id is null then raise exception 'package_unavailable'; end if;
 if p.is_trial and exists(select 1 from public.package_checkout_orders where client_id=p_client_id
   and format=p.format and is_trial and status='paid' and livemode=p_livemode) then
   raise exception 'trial_already_purchased'; end if;
 select * into o from public.package_checkout_orders where client_id=p_client_id and package_id=p.id and status='pending';
 if o.id is not null then return to_jsonb(o); end if;
 insert into public.package_checkout_orders(client_id,package_id,package_name,format,is_trial,credits,price_hkd,validity_months,return_origin,livemode,receipt_email)
 values(p_client_id,p.id,p.name,p.format,p.is_trial,p.credits,p.price_hkd,p.validity_months,p_origin,p_livemode,(select nullif(trim(email),'') from auth.users where id=p_client_id)) returning * into o;
 return to_jsonb(o);
end;
$$;
revoke all on function public.prepare_package_checkout(uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.prepare_package_checkout(uuid,text,text,boolean) to service_role;

