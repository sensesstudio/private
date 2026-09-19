import { createClient } from 'npm:@supabase/supabase-js@2.108.2';
import { waiverCopiesHandler } from './handler.js';
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(waiverCopiesHandler({admin,syncKey:Deno.env.get('SYNC_KEY')}));
