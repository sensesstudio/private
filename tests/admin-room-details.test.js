import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler, createAuthenticator } from '../supabase/functions/admin-room-details/handler.js';
const now = () => +new Date('2026-09-16T02:00:00Z');
const row = (ref, start = '2026-09-16T02:00:00Z', end = '2026-09-16T03:00:00Z') => ({ studio_id: 'kt', starts_at: start, ends_at: end, mindbody_ref: ref, resource_id: 41 });
const request = (day = '2026-09-16') => new Request('https://example.test', { method: 'POST', headers: { authorization: 'Bearer test' }, body: JSON.stringify({ day }) });
const source = { StartDateTime: '2026-09-16T10:00:00', EndDateTime: '2026-09-16T11:00:00', Resource: { Id: 41 } };

test('private endpoint denies missing/invalid sessions and client/teacher roles before reading data', async () => {
  for (const role of [null, 'client', 'teacher']) {
    const h = createHandler({ authenticate: async () => role, readRows: () => assert.fail('private read'), staffToken: () => assert.fail('Mindbody token'), now });
    const response = await h(request());
    assert.equal(response.status, role ? 403 : 401);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  let selects = 0;
  const auth = createAuthenticator({ url: 'https://example.test', apikey: 'public-test', select: async () => { selects++; return [{ role: 'client' }]; }, fetcher: async () => Response.json({ id: 'real-id', user_metadata: { role: 'admin' } }) });
  assert.equal(await auth(''), null); assert.equal(selects, 0);
  assert.equal(await auth('Bearer verified'), 'client'); assert.equal(selects, 1);
  const invalid = createAuthenticator({ url: 'https://example.test', apikey: 'public-test', select: () => assert.fail('invalid token read'), fetcher: async () => new Response(null, { status: 401 }) });
  assert.equal(await invalid('Bearer forged'), null);
});

test('admin details restrict dates and match exact source room/time; serialize only names and booking fields', async () => {
  const rows = [row('appt:1'), row('class:2'), row('appt:3'), row('appt:4')];
  const h = createHandler({ authenticate: async () => 'admin', now, readRows: async () => rows, staffToken: async () => 'private-token', mb: async path => {
    if (path.includes('AppointmentIds=1')) return { Appointments: [{ ...source, Id: 1, Status: 'Confirmed', ClientId: 'c1', Notes: 'secret notes' }] };
    if (path.includes('AppointmentIds=3')) return { Appointments: [{ ...source, Id: 3, Status: 'Cancelled', ClientId: 'c3' }] };
    if (path.includes('AppointmentIds=4')) return { Appointments: [{ ...source, Id: 4, Status: 'Booked', ClientId: 'c4', Resource: { Id: 37 } }] };
    if (path.includes('classvisits')) return { Class: { ...source, Id: 2, ClassDescription: { Name: 'Private Pilates' }, Visits: [{ ClientId: 'c2' }, { ClientId: 'c2' }, { ClientId: 'cancel', LateCancelled: true }, { ClientId: 'wait', WaitlistEntryId: 7 }], Clients: [{ Id: 'c2', FirstName: 'Test', LastName: 'Two', Email: 'private@test' }] } };
    if (path.includes('/client/clients')) return { Clients: [{ Id: 'c1', FirstName: 'Test', LastName: 'One', Email: 'private@test', MobilePhone: '123' }, { Id: 'unrelated', FirstName: 'Unrelated' }] };
    assert.fail(path);
  } });
  const r = await h(request()); assert.equal(r.status, 200);
  const d = await r.json();
  assert.deepEqual(d.rows[0].client_names, ['Test One']); assert.equal(d.rows[0].status, 'Confirmed');
  assert.deepEqual(d.rows[1].client_names, ['Test Two']); assert.equal(d.rows[1].client_count, 1);
  assert.equal(d.rows[2].state, 'changed'); assert.equal(d.rows[3].state, 'changed');
  assert.doesNotMatch(JSON.stringify(d), /private@test|secret notes|ClientId|mindbody_ref|MobilePhone|Unrelated|private-token/);
  for (const day of ['2026-09-15', '2026-09-30', 'bad', '2026-02-30']) assert.equal((await h(request(day))).status, 400);
});

test('class with no bookings differs from missing roster and upstream failures never expose bodies', async () => {
  const h = createHandler({ authenticate: async () => 'admin', now, readRows: async () => [row('class:1'), row('class:2'), row('appt:3')], staffToken: async () => 'token', mb: async path => {
    if (path.includes('ClassId=1')) return { Class: { ...source, Id: 1, Visits: [] } };
    if (path.includes('ClassId=2')) return { Class: { ...source, Id: 2 } };
    throw Error('private@example.test');
  } });
  const d = await (await h(request())).json();
  assert.equal(d.rows[0].client_count, 0); assert.equal(d.rows[1].client_count, null); assert.equal(d.rows[2].state, 'unavailable');
  assert.doesNotMatch(JSON.stringify(d), /private@example/);
});
