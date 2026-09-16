import { createClient } from 'npm:@supabase/supabase-js@2.108.2';
import { createHandler } from './handler.js';
const url=Deno.env.get('SUPABASE_URL')!;
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input:RequestInfo|URL,init?:RequestInit)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}};
const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,options);
const call=(client:ReturnType<typeof createClient>)=>async(name:string,args:Record<string,unknown>)=>{
 const {data,error}=await client.rpc(name,args);if(error)throw new Error('database_unavailable');return data;
};
Deno.serve(createHandler({syncKey:Deno.env.get('SYNC_KEY'),rpc:call(service),authorize:async(authorization:string)=>{
 if(!/^Bearer\s+\S+$/i.test(authorization))return null;
 const user=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{...options,global:{...options.global,headers:{Authorization:authorization}}});
 const {data,error}=await user.auth.getUser(authorization.replace(/^Bearer\s+/i,''));
 if(error||!data.user)return null;
 // This protected RPC checks the stored admin role AND the current Auth session.
 const check=await user.rpc('admin_prospect_directory');
 if(check.error)return null;
 return call(user);
}}));
