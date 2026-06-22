// Async data-access layer — the one write path per entity (rule 4 of the
// data-symmetry contract). Every portal calls these; none touches tables
// directly. Combined with useRealtimeTable, all three portals stay in sync.

import { supabase } from './client.js';
import { answersToClientRow, clientRowToAnswers } from './mappers.js';

function guard() {
  if (!supabase) throw new Error('Supabase not configured — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

// ── Client profile / health declaration ──────────────────────────────────────
export async function fetchClientProfile(clientId) {
  guard();
  const { data, error } = await supabase.from('client_profiles').select('*').eq('id', clientId).maybeSingle();
  if (error) throw error;
  return clientRowToAnswers(data);
}

export async function saveClientProfile(clientId, answers) {
  guard();
  const row = { id: clientId, ...answersToClientRow(answers), updated_at: new Date().toISOString() };
  const { error } = await supabase.from('client_profiles').upsert(row);
  if (error) throw error;
}

// The signed-in user's display name (from their profile row).
export async function fetchProfileName(clientId) {
  guard();
  const { data, error } = await supabase.from('profiles').select('full_name').eq('id', clientId).maybeSingle();
  if (error) throw error;
  return data?.full_name || '';
}

// Package ids the client has already paid for — used to enforce one-time trials.
export async function fetchPurchasedPackageIds(clientId) {
  guard();
  const { data, error } = await supabase.from('payments').select('package_id').eq('client_id', clientId).eq('status', 'paid');
  if (error) throw error;
  return (data || []).map(r => r.package_id).filter(Boolean);
}

// ── Credits & payments ───────────────────────────────────────────────────────
export async function fetchCreditBalance(clientId) {
  guard();
  const { data, error } = await supabase.from('credit_balances').select('balance').eq('client_id', clientId).maybeSingle();
  if (error) throw error;
  return data?.balance ?? 0;
}

// Records a purchase: a payment row + the matching +credits ledger entry.
export async function recordPurchase(clientId, { packageId, credits, amountHkd, method = 'card' }) {
  guard();
  const { data: pay, error: e1 } = await supabase
    .from('payments')
    .insert({ client_id: clientId, package_id: packageId, amount_hkd: amountHkd, method, status: 'paid' })
    .select('id').single();
  if (e1) throw e1;
  const { error: e2 } = await supabase
    .from('credit_ledger')
    .insert({ client_id: clientId, delta: credits, reason: 'purchase', payment_id: pay.id });
  if (e2) throw e2;
  return pay.id;
}

// ── Bookings (transactional: spends exactly one credit, atomically) ───────────
export async function bookWithCredit(clientId, slotId) {
  guard();
  const { data, error } = await supabase.rpc('book_with_credit', { p_client: clientId, p_slot: slotId });
  if (error) throw error; // e.g. 'insufficient_credits', 'slot_already_booked'
  return data;
}

// ── Progress log (teacher -> client + admin) ──────────────────────────────────
export async function addProgressNote({ clientId, teacherId, bookingId, focus, note }) {
  guard();
  const { data, error } = await supabase
    .from('session_notes')
    .insert({ client_id: clientId, teacher_id: teacherId, booking_id: bookingId ?? null, focus, note })
    .select('*').single();
  if (error) throw error;
  return data;
}

export async function fetchProgress(clientId) {
  guard();
  const { data, error } = await supabase
    .from('session_notes').select('*').eq('client_id', clientId).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ── Progress photos (max 3, ≤5MB; enforced in DB + bucket) ────────────────────
export async function uploadSessionPhoto({ noteId, clientId, teacherId, file }) {
  guard();
  const path = `${clientId}/${noteId}/${crypto.randomUUID()}.jpg`;
  const up = await supabase.storage.from('session-photos').upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw up.error;
  const { data, error } = await supabase
    .from('session_photo')
    .insert({ note_id: noteId, client_id: clientId, teacher_id: teacherId, storage_path: path, content_type: file.type, size_bytes: file.size })
    .select('*').single();
  if (error) throw error;
  return data;
}

export async function listSessionPhotos(noteId) {
  guard();
  const { data, error } = await supabase.from('session_photo').select('*').eq('note_id', noteId);
  if (error) throw error;
  // Private bucket: hand back short-lived signed URLs for display.
  const withUrls = await Promise.all((data || []).map(async (p) => {
    const { data: signed } = await supabase.storage.from('session-photos').createSignedUrl(p.storage_path, 3600);
    return { ...p, url: signed?.signedUrl };
  }));
  return withUrls;
}
