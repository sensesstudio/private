// Ops health check: secrets present, Mindbody reachable, sync freshness,
// upcoming busy-block counts per studio. Safe to expose — prints no secrets
// and no client data.
import { db, envPresent, json, mb, staffToken } from '../_shared/mb.ts';

Deno.serve(async () => {
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
