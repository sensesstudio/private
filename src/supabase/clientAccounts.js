import { supabase } from './client.js';
export async function clientAccountAction(body) {
  if (!supabase) throw new Error('Account service is unavailable.');
  const {data,error}=await supabase.functions.invoke('client-accounts',{body});
  if (error) {
    let message='Account service is unavailable. Please retry.';
    try { const response=await error.context?.json(); if (response?.error) message=response.error; } catch { /* no request or credential logging */ }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
