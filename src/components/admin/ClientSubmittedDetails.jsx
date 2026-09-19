import { useState } from 'react';
import { Card } from '../shared/index.jsx';
import { GOALS, LEVELS, SCHEDULES, LOCATIONS } from '../../data.js';
import { supabase } from '../../supabase/client.js';
import { DocumentSections, SignatureImage, profileInstant } from '../live/ClientProfileForms.jsx';
const labels=(values,options)=>values?.length ? values.map(v=>options?.find(o=>o.id===v)?.label || options?.find(o=>o.id===v)?.name || v).join(', ') : 'Not recorded';
const yesNo=v=>v===true?'Yes':v===false?'No':'Not recorded';
function Field({label,children}) {return <div><dt>{label}</dt><dd style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{children || 'Not recorded'}</dd></div>;}
function SignedDocument({signature}) {
  const [state,setState]=useState(null);
  async function load(e){if(!e.currentTarget.open || state?.body)return;setState({loading:true});const {data,error}=await supabase.from('client_waiver_documents').select('title,body').eq('version',signature.version).single();setState(error?{error:true}:data);}
  return <details onToggle={load}><summary>View signed document · {signature.version}</summary>{state?.loading?<p>Loading document…</p>:state?.error?<p>Could not load the document. Close and reopen to retry.</p>:state?.body?<><h3>{state.title}</h3><DocumentSections sections={state.body.sections}/></>:null}</details>;
}
export function ClientSubmittedDetails({client}) {
  const p=client.record?.portal_profile;
  const signatures=client.record?.waiver_signatures || [];
  return <div className="profile-stack" style={{marginTop:22}}>
    <h2 className="admin-card-title">Client-submitted information</h2>
    <section id="client-about" className="admin-client-section"><Card pad={22}><h3>About me</h3>{!p?.intake_completed_at && <p className="admin-muted">No completed intake submission is recorded. Any existing answers are shown below.</p>}<dl className="admin-client-fields">
      <Field label="Goals">{labels(p?.goals,GOALS)}</Field><Field label="Age group">{p?.age_band}</Field><Field label="Practice level">{LEVELS.find(l=>l.id===p?.level)?.label || p?.level}</Field>
      <Field label="Teaching languages">{labels(p?.languages)}</Field><Field label="Injuries / sensitivities">{labels(p?.injuries)}</Field><Field label="Preferred times">{labels(p?.schedule_prefs,SCHEDULES)}</Field><Field label="Preferred studios">{labels(p?.preferred_studio_ids,LOCATIONS)}</Field>
      <Field label="Instructor notes">{p?.notes}</Field><Field label="Pregnant">{yesNo(p?.pregnant)}</Field><Field label="Estimated due date">{p?.edd}</Field><Field label="Recent surgery">{yesNo(p?.recent_surgery)}</Field><Field label="Doctor cleared to exercise">{yesNo(p?.doctor_cleared)}</Field>
      <Field label="Intake last submitted">{profileInstant(p?.intake_completed_at)}</Field>
    </dl></Card></section>
    <section id="client-waiver" className="admin-client-section"><Card pad={22}><h3>Liability waiver</h3>{signatures.length ? signatures.map(s=><div key={s.id}><dl className="admin-client-fields"><Field label="Status">Signed</Field><Field label="Signed name">{s.signed_name}</Field><Field label="Participant">{s.participant_name}</Field><Field label="Signing as">{s.signer_capacity==='parent_guardian'?'Parent / legal guardian':'Participant, aged 18 or above'}</Field><Field label="Signed at">{profileInstant(s.signed_at)}</Field><Field label="Document version">{s.version}</Field></dl><SignatureImage signatureId={s.id} alt={`Signature of ${s.signed_name}`}/><SignedDocument signature={s}/></div>) : <p className="admin-muted">No online waiver signature recorded.</p>}</Card></section>
    <section id="client-preferences" className="admin-client-section"><Card pad={22}><h3>Preferences & favourites</h3><dl className="admin-client-fields">{[['booking_reminders','Booking reminders'],['availability_alerts','Class availability alerts'],['promotions','Promotions & news']].map(([key,label])=><Field key={key} label={label}>{p?.preferences_updated_at ? yesNo(p.notification_preferences?.[key]) : 'Not set'}</Field>)}<Field label="Preferences last saved">{profileInstant(p?.preferences_updated_at)}</Field><Field label="Favourite teachers">{client.record?.favourite_teachers?.map(t=>t.name).join(', ') || 'None saved'}</Field><Field label="Profile last updated">{profileInstant(p?.updated_at)}</Field></dl><p className="admin-muted">Notification choices are stored; automatic delivery is not connected yet.</p></Card></section>
  </div>;
}
