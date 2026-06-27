// Supabase Edge Function: natural-language booking assistant ("Ask").
//
// The client sends a free-form question (English or Cantonese) — e.g.
// "any Reformer slots tomorrow afternoon?" / "聽日晏晝有冇 Reformer 位？".
// We call Claude (Haiku 4.5) with a FORCED tool so it returns a strict
// `intent` object plus a short natural reply mirroring the user's language.
//
// We deliberately do NOT send slot/availability data to Claude. The client
// owns the live slot store and runs the deterministic match (findSlots) +
// booking against the returned intent — so suggestions are always real and
// bookable, and slot data never leaves the browser.
//
// Required secret: ANTHROPIC_API_KEY
// Deploy with **Verify JWT OFF** so guests (not signed in) can use it too.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Mirrors src/chat/parse.js — the same `intent` shape the client fallback emits.
const SYSTEM = `You are the booking assistant for Senses, a boutique private Pilates studio in Hong Kong. Clients message you in English or Cantonese (繁體中文) to find available class times. Your ONLY job is to understand the request and call the propose_search tool — you never see the actual schedule, the app fills in real slots after you.

Always call propose_search exactly once. Map the request onto these fixed options (use null when the client didn't specify):

need (class / focus, pick the closest one):
- reformer — Reformer, rehab, injury recovery, 復康/康復/受傷/普拉提機
- contemporary — strength, core, athletic, 力量/核心/肌力
- prenatal — pre/post-natal, pregnancy, restorative, 產前/產後/懷孕/孕婦/修復
- mat — mat work, mobility, conditioning, 墊上/柔韌/靈活
- foundations — posture, alignment, beginner, 姿勢/體態/入門/新手
- gyrotonic — Gyrotonic
- polestar — Polestar method
- stott — STOTT method

dayIdx: 0 = today, 1 = tomorrow (聽日/明天), 2 = day after (後日). null if no specific day.
daySpan: if no specific day but a range like "this week / 今個禮拜 / 近排" is implied, set 7; otherwise leave 3.
timeOfDay: "morning" (朝早/上晝/早上), "afternoon" (晏晝/下晝/中午), "evening" (夜晚/晚上/今晚), else null.
studio (location): central (中環), cwb (Causeway Bay/銅鑼灣), qb (Quarry Bay/鰂魚涌), kt (Kwun Tong/觀塘), lck (Lai Chi Kok/荔枝角), else null.
teacher: one of t1 Hailey Saw, t2 Minna Ho, t3 Evanne Lam, t4 Vesta Ko, t5 Stacey Gim — only if the client names them; else null.
language: instruction language the client wants — "Cantonese", "English", or "Mandarin"; else null.

understood: true if the message is a genuine request to find / book a class. Set it to false for gibberish, spam, or anything off-topic (not about Pilates classes, times, teachers or studios). When understood is false, leave all the search fields null and make `reply` a short, friendly redirect in the client's language, e.g. "我淨係幫到手搵堂期空檔 😅 試下話我知邊日或者邊種堂？" / "I can only help with class availability — try telling me a class, day or studio.".

reply: ONE short, warm sentence in the SAME language the client used (Cantonese → reply in 繁體中文, English → English). Do NOT list specific times or claim availability — the app shows the real slots right under your reply. Just acknowledge what you're looking for, e.g. "Let me check Reformer times for tomorrow afternoon —" / "幫你睇下聽日晏晝嘅 Reformer 位 —".`;

const TOOL = {
  name: 'propose_search',
  description: 'Record the structured availability search and a short natural-language reply.',
  input_schema: {
    type: 'object',
    properties: {
      reply: { type: 'string', description: 'One short, warm sentence in the same language the client used. No specific times.' },
      understood: { type: 'boolean', description: 'true if this is a real class-availability request; false for gibberish / off-topic / spam.' },
      need: { type: ['string', 'null'], enum: ['reformer', 'contemporary', 'prenatal', 'mat', 'foundations', 'gyrotonic', 'polestar', 'stott', null] },
      dayIdx: { type: ['integer', 'null'], description: '0=today, 1=tomorrow, 2=day after, null=unspecified' },
      daySpan: { type: ['integer', 'null'], description: 'Days to scan when dayIdx is null (3 default, 7 for "this week").' },
      timeOfDay: { type: ['string', 'null'], enum: ['morning', 'afternoon', 'evening', null] },
      studio: { type: ['string', 'null'], enum: ['central', 'cwb', 'qb', 'kt', 'lck', null] },
      teacher: { type: ['string', 'null'], enum: ['t1', 't2', 't3', 't4', 't5', null] },
      language: { type: ['string', 'null'], enum: ['Cantonese', 'English', 'Mandarin', null] },
    },
    required: ['reply'],
  },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'not_configured' }, 503);

    const { message, history } = await req.json();
    if (!message || typeof message !== 'string') return json({ error: 'no_message' }, 400);

    // Short rolling context: prior turns as {role, text}. Keep it small & cheap.
    const prior = Array.isArray(history)
      ? history.filter((h) => h && (h.role === 'user' || h.role === 'assistant') && h.text)
          .slice(-6)
          .map((h) => ({ role: h.role, content: String(h.text) }))
      : [];

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'tool', name: 'propose_search' },
        messages: [...prior, { role: 'user', content: message }],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return json({ error: 'upstream', status: res.status, detail }, 502);
    }

    const data = await res.json();
    const block = Array.isArray(data.content)
      ? data.content.find((b: { type: string }) => b.type === 'tool_use')
      : null;
    if (!block || !block.input) return json({ error: 'no_tool_use' }, 502);

    const i = block.input as Record<string, unknown>;
    const reply = typeof i.reply === 'string' ? i.reply : null;
    const understood = i.understood === false ? false : true; // default true
    const intent = {
      need: (i.need as string) ?? null,
      dayIdx: i.dayIdx === null || i.dayIdx === undefined ? null : Number(i.dayIdx),
      daySpan: i.daySpan === null || i.daySpan === undefined ? 3 : Number(i.daySpan),
      timeOfDay: (i.timeOfDay as string) ?? null,
      studio: (i.studio as string) ?? null,
      teacher: (i.teacher as string) ?? null,
      language: (i.language as string) ?? null,
      raw: message,
    };

    return json({ intent, reply, understood });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
