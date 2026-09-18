import { temporaryPassword } from '../client-accounts/password.js';
const ORIGINS=['https://sensesprivate.com','https://www.sensesprivate.com','https://sensesprivate.up.railway.app'];
export function teamAccountsHandler({admin}) {
 return async request=>{
  const origin=request.headers.get('Origin');
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':ORIGINS.includes(origin)?origin:ORIGINS[0],'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
  const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='POST')return json({error:'Method not allowed.'},405);
  if(origin&&!ORIGINS.includes(origin))return json({error:'Origin not allowed.'},403);
  try{
   const token=request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
   if(!token)return json({error:'Please sign in.'},401);
   const {data:auth,error:authError}=await admin.auth.getUser(token);
   if(authError||!auth?.user)return json({error:'Please sign in again.'},401);
   // Decode only after Auth has verified this token. Role is checked in the DB.
   let session;try{session=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).session_id;}catch{return json({error:'Please sign in again.'},401);}
   if(typeof session!=='string')return json({error:'Please sign in again.'},401);
   const operation=async(action,args={})=>admin.rpc('team_accounts_operation',{p_actor:auth.user.id,p_session:session,p_action:action,...args});
   if((await operation('check')).error)return json({error:'Admin access required.'},403);
   let input;try{input=await request.json();}catch{return json({error:'Invalid request.'},400);}
   if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Invalid request.'},400);
   if(input.action==='list'){
    const {data,error}=await operation('list');if(error)throw error;
    return json({accounts:data,actor:auth.user.id});
   }
   if(input.action==='create'){
    const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
    const name=typeof input.name==='string'?input.name.trim():'';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>150||!['admin','teacher'].includes(input.role)||input.confirmed!==true)return json({error:'Enter a name, valid email and role, then confirm the account details.'},400);
    const password=temporaryPassword();
    const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:name}});
    if(error||!data?.user)return json({error:'Could not create account. The email may already be registered; existing accounts are not changed.'},409);
    const {error:bindError}=await operation('provision',{p_target:data.user.id,p_role:input.role,p_name:name});
    if(bindError){
     const {error:cleanup}=await admin.auth.admin.deleteUser(data.user.id);
     return json({error:cleanup?'Account setup needs support. Please do not retry yet.':'Account setup could not finish. Please reload and retry.'},409);
    }
    return json({email,temporary_password:password});
   }
   if(input.action==='reset'){
    if(typeof input.id!=='string'||input.confirmed!==true||input.id===auth.user.id)return json({error:'Select another team account and confirm the reset.'},400);
    const {data:target,error:targetError}=await admin.auth.admin.getUserById(input.id);
    if(targetError||!target?.user||target.user.email?.toLowerCase()!==input.email?.toLowerCase())return json({error:'Account details changed. Reload and try again.'},409);
    if((await operation('reset',{p_target:input.id})).error)return json({error:'This account cannot be reset.'},403);
    const password=temporaryPassword();
    const {error}=await admin.auth.admin.updateUserById(input.id,{password});
    if(error)return json({error:'Password reset failed. Please retry; the previous password may still apply.'},503);
    return json({email:target.user.email,temporary_password:password});
   }
   return json({error:'Invalid request.'},400);
  }catch{return json({error:'Team accounts are unavailable. Please retry.'},503);}
 };
}
