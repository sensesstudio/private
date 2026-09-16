import Stripe from 'npm:stripe@22.6.2';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createCheckoutHandler } from './handler.js';
const key = Deno.env.get('STRIPE_SECRET_KEY');
const livemode = Deno.env.get('STRIPE_MODE') !== 'test';
const stripe = key ? new Stripe(key) : null;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
Deno.serve(createCheckoutHandler({ stripe, admin, configured: !!key?.includes(livemode ? '_live_' : '_test_') && !!Deno.env.get('STRIPE_WEBHOOK_SECRET'), livemode }));
