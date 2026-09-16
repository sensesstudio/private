import Stripe from 'npm:stripe@22.6.2';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createWebhookHandler } from './handler.js';
const key = Deno.env.get('STRIPE_SECRET_KEY');
const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
const stripe = key ? new Stripe(key) : null;
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
Deno.serve(createWebhookHandler({ stripe, admin, secret, verify: (body: string, signature: string) => stripe!.webhooks.constructEventAsync(body, signature, secret!, undefined, Stripe.createSubtleCryptoProvider()) }));
