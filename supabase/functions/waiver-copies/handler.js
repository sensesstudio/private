import { SUPPORT_EMAIL } from '../_shared/official-receipt.js';
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hkTime=value=>new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Hong_Kong'}).format(new Date(value))+' HKT';
// The copy is the exact document version the client agreed to, with the
// signature record beside it and the drawing attached. No links back into the
// portal are needed for it to stand on its own.
export function waiverCopyPayload(job,sender) {
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.email||''))throw new Error('missing_email');
  const sections=Array.isArray(job.document_body?.sections)?job.document_body.sections:null;
  if(!sections||!job.document_title)throw new Error('document_unavailable');
  const capacity=job.signer_capacity==='parent_guardian'?'Parent / legal guardian of a participant under 18':'Participant, aged 18 or above';
  const details=[['Signed by',job.signed_name],['Participant',job.participant_name],['Signing as',capacity],['Signed at',hkTime(job.signed_at)],['Document version',job.version],['Document reference',String(job.document_sha256||'').slice(0,16)]];
  const drawing=typeof job.signature_image==='string'&&job.signature_image.startsWith('data:image/png;base64,');
  const text=[`Dear ${job.participant_name},`,'',`Thank you for signing the Senses Studio ${job.document_title}. This email is your copy of the document you agreed to, for your records.`,'',
    ...details.map(([k,v])=>`${k}: ${v}`),'',drawing?'Your drawn signature is attached as signature.png.':'',`Questions: ${SUPPORT_EMAIL}`,'','----------------------------------------',job.document_title.toUpperCase(),'',
    ...sections.flatMap(s=>[...(s.h?[s.h.toUpperCase(),'']:[]),...(s.paras||[]).flatMap(p=>[p,'']),...(s.bullets||[]).map(b=>`- ${b}`),...(s.bullets?.length?['']:[]),...(s.after?[s.after,'']:[])])].join('\n');
  const html=`<div style="background:#F5EFEA;padding:32px;color:#382F29;font-family:Arial,sans-serif;line-height:1.6"><h1 style="font-weight:400">Senses Studio</h1><h2>${escapeHtml(job.document_title)}</h2>`+
    `<p>Dear ${escapeHtml(job.participant_name)},</p><p>Thank you for signing. This email is your copy of the document you agreed to, for your records.</p>`+
    `<table style="border-collapse:collapse">${details.map(([k,v])=>`<tr><td style="padding:4px 16px 4px 0;color:#6D5A4E">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`).join('')}</table>`+
    `${drawing?'<p>Your drawn signature is attached as <strong>signature.png</strong>.</p>':''}<p>Questions: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p><hr style="border:0;border-top:1px solid #C9B29C;margin:24px 0">`+
    sections.map(s=>`${s.h?`<h3>${escapeHtml(s.h)}</h3>`:''}${(s.paras||[]).map(p=>`<p>${escapeHtml(p)}</p>`).join('')}${s.bullets?.length?`<ul>${s.bullets.map(b=>`<li>${escapeHtml(b)}</li>`).join('')}</ul>`:''}${s.after?`<p>${escapeHtml(s.after)}</p>`:''}`).join('')+'</div>';
  return {from:`Senses Studio <${sender}>`,to:[job.email],reply_to:SUPPORT_EMAIL,subject:`Senses Studio - Your signed ${job.document_title}`,text,html,
    attachments:drawing?[{filename:'signature.png',content:job.signature_image.slice(22),content_type:'image/png'}]:[]};
}
export function waiverCopiesHandler({admin,syncKey,fetchImpl=fetch}) {
 return async request=>{
  const headers={'Content-Type':'application/json','Cache-Control':'no-store'};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  // Only the internal scheduler can dispatch customer email. There is no arbitrary recipient endpoint.
  if(!syncKey || request.headers.get('x-sync-key')!==syncKey)return json({error:'Unauthorized.'},401);
  try {
   const {data:config,error}=await admin.rpc('waiver_copy_jobs');if(error)throw error;
   if(!config.configured)return json({configured:false,sent:0});
   let sent=0,failed=0;
   for(const job of config.jobs){
    let claim;
    try {
     const {data,error}=await admin.rpc('claim_waiver_copy_email',{p_signature_id:job.signature_id,p_payload:waiverCopyPayload(job,config.sender)});
     if(error)throw error;if(!data)continue;claim=data;
     const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${config.key}`,'Content-Type':'application/json','Idempotency-Key':`senses-waiver-copy/${job.signature_id}`},body:JSON.stringify(claim.payload),signal:AbortSignal.timeout(20000)});
     const result=await response.json();
     if(!response.ok||typeof result.id!=='string')throw new Error('delivery_failed');
     const saved=await admin.rpc('finish_waiver_copy_email',{p_signature_id:job.signature_id,p_attempt:claim.attempt,p_provider_id:result.id});
     if(saved.error)throw saved.error;sent++;
    }catch {
     failed++;
     if(claim)await admin.rpc('finish_waiver_copy_email',{p_signature_id:job.signature_id,p_attempt:claim.attempt,p_provider_id:null,p_error:'delivery_failed'});
    }
   }
   return json({configured:true,sent,failed});
  }catch{return json({error:'Waiver copy delivery is unavailable.'},503);}
 };
}
