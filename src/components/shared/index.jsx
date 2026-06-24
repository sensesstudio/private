import { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';

export function hkd(n) { return 'HK$' + Number(n).toLocaleString('en-HK'); }

export function useVP() {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return { w, mobile: w < 760 };
}

export function Icon({ n, size = 20, color = 'currentColor', sw = 1.6, style = {} }) {
  const iconName = n.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  const LucideIcon = LucideIcons[iconName];
  if (!LucideIcon) return <span style={{ width: size, height: size, display: 'inline-flex', flex: 'none', ...style }} />;
  return <LucideIcon size={size} color={color} strokeWidth={sw} style={{ display: 'inline-flex', flex: 'none', ...style }} />;
}

// no-op with lucide-react (icons render directly, no createIcons needed)
export function useLucide() {}

export function Pill({ children, color = 'var(--taupe)', bg = 'var(--sand)', style = {} }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)',
      fontWeight: 500, fontSize: 10, letterSpacing: '.12em', textTransform: 'uppercase',
      color, background: bg, padding: '5px 11px', borderRadius: 999, whiteSpace: 'nowrap', ...style,
    }}>{children}</span>
  );
}

export function Eyebrow({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11,
      letterSpacing: '.26em', textTransform: 'uppercase', color: 'var(--accent)', ...style,
    }}>{children}</div>
  );
}

export function Button({ children, onClick, variant = 'primary', size = 'md', full = false, icon, iconRight, disabled = false, style = {} }) {
  const sizes = {
    sm: { padding: '11px 18px', fontSize: 11 },
    md: { padding: '15px 26px', fontSize: 12 },
    lg: { padding: '18px 30px', fontSize: 12.5 },
  };
  const variants = {
    primary: { background: 'var(--taupe)', color: 'var(--ivory)', border: '1px solid var(--taupe)' },
    accent:  { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' },
    dark:    { background: 'var(--espresso)', color: 'var(--cream)', border: '1px solid var(--espresso)' },
    ghost:   { background: 'transparent', color: 'var(--espresso)', border: '1px solid var(--taupe)' },
    soft:    { background: 'var(--ivory)', color: 'var(--espresso)', border: '1px solid var(--border)' },
    light:   { background: 'var(--cream)', color: 'var(--espresso)', border: '1px solid transparent' },
  };
  return (
    <button className="tap" onClick={disabled ? undefined : onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9,
      fontFamily: 'var(--font-sans)', fontWeight: 600, letterSpacing: '.14em', textTransform: 'uppercase',
      borderRadius: 999, cursor: disabled ? 'not-allowed' : 'pointer', width: full ? '100%' : 'auto',
      opacity: disabled ? .45 : 1, minHeight: 46, lineHeight: 1,
      ...sizes[size], ...variants[variant], ...style,
    }}>
      {icon && <Icon n={icon} size={16} sw={2} />}
      {children}
      {iconRight && <Icon n={iconRight} size={16} sw={2} />}
    </button>
  );
}

export function Card({ children, pad = 20, style = {}, onClick, hover = false }) {
  return (
    <div className={onClick || hover ? 'tap card-hover' : ''} onClick={onClick} style={{
      background: 'var(--ivory)', borderRadius: 22, padding: pad,
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-soft)', ...style,
    }}>{children}</div>
  );
}

export function Avatar({ t, size = 56, radius, style = {} }) {
  const r = radius != null ? radius : '50%';
  return (
    <div className={'app-ph ' + (t.ph || '')} style={{
      width: size, height: size, borderRadius: r, flex: 'none',
      display: 'grid', placeItems: 'center', position: 'relative', ...style,
    }}>
      <span style={{
        fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: size * 0.34,
        color: 'rgba(255,255,255,.92)', letterSpacing: '.02em', textShadow: '0 1px 4px rgba(58,50,44,.25)',
      }}>{t.initials}</span>
      {t.photo && (
        <img src={t.photo} alt={t.name || ''} loading="lazy"
          onError={e => { e.currentTarget.style.display = 'none'; }}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}

export function Stars({ value, size = 13, showNum = true, reviews }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ display: 'inline-flex', gap: 1 }}>
        {[0,1,2,3,4].map(i => (
          <Icon key={i} n="star" size={size}
            color={i < Math.round(value) ? 'var(--accent)' : 'var(--linen)'}
            sw={0}
            style={{ fill: i < Math.round(value) ? 'var(--accent)' : 'var(--linen)' }} />
        ))}
      </span>
      {showNum && (
        <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12, color: 'var(--espresso)' }}>
          {value.toFixed(1)}
          {reviews != null && <span style={{ color: 'var(--fg3)', fontWeight: 300 }}> ({reviews})</span>}
        </span>
      )}
    </span>
  );
}

export function MatchBadge({ pct, size = 'md' }) {
  const dim = size === 'lg' ? 54 : 40;
  const fs = size === 'lg' ? 15 : 12;
  const r = (dim - 5) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ position: 'relative', width: dim, height: dim, flex: 'none' }}>
      <svg width={dim} height={dim} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke="var(--sand)" strokeWidth="3" />
        <circle cx={dim/2} cy={dim/2} r={r} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct/100)}
          style={{ transition: 'stroke-dashoffset 1s var(--ease)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: fs, color: 'var(--espresso)' }}>{pct}</span>
      </div>
    </div>
  );
}

