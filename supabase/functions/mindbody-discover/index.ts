// TEMPORARY diagnostics: lists Mindbody rooms/resources + locations and shows
// how they match the 3 client-bookable rooms configured in mindbody_rooms.
// Remove (or re-enable JWT) once the sync is verified.
import { db, json, mb, norm, staffToken } from '../_shared/mb.ts';

Deno.serve(async () => {
  try {
    const token = await staffToken();
    const [resources, locations, rooms] = await Promise.all([
      mb('/site/resources?Limit=200', token),
      mb('/site/locations?Limit=200', token),
      db().select('mindbody_rooms', 'select=*'),
    ]);
    const list = (resources.Resources ?? []).map((r: any) => ({ id: r.Id, name: r.Name }));
    const matches = rooms.map((room: any) => {
      const hit = list.find((r: any) => norm(r.name) === norm(room.match_pattern)) ??
        list.find((r: any) => norm(r.name).includes(norm(room.match_pattern)) ||
          norm(room.match_pattern).includes(norm(r.name)));
      return {
        studio_id: room.studio_id,
        pattern: room.match_pattern,
        matched: hit ?? null,
      };
    });
    return json({
      locations: (locations.Locations ?? []).map((l: any) => ({ id: l.Id, name: l.Name })),
      all_resources: list,
      configured_rooms: matches,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
