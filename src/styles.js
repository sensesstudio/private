// Shared style constants used across multiple component files

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', fontFamily: 'var(--font-sans)', fontWeight: 300,
  fontSize: 16, color: 'var(--ink)', background: 'var(--ivory)', border: '1px solid var(--border)',
  borderRadius: 14, padding: '16px 18px', outline: 'none', minHeight: 52,
};

export const socialBtn = {
  flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  minHeight: 50, background: 'var(--ivory)', border: '1px solid var(--border)', borderRadius: 14,
  fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 14, color: 'var(--espresso)', cursor: 'pointer',
};

export const backLink = {
  display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none',
  cursor: 'pointer', fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 13,
  letterSpacing: '.04em', color: 'var(--taupe)', marginBottom: 10,
};

export const labelMini = {
  fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, letterSpacing: '.16em',
  textTransform: 'uppercase', color: 'var(--fg3)', marginBottom: 9,
};

export const metaItem = {
  display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-sans)',
  fontWeight: 300, fontSize: 13, color: 'var(--taupe)',
};

export const sheetTitle = {
  fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: 24, color: 'var(--espresso)', margin: '4px 0 18px',
};

export const linkBtn = {
  display: 'block', width: '100%', marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
  fontFamily: 'var(--font-sans)', fontWeight: 500, fontSize: 12.5, color: 'var(--taupe)',
  textAlign: 'center', textDecoration: 'underline', textUnderlineOffset: 3,
};

export const tdStyle = {
  padding: '13px 18px', fontFamily: 'var(--font-sans)', fontWeight: 300, fontSize: 13,
  color: 'var(--taupe)', whiteSpace: 'nowrap',
};
