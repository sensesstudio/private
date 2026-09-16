import { temporaryPassword, validNewPassword } from './password.js';
const ORIGINS = ['https://sensesprivate.up.railway.app', 'https://sensesprivate.com', 'https://www.sensesprivate.com'];
export function clientAccountsHandler({ admin, verifyPassword }) {
  return async request => {
    const origin = request.headers.get('Origin');
    const headers = { 'Content-Type':'application/json', 'Cache-Control':'no-store', 'Vary':'Origin',
      'Access-Control-Allow-Origin':ORIGINS.includes(origin) ? origin : ORIGINS[0],
      'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods':'POST, OPTIONS' };
    const json = (body, status=200) => new Response(JSON.stringify(body),{ status, headers });
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers});
    if (request.method !== 'POST') return json({error:'Method not allowed.'},405);
    if (origin && !ORIGINS.includes(origin)) return json({error:'Origin not allowed.'},403);
    try {
      const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/i)?.[1];
      if (!token) return json({error:'Please sign in first.'},401);
      const {data:auth,error:authError} = await admin.auth.getUser(token);
      if (authError || !auth?.user) return json({error:'Please sign in again.'},401);
      const {data:profile,error:profileError} = await admin.from('profiles').select('role').eq('id',auth.user.id).single();
      if (profileError) throw profileError;
      let input;
      try { input = await request.json(); } catch { return json({error:'Invalid request.'},400); }
      if (!input || typeof input!=='object' || Array.isArray(input)) return json({error:'Invalid request.'},400);
      if (input.action === 'create') {
        if (profile?.role!=='admin') return json({error:'Admin access required.'},403);
        if (typeof input.clientId!=='string' || input.clientId.length>100 || input.confirmedEmail!==true) return json({error:'Confirm the client email before creating a login.'},400);
        const {data:client,error} = await admin.from('studio_clients').select('id,client_name,email,version').eq('id',input.clientId).single();
        if (error || !client) return json({error:'Client could not be found. Reload and try again.'},404);
        const email=client.email?.trim().toLowerCase();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:'Add a valid email to this client first.'},400);
        if (typeof input.email!=='string' || input.email.trim().toLowerCase()!==email) return json({error:'The client email has changed. Reload and verify it again.'},409);
        const {data:linked,error:linkError}=await admin.from('studio_client_accounts').select('user_id').eq('client_id',client.id).maybeSingle();
        if (linkError) throw linkError;
        if (linked) return json({error:'This client already has a login. Existing passwords have not been changed.'},409);
        const password=temporaryPassword();
        // No invitation email is sent. Credentials are returned once to the
        // authenticated admin for personal handover after verifying identity.
        const {data:created,error:createError}=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{full_name:client.client_name}});
        if (createError || !created?.user) return json({error:'Could not create login. This email may already have an account; existing accounts are never overwritten.'},409);
        const {error:bindError}=await admin.rpc('bind_studio_client_account',{p_client_id:client.id,p_version:client.version,p_user_id:created.user.id,p_email:email,p_actor:auth.user.id});
        if (bindError) {
          // Only roll back the new user created by this request, never an
          // existing account. A failed rollback is left for admin review.
          const {error:cleanupError}=await admin.auth.admin.deleteUser(created.user.id);
          return json({error:cleanupError ? 'Login setup needs support. Do not retry until the studio has checked the account.' : 'Client details changed or email is shared. Reload and use a unique client email.'},409);
        }
        return json({email,temporary_password:password});
      }
      if (input.action === 'change-password') {
        if (profile?.role!=='client') return json({error:'Client account required.'},403);
        if (!validNewPassword(input.password,input.currentPassword) || typeof input.currentPassword!=='string' || input.currentPassword.length>256) return json({error:'Choose a different password of 12–72 characters with letters and numbers.'},400);
        const {data:link,error}=await admin.from('studio_client_accounts').select('user_id,password_changed_at').eq('user_id',auth.user.id).maybeSingle();
        if (error) throw error;
        if (!link) return json({error:'Contact the studio to link your account.'},403);
        if (link.password_changed_at) return json({error:'Initial password setup is already complete. Please reload your account.'},409);
        if (!(await verifyPassword(auth.user.email,input.currentPassword,auth.user.id))) return json({error:'Current password is incorrect. Please try again.'},400);
        const {error:updateError}=await admin.auth.admin.updateUserById(auth.user.id,{password:input.password});
        if (updateError) return json({error:'Password could not be changed. Choose a stronger password and try again.'},400);
        const {error:saveError}=await admin.from('studio_client_accounts').update({password_changed_at:new Date().toISOString()}).eq('user_id',auth.user.id).is('password_changed_at',null);
        if (saveError) return json({error:'Your password changed, but setup could not finish. Sign in with the new password and complete setup again.'},503);
        return json({ok:true});
      }
      return json({error:'Invalid request.'},400);
    } catch { return json({error:'Account service is unavailable. Please retry.'},503); }
  };
}
