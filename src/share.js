// Share a booked class so the client can invite a friend to join their
// semi-private (1-on-2) session. Uses the native Web Share sheet when
// available (mobile → WhatsApp etc.), and falls back to a wa.me link, then
// to copying the text. Bilingual message, with the app link appended.

export async function shareClass({ teacherName, dayLabel, slotTime, locName, url } = {}) {
  const link = url || (typeof window !== 'undefined' ? window.location.origin : '');
  const lines = [
    '一齊嚟做我嘅 1-on-2 partner 啦！🧘',
    'Join me for a semi-private Pilates session at Senses 🧘',
    [teacherName, dayLabel, slotTime, locName].filter(Boolean).join(' · '),
    link,
  ].filter(Boolean);
  const text = lines.join('\n');

  // 1) Native share sheet (best on mobile — lets them pick WhatsApp directly).
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title: 'Senses · 1-on-2 Pilates', text });
      return 'shared';
    } catch (e) {
      if (e && e.name === 'AbortError') return 'cancelled'; // user closed the sheet
      // otherwise fall through to the WhatsApp link
    }
  }

  // 2) WhatsApp link (opens WhatsApp with the message prefilled).
  if (typeof window !== 'undefined') {
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
    return 'whatsapp';
  }

  // 3) Last resort — copy to clipboard.
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return 'copied';
    }
  } catch { /* ignore */ }
  return 'unavailable';
}
