// Ops health check: secrets present, Mindbody reachable, sync freshness,
// upcoming busy-block counts per studio. Safe to expose — prints no secrets
// and no client data.
import { db, envPresent, json, mb, staffToken } from '../_shared/mb.ts';

const HK_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Hong_Kong', hour: '2-digit', minute: '2-digit',
});

Deno.serve(async (req) => {
  // ?day=YYYY-MM-DD → list that day's busy blocks (HK time) for spot-checking
  // against the Mindbody schedule.
  const day = new URL(req.url).searchParams.get('day');
  if (day) {
    try {
      const from = new Date(`${day}T00:00:00+08:00`);
      if (isNaN(from.getTime())) return json({ error: 'use ?day=YYYY-MM-DD' }, 400);
      const to = new Date(from.getTime() + 86400_000);
      const rows = await db().select(
        'room_busy',
        `select=studio_id,starts_at,ends_at&starts_at=gte.${from.toISOString()}&starts_at=lt.${to.toISOString()}&order=studio_id,starts_at`,
      );
      return json({
        day,
        busy_blocks: rows.map((r: any) => ({
          studio: r.studio_id,
          from: HK_TIME.format(new Date(r.starts_at)),
          to: HK_TIME.format(new Date(r.ends_at)),
        })),
      });
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  }

  const out: Record<string, unknown> = { present: envPresent() };
  try {
    const token = await staffToken();
    const sites = await mb('/site/sites', token);
    out.mindbody = {
      ok: true,
      sites: (sites.Sites ?? []).map((s: any) => ({ id: s.Id, name: s.Name })),
    };
  } catch (e) {
    out.mindbody = { ok: false, error: String(e) };
  }
  try {
    const d = db();
    const [state, busy] = await Promise.all([
      d.select('sync_state', 'select=*&id=eq.mindbody'),
      d.select('room_busy', `select=studio_id&starts_at=gte.${new Date().toISOString()}&limit=2000`),
    ]);
    const counts: Record<string, number> = {};
    for (const b of busy) counts[b.studio_id] = (counts[b.studio_id] ?? 0) + 1;
    const s = state[0] ?? null;
    out.sync = {
      last_ok_at: s?.last_ok_at ?? null,
      minutes_since_ok: s?.last_ok_at
        ? Math.round((Date.now() - new Date(s.last_ok_at).getTime()) / 60000)
        : null,
      detail: s?.detail ?? null,
      upcoming_busy_blocks: counts,
    };
  } catch (e) {
    out.sync = { error: String(e) };
  }
  const mbOk = (out.mindbody as any).ok === true;
  out.summary = mbOk ? 'PASS' : 'FAIL: mindbody unreachable';
  return json(out);
});
