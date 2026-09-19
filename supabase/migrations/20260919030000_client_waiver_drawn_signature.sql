-- Clients now sign the waiver by hand as well as by typed name. The drawing is
-- a PNG kept beside the immutable signature record in its own table: only the
-- signing RPC writes it, and it is read on demand by the client who signed and
-- by admins, so the client portal profile and the admin directory stay small.
create table public.client_waiver_signature_images (
 signature_id uuid primary key references public.client_waiver_signatures(id) on delete cascade,
 user_id uuid not null references public.profiles(id),
 image text not null check(image like 'data:image/png;base64,%' and length(image) between 100 and 200000),
 created_at timestamptz not null default clock_timestamp()
);
alter table public.client_waiver_signature_images enable row level security;
create policy waiver_signature_image_own_read on public.client_waiver_signature_images for select to authenticated using(user_id=auth.uid());
create policy waiver_signature_image_admin_read on public.client_waiver_signature_images for select to authenticated using((select public.is_admin()));
revoke all on public.client_waiver_signature_images from public,anon,authenticated;
grant select on public.client_waiver_signature_images to authenticated;

drop function public.sign_my_client_waiver(text,text,text,boolean);
drop function private.sign_client_waiver(text,text,text,boolean);

create function private.sign_client_waiver(p_version text,p_name text,p_capacity text,p_agreed boolean,p_signature text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id text:=private.active_studio_client_id(); d public.client_waiver_documents; s public.client_waiver_signatures; v_png bytea;
begin
 if p_agreed is distinct from true or length(btrim(coalesce(p_name,''))) not between 1 and 200
  or p_capacity is null or p_capacity not in ('self','parent_guardian') then raise exception 'waiver_consent_required'; end if;
 -- The drawing must be a real PNG data URL: prefix, decodable base64 and the PNG file header.
 if p_signature is null or p_signature not like 'data:image/png;base64,%' or length(p_signature) not between 100 and 200000 then raise exception 'waiver_signature_required'; end if;
 begin v_png:=decode(substr(p_signature,23),'base64'); exception when others then raise exception 'waiver_signature_required'; end;
 if substr(v_png,1,8) is distinct from '\x89504e470d0a1a0a'::bytea then raise exception 'waiver_signature_required'; end if;
 select * into d from public.client_waiver_documents where version=p_version and active;
 if d.version is null then raise exception 'waiver_changed_reload'; end if;
 perform pg_advisory_xact_lock(hashtextextended('waiver:'||auth.uid()::text,0));
 insert into public.client_waiver_signatures(user_id,client_id,version,signed_name,participant_name,signer_capacity,document_sha256)
  select auth.uid(),v_id,d.version,btrim(p_name),c.client_name,p_capacity,d.sha256 from public.studio_clients c where c.id=v_id
  on conflict(user_id,version) do nothing;
 select * into s from public.client_waiver_signatures where user_id=auth.uid() and version=d.version;
 -- A retry returns the original signature, drawing included; nothing is replaced.
 insert into public.client_waiver_signature_images(signature_id,user_id,image) values(s.id,auth.uid(),p_signature) on conflict(signature_id) do nothing;
 insert into public.client_profiles(id) values(auth.uid()) on conflict(id) do nothing;
 update public.client_profiles set waiver_signed_at=s.signed_at,waiver_signed_name=s.signed_name,waiver_version=s.version,
  updated_at=clock_timestamp(),profile_version=profile_version+1 where id=auth.uid() and waiver_version is distinct from s.version;
 return private.client_portal_profile();
end; $$;
revoke all on function private.sign_client_waiver(text,text,text,boolean,text) from public,anon,authenticated;
grant execute on function private.sign_client_waiver(text,text,text,boolean,text) to authenticated;
create function public.sign_my_client_waiver(p_version text,p_name text,p_capacity text,p_agreed boolean,p_signature text) returns jsonb language sql security invoker set search_path='' as $$select private.sign_client_waiver(p_version,p_name,p_capacity,p_agreed,p_signature)$$;
revoke all on function public.sign_my_client_waiver(text,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.sign_my_client_waiver(text,text,text,boolean,text) to authenticated;
