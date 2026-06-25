// Single entry the chat UI talks to. Tries the AI edge function (Claude) for
// language understanding; falls back to the local rule-based parser when the
// function isn't configured or errors. Slot matching + reply always run on the
// client against the live slot store, so suggestions are real and bookable.

import { isSupabaseConfigured, supabase } from '../supabase/client.js';
import { parseQuery } from './parse.js';
import { findSlots, buildReply } from './query.js';

export async function askAssistant(message, history = []) {
  let intent = null;
  let reply = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('chat-ask', { body: { message, history } });
      if (!error && data && data.intent) {
        intent = data.intent;
        reply = data.reply || null;
      }
    } catch { /* fall through to local parser */ }
  }

  if (!intent) intent = parseQuery(message);
  const result = findSlots(intent);
  if (!reply) reply = buildReply(intent, result).text;
  return { reply, suggestions: result.suggestions, intent };
}
