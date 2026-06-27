// Single entry the chat UI talks to. Tries the AI edge function (Claude) for
// language understanding; falls back to the local rule-based parser when the
// function isn't configured or errors. Slot matching + reply always run on the
// client against the live slot store, so suggestions are real and bookable.

import { isSupabaseConfigured, supabase } from '../supabase/client.js';
import { parseQuery, hasSignal } from './parse.js';
import { findSlots, buildReply } from './query.js';

// Shown when we can't make out a booking request (gibberish / off-topic). Kept
// bilingual since we can't reliably detect the language of nonsense input.
const CLARIFY = '唔好意思，我可能聽唔明 😅 你可以問我邊一日、邊間 studio 或者邊種堂（例如 Reformer）有冇位。\nSorry, I didn\'t quite catch that — try asking about a class, day or studio, e.g. "Reformer tomorrow afternoon". Or tap the WhatsApp button to reach us.';

export async function askAssistant(message, history = []) {
  let intent = null;
  let reply = null;
  let understood = null; // AI may explicitly flag an off-topic message

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('chat-ask', { body: { message, history } });
      if (!error && data && data.intent) {
        intent = data.intent;
        reply = data.reply || null;
        if (typeof data.understood === 'boolean') understood = data.understood;
      }
    } catch { /* fall through to local parser */ }
  }

  if (!intent) intent = parseQuery(message);

  // Off-topic / unparseable: don't show generic slots — ask them to rephrase.
  const unclear = understood === false || (understood === null && !hasSignal(intent));
  if (unclear) {
    return { reply: reply || CLARIFY, suggestions: [], intent, clarify: true };
  }

  const result = findSlots(intent);
  if (!reply) reply = buildReply(intent, result).text;
  return { reply, suggestions: result.suggestions, intent, clarify: false };
}
