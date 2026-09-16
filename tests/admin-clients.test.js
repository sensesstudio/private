import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { rawClientRows, clientDirectoryFixture } from './fixtures/client-import.js';
import { groupClients, filterClients, packageStatus } from '../src/admin/clients.js';

test('CSV import preserves all source fields, duplicates and identifiers; only admins may read', async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;`);
  const migration = async name => readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), 'utf8');
  await db.exec((await migration('0001_init.sql')).replace('create extension if not exists pgcrypto;', ''));
  await db.exec(await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8'));
  await db.exec((await migration('0004_mindbody_rooms.sql')).replace(/create extension if not exists pg_(cron|net);/g, ''));
  await db.exec('grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;');
  await db.exec(await migration('0005_live_availability.sql'));
  await db.exec(await migration('20260916070412_admin_client_csv.sql'));
  const ids = { admin: '11111111-0000-4000-8000-000000000001', client: '11111111-0000-4000-8000-000000000002', teacher: '11111111-0000-4000-8000-000000000003' };
  for (const [role, id] of Object.entries(ids)) {
    await db.query('insert into auth.users values ($1)', [id]);
    await db.query('insert into public.profiles(id,role,full_name) values ($1,$2,$3)', [id, role, `Synthetic ${role}`]);
  }
  const as = async (role, id = '') => db.exec(`reset role; select set_config('request.jwt.claim.sub','${id}',false); set role ${role};`);
  const ingest = (rows = rawClientRows, hash = 'a'.repeat(64)) => db.query('select public.import_admin_client_packages($1,$2,$3,$4::jsonb) as id', ['synthetic-clients.csv', hash, '2026-09-30', JSON.stringify(rows)]);
  await as('service_role');
  const first = (await ingest()).rows[0].id;
  assert.equal((await ingest()).rows[0].id, first);
  assert.equal((await db.query('select count(*)::int n from admin_client_imports')).rows[0].n, 1);
  const stored = (await db.query('select * from admin_client_packages order by source_row')).rows;
  assert.deepEqual(stored.map(r => r.raw_data), rawClientRows);
  assert.equal(stored[0].client_id, '1000000000000000000001');
  assert.equal(stored[0].phone, '00123456789');
  assert.deepEqual(stored.map(r => r.duplicate_of_row), [null, null, 2, null]);
  assert.equal(stored[3].visits_since_jun, null);
  await assert.rejects(ingest([{ ...rawClientRows[0], Credits_left: '-1' }], 'b'.repeat(64)), /check constraint/);
  await assert.rejects(ingest([{ ...rawClientRows[0], Days_to_expiry: '9' }], 'c'.repeat(64)), /inconsistent_snapshot_date/);
  await assert.rejects(ingest([{ ...rawClientRows[0], Extra: 'unsupported' }], 'd'.repeat(64)), /unexpected_csv_columns/);
  assert.equal((await db.query('select count(*)::int n from admin_client_imports')).rows[0].n, 1);
  assert.equal((await db.query('select count(*)::int n from credit_ledger')).rows[0].n, 0);
  assert.equal((await db.query('select count(*)::int n from profiles')).rows[0].n, 3);
  await as('anon');
  await assert.rejects(db.query('select * from admin_client_packages'), /permission denied/);
  await assert.rejects(db.query('select * from admin_client_imports'), /permission denied/);
  await assert.rejects(db.query('select admin_client_directory()'), /permission denied/);
  await assert.rejects(ingest(), /permission denied/);
  for (const role of ['client','teacher']) {
    await as('authenticated', ids[role]);
    assert.deepEqual((await db.query('select * from admin_client_packages')).rows, []);
    assert.deepEqual((await db.query('select * from admin_client_imports')).rows, []);
    await assert.rejects(db.query('select admin_client_directory()'), /admin_access_required/);
    await assert.rejects(ingest(), /permission denied/);
  }
  await as('authenticated', ids.admin);
  await db.exec('begin');
  const directory = (await db.query('select admin_client_directory() as data')).rows[0].data;
  assert.equal(directory.import.row_count, 4);
  assert.equal(directory.rows.length, 4);
  assert.equal(directory.rows[0].client_name, 'Example Package Holder');
  assert.equal('raw_data' in directory.rows[0], false);
  assert.equal('source_sha256' in directory.import, false);
  assert.match((await db.query("select current_setting('response.headers') as h")).rows[0].h, /no-store/);
  await db.exec('commit');
  await assert.rejects(db.query("update admin_client_packages set credits_left=0"), /permission denied/);
  await assert.rejects(ingest(), /permission denied/);
  await as('anon');
  const publicData = JSON.stringify((await db.query('select availability_snapshot() as data')).rows[0].data);
  for (const privateValue of ['Example Package Holder','holder@example.test','00123456789','1000000000000000000001']) assert.equal(publicData.includes(privateValue), false);
});

test('client summaries keep all packages, count visits once, preserve missing values and filter the snapshot', () => {
  const { rows, import: batch } = clientDirectoryFixture();
  const clients = groupClients(rows);
  assert.equal(clients.length, 2);
  assert.equal(clients[0].packages.length, 3);
  assert.equal(clients[0].credits, 11);
  assert.equal(clients[0].visits, '7');
  assert.equal(clients[0].duplicates, 1);
  assert.equal(clients[1].visits, '—');
  for (const query of ['holder@example.test','00123456789','1000000000000000000001','Example Private 5']) assert.equal(filterClients(clients, query, 'all', batch.as_of).length, 1);
  assert.equal(filterClients(clients, '', 'duplicates', batch.as_of).length, 1);
  assert.equal(filterClients(clients, '', 'expiring', batch.as_of).length, 2);
  assert.equal(packageStatus(clients[0].packages, batch.as_of), 'Expires within 30 days');
  assert.equal(packageStatus(clients[1].packages, batch.as_of), 'Expires today');
  assert.equal(packageStatus(clients[1].packages, '2026-10-01'), 'Expired');
  assert.equal(packageStatus([{ ...rows[0], credits_left: 0 }], batch.as_of), 'No credits');
});
