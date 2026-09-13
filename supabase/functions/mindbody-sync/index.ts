// Pulls the next 14 days of Mindbody bookings for the 3 client-bookable rooms
// and mirrors them into room_busy (start/end times only — no client data).
// Called every 5 minutes by pg_cron; protected by the x-sync-key header.
import { db, hkToIso, json, mb, norm, staffToken } from '../_shared/mb.ts';

const WINDOW_DAYS = 14;
const PAGE = 200;
const MAX_PAGES = 10;

async function paged(pathBase: string, listKey: string, token: string): Promise<any[]> {
  const all: any[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const d = await mb(`${pathBase}&Limit=${PAGE}&Offset=${page * PAGE}`, token);
    const items = d[listKey] ?? [];
    all.push(...items);
    const total = d.PaginationResponse?.TotalResults ?? items.length;
    if (all.length >= total || items.length === 0) break;
  }
  return all;
}

Deno.serve(async (req) => {
  const expected = (Deno.env.get('SYNC_KEY') ?? '').trim();
  if (!expected) return json({ error: 'SYNC_KEY not configured' }, 503);
  if ((req.headers.get('x-sync-key') ?? '') !== expected) {
    return json({ error: 'forbidden' }, 403);
  }

  const d = db();
  const startedAt = new Date().toISOString();
  try {
    const token = await staffToken();

    // 1. Resolve room name patterns to Mindbody resource IDs (self-healing).
    const rooms: any[] = await d.select('mindbody_rooms', 'select=*&active=eq.true');
    const res = await mb('/site/resources?Limit=200', token);
    const resources = (res.Resources ?? []).map((r: any) => ({ id: r.Id, name: r.Name }));
    const byResource = new Map<number, string>(); // resource id -> studio_id
    const resolved: any[] = [];
    for (const room of rooms) {
      const hit = resources.find((r: any) => norm(r.name) === norm(room.match_pattern)) ??
        resources.find((r: any) => norm(r.name).includes(norm(room.match_pattern)) ||
          norm(room.match_pattern).includes(norm(r.name)));
      if (hit) {
        byResource.set(hit.id, room.studio_id);
        resolved.push({ studio_id: room.studio_id, resource_id: hit.id, resource_name: hit.name });
        if (room.resource_id !== hit.id || room.resource_name !== hit.name) {
          await d.patch('mindbody_rooms', `studio_id=eq.${room.studio_id}`, {
            resource_id: hit.id, resource_name: hit.name, updated_at: new Date().toISOString(),
          });
        }
      } else {
        resolved.push({ studio_id: room.studio_id, resource_id: null, unmatched_pattern: room.match_pattern });
      }
    }

    // 2. Sync window: today 00:00 HK → +14 days.
    const now = new Date();
    const hkMidnight = new Date(now.getTime() + 8 * 3600_000);
    hkMidnight.setUTCHours(0, 0, 0, 0);
    const from = new Date(hkMidnight.getTime() - 8 * 3600_000);
    const until = new Date(from.getTime() + WINDOW_DAYS * 86400_000);
    const day = (t: Date) => t.toISOString().slice(0, 10);

    // 3. Appointments + classes occupying the mapped rooms.
    const appts = await paged(
      `/appointment/staffappointments?StartDate=${day(from)}&EndDate=${day(until)}`,
      'Appointments', token,
    );
    const classes = await paged(
      `/class/classes?StartDateTime=${day(from)}T00:00:00&EndDateTime=${day(until)}T23:59:59`,
      'Classes', token,
    );

    const rows: any[] = [];
    let apptHits = 0, classHits = 0;
    for (const a of appts) {
      if (String(a.Status ?? '').toLowerCase() === 'cancelled') continue;
      const rs = a.Resources ?? (a.Resource ? [a.Resource] : []);
      for (const r of rs) {
        const studio = byResource.get(r?.Id);
        if (studio && a.StartDateTime && a.EndDateTime) {
          rows.push({
            studio_id: studio,
            starts_at: hkToIso(a.StartDateTime),
            ends_at: hkToIso(a.EndDateTime),
            ref: `appt:${a.Id}`,
          });
          apptHits++;
        }
      }
    }
    for (const c of classes) {
      if (c.IsCanceled) continue;
      const rs = c.Resources ?? (c.Resource ? [c.Resource] : []);
      for (const r of rs) {
        const studio = byResource.get(r?.Id);
        if (studio && c.StartDateTime && c.EndDateTime) {
          rows.push({
            studio_id: studio,
            starts_at: hkToIso(c.StartDateTime),
            ends_at: hkToIso(c.EndDateTime),
            ref: `class:${c.Id}`,
          });
          classHits++;
        }
      }
    }

    // 4. Atomically replace the mindbody-sourced window.
    const written = await d.rpc('replace_room_busy', {
      p_rows: rows, p_from: from.toISOString(), p_until: until.toISOString(),
    });

    const detail = {
      rooms: resolved,
      window: { from: from.toISOString(), until: until.toISOString() },
      fetched: { appointments: appts.length, classes: classes.length },
      matched: { appointments: apptHits, classes: classHits },
      busy_blocks_written: written,
    };
    await d.upsert('sync_state', {
      id: 'mindbody', last_run_at: startedAt, last_ok_at: new Date().toISOString(), detail,
    });
    return json({ ok: true, ...detail });
  } catch (e) {
    try {
      await d.upsert('sync_state', {
        id: 'mindbody', last_run_at: startedAt, detail: { error: String(e) },
      });
    } catch { /* keep original error */ }
    return json({ ok: false, error: String(e) }, 500);
  }
});
