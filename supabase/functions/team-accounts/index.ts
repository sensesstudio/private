import { createClient } from 'npm:@supabase/supabase-js@2.108.2';
import { teamAccountsHandler } from './handler.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(teamAccountsHandler({admin}));
