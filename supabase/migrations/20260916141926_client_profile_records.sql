-- Persist actual client input and expose it only to the owner and studio admins.
alter table public.client_profiles
 add column profile_version integer not null default 1,
 add column intake_completed_at timestamptz,
 add column notification_preferences jsonb not null default '{"booking_reminders":false,"availability_alerts":false,"promotions":false}',
 add column preferences_updated_at timestamptz,
 add column favourite_teacher_ids uuid[] not null default '{}';

-- All client mutations go through validated, session-gated RPCs. In particular,
-- a client must never be able to forge waiver names, versions or timestamps.
drop policy client_self on public.client_profiles;
create policy client_profiles_admin_read on public.client_profiles for select to authenticated using ((select public.is_admin()));
revoke all on public.client_profiles from public,anon,authenticated;
grant select on public.client_profiles to authenticated;

create table public.client_waiver_documents (
 version text primary key, title text not null, body jsonb not null,
 sha256 text not null, active boolean not null default true
);
alter table public.client_waiver_documents enable row level security;
create policy waiver_document_read on public.client_waiver_documents for select to anon,authenticated using(true);
revoke all on public.client_waiver_documents from public,anon,authenticated;
grant select on public.client_waiver_documents to anon,authenticated;
insert into public.client_waiver_documents(version,title,body,sha256) values
 ('2026-09-16', 'Waiver and Release of Liability', '{"title":"Waiver and Release of Liability","sections":[{"paras":["In consideration of the risk of injury while participating in Group Yoga Class, Private Yoga Class, Pilates Classes, or Studio Rental (the \"Activity\"), and as consideration for the right to participate in the Activity, I hereby, for myself, my heirs, executors, administrators, assigns, or personal representatives, knowingly and voluntarily enter into this waiver and release of liability and hereby waive any and all rights, claims or causes of action of any kind whatsoever arising out of my participation in the Activity, and do hereby release and forever discharge Yoga Senses Limited / Pilates Senses Limited (trading as \"Senses Studio\") and its directors, officers, instructors, employees, and independent contractors, located at:"],"bullets":["1701, H Queen''s, 80 Queen''s Road Central, Central","20/F, The Hedon, 11 Matheson Street, Causeway Bay","1906, 19/F, Westlands Centre, 20 Westlands Road, Quarry Bay","B, 31/F, Billion Plaza II, 10 Cheung Yue Street, Lai Chi Kok, Hong Kong","TG Place, 10 Shing Yip Street, Kwun Tong (Pilates Studio: Room B, 30/F; Yoga Studio: Room E1, 31/F)"],"after":"their affiliates, managers, members, agents, attorneys, staff, volunteers, heirs, representatives, predecessors, successors and assigns (collectively, the \"Released Parties\"), for any physical or psychological injury, including but not limited to illness, paralysis, death, damages, economical or emotional loss, that I may suffer as a direct result of my participation in the aforementioned Activity, including travelling to and from an event related to this Activity, to the extent permitted by applicable law."},{"h":"Assumption of Risk","paras":["I AM VOLUNTARILY PARTICIPATING IN THE AFOREMENTIONED ACTIVITY AND I AM PARTICIPATING IN THE ACTIVITY ENTIRELY AT MY OWN RISK. I AM AWARE OF THE RISKS ASSOCIATED WITH TRAVELLING TO AND FROM AS WELL AS PARTICIPATING IN THIS ACTIVITY, WHICH MAY INCLUDE, BUT ARE NOT LIMITED TO, PHYSICAL OR PSYCHOLOGICAL INJURY, PAIN, SUFFERING, ILLNESS, DISFIGUREMENT, TEMPORARY OR PERMANENT DISABILITY (INCLUDING PARALYSIS), ECONOMIC OR EMOTIONAL LOSS, AND DEATH. I UNDERSTAND THAT THESE INJURIES OR OUTCOMES MAY ARISE FROM MY OWN OR OTHERS’ ACTIONS, CONDITIONS RELATED TO TRAVEL, OR THE CONDITION OF THE ACTIVITY LOCATION(S). NONETHELESS, I ASSUME ALL RELATED RISKS, BOTH KNOWN OR UNKNOWN TO ME, OF MY PARTICIPATION IN THIS ACTIVITY, INCLUDING TRAVEL TO, FROM AND DURING THIS ACTIVITY."]},{"h":"Negligence Clause","paras":["To the extent permitted by the Control of Exemption Clauses Ordinance (Cap. 71, Laws of Hong Kong), this release extends to claims arising from the negligence of the Released Parties. Nothing in this waiver shall exclude or restrict liability of the Released Parties for death or personal injury resulting from negligence, to the extent that such exclusion or restriction is prohibited by the Control of Exemption Clauses Ordinance (Cap. 71) or any other applicable law.","For losses other than death or personal injury, this release and waiver of liability shall apply to the fullest extent permitted by law, including losses arising from the negligence of the Released Parties, provided that such exclusion satisfies the requirement of reasonableness under the Control of Exemption Clauses Ordinance (Cap. 71)."]},{"h":"Health Declaration and Fitness Self-Certification","paras":["I hereby declare and certify that:"],"bullets":["I am in good physical health and have no medical condition, illness, or injury that would prevent me from safely participating in the Activity.","I have disclosed, or will disclose prior to participation, any and all known medical conditions, physical limitations, disabilities, allergies, pregnancies, recent surgeries, or injuries to a Yoga Senses Limited / Pilates Senses Limited instructor or staff member before commencing any Activity.","I understand that yoga, Pilates, and related physical activities involve physical exertion that may be strenuous and may cause or aggravate a physical injury or medical condition.","I have consulted with a licensed physician regarding my fitness to participate, or I have chosen to participate without such consultation and accept full responsibility for that decision.","I accept an ongoing obligation to inform an instructor or staff member immediately if my health status changes at any time, including during an Activity session.","I understand that the instructors of Yoga Senses Limited / Pilates Senses Limited are qualified fitness professionals but are not medical practitioners, and that any guidance provided during the Activity does not constitute medical advice.","I agree to follow all instructions given by the instructor during the Activity. If I choose to disregard such instructions or perform any movement beyond my ability, I do so entirely at my own risk."]},{"h":"Pregnancy Declaration and Prenatal Participation","paras":["I acknowledge that participation in yoga, Pilates, and related activities during pregnancy may involve additional risks to both myself and my unborn child. I hereby declare that:"],"bullets":["If I am pregnant, I have fully disclosed my pregnancy to Yoga Senses Limited / Pilates Senses Limited prior to participating in any Activity.","I have obtained prior approval from a registered medical practitioner (doctor) confirming that I am fit to participate in the Activity, and I agree to provide such confirmation upon request.","I understand that not all classes are suitable for pregnancy, and it is my responsibility to enrol only in classes that are designated as prenatal-safe or otherwise approved by the studio.","I accept full responsibility for consulting with my doctor regarding any limitations, contraindications, or risks associated with my participation.","I participate in any Activity during pregnancy entirely at my own risk, to the extent permitted by applicable law.","I will immediately inform the instructor of my pregnancy status before the commencement of any class and of any changes in my condition.","I will stop participating immediately if I experience any discomfort, pain, dizziness, or other unusual symptoms and will seek medical advice."],"after":"Nothing in this clause shall exclude or limit liability for death or personal injury caused by negligence where such exclusion is not permitted under the laws of Hong Kong."},{"h":"Equipment Use and Malfunction","bullets":["I acknowledge that participation in the Activity may involve the use of studio equipment and props, including but not limited to yoga mats, blocks, straps, reformer machines, resistance bands, aerial silks, and other apparatus.","I agree to inspect any equipment before use and to notify a Yoga Senses Limited / Pilates Senses Limited instructor or staff member immediately if I observe any damage, defect, or malfunction.","I agree to use all equipment only in the manner instructed and for its intended purpose.","Yoga Senses Limited / Pilates Senses Limited shall take reasonable steps to maintain and inspect studio equipment. However, to the extent permitted by the Control of Exemption Clauses Ordinance (Cap. 71), I acknowledge and accept that equipment may malfunction, and I assume the risk of injury arising from such malfunction, except where such injury is caused by the negligence of the Released Parties resulting in death or personal injury.","I agree to be financially responsible for any damage to studio equipment or facilities caused by my wilful misconduct, neglect, or recklessness."]},{"h":"Pilates Footwear – Non-Slip Socks","paras":["For safety and hygiene reasons, all participants are required to wear non-slip grip socks for all Pilates sessions, including group classes and private sessions. Entry to any Pilates class without appropriate non-slip socks is not permitted.","If a participant arrives without non-slip socks, they may be asked to purchase socks at the studio (if available) or will not be allowed to join the class, and any applicable late-cancellation or no-show policy may still apply. It is the participant’s responsibility to ensure they have suitable non-slip socks before the start of each Pilates session."]},{"h":"Personal Belongings","paras":["All personal belongings (including but not limited to shoes, clothing, bags, yoga mats, electronic devices and valuables) are brought into the studio and its premises at the member’s / participant’s own risk. The studio does not accept any responsibility or liability for any loss, theft or damage to personal property, whether items are left in open areas, reception, shoe racks, changing areas, lockers or any other part of the premises, except to the extent that such liability cannot be excluded under applicable law. Members and participants are advised not to bring valuables to the studio and to ensure that all personal items are kept safely with them at all times."]},{"h":"Indemnification","paras":["I agree to indemnify and hold harmless the Released Parties against any and all claims, suits, or actions of any kind whatsoever for liability, damages, compensation, or otherwise brought by me or anyone on my behalf, including attorney’s fees and any related costs, if litigation arises pursuant to any claims made by me or by anyone else acting on my behalf. If the Released Parties incur any of these types of expenses, I agree to reimburse them in full."]},{"h":"Third-Party Acts and Omissions","paras":["I acknowledge that the Released Parties are not responsible for errors, omissions, acts, or failures to act of any third party or entity conducting a specific event or activity on behalf of Yoga Senses Limited / Pilates Senses Limited."]},{"h":"Nature of the Activity","paras":["I acknowledge that this Activity may involve a test of a person’s physical and mental limits and may carry with it the potential for death, serious injury, and property loss. The risks may include, but are not limited to, those caused by terrain, facilities, temperature, weather, lack of hydration, condition of participants, equipment, vehicular traffic, and actions of others, including but not limited to participants, volunteers, spectators, coaches, event officials, event monitors, and/or producers of the event."]},{"h":"Personal Data Collection and Privacy (PDPO Compliance)","paras":["In accordance with the Personal Data (Privacy) Ordinance (Cap. 486, Laws of Hong Kong):"],"bullets":["Purpose of Collection: Yoga Senses Limited / Pilates Senses Limited collects personal data (including name, address, contact details, emergency contact information, and health-related information disclosed under this waiver) for: (a) administration of class bookings and studio access; (b) health and safety management; (c) communication regarding the Activity, schedules, and studio updates; (d) compliance with legal obligations; and (e) contacting emergency contacts in the event of an emergency.","Voluntary Provision: The provision of personal data is voluntary. However, failure to provide the required data may result in the inability to participate in the Activity.","Transfer and Disclosure: Personal data will not be transferred to third parties except: (a) where required by law; (b) to emergency services or medical personnel in the event of an emergency; or (c) to professional advisers (legal, insurance) in connection with any claim or legal proceedings.","Data Retention: Personal data will be retained only for as long as necessary to fulfil the purposes stated above, or as required by law, after which it will be securely destroyed.","Access and Correction: Under the PDPO, I have the right to request access to and correction of my personal data held by Yoga Senses Limited / Pilates Senses Limited. Requests may be made in writing to the studio’s data protection contact at any of the studio addresses listed above."]},{"h":"Medical Treatment and Insurance","paras":["In the event that I should require medical care or treatment, I agree to be financially responsible for any costs incurred as a result of such treatment. I am aware and understand that I should carry my own health insurance."]},{"h":"Governing Law and Jurisdiction","paras":["This agreement shall be governed by and construed in accordance with the laws of the Hong Kong Special Administrative Region. The parties submit to the exclusive jurisdiction of the courts of Hong Kong."]},{"h":"Acknowledgement and Agreement","paras":["I ACKNOWLEDGE THAT I HAVE CAREFULLY READ THIS \"WAIVER AND RELEASE OF LIABILITY\" AND FULLY UNDERSTAND THAT IT IS A RELEASE OF LIABILITY. I EXPRESSLY AGREE TO RELEASE AND DISCHARGE THE RELEASED PARTIES FROM ANY AND ALL CLAIMS OR CAUSES OF ACTION, TO THE EXTENT PERMITTED BY LAW, AND I AGREE TO VOLUNTARILY GIVE UP OR WAIVE ANY RIGHT THAT I OTHERWISE HAVE TO BRING A LEGAL ACTION AGAINST THE RELEASED PARTIES FOR PERSONAL INJURY OR PROPERTY DAMAGE, EXCEPT WHERE SUCH WAIVER IS PROHIBITED UNDER THE CONTROL OF EXEMPTION CLAUSES ORDINANCE (CAP. 71)."]},{"h":"Participant / Parent or Guardian Declaration","paras":["The undersigned declares that they have carefully read this Waiver and Release of Liability, fully understand its contents, and acknowledge that it is a legally binding agreement. The undersigned further confirms that this agreement is signed voluntarily and cannot be modified orally.","If the participant is aged 18 or above: the participant confirms that they are 18 years of age or older and are signing this agreement on their own behalf.","If the participant is under 18 years of age: the parent or legal guardian confirms that they are the parent or legal guardian of the participant named below, have read and understood this agreement, and consent to the participant taking part in the Activity and agree to this Waiver and Release of Liability on the participant’s behalf."]}]}'::jsonb, '1fb69752bd5595fadfa4dfc96cdb86aa3ba6430b12a9012c816e43d7df741300');
