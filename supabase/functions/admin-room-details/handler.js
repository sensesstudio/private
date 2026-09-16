// Admin-only, read-through Mindbody details. No names enter public snapshots,
// database tables, logs, browser storage or shared caches.
const DAY = 86400000;
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
const reply = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const name = client => [client?.FirstName, client?.LastName].filter(v => typeof v === 'string').join(' ').trim().slice(0, 200);
const instant = value => +new Date(value && /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}+08:00`);
const cancelled = value => /^(cancelled|canceled|latecancelled)$/i.test(value || '');

export function createHandler({ authenticate, readRows, staffToken, mb, now = Date.now }) {
  return async req => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
    try {
      // authenticate verifies the token against Auth, then reads the protected
      // database role. Never trust a client-supplied role or user_metadata.
      const role = await authenticate(req.headers.get('authorization') || '');
      if (!role) return reply({ error: 'authentication_required' }, 401);
      if (role !== 'admin') return reply({ error: 'admin_access_required' }, 403);
      let body;
      try { body = await req.json(); } catch { return reply({ error: 'invalid_date' }, 400); }
      const day = body?.day;
      const today = new Date(now() + 8 * 3600000).toISOString().slice(0, 10);
      const start = +new Date(`${day}T00:00:00+08:00`);
      const first = +new Date(`${today}T00:00:00+08:00`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || !Number.isFinite(start) || new Date(start + 8 * 3600000).toISOString().slice(0, 10) !== day || start < first || start >= first + 14 * DAY) return reply({ error: 'invalid_date' }, 400);
      const rows = await readRows(new Date(start).toISOString(), new Date(start + DAY).toISOString());
      if (rows.length > 96) return reply({ error: 'details_unavailable' }, 503);
      const refs = [...new Set(rows.map(r => r.mindbody_ref).filter(r => /^(appt|class):\d+$/.test(r || '')))];
      const token = refs.length ? await staffToken() : null;
      const records = new Map(), clients = new Map();
      // Four concurrent reads at most; failures are isolated to their row.
      let cursor = 0;
      await Promise.all(Array.from({ length: Math.min(4, refs.length) }, async () => {
        while (cursor < refs.length) {
          const ref = refs[cursor++], [kind, id] = ref.split(':');
          try {
            if (kind === 'appt') {
              const original = rows.find(row => row.mindbody_ref === ref);
              const sourceDay = new Date(+new Date(original.starts_at) + 8 * 3600000).toISOString().slice(0, 10);
              const data = await mb(`/appointment/staffappointments?AppointmentIds=${id}&StartDate=${sourceDay}&EndDate=${day}&Limit=200`, token);
              const a = data.Appointments?.find(a => String(a.Id) === id);
              if (!a) continue;
              records.set(ref, { kind: 'Appointment', source: a, status: a.IsWaitlist ? 'Waitlisted' : a.Status || 'Status unavailable', ids: a.ClientId && !cancelled(a.Status) && !a.IsWaitlist ? [String(a.ClientId)] : [] });
            } else {
              const data = await mb(`/class/classvisits?ClassId=${id}`, token);
              const c = data.Class;
              if (!c || String(c.Id) !== id) continue;
              const visits = c.Visits;
              const ids = Array.isArray(visits) ? [...new Set(visits.filter(v => !v.LateCancelled && v.Action !== 'Removed' && !v.WaitlistEntryId).map(v => v.ClientId).filter(Boolean).map(String))] : null;
              for (const client of c.Clients || []) if (ids?.includes(String(client.Id))) clients.set(String(client.Id), name(client));
              records.set(ref, { kind: 'Class', source: c, status: c.IsCanceled ? 'Cancelled' : 'Scheduled', ids, title: typeof c.ClassDescription?.Name === 'string' ? c.ClassDescription.Name.slice(0, 200) : null });
            }
          } catch { /* Never echo upstream error bodies containing private data. */ }
        }
      }));
      const ids = [...new Set([...records.values()].flatMap(r => r.ids || []))].filter(id => !clients.get(id));
      for (let i = 0; i < ids.length; i += 20) {
        const batch = ids.slice(i, i + 20);
        try {
          const qs = batch.map(id => `ClientIds=${encodeURIComponent(id)}`).join('&');
          const data = await mb(`/client/clients?${qs}&IncludeInactive=true&Limit=200`, token);
          for (const client of data.Clients || []) if (batch.includes(String(client.Id))) clients.set(String(client.Id), name(client));
        } catch { /* Keep the occupancy, mark missing names explicitly. */ }
      }
      return reply({ day, fetched_at: new Date(now()).toISOString(), rows: rows.map(row => {
        const base = { studio_id: row.studio_id, starts_at: row.starts_at, ends_at: row.ends_at };
        const r = records.get(row.mindbody_ref);
        if (!r) return { ...base, state: 'unavailable' };
        const s = r.source;
        const roomMatches = (s.Resources || (s.Resource ? [s.Resource] : [])).some(resource => Number(resource.Id) === Number(row.resource_id));
        // A rescheduled/cancelled source must not label an old occupied block.
        if (cancelled(r.status) || r.status === 'Waitlisted' || !roomMatches || instant(s.StartDateTime) !== +new Date(row.starts_at) || instant(s.EndDateTime) !== +new Date(row.ends_at)) return { ...base, state: 'changed', kind: r.kind, status: r.status };
        const names = (r.ids || []).map(id => clients.get(id)).filter(Boolean);
        return { ...base, state: 'current', kind: r.kind, status: r.status, title: r.title || null, client_names: names, missing_names: r.ids === null ? null : r.ids.length - names.length, client_count: r.ids?.length ?? null };
      }) });
    } catch { return reply({ error: 'details_unavailable' }, 503); }
  };
}

export function createAuthenticator({ url, apikey, select, fetcher = fetch }) {
  return async authorization => {
    if (!/^Bearer\s+\S+$/i.test(authorization)) return null;
    const response = await fetcher(`${url}/auth/v1/user`, {
      headers: { Authorization: authorization, apikey }, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (!user.id) return null;
    const profiles = await select('profiles', `select=role&id=eq.${encodeURIComponent(user.id)}`);
    return profiles[0]?.role || null;
  };
}