export function Skel({ w = '100%', h = 14, r = 8, style = {} }) {
  return <div className="skel" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function Segmented({ options, value, onChange, style = {} }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--sand)', borderRadius: 999, padding: 4, gap: 2, ...style }}>
      {options.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        const on = v === value;
        return (
          <button key={v} className="tap" onClick={() => onChange(v)} style={{
            border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            fontWeight: on ? 600 : 500, fontSize: 11.5, letterSpacing: '.06em',
            padding: '9px 12px', borderRadius: 999, minHeight: 38,
            flex: 1, textAlign: 'center', whiteSpace: 'nowrap',
            background: on ? 'var(--ivory)' : 'transparent',
            color: on ? 'var(--espresso)' : 'var(--taupe)',
            boxShadow: on ? 'var(--shadow-sm)' : 'none', transition: 'all .25s var(--ease)',
          }}>{label}</button>
        );
      })}
    </div>
  );
}

export function PhoneFrame({ children, navBar, overlay }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--cream)' }}>
      <div className="screen-scroll" style={{ flex: 1, minHeight: 0, position: 'relative' }}>{children}</div>
      {navBar}
      <a href="https://wa.me/85298818081" target="_blank" rel="noopener noreferrer" aria-label="Chat with us on WhatsApp"
         style={{ position: 'absolute', right: 16, bottom: 'calc(78px + env(safe-area-inset-bottom))', zIndex: 45, width: 52, height: 52, borderRadius: '50%', background: 'var(--espresso)', color: 'var(--cream)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-md)', textDecoration: 'none' }}>
        <svg width="27" height="27" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M16.04 4C9.96 4 5 8.96 5 15.04c0 2.13.6 4.1 1.62 5.78L5 28l7.36-1.93a11 11 0 0 0 3.68.64h.01C22.13 26.71 27 21.75 27 15.67 27 9.6 22.12 4 16.04 4zm0 20.2c-1.18 0-2.34-.3-3.35-.88l-.24-.14-3.99 1.05 1.06-3.89-.16-.25a9.13 9.13 0 0 1-1.4-4.86c0-5.05 4.11-9.16 9.17-9.16 2.45 0 4.75.96 6.48 2.69a9.1 9.1 0 0 1 2.68 6.48c0 5.05-4.11 9.16-9.16 9.16zm5.03-6.86c-.27-.14-1.63-.8-1.88-.9-.25-.09-.43-.14-.61.14-.18.27-.7.9-.86 1.08-.16.18-.32.2-.59.07-.27-.14-1.16-.43-2.2-1.36-.81-.72-1.36-1.62-1.52-1.89-.16-.27-.02-.42.12-.55.12-.12.27-.32.4-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.47-.84-2.01-.22-.53-.44-.46-.61-.46-.16 0-.34-.02-.52-.02s-.48.07-.73.34c-.25.27-.96.94-.96 2.3s.98 2.66 1.12 2.85c.14.18 1.93 2.95 4.68 4.13.65.28 1.16.45 1.56.58.66.21 1.25.18 1.72.11.52-.08 1.63-.67 1.86-1.31.23-.64.23-1.19.16-1.31-.07-.12-.25-.18-.52-.32z"/></svg>
      </a>
      {overlay}
    </div>
  );
}

export function Sheet({ open, onClose, children, maxH = '92%' }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 90, background: 'rgba(35,30,26,.42)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxHeight: maxH, overflowY: 'auto', background: 'var(--cream)', borderTopLeftRadius: 30, borderTopRightRadius: 30, boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ position: 'sticky', top: 0, padding: '12px 0 6px', display: 'grid', placeItems: 'center', background: 'var(--cream)', zIndex: 2 }}>
          <div style={{ width: 42, height: 5, borderRadius: 999, background: 'var(--linen)' }} />
        </div>
        {children}
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children, w = 520 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(35,30,26,.46)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: w, maxHeight: '88vh', overflowY: 'auto', background: 'var(--cream)', borderRadius: 26, boxShadow: 'var(--shadow-lg)' }}>{children}</div>
    </div>
  );
}

export function SpecChips({ items, accent = false }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {items.map(s => (
        <span key={s} style={{
          fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 11,
          color: accent ? 'var(--accent)' : 'var(--taupe)',
          background: accent ? 'var(--accent-tint)' : 'var(--sand)',
          padding: '6px 12px', borderRadius: 999,
        }}>{s}</span>
      ))}
    </div>
  );
}

export function downloadCSV(filename, headers, rows) {
  const esc = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
}

const _liveProgress = { entries: [] };

export function addLiveProgress(entry) {
  _liveProgress.entries = [{ id: 'live' + Date.now(), date: new Date().toISOString().slice(0, 10), ...entry }, ..._liveProgress.entries];
  window.dispatchEvent(new CustomEvent('progresschange'));
}

export function useLiveProgress(cId) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force(x => x + 1);
    window.addEventListener('progresschange', h);
    return () => window.removeEventListener('progresschange', h);
  }, []);
  return cId ? _liveProgress.entries.filter(e => e.cId === cId) : _liveProgress.entries;
}

// Client session reviews — shared across portals (client writes, teacher & admin see).
const _liveReviews = { items: [] };

export function addReview(r) {
  _liveReviews.items = [{ id: 'rev' + Date.now(), date: new Date().toISOString().slice(0, 10), ...r }, ..._liveReviews.items];
  window.dispatchEvent(new CustomEvent('reviewchange'));
}

export function useLiveReviews(filter) {
  const [, force] = useState(0);
  useEffect(() => {
    const h = () => force(x => x + 1);
    window.addEventListener('reviewchange', h);
    return () => window.removeEventListener('reviewchange', h);
  }, []);
  const all = _liveReviews.items;
  if (!filter) return all;
  if (filter.tId) return all.filter(r => r.tId === filter.tId);
  if (filter.cId) return all.filter(r => r.cId === filter.cId);
  return all;
}
