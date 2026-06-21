// Real authentication via Supabase Auth. All gated by isSupabaseConfigured so
// the demo login still works untouched when keys aren't present.

import { supabase, isSupabaseConfigured } from './client.js';

// Sign up a client. The handle_new_user DB trigger creates their profile +
// client_profiles row automatically from the metadata we pass here.
// Returns { user, needsConfirmation } — needsConfirmation is true when the
// project requires email confirmation (no session yet).
export async function signUpClient({ email, password, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: 'client' } },
  });
  if (error) throw error;
  return { user: data.user, needsConfirmation: !data.session };
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  if (isSupabaseConfigured) await supabase.auth.signOut();
}

// The current logged-in user's id (auth.uid), or null.
export async function currentUserId() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id || null;
}
