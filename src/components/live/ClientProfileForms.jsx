import { useEffect, useState } from 'react';
import { Button, Card } from '../shared/index.jsx';
import { GOALS, INJURIES, LEVELS, SCHEDULES } from '../../data.js';
import { useLiveAvailability } from '../../availability/live.js';
import { supabase } from '../../supabase/client.js';
import { inputStyle } from '../../styles.js';
import { SignaturePad } from './SignaturePad.jsx';

export const profileInstant = value => value ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(value))+' HKT' : 'Not recorded';
export function DocumentSections({sections=[]}) { return sections.map((s,i)=><section className="profile-document" key={i}>{s.h && <h3>{s.h}</h3>}{s.paras?.map((p,j)=><p key={j}>{p}</p>)}{!!s.bullets?.length && <ul>{s.bullets.map((p,j)=><li key={j}>{p}</li>)}</ul>}{s.after && <p>{s.after}</p>}</section>); }
export function useClientProfile() {
  const [state,setState]=useState({loading:true,data:null,error:false});
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    let active=true;setState({loading:true,data:null,error:false});
    supabase.rpc('my_client_profile').then(({data,error})=>{
      if(active)setState(error || !data?.contact ? {loading:false,data:null,error:true} : {loading:false,data,error:false});
    }).catch(()=>{if(active)setState({loading:false,data:null,error:true});});
    return()=>{active=false;};
  },[retry]);
  async function mutate(rpc,args) {
    const {data,error}=await supabase.rpc(rpc,args);
    if(error || !data?.contact) throw new Error(error?.message==='profile_changed_reload' ? 'Your profile changed in another window. Reload this page before saving again.'
      : error?.message==='waiver_signature_required' ? 'Please draw your signature in the box before signing.'
      : error?.message==='waiver_changed_reload' ? 'The waiver was updated. Reload this page and read the new version before signing.'
      : 'Your changes could not be saved. Please retry, or sign in again.');
    setState({loading:false,data,error:false});return data;
  }
  return {...state,reload:()=>setRetry(n=>n+1),save:(section,details)=>mutate('save_my_client_profile',{p_section:section,p_details:details,p_version:state.data?.profile?.profile_version || 1}),sign:args=>mutate('sign_my_client_waiver',args)};
}
export function SignatureImage({signatureId,alt='Signature'}) {
  const [state,setState]=useState({loading:true});
  useEffect(()=>{
    let active=true;setState({loading:true});
    supabase.from('client_waiver_signature_images').select('image').eq('signature_id',signatureId).maybeSingle().then(({data,error})=>{
      if(active)setState(error ? {error:true} : {image:typeof data?.image==='string' && data.image.startsWith('data:image/png;base64,') ? data.image : null});
    }).catch(()=>{if(active)setState({error:true});});
    return()=>{active=false;};
  },[signatureId]);
  if(state.loading)return <p className="profile-source">Loading signature…</p>;
  if(state.error)return <p className="profile-source">The drawn signature could not be loaded.</p>;
  if(!state.image)return <p className="profile-source">Signed by typed name; no drawn signature is on file.</p>;
  return <img className="profile-signature-image" src={state.image} alt={alt}/>;
}
export function ProfileRecordGate({record,children}) {
  if(record.loading)return <p role="status">Loading your saved details…</p>;
  if(record.error)return <Card><p role="alert">Your profile details could not be loaded.</p><Button onClick={record.reload}>Retry</Button></Card>;
  return children;
}
function Choices({title,options,value,multiple=false,onChange}) {
  const choose=id=>onChange(multiple ? (value || []).includes(id) ? value.filter(v=>v!==id) : [...(value || []),id] : value===id ? null : id);
  return <Card pad={22}><h2>{title}</h2><div className="profile-option-grid" role="group" aria-label={title}>{options.map(o=>{const id=o.id || o,label=o.label || o;return <button type="button" aria-pressed={multiple ? (value || []).includes(id) : value===id} key={id} onClick={()=>choose(id)}><span className="profile-option-circle"/>{label}</button>;})}</div></Card>;
}
function SaveResult({error,saved}) {return <>{error && <p role="alert">{error}</p>}{saved && <p role="status">Saved. The studio can now see your updated details.</p>}</>;}
export function ClientIntakeForm({record}) {
  const p=record.data?.profile || {},contact=record.data?.contact || {};
  const [form,setForm]=useState(()=>({name:contact.name || '',phone:contact.phone || '+852 ',goals:p.goals || [],age_band:p.age_band || null,level:p.level || null,injuries:p.injuries || [],schedule_prefs:p.schedule_prefs || [],preferred_studio_ids:p.preferred_studio_ids || [],languages:p.languages || [],notes:p.notes || '',pregnant:p.pregnant ?? null,edd:p.edd || null,recent_surgery:p.recent_surgery ?? null,doctor_cleared:p.doctor_cleared ?? null}));
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  const {snapshot}=useLiveAvailability();
  const change=(key,value)=>{setSaved(false);setForm(f=>({...f,[key]:value}));};
  const exclusive=(key,value,none)=>change(key,value.at(-1)===none ? [none] : value.filter(v=>v!==none));
  async function submit(e){
    e.preventDefault();if(busy)return;setError('');setSaved(false);
    if(!/^\+[1-9]\d{6,14}$/.test(form.phone.replace(/[\s().-]/g,''))){setError('Include a valid country code and mobile number.');return;}
    if(!form.languages.length || [form.pregnant,form.recent_surgery,form.doctor_cleared].some(v=>v===null)){setError('Choose a teaching language and answer all three health questions.');return;}
    setBusy(true);try{await record.save('about',{...form,edd:form.pregnant ? form.edd : null});setSaved(true);}catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <form className="profile-stack profile-edit-form" onSubmit={submit}>
    <Card pad={22}><h2>Your details</h2><label>Full name<input style={inputStyle} autoComplete="name" required maxLength={200} value={form.name} onChange={e=>change('name',e.target.value)}/></label><label>Login email<input style={inputStyle} type="email" readOnly value={contact.email || ''}/></label><label>Mobile number<input style={inputStyle} type="tel" autoComplete="tel" required maxLength={32} value={form.phone} onChange={e=>change('phone',e.target.value)}/></label><p className="profile-source">Your answers are shared with studio admins to help arrange your sessions.</p></Card>
    <Choices title="What brings you to the mat?" options={GOALS} multiple value={form.goals} onChange={v=>change('goals',v)}/>
    <Choices title="A little about you" options={['Under 25','25–34','35–44','45–54','55+']} value={form.age_band} onChange={v=>change('age_band',v)}/>
    <Choices title="Where are you in your practice?" options={LEVELS} value={form.level} onChange={v=>change('level',v)}/>
    <Choices title="Preferred teaching language" options={['English','Cantonese','Mandarin','No preference']} multiple value={form.languages} onChange={v=>exclusive('languages',v,'No preference')}/>
    <Choices title="Anything we should hold gently?" options={INJURIES} multiple value={form.injuries} onChange={v=>exclusive('injuries',v,'None')}/>
    <Choices title="When do you like to move?" options={SCHEDULES} multiple value={form.schedule_prefs} onChange={v=>change('schedule_prefs',v)}/>
    <Choices title="Which studios suit your life?" options={(snapshot?.studios || []).map(s=>({id:s.id,label:s.name}))} multiple value={form.preferred_studio_ids} onChange={v=>change('preferred_studio_ids',v)}/>
    <Card><h2>What should your instructor know?</h2><textarea aria-label="Instructor notes" className="profile-input-frame" maxLength={4000} value={form.notes} onChange={e=>change('notes',e.target.value)} placeholder="Your goals, preferences and anything else you would like to share"/></Card>
    <Card><h2>A quick health declaration</h2>{[['pregnant','Are you pregnant?'],['recent_surgery','Any recent surgery?'],['doctor_cleared','Has a doctor cleared you to exercise?']].map(([key,label])=><div className="profile-setting" key={key}><span>{label}</span><div className="profile-option-grid" role="group" aria-label={label}>{[true,false].map(v=><button type="button" aria-pressed={form[key]===v} key={String(v)} onClick={()=>change(key,v)}>{v?'Yes':'No'}</button>)}</div></div>)}{form.pregnant && <div className="profile-stack"><label>Estimated due date<input style={inputStyle} type="date" required value={form.edd || ''} onChange={e=>change('edd',e.target.value || null)}/></label><div><p>Please also complete the Pregnancy Declaration Form before participating.</p><a className="profile-text-link" href="https://senses.team/form/pregnancy" target="_blank" rel="noopener noreferrer">Complete Pregnancy Declaration Form</a><p className="profile-source">Opens in a new tab. Remember to save your About me details here.</p></div></div>}</Card>
    <SaveResult error={error} saved={saved}/><button className="live-link" type="submit" disabled={busy}>{busy?'Saving…':'Save my details'}</button>
  </form>;
}
export function ClientPreferencesForm({record}) {
  const [values,setValues]=useState(record.data?.profile?.notification_preferences || {booking_reminders:false,availability_alerts:false,promotions:false});
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setError('');try{await record.save('preferences',{notification_preferences:values});setSaved(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <form className="profile-stack" onSubmit={submit}><Card pad={0}><div className="profile-list-title">Notifications</div>{[['booking_reminders','Booking reminders','Confirmations and reminders before a session'],['availability_alerts','Class availability alerts','Updates when instructors open new sessions'],['promotions','Promotions & news','Studio news and offers']].map(([key,title,sub])=><label className="profile-setting" key={key}><span><strong>{title}</strong><p>{sub}</p></span><input type="checkbox" checked={values[key]===true} onChange={e=>{setSaved(false);setValues(v=>({...v,[key]:e.target.checked}));}}/></label>)}</Card><p className="profile-source">Your choices are saved for the studio. Automated notification delivery is not connected yet.</p><SaveResult error={error} saved={saved}/><button className="live-link" type="submit" disabled={busy}>{busy?'Saving…':'Save preferences'}</button></form>;
}
export function ClientFavouritesForm({record}) {
  const {snapshot,loading}=useLiveAvailability();
  const [ids,setIds]=useState(record.data?.profile?.favourite_teacher_ids || []);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  const teachers=snapshot?.teachers || [];
  const options=[...teachers.map(t=>({id:t.id,label:t.full_name})),...ids.filter(id=>!teachers.some(t=>t.id===id)).map(id=>({id,label:'Saved instructor (not currently listed)'}))];
  async function submit(e){e.preventDefault();if(busy)return;setBusy(true);setError('');try{await record.save('favourites',{favourite_teacher_ids:ids});setSaved(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
  return <form className="profile-stack" onSubmit={submit}><p>Choose the instructors you would like to save. The studio can see your preferences.</p>{options.length ? <Choices title="Your favourite teachers" options={options} multiple value={ids} onChange={v=>{setIds(v);setSaved(false);}}/> : <Card><p>{loading?'Loading instructors…':'No instructors are currently listed.'}</p></Card>}<SaveResult error={error} saved={saved}/><button className="live-link" type="submit" disabled={busy || loading}>{busy?'Saving…':'Save favourites'}</button></form>;
}
export function ClientWaiverForm({record}) {
  const document=record.data?.waiver_document;
  const signed=record.data?.waiver_signatures?.find(s=>s.version===document?.version);
  const [read,setRead]=useState(false),[agreed,setAgreed]=useState(false),[name,setName]=useState(''),[capacity,setCapacity]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const [signature,setSignature]=useState(null);
  async function submit(e){e.preventDefault();if(busy || !read || !agreed || !signature)return;setBusy(true);setError('');try{await record.sign({p_version:document.version,p_name:name.trim(),p_capacity:capacity,p_agreed:agreed,p_signature:signature});}catch(e){setError(e.message);}finally{setBusy(false);}}
  if(!document)return <Card><p>The waiver is unavailable. Please contact the studio.</p></Card>;
  return <div className="profile-stack">
    <Card><h2>{signed?'Waiver signed':'Please read and sign your waiver'}</h2>{signed ? <><p>Signed by {signed.signed_name} · {profileInstant(signed.signed_at)}</p><p>Participant: {signed.participant_name} · {signed.signer_capacity==='parent_guardian'?'Parent / legal guardian':'Participant'}</p><SignatureImage signatureId={signed.id} alt="Your signature"/></> : <p>Your signed waiver will be saved with your client record.</p>}<p className="profile-source">Version {document.version}</p></Card>
    <div className="profile-waiver-scroll" tabIndex={0} role="region" aria-label="Waiver document" onScroll={e=>{const v=e.currentTarget;if(v.scrollTop+v.clientHeight>=v.scrollHeight-16)setRead(true);}}><h2>{document.title}</h2><DocumentSections sections={document.body.sections}/><p>End of waiver</p></div>
    {!signed && <form className="profile-stack profile-edit-form" onSubmit={submit}><p className="profile-source">{read?'You have reached the end of the waiver.':'Scroll to the end of the waiver to continue.'}</p><label className="profile-consent"><input type="checkbox" disabled={!read} checked={agreed} onChange={e=>setAgreed(e.target.checked)}/>I have read, understood and agree to this Waiver and Release of Liability, and I am signing voluntarily.</label><label>Signing as<select style={inputStyle} required value={capacity} onChange={e=>setCapacity(e.target.value)}><option value="">Select…</option><option value="self">Participant, aged 18 or above</option><option value="parent_guardian">Parent / legal guardian of a participant under 18</option></select></label><p>Participant: {record.data.contact.name}</p><label>Full legal name<input style={inputStyle} required maxLength={200} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label><div className="profile-signature-field"><span>Signature</span><SignaturePad onChange={setSignature}/></div>{error && <p role="alert">{error}</p>}<button className="live-link" type="submit" disabled={busy || !read || !agreed || !name.trim() || !capacity || !signature}>{busy?'Saving…':'Agree & sign'}</button></form>}
  </div>;
}
