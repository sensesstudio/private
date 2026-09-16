import { createClient } from 'npm:@supabase/supabase-js@2.108.2';
import { clientAccountsHandler } from './handler.js';
const url=Deno.env.get('SUPABASE_URL')!;
// Bound Auth/Data API calls well below the five-minute operation lease.
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}};
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options);
Deno.serve(clientAccountsHandler({admin,verifyPassword:async (email:string,password:string,userId:string) => {
  // A fresh client per request prevents sessions leaking between callers.
  const verifier=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,options);
  const {data,error}=await verifier.auth.signInWithPassword({email,password});
  const valid=!error && data.user?.id===userId;
  if (data.session) await verifier.auth.signOut({scope:'local'});
  return valid;
}}));
