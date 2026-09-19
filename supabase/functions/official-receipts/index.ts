import Stripe from 'npm:stripe@22.6.2';
import { createClient } from 'npm:@supabase/supabase-js@2.108.2';
import { renderPdf } from '../_shared/receipt-runtime.ts';
import { officialReceiptsHandler } from './handler.js';
const key=Deno.env.get('STRIPE_SECRET_KEY');
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(officialReceiptsHandler({admin,stripe:key?new Stripe(key):null,renderPdf,syncKey:Deno.env.get('SYNC_KEY')}));