create unique index one_active_client_waiver on public.client_waiver_documents(active) where active;

create table public.client_waiver_signatures (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 client_id text not null references public.studio_clients(id),
 version text not null references public.client_waiver_documents(version),
 signed_name text not null check(length(btrim(signed_name)) between 1 and 200),
 participant_name text not null check(length(btrim(participant_name)) between 1 and 200),
 signer_capacity text not null check(signer_capacity in ('self','parent_guardian')),
 signed_at timestamptz not null default clock_timestamp(),
 document_sha256 text not null,
 unique(user_id,version)
);
create index client_waiver_client_idx on public.client_waiver_signatures(client_id);
alter table public.client_waiver_signatures enable row level security;
create policy client_waiver_admin_read on public.client_waiver_signatures for select to authenticated using((select public.is_admin()));
revoke all on public.client_waiver_signatures from public,anon,authenticated;
grant select on public.client_waiver_signatures to authenticated;

create function private.active_studio_client_id() returns text
language plpgsql stable security definer set search_path='' as $$
declare v_id text;
begin
 if private.client_account_snapshot()->>'status' <> 'active' then
   raise exception 'active_client_account_required' using errcode='42501'; end if;
 select client_id into v_id from public.studio_client_accounts where user_id=auth.uid();
 if v_id is null then raise exception 'active_client_account_required' using errcode='42501'; end if;
 return v_id;
