import { db, mb, staffToken } from '../_shared/mb.ts';
import { createHandler, createAuthenticator } from './handler.js';

Deno.serve(createHandler({
  authenticate: createAuthenticator({
    url: Deno.env.get('SUPABASE_URL')!, apikey: Deno.env.get('SUPABASE_ANON_KEY')!, select: db().select,
  }),
  async readRows(from: string, until: string) {
    const d = db();
    const [rows, rooms] = await Promise.all([
      d.select('room_busy', `select=studio_id,starts_at,ends_at,mindbody_ref&source=eq.mindbody&starts_at=lt.${encodeURIComponent(until)}&ends_at=gt.${encodeURIComponent(from)}&order=starts_at&limit=97`),
      d.select('mindbody_rooms', 'select=studio_id,resource_id&active=eq.true'),
    ]);
    return rows.filter(r => ['kt', 'cwb', 'central'].includes(r.studio_id)).map(r => ({ ...r, resource_id: rooms.find(room => room.studio_id === r.studio_id)?.resource_id }));
  },
  staffToken,
  mb: (path: string, token: string) => mb(path, token, AbortSignal.timeout(10000)),
}));
