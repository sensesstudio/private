import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { rawClientRows, clientDirectoryFixture } from './fixtures/client-import.js';
import { groupClients, filterClients, packageStatus, sortClients } from '../src/admin/clients.js';

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
  await db.exec('reset role');
  await db.exec(await migration('20260916081040_admin_client_editing.sql'));
  await db.exec(await migration('20260916081703_mindbody_client_packages.sql'));
  await db.exec(await migration('20260916091926_admin_client_last_visit.sql'));
  const saveClient = (id, version, name = 'Synthetic Added Client') => db.query('select save_studio_client($1,$2,$3) as id', [id,version,JSON.stringify({client_name:name,phone:'001234000',email:'new@example.test',visits_since_jun:0})]);
  const pack = { package_name:'Synthetic manual pack', credits_left:3,total_credits:5,purchase_amount_hkd:500,remaining_value_hkd:300,purchase_date:'2026-09-01',expiry_date:'2026-12-01' };
  const savePack = (id,version,client,details=pack) => db.query('select save_studio_client_package($1,$2,$3,$4) as id',[id,version,client,JSON.stringify(details)]);
  await as('anon');
  await assert.rejects(saveClient(null,null),/permission denied/);
  await assert.rejects(db.query('select * from studio_clients'),/permission denied/);
  for (const role of ['client','teacher']) {
    await as('authenticated',ids[role]);
    await assert.rejects(saveClient(null,null),/admin_access_required/);
    await assert.rejects(savePack(null,null,stored[0].client_id),/admin_access_required/);
    assert.deepEqual((await db.query('select * from studio_clients')).rows,[]);
    assert.deepEqual((await db.query('select * from mindbody_package_links')).rows,[]);
    await assert.rejects(db.query("insert into studio_clients(client_name) values('Blocked')"),/row-level security|admin_access_required/);
  }
  await as('authenticated',ids.admin);
  let live = (await db.query('select admin_client_directory() as data')).rows[0].data;
  assert.equal(live.clients.length,2); assert.equal(live.rows.length,4);
  const added = (await saveClient(null,null)).rows[0].id;
  assert.match(added,/^manual:/);
  live = (await db.query('select admin_client_directory() as data')).rows[0].data;
  assert.equal(groupClients(live.rows,live.clients).find(c=>c.id===added).packages.length,0);
  await saveClient(added,1,'Synthetic Edited Client');
  await assert.rejects(saveClient(added,1,'Lost edit'),/record_changed_reload/);
  const addedPack=(await savePack(null,null,added)).rows[0].id;
  await savePack(addedPack,1,added,{...pack,credits_left:2});
  await assert.rejects(savePack(addedPack,1,added),/record_changed_reload/);
  await assert.rejects(savePack(addedPack,2,stored[0].client_id),/record_changed_reload/);
  await assert.rejects(savePack(null,null,added,{...pack,credits_left:6}),/check constraint/);
  await assert.rejects(savePack(null,null,added,{...pack,expiry_date:'2025-01-01'}),/check constraint/);
  await assert.rejects(db.query('delete from studio_clients'),/permission denied/);
  await assert.rejects(db.query("update studio_clients set version=99"),/permission denied/);
  await assert.rejects(db.query('select * from private.studio_client_changes'),/permission denied/);
  await assert.rejects(db.query("select apply_mindbody_client_sync(now(),'[]',false)"),/permission denied/);
  const linked=live.rows[0];
  await as('service_role');
  const syncResult=[{package_id:linked.id,version:linked.version,status:'synced',service_id:'12345',remaining:1,total:10,expiry_date:'2027-02-01',current:true}];
  await db.query('select apply_mindbody_client_sync($1,$2,false)', ['2026-09-30T02:00:00Z',JSON.stringify(syncResult)]);
  await db.query('select apply_mindbody_client_sync($1,$2,true)', ['2026-09-30T02:15:00Z','[]']);
  // A delayed older response cannot overwrite a newer sync status.
  await db.query('select apply_mindbody_client_sync($1,$2,false)', ['2026-09-30T01:00:00Z',JSON.stringify([{...syncResult[0],remaining:9}])]);
  await as('authenticated',ids.admin);
  live=(await db.query('select admin_client_directory() as data')).rows[0].data;
  const synced=live.rows.find(p=>p.id===linked.id);
  assert.equal(synced.credits_left,1); assert.equal(synced.expiry_date,'2027-02-01');
  assert.equal(synced.recorded.credits_left,linked.credits_left); assert.equal(live.sync.failed,true);
  await assert.rejects(savePack(linked.id,linked.version,linked.client_id,pack),/edit_linked_package_in_mindbody/);
  await db.exec('reset role');
  assert.equal((await db.query('select count(*)::int n from private.studio_client_changes')).rows[0].n,4);
  assert.deepEqual((await db.query('select raw_data from admin_client_packages order by source_row')).rows.map(r=>r.raw_data),rawClientRows);
  assert.equal((await db.query('select count(*)::int n from credit_ledger')).rows[0].n,0);

  // A new attendance export supplies dates without duplicating studio packages
  // or replacing the Mindbody-owned values or immutable original source rows.
  await as('service_role');
  const attendanceImport = (await ingest(rawClientRows, 'e'.repeat(64))).rows[0].id;
  await db.query(`update admin_client_packages set
    last_visit_date=case when source_row < 5 then date '2026-09-24' end,
    never_attended=source_row=5,
    raw_data=raw_data || jsonb_build_object('Last_visit_date',case when source_row < 5 then '24/9/2026' else 'Never attended' end)
    where import_id=$1`, [attendanceImport]);
  await as('authenticated',ids.admin);
  live=(await db.query('select admin_client_directory() as data')).rows[0].data;
  assert.equal(live.rows.length,5);
  assert.equal(live.last_visit_import.id,attendanceImport);
  assert.equal(live.clients.find(c=>c.id===stored[0].client_id).last_visit_date,'2026-09-24');
  assert.equal(live.clients.find(c=>c.id===stored[3].client_id).never_attended,true);
  assert.equal(live.clients.find(c=>c.id===added).last_visit_date,null);
  assert.equal(live.clients.find(c=>c.id===added).never_attended,false);
  assert.equal(live.rows.find(p=>p.id===linked.id).credits_left,1);
  assert.equal(live.rows.find(p=>p.id===linked.id).expiry_date,'2027-02-01');
  for (const role of ['client','teacher']) {
    await as('authenticated',ids[role]);
    await assert.rejects(db.query('select admin_client_directory()'),/admin_access_required/);
    assert.deepEqual((await db.query('select last_visit_date from admin_client_packages')).rows,[]);
  }

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
  assert.equal(clients[0].lastVisit, '2026-09-24');
  assert.equal(clients[1].lastVisit, null);
  assert.equal(clients[1].neverAttended, true);
  const newer = { ...clients[0], id: 'newer', lastVisit: '2026-10-01' };
  const byVisit = [...clients, newer];
  assert.deepEqual(sortClients(byVisit, 'last_visit', 'desc', batch.as_of).map(c=>c.id), [newer.id,clients[0].id,clients[1].id]);
  assert.deepEqual(sortClients(byVisit, 'last_visit', 'asc', batch.as_of).map(c=>c.id), [clients[0].id,newer.id,clients[1].id]);
  for (const query of ['holder@example.test','00123456789','1000000000000000000001','Example Private 5']) assert.equal(filterClients(clients, query, 'all', batch.as_of).length, 1);
  assert.equal(filterClients(clients, '', 'duplicates', batch.as_of).length, 1);
  assert.equal(filterClients(clients, '', 'expiring', batch.as_of).length, 2);
  assert.equal(packageStatus(clients[0].packages, batch.as_of), 'Expires within 30 days');
  assert.equal(packageStatus(clients[1].packages, batch.as_of), 'Expires today');
  assert.equal(packageStatus(clients[1].packages, '2026-10-01'), 'Expired');
  assert.equal(packageStatus([{ ...rows[0], credits_left: 0 }], batch.as_of), 'No credits');
});