end; $$;
revoke all on function private.active_studio_client_id() from public,anon,authenticated;

create function private.client_portal_profile() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_id text:=private.active_studio_client_id();
begin
 perform set_config('response.headers','[{"Cache-Control":"no-store"}]',true);
 return jsonb_build_object('profile',(select to_jsonb(p)-'id' from public.client_profiles p where p.id=auth.uid()),
 'contact',(select jsonb_build_object('name',c.client_name,'phone',c.phone,'email',a.login_email) from public.studio_clients c join public.studio_client_accounts a on a.client_id=c.id where c.id=v_id),
 'waiver_document',(select to_jsonb(d) from public.client_waiver_documents d where active),
 'waiver_signatures',coalesce((select jsonb_agg(to_jsonb(s)-array['user_id','client_id'] order by s.signed_at desc) from public.client_waiver_signatures s where s.user_id=auth.uid()),'[]'::jsonb));
end; $$;

create function private.save_client_portal_profile(p_section text,p_details jsonb,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id text:=private.active_studio_client_id(); oldp public.client_profiles; v public.client_profiles;
 v_name text; v_phone text; v_key text; v_allowed text[];
begin
 if jsonb_typeof(p_details) is distinct from 'object' or length(p_details::text)>20000 then raise exception 'invalid_profile'; end if;
 insert into public.client_profiles(id) values(auth.uid()) on conflict(id) do nothing;
 select * into oldp from public.client_profiles where id=auth.uid() for update;
 if p_version is null or oldp.profile_version<>p_version then raise exception 'profile_changed_reload'; end if;
 if p_section='about' then
  v_allowed:=array['name','phone','goals','age_band','level','injuries','schedule_prefs','preferred_studio_ids','languages','notes','pregnant','edd','recent_surgery','doctor_cleared'];
 elsif p_section='preferences' then v_allowed:=array['notification_preferences'];
 elsif p_section='favourites' then v_allowed:=array['favourite_teacher_ids'];
 else raise exception 'invalid_profile_section'; end if;
 if exists(select 1 from jsonb_object_keys(p_details) k where not k=any(v_allowed)) then raise exception 'invalid_profile_field'; end if;
 for v_key in select unnest(case when p_section='about' then array['goals','injuries','schedule_prefs','preferred_studio_ids','languages'] when p_section='favourites' then array['favourite_teacher_ids'] else array[]::text[] end) loop
  if jsonb_typeof(p_details->v_key) is distinct from 'array' then raise exception 'invalid_profile_choices'; end if;
  if jsonb_array_length(p_details->v_key)>30 or exists(select 1 from jsonb_array_elements(p_details->v_key) e where jsonb_typeof(e)<>'string') then raise exception 'invalid_profile_choices'; end if;
 end loop;
 select * into v from jsonb_populate_record(oldp,p_details);
 if p_section='about' then
  v_name:=btrim(p_details->>'name'); v_phone:=regexp_replace(btrim(p_details->>'phone'),'[[:space:]().-]','','g');
  if v_name is null or length(v_name) not between 1 and 200 then raise exception 'valid_name_required'; end if;
  if v_phone is null or v_phone !~ '^\+[1-9][0-9]{6,14}$' then raise exception 'valid_phone_required'; end if;
  if not v.goals <@ array['strength','flex','rehab','posture','natal','calm']
   or (v.age_band is not null and v.age_band not in ('Under 25','25–34','35–44','45–54','55+'))
   or (v.level is not null and v.level not in ('new','some','exp'))
   or not v.injuries <@ array['Lower back','Knees','Shoulders','Neck','Wrists','Hips','None']
   or ('None'=any(v.injuries) and cardinality(v.injuries)>1)
   or not v.schedule_prefs <@ array['am','day','pm','wknd']
   or not v.languages <@ array['English','Cantonese','Mandarin','No preference']
   or ('No preference'=any(v.languages) and cardinality(v.languages)>1)
   or cardinality(v.languages)=0 or length(coalesce(v.notes,''))>4000
   or exists(select 1 from unnest(v.preferred_studio_ids) s where not exists(select 1 from public.studios where id=s))
   or v.pregnant is null or v.recent_surgery is null or v.doctor_cleared is null then raise exception 'complete_valid_intake_required'; end if;
  if v.pregnant and (v.edd is null or v.edd<(now() at time zone 'Asia/Hong_Kong')::date or v.edd>(now() at time zone 'Asia/Hong_Kong')::date+300) then raise exception 'valid_due_date_required'; end if;
  update public.studio_clients set client_name=v_name,phone=v_phone where id=v_id;
  update public.profiles set full_name=v_name where id=auth.uid();
  update public.client_profiles set goals=v.goals,age_band=v.age_band,level=v.level,injuries=v.injuries,
   schedule_prefs=v.schedule_prefs,preferred_studio_ids=v.preferred_studio_ids,languages=v.languages,notes=v.notes,
   pregnant=v.pregnant,edd=case when v.pregnant then v.edd end,recent_surgery=v.recent_surgery,doctor_cleared=v.doctor_cleared,
   intake_completed_at=clock_timestamp() where id=auth.uid();
 elsif p_section='preferences' then
  if jsonb_typeof(v.notification_preferences) is distinct from 'object'
    or not v.notification_preferences ?& array['booking_reminders','availability_alerts','promotions']
    or exists(select 1 from jsonb_each(v.notification_preferences) e where e.key not in ('booking_reminders','availability_alerts','promotions') or jsonb_typeof(e.value)<>'boolean') then raise exception 'invalid_notification_preferences'; end if;
  update public.client_profiles set notification_preferences=v.notification_preferences,preferences_updated_at=clock_timestamp() where id=auth.uid();
 else
  if exists(select 1 from unnest(v.favourite_teacher_ids) t where not exists(select 1 from public.teacher_profiles where id=t and active)) then raise exception 'invalid_instructor'; end if;
  update public.client_profiles set favourite_teacher_ids=v.favourite_teacher_ids where id=auth.uid();
 end if;
 update public.client_profiles set profile_version=profile_version+1,updated_at=clock_timestamp() where id=auth.uid();
 insert into private.studio_client_changes(actor_id,table_name,before_data,after_data)
  select auth.uid(),'client_profiles',to_jsonb(oldp),to_jsonb(p) from public.client_profiles p where id=auth.uid();
 return private.client_portal_profile();
end; $$;

create function private.sign_client_waiver(p_version text,p_name text,p_capacity text,p_agreed boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id text:=private.active_studio_client_id(); d public.client_waiver_documents; s public.client_waiver_signatures;
begin
 if p_agreed is distinct from true or length(btrim(coalesce(p_name,''))) not between 1 and 200
  or p_capacity is null or p_capacity not in ('self','parent_guardian') then raise exception 'waiver_consent_required'; end if;
 select * into d from public.client_waiver_documents where version=p_version and active;
 if d.version is null then raise exception 'waiver_changed_reload'; end if;
 perform pg_advisory_xact_lock(hashtextextended('waiver:'||auth.uid()::text,0));
 insert into public.client_waiver_signatures(user_id,client_id,version,signed_name,participant_name,signer_capacity,document_sha256)
  select auth.uid(),v_id,d.version,btrim(p_name),c.client_name,p_capacity,d.sha256 from public.studio_clients c where c.id=v_id
  on conflict(user_id,version) do nothing;
 select * into s from public.client_waiver_signatures where user_id=auth.uid() and version=d.version;
 insert into public.client_profiles(id) values(auth.uid()) on conflict(id) do nothing;
 update public.client_profiles set waiver_signed_at=s.signed_at,waiver_signed_name=s.signed_name,waiver_version=s.version,
  updated_at=clock_timestamp(),profile_version=profile_version+1 where id=auth.uid() and waiver_version is distinct from s.version;
 return private.client_portal_profile();
end; $$;

revoke all on function private.client_portal_profile(),private.save_client_portal_profile(text,jsonb,integer),private.sign_client_waiver(text,text,text,boolean) from public,anon,authenticated;
grant execute on function private.client_portal_profile(),private.save_client_portal_profile(text,jsonb,integer),private.sign_client_waiver(text,text,text,boolean) to authenticated;
create function public.my_client_profile() returns jsonb language sql stable security invoker set search_path='' as $$select private.client_portal_profile()$$;
create function public.save_my_client_profile(p_section text,p_details jsonb,p_version integer) returns jsonb language sql security invoker set search_path='' as $$select private.save_client_portal_profile(p_section,p_details,p_version)$$;
create function public.sign_my_client_waiver(p_version text,p_name text,p_capacity text,p_agreed boolean) returns jsonb language sql security invoker set search_path='' as $$select private.sign_client_waiver(p_version,p_name,p_capacity,p_agreed)$$;
revoke all on function public.my_client_profile(),public.save_my_client_profile(text,jsonb,integer),public.sign_my_client_waiver(text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.my_client_profile(),public.save_my_client_profile(text,jsonb,integer),public.sign_my_client_waiver(text,text,text,boolean) to authenticated;

create or replace function private.audit_studio_client_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_email text;
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if TG_TABLE_NAME='studio_clients' then
    -- Serialize email checks with admin edits as well as concurrent sign-ins.
    perform pg_advisory_xact_lock(hashtextextended(lower(btrim(new.email)),0));
  end if;
  if not coalesce(public.is_admin(),false) then
    if TG_TABLE_NAME<>'studio_clients' then raise exception 'admin_access_required' using errcode='42501'; end if;
    if TG_OP='INSERT' then
    v_email:=private.current_google_client_email();
    if v_email is null or new.id<>'google:'||auth.uid()::text
      or new.email<>v_email or new.signup_source<>'google' then
      raise exception 'client_profile_access_required' using errcode='42501'; end if;
      if new.phone<>'' or new.visits_since_jun is not null or new.profile_completed_at is not null then
        raise exception 'empty_client_profile_required' using errcode='42501'; end if;
    elsif old.id<>private.active_studio_client_id()
      or (old.profile_completed_at is distinct from new.profile_completed_at and not (old.profile_completed_at is null and new.profile_completed_at is not null and old.signup_source='google'))
      or (to_jsonb(new)-array['client_name','phone','profile_completed_at','version','updated_at'])
        is distinct from (to_jsonb(old)-array['client_name','phone','profile_completed_at','version','updated_at']) then
      raise exception 'client_profile_access_required' using errcode='42501';
    end if;
  end if;
  new.version:=case when TG_OP='UPDATE' then old.version+1 else 1 end;
  new.updated_at:=clock_timestamp();
  insert into private.studio_client_changes(actor_id,table_name,before_data,after_data)
    values(auth.uid(),TG_TABLE_NAME,case when TG_OP='UPDATE' then to_jsonb(old) end,to_jsonb(new));
  return new;
end;
$$;


create or replace function public.admin_client_directory() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare v_import public.admin_client_imports; v_today date := (now() at time zone 'Asia/Hong_Kong')::date;
begin
  if not coalesce(public.is_admin(),false) then raise exception 'admin_access_required' using errcode='42501'; end if;
  perform set_config('response.headers','[{"Cache-Control":"no-store"}]',true);
  select i.* into v_import from public.admin_client_imports i
    where exists(select 1 from public.studio_client_packages p where p.import_id=i.id)
    order by i.imported_at desc,i.id desc limit 1;
  return jsonb_build_object('import',case when v_import.id is not null then to_jsonb(v_import)-'source_sha256' end,
    'as_of',v_today,'sync',(select to_jsonb(s)-'id' from public.mindbody_client_sync_state s where id),
    'last_visit_import',(select to_jsonb(i)-'source_sha256' from public.admin_client_imports i
      where exists(select 1 from public.admin_client_packages a where a.import_id=i.id and a.raw_data ? 'Last_visit_date')
      order by i.imported_at desc,i.id desc limit 1),
    'lifetime_import',(select to_jsonb(i)-'source_sha256' from public.admin_client_imports i
      where exists(select 1 from public.admin_client_packages a where a.import_id=i.id and a.raw_data ? 'Private_sessions_lifetime')
      order by i.imported_at desc,i.id desc limit 1),
    'next_visit_import',(select to_jsonb(i)-'source_sha256' from public.admin_client_imports i
      where exists(select 1 from public.admin_client_packages a where a.import_id=i.id and a.raw_data ? 'Next_visit')
      order by i.imported_at desc,i.id desc limit 1),
    'clients',coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object(
      'portal_profile',(select to_jsonb(cp)-'id' from public.client_profiles cp join public.studio_client_accounts ca on ca.user_id=cp.id where ca.client_id=c.id),
      'waiver_signatures',coalesce((select jsonb_agg(to_jsonb(ws)-array['user_id','client_id'] order by ws.signed_at desc) from public.client_waiver_signatures ws where ws.client_id=c.id),'[]'::jsonb),
      'favourite_teachers',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name)) from public.studio_client_accounts ca join public.client_profiles cp on cp.id=ca.user_id join public.profiles p on p.id=any(cp.favourite_teacher_ids) where ca.client_id=c.id),'[]'::jsonb),
      'private_sessions_lifetime',pv.private_sessions_lifetime,'last_visit_date',v.last_visit_date,'never_attended',coalesce(v.never_attended,false),
      'next_visit_at',nv.next_visit_at,'next_visit_details',nv.next_visit_details,
      'no_upcoming_booking',coalesce(nv.no_upcoming_booking,false)) order by c.client_name,c.id)
      from public.studio_clients c left join lateral (
        select a.last_visit_date,a.never_attended from public.admin_client_packages a
        join public.admin_client_imports i on i.id=a.import_id
        where a.client_id=c.id and a.raw_data ? 'Last_visit_date'
        order by i.imported_at desc,i.id desc,a.source_row limit 1
      ) v on true left join lateral (
        select a.next_visit_at,a.next_visit_details,a.no_upcoming_booking from public.admin_client_packages a
        join public.admin_client_imports i on i.id=a.import_id
        where a.client_id=c.id and a.raw_data ? 'Next_visit'
        order by i.imported_at desc,i.id desc,a.source_row limit 1
      ) nv on true left join lateral (
        select a.private_sessions_lifetime from public.admin_client_packages a
        join public.admin_client_imports i on i.id=a.import_id
        where a.client_id=c.id and a.raw_data ? 'Private_sessions_lifetime'
        order by i.imported_at desc,i.id desc,a.source_row limit 1
      ) pv on true),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg((to_jsonb(p)-'import_id') || jsonb_build_object(
      'client_name',c.client_name,'phone',c.phone,'email',c.email,'visits_since_jun',c.visits_since_jun,
      'recorded',jsonb_build_object('credits_left',p.credits_left,'total_credits',p.total_credits,'expiry_date',p.expiry_date),
      'credits_left',coalesce(l.remaining,p.credits_left),'total_credits',coalesce(l.total,p.total_credits),
      'expiry_date',coalesce(l.expiry_date,p.expiry_date),'days_to_expiry',coalesce(l.expiry_date,p.expiry_date)-v_today,
      'mindbody',case when l.package_id is not null then to_jsonb(l)-'package_id' end
    ) order by p.source_row nulls last,p.id)
    from public.studio_client_packages p join public.studio_clients c on c.id=p.client_id
    left join public.mindbody_package_links l on l.package_id=p.id),'[]'::jsonb));
end;
$$;
