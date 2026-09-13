// Shared Mindbody + database helpers for edge functions.
// Mindbody Public API v6; site timezone is Asia/Hong_Kong (UTC+8, no DST).

const BASE = 'https://api.mindbodyonline.com/public/v6';

export const SITE_ID = (Deno.env.get('MINDBODY_SITE_ID') ?? '').trim();
const API_KEY = (Deno.env.get('MINDBODY_API_KEY') ?? '').trim();
const STAFF_USER = (Deno.env.get('MINDBODY_STAFF_USER') ?? '').trim();
const STAFF_PASS = (Deno.env.get('MINDBODY_STAFF_PASS') ?? '').trim();

export function envPresent() {
  return {
    MINDBODY_API_KEY: !!API_KEY,
    MINDBODY_SITE_ID: !!SITE_ID,
    MINDBODY_STAFF_USER: !!STAFF_USER,
    MINDBODY_STAFF_PASS: !!STAFF_PASS,
  };
}

function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Api-Key': API_KEY,
    SiteId: SITE_ID,
    'Content-Type': 'application/json',
  };
  if (token) h.Authorization = token;
  return h;
}

export async function staffToken(): Promise<string> {
  const r = await fetch(`${BASE}/usertoken/issue`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ Username: STAFF_USER, Password: STAFF_PASS }),
  });
  if (!r.ok) throw new Error(`usertoken/issue ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.AccessToken as string;
}

export async function mb(path: string, token?: string): Promise<any> {
  const r = await fetch(`${BASE}${path}`, { headers: headers(token) });
  if (!r.ok) throw new Error(`${path.split('?')[0]} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return await r.json();
}

// Mindbody returns naive local datetimes ("2026-09-14T10:00:00"); pin to HK time.
export function hkToIso(local: string): string {
  return new Date(`${local}+08:00`).toISOString();
}

export const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

// Minimal PostgREST client using the service-role key (edge functions get
// SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY injected automatically).
export function db() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const h = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  return {
    async select(table: string, qs: string): Promise<any[]> {
      const r = await fetch(`${url}/rest/v1/${table}?${qs}`, { headers: h });
      if (!r.ok) throw new Error(`db select ${table} ${r.status}`);
      return await r.json();
    },
    async patch(table: string, qs: string, body: unknown): Promise<void> {
      const r = await fetch(`${url}/rest/v1/${table}?${qs}`, {
        method: 'PATCH', headers: h, body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`db patch ${table} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    },
    async upsert(table: string, body: unknown): Promise<void> {
      const r = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...h, Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`db upsert ${table} ${r.status}: ${(await r.text()).slice(0, 200)}`);
    },
    async rpc(fn: string, args: unknown): Promise<any> {
      const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST', headers: h, body: JSON.stringify(args),
      });
      if (!r.ok) throw new Error(`rpc ${fn} ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return r.status === 204 ? null : await r.json();
    },
  };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
