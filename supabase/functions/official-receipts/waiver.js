const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function waiverEmailPayload(d,sender){
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))throw Error('missing_email');
 const at=new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(d.signed_at))+' HKT';
 const lines=[d.title,`Participant: ${d.participant_name}`,`Signed by: ${d.signed_name}`,`Signing as: ${d.capacity==='parent_guardian'?'Parent / legal guardian':'Participant'}`,`Signed at: ${at}`,`Version: ${d.version}`,`Document reference: ${d.sha256}`,''];
 for(const s of d.body.sections||[]){if(s.h)lines.push(s.h);lines.push(...s.paras||[],...s.bullets||[]);if(s.after)lines.push(s.after);lines.push('');}
 const text='Thank you. Your signed liability waiver has been saved. Below is a copy of the version you agreed to.\n\n'+lines.join('\n')+'\nContact: cs@senses-studio.co';
 return {from:`Senses Studio <${sender}>`,to:[d.email],reply_to:'cs@senses-studio.co',subject:`Senses Studio - Your signed liability waiver (${d.version})`,text,html:`<div style="background:#F5EFEA;padding:28px;color:#382F29;font-family:Arial,sans-serif;line-height:1.6"><h1>Senses Studio</h1><h2>Signed Liability Waiver</h2><div style="white-space:pre-wrap">${escapeHtml(text)}</div></div>`};
}
export async function sendWaiverEmails(admin,fetchImpl){
 const {data:config,error}=await admin.rpc('waiver_worker_jobs');if(error)throw error;
 if(!config.configured)return {configured:false,sent:0};
 let sent=0,failed=0;
 for(const job of config.jobs){let claim;try{
 const {data,error}=await admin.rpc('claim_waiver_email',{p_signature_id:job.signature_id,p_payload:waiverEmailPayload(job.document,config.sender)});
 if(error)throw error;if(!data)continue;claim=data;
 const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json','Idempotency-Key':`senses-waiver/${job.signature_id}`},body:JSON.stringify(claim.payload),signal:AbortSignal.timeout(20000)});
 const result=await response.json();if(!response.ok||typeof result.id!=='string')throw Error('delivery_failed');
 const saved=await admin.rpc('finish_waiver_email',{p_signature_id:job.signature_id,p_attempt:claim.attempt,p_provider_id:result.id});if(saved.error)throw saved.error;sent++;
 }catch{failed++;if(claim)await admin.rpc('finish_waiver_email',{p_signature_id:job.signature_id,p_attempt:claim.attempt,p_provider_id:null,p_error:'delivery_failed'});}}
 return {configured:true,sent,failed};
}
