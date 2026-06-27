import { useState, useRef, useEffect } from 'react';
import { Icon, Avatar } from '../shared/index.jsx';
import { locName } from '../../data.js';
import { useSlots } from '../../slots.js';
import { askAssistant } from '../../chat/ask.js';

const EXAMPLES = [
  'Any Reformer slots tomorrow afternoon?',
  '聽日晏晝有冇 Reformer 位？',
  'Cantonese teacher in Causeway Bay this week',
];

function SlotCard({ s, onPick }) {
  return (
    <button className="tap" onClick={() => onPick(s.teacherId, s.dayIdx, s.time)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 14, padding: 11, boxShadow: 'var(--shadow-sm)' }}>
      <Avatar t={s.teacher} size={42} radius={12} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 14.5, color: 'var(--espresso)', lineHeight: 1.1 }}>{s.day.dow} {s.day.dom} · {s.time}</div>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 11.5, color: 'var(--taupe)', marginTop: 2 }}>{s.teacher.name} · {s.teacher.specs[0]} · {locName(s.teacher.locId)}</div>
      </div>
      <span style={{ flex: 'none', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 11, color: '#fff', background: 'var(--accent)', borderRadius: 999, padding: '6px 13px' }}>Book</span>
    </button>
  );
}

function Bubble({ m, onChip, onPick }) {
  const user = m.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: user ? 'flex-end' : 'flex-start', gap: 8 }}>
      {m.text && (
        <div style={{ maxWidth: '85%', background: user ? 'var(--accent)' : 'var(--ivory)', color: user ? '#fff' : 'var(--espresso)', border: user ? 'none' : '1px solid var(--border-soft)', borderRadius: 16, padding: '10px 13px', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13.5, lineHeight: 1.5 }}>{m.text}</div>
      )}
      {m.chips && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, maxWidth: '92%' }}>
          {m.chips.map(c => (
            <button key={c} className="tap" onClick={() => onChip(c)} style={{ cursor: 'pointer', background: 'var(--accent-tint)', border: '1px solid var(--accent)', borderRadius: 999, padding: '7px 12px', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--accent)' }}>{c}</button>
          ))}
        </div>
      )}
      {m.suggestions && m.suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '92%' }}>
          {m.suggestions.map((s, i) => <SlotCard key={s.slot.id + i} s={s} onPick={onPick} />)}
        </div>
      )}
    </div>
  );
}

export function ChatAssistant({ onPickSlot }) {
  useSlots(); // re-render as availability changes
  const [messages, setMessages] = useState([
    { id: 'seed', role: 'assistant', text: "Hi! Ask me about availability — in English or 中文. For example:", chips: EXAMPLES },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  const send = async (textArg) => {
    const text = (typeof textArg === 'string' ? textArg : input).trim();
    if (!text || busy) return;
    setInput('');
    setMessages(m => [...m, { id: 'u' + Date.now(), role: 'user', text }]);
    setBusy(true);
    try {
      const { reply, suggestions, clarify } = await askAssistant(text, []);
      setMessages(m => [...m, { id: 'a' + Date.now(), role: 'assistant', text: reply, suggestions, chips: clarify ? EXAMPLES : undefined }]);
    } catch {
      setMessages(m => [...m, { id: 'a' + Date.now(), role: 'assistant', text: 'Sorry — something went wrong. Please try again, or tap the WhatsApp button to reach us.' }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 20px 6px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 30, color: 'var(--espresso)', margin: '6px 0 4px' }}>Ask Senses</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13, color: 'var(--fg3)', margin: 0 }}>Tell me what you're after — any language. I'll check live availability.</p>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 13, padding: '14px 18px 16px' }}>
        {messages.map(m => <Bubble key={m.id} m={m} onChip={send} onPick={onPickSlot} />)}
        {busy && (
          <div style={{ alignSelf: 'flex-start', background: 'var(--ivory)', border: '1px solid var(--border-soft)', borderRadius: 16, padding: '10px 14px', fontFamily: 'var(--font-sans)', fontSize: 14, color: 'var(--taupe)', letterSpacing: '.1em' }}>…</div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ position: 'sticky', bottom: 0, background: 'var(--cream)', borderTop: '1px solid var(--border-soft)', padding: '10px 16px calc(12px + env(safe-area-inset-bottom))', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }} placeholder="Ask about availability…" style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 15, color: 'var(--ink)', background: 'var(--ivory)', border: '1px solid var(--border)', borderRadius: 999, padding: '12px 16px', outline: 'none' }} />
        <button className="tap" onClick={() => send()} disabled={busy} aria-label="Send" style={{ flex: 'none', width: 46, height: 46, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--accent)', display: 'grid', placeItems: 'center', opacity: busy ? 0.6 : 1 }}><Icon n="arrow-up" size={20} color="#fff" sw={2.4} /></button>
      </div>
    </div>
  );
}
