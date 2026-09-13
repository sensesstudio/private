import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const teacher = '11111111-1111-4111-8111-111111111111';
const client = '22222222-2222-4222-8222-222222222222';
const admin = '33333333-3333-4333-8333-333333333333';
const sqlFile = name => readFile(new URL(`../supabase/${name}`, import.meta.url), 'utf8');

test('migration executes on PostgreSQL and enforces identity, ownership, conflicts and public data limits', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;`);
  // PGlite provides gen_random_uuid natively. Its embedded runtime does not host
  // Supabase's cron/network extensions; the actual schema and functions run unchanged.
  await db.exec((await sqlFile('migrations/0001_init.sql')).replace('create extension if not exists pgcrypto;', ''));
  await db.exec(await sqlFile('seed.sql'));
  await db.exec((await sqlFile('migrations/0004_mindbody_rooms.sql')).replace(/create extension if not exists pg_(cron|net);/g, ''));
  await db.exec('grant select, insert, update, delete on all tables in schema public to anon, authenticated, service_role;');
  await db.exec(await sqlFile('migrations/0005_live_availability.sql'));
  await db.exec(`insert into auth.users values ('${teacher}'), ('${client}'), ('${admin}');
    insert into profiles (id, role, full_name, email) values ('${teacher}', 'teacher', 'Test Instructor', 'private-teacher@example.test'), ('${client}', 'client', 'Secret Client', 'private-client@example.test'), ('${admin}', 'admin', 'Test Admin', null);
    insert into teacher_profiles(id, home_studio_id, studio_ids, bio) values ('${teacher}', 'central', array['central','cwb'], 'Private biography');
    update mindbody_rooms set resource_id = case studio_id when 'kt' then 41 when 'cwb' then 37 else 49 end;
    insert into sync_state(id,last_ok_at,detail) values ('mindbody',now(),jsonb_build_object('window',jsonb_build_object('from',now()-interval '1 day','until',now()+interval '14 days')));`);
  const [{ start }] = (await db.query(`select (date_trunc('day', now() at time zone 'Asia/Hong_Kong') + interval '1 day 10 hours') at time zone 'Asia/Hong_Kong' as start`)).rows;
  const at = new Date(start).toISOString();
  const next = new Date(+new Date(start) + 3600000).toISOString();
  const later = new Date(+new Date(start) + 7200000).toISOString();
  async function as(id, role = 'authenticated') { await db.exec(`reset role; select set_config('request.jwt.claim.sub','${id || ''}',false); set role ${role};`); }
  const open = (studio, date = at, value = true) => db.query('select set_teacher_availability($1, $2::timestamptz, $3) as id', [studio, date, value]);
  await as(null, 'anon');
  await assert.rejects(open('central'), /permission denied/);
  await as(client);
  await assert.rejects(open('central'), /teacher_access_required/);
  await assert.rejects(db.query("update profiles set role = 'admin' where id = $1", [client]), /permission denied/);
  const own = await db.query('select id, role from profiles');
  assert.deepEqual(own.rows, [{ id: client, role: 'client' }]);
  await as(teacher);
  await assert.rejects(db.query('update teacher_profiles set active = false where id = $1', [teacher]), /permission denied/);
  const id = (await open('central')).rows[0].id;
  assert.equal((await open('central')).rows[0].id, id); // idempotent open
  await assert.rejects(open('cwb'), /teacher_time_conflict/);
  await assert.rejects(open('kt', next), /studio_not_assigned/);
  await assert.rejects(open('central', '2020-01-01T02:00:00Z'), /outside_availability_window/);
  await assert.rejects(open('central', new Date(+new Date(start) + 1800000).toISOString()), /invalid_session_time/);
  await open('cwb', next); // adjacent session permitted
  await assert.rejects(db.query('insert into slots(teacher_id,studio_id,starts_at) values ($1,$2,$3)', [teacher,'central',later]), /permission denied/);
  await as(null, 'service_role');
  await db.query("update slots set status='held',held_by=$1,hold_expires_at=now()+interval '10 minutes' where id=$2", [client,id]);
  await as(teacher);
  await assert.rejects(open('central', at, false), /slot_reserved/);
  await as(null, 'service_role');
  await db.query("update slots set hold_expires_at=now()-interval '1 minute' where id=$1", [id]);
  await as(teacher);
  await open('central', at, false);
  assert.equal((await open('central', at, false)).rows[0].id, null); // idempotent close
  const bookedId = (await open('central', at)).rows[0].id;
  await as(null, 'service_role');
  await db.query("update slots set status='booked' where id=$1", [bookedId]);
  await db.query("insert into bookings(client_id,teacher_id,studio_id,slot_id,starts_at) values($1,$2,'central',$3,$4)", [client,teacher,bookedId,at]);
  await db.query("insert into room_busy(studio_id, starts_at, ends_at, mindbody_ref) values('central',$1,$2,'secret-reference')", [at,next]);
  await as(teacher);
  await assert.rejects(open('central', at, false), /slot_reserved/);
  await as(null, 'anon');
  const data = (await db.query('select availability_snapshot() as data')).rows[0].data;
  assert.equal(data.teachers[0].full_name, 'Test Instructor');
  assert.equal(data.studios.length, 3); assert.equal(data.reservations.length, 1);
  assert.equal(data.slots[0].ends_at !== undefined, true);
  const json = JSON.stringify(data);
  for (const privateValue of [client, 'private-client', 'private-teacher', 'Secret Client', 'Private biography', 'secret-reference', 'held_by']) assert.equal(json.includes(privateValue), false, privateValue);
  await as(null, 'service_role');
  await db.query('update teacher_profiles set active=false where id=$1', [teacher]);
  await as(teacher);
  await assert.rejects(open('central', later), /teacher_access_required/);
  const inactive = (await db.query('select availability_snapshot() as data')).rows[0].data;
  assert.equal(inactive.teachers.length, 0);
});
