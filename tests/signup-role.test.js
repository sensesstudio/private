import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('sign-up cannot self-assign admin or teacher, and existing staff retain their roles', async t => {
  const db = new PGlite(); t.after(() => db.close());
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create table public.profiles (id uuid primary key, role text not null, full_name text not null, email text);
    create table public.client_profiles (id uuid primary key references public.profiles(id));
    insert into public.profiles values ('11111111-1111-4111-8111-111111111111','admin','Existing Admin',null), ('22222222-2222-4222-8222-222222222222','teacher','Existing Teacher',null);`);
  await db.exec(await readFile(new URL('../supabase/migrations/20260916062159_lock_signup_roles.sql', import.meta.url), 'utf8'));
  for (const role of ['admin', 'teacher', 'client', 'invalid']) {
    const { rows } = await db.query(`insert into auth.users values (gen_random_uuid(),'fixture@example.test',$1::jsonb) returning id`, [JSON.stringify({ role, full_name: 'Fixture' })]);
    assert.equal((await db.query('select role from profiles where id=$1', [rows[0].id])).rows[0].role, 'client');
    assert.equal((await db.query('select count(*)::int as n from client_profiles where id=$1', [rows[0].id])).rows[0].n, 1);
  }
  assert.equal((await db.query("select count(*)::int as n from profiles where role in ('admin','teacher')")).rows[0].n, 2);
  for (const role of ['anon', 'authenticated']) assert.equal((await db.query("select has_function_privilege($1, 'public.handle_new_user()', 'execute') as allowed", [role])).rows[0].allowed, false);
});
