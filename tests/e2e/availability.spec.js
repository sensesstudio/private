import { test, expect } from '@playwright/test';
import { clientDirectoryFixture } from '../fixtures/client-import.js';
import { pricingPackages } from '../fixtures/pricing.js';

const now = '2026-09-30T02:00:00Z';
const teacherId = '11111111-1111-4111-8111-111111111111';
const teacher2 = '33333333-3333-4333-8333-333333333333';
const clientId = '22222222-2222-4222-8222-222222222222';
const slots = [
  { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', teacher_id: teacherId, studio_id: 'central', starts_at: '2026-09-30T03:00:00Z', ends_at: '2026-09-30T04:00:00Z', status: 'open' },
  { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', teacher_id: teacherId, studio_id: 'cwb', starts_at: '2026-10-01T04:00:00Z', ends_at: '2026-10-01T05:00:00Z', status: 'open' },
  { id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', teacher_id: teacher2, studio_id: 'kt', starts_at: '2026-09-30T04:00:00Z', ends_at: '2026-09-30T05:00:00Z', status: 'open' },
];
function makeSnapshot() {
  return {
    teachers: [{ id: teacherId, full_name: 'Test Instructor', home_studio_id: 'central', studio_ids: ['central', 'cwb'], headline: 'Reformer & rehabilitation', specs: ['Reformer'], langs: ['Cantonese'], certs: ['Test certificate'], rate_hkd: 950 }, { id: teacher2, full_name: 'Other Instructor', home_studio_id: 'kt', studio_ids: ['kt'], specs: ['Mat'], langs: ['English'], rate_hkd: 950 }],
    studios: [{ id: 'central', name: 'Central', address: 'Central studio address' }, { id: 'cwb', name: 'Causeway Bay', address: 'Causeway Bay studio address' }, { id: 'kt', name: 'Kwun Tong', address: 'Kwun Tong studio address' }],
    slots: structuredClone(slots),
    room_busy: [{ studio_id: 'kt', starts_at: '2026-09-30T04:15:00Z', ends_at: '2026-09-30T05:00:00Z' }],
    reservations: [], rooms: ['central', 'cwb', 'kt'].map(studio_id => ({ studio_id, active: true, resource_id: 1 })),
    sync: { last_ok_at: now, from: '2026-09-29T16:00:00Z', until: '2026-10-13T16:00:00Z' },
  };
}
async function setup(page, { role = 'teacher', failed = false, stale = false, empty = false } = {}) {
  const data = makeSnapshot(); let fail = failed, detailsFail = false, clientsFail = false; const detailReads = []; const writes = [], websockets = [];
  const clientDirectory = clientDirectoryFixture(); const clientReads = []; const clientWrites = [];
  const paymentApi = { available:true, failed:false, status:'pending', purchases:[], checkouts:[], signups:[] };
  const accountApi = { link:null, needsPassword:true, calls:[] };
  const googleApi = { enabled:false, authorize:[], exchanges:[], error:false };
  if (stale) data.sync.last_ok_at = '2026-09-30T01:00:00Z';
  if (empty) { data.slots = []; data.teachers = []; }
  await page.clock.setFixedTime(new Date(now));
  await page.routeWebSocket('**/realtime/v1/**', ws => {
    websockets.push(ws);
    ws.onMessage(message => {
      const m = JSON.parse(String(message));
      if (m.event === 'phx_join') ws.send(JSON.stringify({ event: 'phx_reply', topic: m.topic, ref: m.ref, payload: { status: 'ok', response: { postgres_changes: (m.payload.config.postgres_changes || []).map((c, i) => ({ ...c, id: i + 1 })) } } }));
      if (m.event === 'heartbeat') ws.send(JSON.stringify({ event: 'phx_reply', topic: 'phoenix', ref: m.ref, payload: { status: 'ok', response: {} } }));
    });
  });
  await page.route('https://availability-test.supabase.co/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path.endsWith('/settings')) return respond({external:{google:googleApi.enabled,email:true}});
    if (path.endsWith('/authorize')) {
      const url=new URL(route.request().url());googleApi.authorize.push(Object.fromEntries(url.searchParams));
      const callback=new URL(url.searchParams.get('redirect_to'));
      if (googleApi.error) callback.hash='error=access_denied&error_description=Private-provider-error';
      else callback.searchParams.set('code','synthetic-oauth-code');
      return route.fulfill({status:302,headers:{location:callback.href},body:''});
    }
    if (path.endsWith('/studio_client_accounts')) return respond(accountApi.link);
    if (path.endsWith('/client-accounts')) {
      const input=route.request().postDataJSON();accountApi.calls.push(input);
      if (input.action==='create') { accountApi.link={login_email:'holder@example.test',password_changed_at:null};return respond({email:'holder@example.test',temporary_password:'SyntheticMapleTea4826'}); }
      if (input.action==='reset-password') { accountApi.needsPassword=true;return respond({email:'holder@example.test',temporary_password:input.temporaryPassword || 'SyntheticResetTea4826'}); }
      accountApi.needsPassword=false;return respond({ok:true});
    }
    if (path.endsWith('/my_client_account')) return respond(accountApi.needsPassword ? {status:'password_required'} : accountApi.records || {
      status:'active',name:'Example Package Holder',private_lifetime:{sessions:28,as_of:'2026-09-30'},last_visit:{date:'2026-09-24',as_of:'2026-09-30'},
      next_visit:{at:'2026-10-02T02:30:00Z',details:'Central Synthetic session',as_of:'2026-09-30'},
      packages:[{id:'synthetic-own-pack',name:'Example Private 10',remaining:4,total:10,purchased_on:'2026-09-01',expires_on:'2026-10-10',sync_status:'synced',synced_at:now}],
    });
    if (path.endsWith('/create-checkout')) {
      const input=route.request().postDataJSON();
      if(input.action==='availability') return respond({available:paymentApi.available,livemode:true});
      if(input.action==='status') return respond({status:paymentApi.status,credits:5,package_name:'5-class pack',format:'1:1'});
      paymentApi.checkouts.push(input);
      return respond({url:'https://checkout.stripe.com/c/pay/cs_live_synthetic'});
    }
    if (path.endsWith('/packages')) return paymentApi.failed ? respond({message:'unavailable'},503) : respond(pricingPackages);
    if (path.endsWith('/package_checkout_orders')) return respond(paymentApi.purchases);
    if (path.endsWith('/signup')) { paymentApi.signups.push(route.request().postDataJSON()); return respond({id:clientId,email:'buyer@example.test',identities:[]}); }
    if (path.endsWith('/save_studio_client')) {
      const input=route.request().postDataJSON(); clientWrites.push(input);
      clientDirectory.clients ??= [];
      const id=input.p_id || 'manual:synthetic-new-client';
      clientDirectory.clients=clientDirectory.clients.filter(c=>c.id!==id);
      clientDirectory.clients.push({id,...input.p_details,version:(input.p_version || 0)+1});
      return respond(id);
    }
    if (path.endsWith('/save_studio_client_package')) {
      const input=route.request().postDataJSON(); clientWrites.push(input);
      const c=clientDirectory.clients.find(c=>c.id===input.p_client_id);
      const id=input.p_id || 'synthetic-new-package';
      clientDirectory.rows=clientDirectory.rows.filter(p=>p.id!==id);
      clientDirectory.rows.push({id,client_id:c.id,client_name:c.client_name,phone:c.phone,email:c.email,visits_since_jun:c.visits_since_jun,...input.p_details,version:(input.p_version || 0)+1});
      return respond(id);
    }
    if (path.endsWith('/admin_client_directory')) {
      clientReads.push(path);
      if (role !== 'admin') return respond({ message: 'admin_access_required' }, 403);
      return clientsFail ? respond({ message: 'unavailable' }, 503) : respond(clientDirectory);
    }
    if (path.endsWith('/admin-room-details')) {
      const { day } = route.request().postDataJSON(); detailReads.push(day);
      if (role !== 'admin') return respond({ error: 'admin_access_required' }, 403);
      if (detailsFail) return respond({ error: 'details_unavailable' }, 503);
      return respond({ day, fetched_at: now, rows: data.room_busy.map(r => ({ ...r, state: 'current', kind: 'Appointment', status: 'Confirmed', client_names: ['Fixture Client'], client_count: 1, missing_names: 0 })) });
    }
    if (path.endsWith('/availability_snapshot')) return fail ? respond({ message: 'unavailable' }, 503) : respond(data);
    if (path.endsWith('/set_teacher_availability')) {
      const input = route.request().postDataJSON(); writes.push(input);
      if (role !== 'teacher') return respond({ message: 'teacher_access_required' }, 403);
      if (input.p_open) data.slots.push({ id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', teacher_id: teacherId, studio_id: input.p_studio, starts_at: input.p_starts_at, ends_at: new Date(+new Date(input.p_starts_at) + 3600000).toISOString(), status: 'open' });
      else data.slots = data.slots.filter(s => !(s.teacher_id === teacherId && +new Date(s.starts_at) === +new Date(input.p_starts_at)));
      return respond('dddddddd-dddd-4ddd-8ddd-dddddddddddd');
    }
    const userId = role === 'teacher' ? teacherId : clientId;
    if (path.endsWith('/token')) {
      if (new URL(route.request().url()).searchParams.get('grant_type')==='pkce') googleApi.exchanges.push(route.request().postDataJSON());
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', exp: 9999999999 })}.test-signature`;
      return respond({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'test@example.test', app_metadata: {}, user_metadata: {} } });
    }
    if (path.endsWith('/profiles')) return respond({ id: userId, full_name: role === 'teacher' ? 'Test Instructor' : 'Test Client', role });
    if (path.endsWith('/logout')) return route.fulfill({ status: 204 });
    if (path.includes('/functions/')) return respond({ message: 'not deployed' }, 404);
    return respond([]);
  });
  return { data, writes, detailReads, clientWrites, clientDirectory, clientReads, paymentApi, accountApi, googleApi, setClientsFailure: value => { clientsFail = value; }, setDetailsFailure: value => { detailsFail = value; }, setFailure: value => { fail = value; } };
}

test('client uses real HK dates, filters actual slot studios and cannot book a blocked room', async ({ page }) => {
  await setup(page); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?book=1');
  await expect(page.getByText('Test Instructor', { exact: true })).toBeVisible();
  await expect(page.getByText('Hailey Saw', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Quarry Bay', { exact: true })).toHaveCount(0);
  await page.getByText('Other Instructor', { exact: true }).click();
  await expect(page.getByRole('button').filter({ hasText: '12:00–13:00' })).toBeDisabled();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'By date', exact: true }).click();
  await expect(page.getByText('11:00', { exact: true })).toBeVisible();
  await page.locator('select').first().selectOption('cwb');
  await expect(page.getByText('11:00', { exact: true })).toHaveCount(0);
  await page.locator('button[title="2026-10-01"]').click();
  await page.getByText('12:00', { exact: true }).click();
  await expect(page.getByText('Causeway Bay studio address', { exact: false })).toBeVisible();
  await expect(page.getByText('Online confirmation is coming soon.', { exact: false })).toBeVisible();
  await expect(page.getByText("You're booked", { exact: false })).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `test-results/client-${test.info().project.name}.png`, fullPage: true });
});

test('teacher signs in, edits only assigned studios, and updates client availability', async ({ page }) => {
  const api = await setup(page);
  await page.goto('/#teacher');
  await page.getByLabel('Email', { exact: true }).fill('test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('navigation',{name:'Teacher navigation'}).getByRole('button',{name:'Availability',exact:true}).click();
  await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible();
  await expect(page.getByLabel('Studio', { exact: true }).locator('option')).toHaveCount(2);
  const opened = page.getByRole('button', { name: '2026-09-30 11:00 Central Open', exact: true });
  await opened.click();
  await expect(page.getByRole('button', { name: '2026-09-30 11:00 Central Closed', exact: true })).toBeVisible();
  expect(api.writes[0]).toEqual({ p_studio: 'central', p_starts_at: '2026-09-30T03:00:00.000Z', p_open: false });
  await page.getByRole('button', { name: '2026-09-30 11:00 Central Closed', exact: true }).click();
  await expect(opened).toBeVisible();
  await page.getByRole('button', { name: 'Client', exact: true }).click();
  await page.getByRole('button', { name: 'Book', exact: true }).click();
  await page.getByRole('button', { name: 'By date', exact: true }).click();
  await expect(page.getByText('11:00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Teacher', exact: true }).click();
  await page.getByRole('navigation',{name:'Teacher navigation'}).getByRole('button',{name:'Availability',exact:true}).click();
  await expect(opened).toBeVisible();
  await page.screenshot({ path: `test-results/teacher-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Instructor sign-in' })).toBeVisible();
});

test('client credentials do not grant teacher or admin access', async ({ page }) => {
  const api = await setup(page, { role: 'client' });
  await page.goto('/#teacher');
  await page.getByLabel('Email', { exact: true }).fill('test@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Access unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Admin', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Access unavailable' })).toBeVisible();
  expect(api.writes).toEqual([]);
  expect(api.clientReads).toEqual([]);
});

test('admin clients show complete CSV packages, search, pagination and private failure states', async ({ page }, testInfo) => {
  const api = await setup(page, { role: 'admin' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/#admin');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('button', { name: 'Clients', exact: true }).click();
  await expect(page.getByText('2 clients · 4 package records', { exact: true })).toBeVisible();
  await expect(page.locator('.admin-clients-table tbody tr')).toHaveCount(2);
  await expect(page.getByLabel('Sort clients',{exact:true})).toHaveValue('next_visit:asc');
  await expect(page.locator('.admin-clients-table tbody tr').first()).toContainText('11 / 25');
  await expect(page.locator('.admin-clients-table tbody tr').first().locator('td').nth(4)).toHaveText('24 Sept 2026');
  await expect(page.locator('.admin-clients-table tbody tr').last().locator('td').nth(4)).toHaveText('Never attended');
  await expect(page.locator('.admin-clients-table tbody tr').first().locator('td').nth(5)).toHaveText('2 Oct 202610:30 HKT');
  await expect(page.locator('.admin-clients-table tbody tr').last().locator('td').nth(5)).toHaveText('No upcoming booking');
  await expect(page.locator('.admin-clients-table tbody tr').first().locator('td').nth(6)).toHaveText('14sessions attended');
  await expect(page.locator('.admin-clients-table tbody tr').last().locator('td').nth(6)).toHaveText('0sessions attended');
  await expect(page.getByText('1 possible duplicate row is included in totals.', { exact: false })).toBeVisible();
  await page.screenshot({ path: `test-results/admin-clients-${testInfo.project.name}.png`, fullPage: true });
  for (const q of ['holder@example.test', '00123456789', '1000000000000000000001', 'Example Private 5']) {
    await page.getByLabel('Search clients', { exact: true }).fill(q);
    await expect(page.locator('.admin-clients-table tbody tr')).toHaveCount(1);
  }
  await page.getByRole('button', { name: 'Example Package Holder', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Example Package Holder', exact: true })).toBeVisible();
  for (const value of ['1000000000000000000001', '00123456789', 'holder@example.test', 'HK$9,000', 'HK$3,600', '1 Sept 2026', '10 Oct 2026']) {
    await expect(page.getByText(value, { exact: true }).first()).toBeVisible();
  }
  await expect(page.getByText('CSV row 4 · Possible duplicate of row 2 in source CSV', { exact: true })).toBeVisible();
  await expect(page.locator('.admin-client-packages h3')).toHaveCount(3);
  await page.screenshot({ path: `test-results/admin-client-details-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Back to clients', exact: true }).click();
  await page.getByLabel('Search clients', { exact: true }).fill('nothing-matches');
  await expect(page.getByText('No clients match your search.', { exact: true })).toBeVisible();
  await page.getByLabel('Search clients', { exact: true }).fill('');
  await page.getByLabel('Filter clients', { exact: true }).selectOption('duplicates');
  await expect(page.locator('.admin-clients-table tbody tr')).toHaveCount(1);
  await page.getByLabel('Filter clients', { exact: true }).selectOption('all');
  for (let i = 0; i < 25; i++) api.clientDirectory.rows.push({ ...api.clientDirectory.rows[0], source_row: 6 + i, client_id: `synthetic-extra-${i}`, client_name: `Pagination Example ${String(i).padStart(2, '0')}` });
  api.clientDirectory.import.row_count = api.clientDirectory.rows.length;
  await page.getByRole('button', { name: 'Refresh clients', exact: true }).click();
  await expect(page.getByText('1–25 of 27 clients', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('26–27 of 27 clients', { exact: true })).toBeVisible();
  await expect(page.locator('.admin-clients-table tbody tr')).toHaveCount(2);
  api.setClientsFailure(true);
  await page.getByRole('button', { name: 'Refresh clients', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Client records could not be loaded.');
  await expect(page.getByText('holder@example.test', { exact: true })).toHaveCount(0);
  api.setClientsFailure(false);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('27 clients · 29 package records', { exact: true })).toBeVisible();
  const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(storage).not.toMatch(/holder@example.test|Example Package Holder|00123456789/);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin sign-in', exact: true })).toBeVisible();
  await expect(page.locator('.admin-clients-table')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('admin client import empty and incomplete responses never appear as complete data', async ({ page }) => {
  const api = await setup(page, { role: 'admin' });
  api.clientDirectory.import.row_count = 10;
  await page.goto('/#admin');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('button', { name: 'Clients', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Client records could not be loaded.');
  api.clientDirectory.import = null; api.clientDirectory.rows = [];
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByText('No clients yet. Select Add client to get started.', { exact: true })).toBeVisible();
});

for (const mode of ['failed', 'stale', 'empty']) test(`${mode} backend has no demo or selectable availability`, async ({ page }) => {
  const api = await setup(page, { [mode]: true });
  await page.goto('/?book=1');
  await expect(page.getByText('Hailey Saw', { exact: true })).toHaveCount(0);
  if (mode !== 'empty') await expect(page.getByText('Availability is temporarily unavailable.', { exact: false }).first()).toBeVisible();
  await page.getByRole('button', { name: 'By date', exact: true }).click();
  await expect(page.getByText('11:00', { exact: true })).toHaveCount(0);
  if (mode === 'failed') {
    api.setFailure(false);
    await page.getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(page.getByText('11:00', { exact: true })).toBeVisible();
  }
});

test('Match for me matches the actual studio and disables an earlier suggestion when the room becomes busy', async ({ page }) => {
  const api = await setup(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Match for me', exact: true }).click();
  await page.getByPlaceholder('Ask about availability…').fill('Cantonese Reformer tomorrow in Causeway Bay');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  const card = page.getByRole('button').filter({ hasText: 'Test Instructor · Reformer · Causeway Bay' });
  await expect(card).toBeEnabled();
  api.data.room_busy.push({ studio_id: 'cwb', starts_at: slots[1].starts_at, ends_at: slots[1].ends_at });
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(card).toBeDisabled();
  await expect(card).toContainText('Unavailable');
});

test('admin sees synced room occupancy without teacher openings and filters Hong Kong days', async ({ page }) => {
  const api = await setup(page, { role: 'admin' });
  api.data.teachers = []; api.data.slots = [];
  api.data.room_busy.push(
    { studio_id: 'central', starts_at: '2026-09-29T15:30:00Z', ends_at: '2026-09-29T16:30:00Z' },
    { studio_id: 'cwb', starts_at: '2026-10-01T04:00:00Z', ends_at: '2026-10-01T05:00:00Z' },
  );
  await page.goto('/#admin');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('button', { name: 'Bookings', exact: true }).click();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Private room availability' })).toBeVisible();
  await expect(page.getByText('Room schedule is up to date', { exact: false })).toBeVisible();
  await expect(page.locator('.room-table tbody tr')).toHaveCount(2);
  expect(await page.locator('body').innerText()).not.toMatch(/[\u3400-\u9fff]/);
  await expect(page.locator('.room-table')).toContainText('23:30');
  await expect(page.locator('.room-table')).toContainText('00:30');
  await page.getByLabel('Room studio', { exact: true }).selectOption('cwb');
  await expect(page.getByText('No occupied intervals for this selection.', { exact: false })).toBeVisible();
  await page.getByLabel('Room date', { exact: true }).fill('2026-10-01');
  await page.getByRole('button', { name: 'Go', exact: true }).click();
  await expect(page.locator('.room-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.room-table')).toContainText('12:00');
  await expect(page.locator('.room-table')).toContainText('Causeway Bay');
  await expect(page.getByText('Client details are visible only to admins', { exact: false })).toBeVisible();
  await page.screenshot({ path: `test-results/admin-rooms-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('button', { name: 'Teachers', exact: true }).click();
  await expect(page.getByText('Instructor management is not connected yet.', { exact: false })).toBeVisible();
});

test('admin refresh replaces room records and a failed read preserves records with a warning', async ({ page }) => {
  const api = await setup(page, { role: 'admin' });
  await page.goto('/#admin');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('button', { name: 'Bookings', exact: true }).click();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('.room-table tbody tr')).toHaveCount(1);
  api.setFailure(true);
  await page.getByRole('button', { name: 'Refresh list', exact: true }).click();
  await expect(page.getByText('Latest schedule unavailable;', { exact: false })).toBeVisible();
  await expect(page.locator('.room-table tbody tr')).toHaveCount(1);
  api.setFailure(false); api.data.room_busy = [];
  await page.getByRole('button', { name: 'Refresh list', exact: true }).click();
  await expect(page.getByText('No occupied intervals for this selection.', { exact: false })).toBeVisible();
  api.data.sync.last_ok_at = '2026-09-30T01:00:00Z';
  await page.getByRole('button', { name: 'Refresh list', exact: true }).click();
  await expect(page.getByText('Room sync is overdue;', { exact: false })).toBeVisible();
  await expect(page.getByText('No occupied intervals for this selection.', { exact: false })).toHaveCount(0);
});


test('admin keeps the original workspace and all eight sections without mock management records', async ({ page }, testInfo) => {
  const api = await setup(page, { role: 'admin' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/#admin');
  await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toHaveCount(0);
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Admin navigation' });
  await expect(nav.getByRole('button')).toHaveCount(8);
  await expect(nav.getByRole('button', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.admin-stats').first()).toContainText('Revenue · Not connected');
  await expect(page.getByRole('heading', { name: 'Revenue trend', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'By studio', exact: true })).toBeVisible();
  if (testInfo.project.name === 'desktop') await expect(page.locator('aside')).toHaveCSS('width', '248px');
  await page.screenshot({ path: `test-results/admin-dashboard-${testInfo.project.name}.png`, fullPage: true });
  for (const section of ['Teachers', 'Approvals', 'Prospects', 'Payouts', 'Refunds']) {
    await nav.getByRole('button', { name: section, exact: true }).click();
    await expect(page.getByText('Not connected yet', { exact: true })).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/[\u3400-\u9fff]/);
    await expect(page.getByText(/Mara Whitfield|Hailey Saw|Yuki Mori|Grace Lau|768,000|49,400/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Approve|Send reminder|Confirm refund/ })).toHaveCount(0);
  }
  await nav.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Room schedule', exact: true }).click();
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Private room availability', exact: true })).toBeVisible();
  await expect(page.locator('.room-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin sign-in' })).toBeVisible();
  await expect(nav).toHaveCount(0);
  expect(api.writes).toEqual([]);
  expect(errors).toEqual([]);
});

test('room day view shows three hourly columns, partial gaps and safe stale states', async ({ page }, testInfo) => {
  const api = await setup(page, { role: 'admin' });
  api.data.room_busy = [{ studio_id: 'cwb', starts_at: '2026-09-30T01:30:00Z', ends_at: '2026-09-30T02:30:00Z' }];
  await page.goto('/#admin');
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password-only');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('navigation', { name: 'Admin navigation' }).getByRole('button', { name: 'Bookings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Day view', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.room-day-grid tbody tr')).toHaveCount(15);
  await expect(page.locator('.room-column-name')).toHaveText(['Kwun Tong private room', 'Causeway Bay private room', 'Central private room']);
  await expect(page.locator('td[data-studio="cwb"][data-hour="09:00"]')).toContainText('Free 09:00–09:30');
  await expect(page.locator('td[data-studio="cwb"][data-hour="09:00"]')).toContainText('09:30–10:30 · Occupied');
  await expect(page.locator('td[data-studio="cwb"][data-hour="10:00"]')).toContainText('Until 10:30');
  await expect(page.locator('td[data-studio="cwb"][data-hour="10:00"]')).toContainText('Free 10:30–11:00');
  await expect(page.locator('th[data-studio="cwb"]')).toContainText('14 of 15 hours free');
  await expect(page.getByRole('button', { name: 'Previous day', exact: true })).toBeDisabled();
  await page.screenshot({ path: `test-results/room-grid-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'Next day', exact: true }).click();
  await expect(page.getByLabel('Room date', { exact: true })).toHaveValue('2026-10-01');
  await expect(page.locator('th[data-studio="cwb"]')).toContainText('15 of 15 hours free');
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByLabel('Room date', { exact: true })).toHaveValue('2026-09-30');
  api.setFailure(true);
  await page.getByRole('button', { name: 'Refresh list', exact: true }).click();
  await expect(page.getByText('Latest schedule unavailable;', { exact: false })).toBeVisible();
  await expect(page.locator('.room-segment-free')).toHaveCount(0);
  await expect(page.locator('.room-free-total')).toHaveText(['Availability unconfirmed', 'Availability unconfirmed', 'Availability unconfirmed']);
  await expect(page.locator('.room-segment-busy').first()).toContainText('Last read');
  api.setFailure(false); api.data.sync.last_ok_at = '2026-09-30T01:00:00Z';
  await page.getByRole('button', { name: 'Refresh list', exact: true }).click();
  await expect(page.getByText('Room sync is overdue;', { exact: false })).toBeVisible();
  await expect(page.locator('.room-segment-free')).toHaveCount(0);
  expect(await page.locator('body').innerText()).not.toMatch(/[\u3400-\u9fff]/);
  expect(api.writes).toEqual([]);
});


test('admin client names appear on dashboard, grid and list, and disappear after failed refresh or sign-out', async ({ page }) => {
  const api = await setup(page, { role: 'admin' });
  await page.goto('/#admin');
  expect(api.detailReads).toHaveLength(0);
  await page.getByLabel('Email', { exact: true }).fill('admin@example.test');
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.locator('.admin-room-row')).toContainText('Fixture Client');
  await expect(page.locator('.admin-room-row')).toContainText('Appointment · Confirmed');
  await page.getByRole('button', { name: 'Room schedule', exact: true }).click();
  await expect(page.locator('.room-day-grid')).toContainText('Fixture Client');
  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('.room-table')).toContainText('Fixture Client');
  api.setDetailsFailure(true);
  await page.getByRole('button', { name: 'Refresh list', exact: true }).click();
  await expect(page.locator('.room-table')).toContainText('Client details unavailable');
  await expect(page.getByText('Fixture Client', { exact: true })).toHaveCount(0);
  await expect(page.locator('.room-table tbody tr')).toHaveCount(1);
  api.setDetailsFailure(false);
  await page.getByRole('button', { name: 'Refresh list', exact: true }).click();
  await expect(page.locator('.room-table')).toContainText('Fixture Client');
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('Fixture Client');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin sign-in' })).toBeVisible();
  await expect(page.getByText('Fixture Client', { exact: true })).toHaveCount(0);
  expect(api.writes).toHaveLength(0);
});

test('client pricing preserves the design, shows database packs and signs in before Stripe checkout', async ({ page }, testInfo) => {
  const api=await setup(page,{role:'client'}); const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://checkout.stripe.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Stripe checkout fixture</h1>'}));
  await page.goto('/#client');
  await page.getByRole('navigation',{name:'Client navigation'}).getByRole('button',{name:'Pricing',exact:true}).click();
  await expect(page.locator('.pricing-pack')).toHaveCount(4);
  await expect(page.locator('.pricing-price strong')).toHaveText(['HK$900','HK$1,200','HK$4,750','HK$9,000']);
  await expect(page.getByText('Valid for 3 months from first visit',{exact:true})).toBeVisible();
  expect(await page.locator('.client-pricing').innerText()).not.toMatch(/[\u3400-\u9fff]/);
  await page.screenshot({path:`test-results/client-pricing-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Semi-private · 1:2',exact:true}).click();
  await expect(page.locator('.pricing-price strong')).toHaveText(['HK$1,200','HK$1,600','HK$6,500','HK$12,000']);
  await expect(page.getByText('Prices are the total for two people sharing the session.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Buy · HK$6,500',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Client sign-in',exact:true})).toBeVisible();
  expect(api.paymentApi.checkouts).toEqual([]);
  await page.getByLabel('Email',{exact:true}).fill('buyer@example.test');
  await page.getByLabel('Password',{exact:true}).fill('synthetic-password');
  await page.locator('.pricing-auth').getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Client sign-in',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Buy · HK$6,500',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Stripe checkout fixture',exact:true})).toBeVisible();
  expect(api.paymentApi.checkouts).toEqual([{packageId:'p12-5',origin:'http://127.0.0.1:4173'}]);
  expect(errors).toEqual([]);
});

test('checkout return waits for verified payment and shows only own purchases', async ({ page }) => {
  const api=await setup(page,{role:'client'});
  await page.goto('/?checkout=success&session_id=cs_live_synthetic#client');
  await expect(page.getByText('Sign in with the account used at checkout to confirm your purchase.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill('buyer@example.test');
  await page.getByLabel('Password',{exact:true}).fill('synthetic-password');
  await page.locator('.pricing-auth').getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByText('Checking your payment.',{exact:false})).toBeVisible();
  await expect(page.getByText('No purchases on this app yet.',{exact:true})).toBeVisible();
  await expect(page.getByText('Payment confirmed.',{exact:false})).toHaveCount(0);
  api.paymentApi.status='paid';api.paymentApi.purchases=[{id:'synthetic-order',package_name:'5-class pack',format:'1:1',credits:5,price_hkd:4750,validity_months:3,paid_at:now}];
  await page.getByRole('button',{name:'Check payment status',exact:true}).click();
  await expect(page.getByText('Payment confirmed. 5 sessions added for 5-class pack (1:1).',{exact:true})).toBeVisible();
  await expect(page.locator('.pricing-purchases article')).toHaveCount(1);
  await expect(page.locator('.pricing-purchases article')).toContainText('5 sessions purchased · HK$4,750');
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page.locator('.pricing-purchases')).toHaveCount(0);
  await expect(page.getByText('Payment confirmed.',{exact:false})).toHaveCount(0);
});

test('unavailable pricing has no fake packs or enabled payment and signup requests only a client profile', async ({ page }) => {
  const api=await setup(page,{role:'client'});api.paymentApi.failed=true;
  await page.goto('/?pricing=1#client');
  await expect(page.getByText('Packages could not be loaded.',{exact:false})).toBeVisible({timeout:15000});
  await expect(page.locator('.pricing-pack')).toHaveCount(0);
  api.paymentApi.failed=false;api.paymentApi.available=false;
  await page.getByRole('button',{name:'Retry pricing',exact:true}).click();
  await expect(page.locator('.pricing-pack')).toHaveCount(4);
  await expect(page.getByRole('button',{name:'Buy · HK$900',exact:true})).toBeDisabled();
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'New here? Create account',exact:true}).click();
  await page.getByLabel('Full name',{exact:true}).fill('Synthetic Buyer');
  await page.getByLabel('Email',{exact:true}).fill('buyer@example.test');
  await page.getByLabel('Password',{exact:true}).fill('synthetic-password');
  await page.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(page.getByText('Check your email to confirm your account, then return here to sign in.',{exact:true})).toBeVisible();
  expect(api.paymentApi.signups[0].data).toEqual({full_name:'Synthetic Buyer'});
  expect(api.paymentApi.checkouts).toEqual([]);
});


test('admin adds and edits clients and packages; Mindbody balances refresh without a click',async({page},testInfo)=>{
 const api=await setup(page,{role:'admin'});
 await page.goto('/#admin');
 await page.getByLabel('Email',{exact:true}).fill('admin@example.test');
 await page.getByLabel('Password',{exact:true}).fill('test-password-only');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('navigation',{name:'Admin navigation'}).getByRole('button',{name:'Clients',exact:true}).click();
 await page.getByRole('button',{name:'Add client',exact:true}).click();
 await page.getByLabel('Client name',{exact:true}).fill('Synthetic New Client');
 await page.getByLabel('Phone',{exact:true}).fill('001234000');
 await page.getByLabel('Email',{exact:true}).fill('new@example.test');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Synthetic New Client',exact:true})).toBeVisible();
 await expect(page.getByText('0 package records',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit client',exact:true}).click();
 await page.getByLabel('Client name',{exact:true}).fill('Synthetic Edited Client');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Synthetic Edited Client',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Add package',exact:true}).click();
 await page.getByLabel('Package name',{exact:true}).fill('Synthetic manual pack');
 await page.getByLabel('Total credits',{exact:true}).fill('5');
 await page.getByLabel('Credits left',{exact:true}).fill('6');
 await page.getByLabel('Purchase amount (HK$)',{exact:true}).fill('500');
 await page.getByLabel('Remaining value (HK$)',{exact:true}).fill('300');
 await page.getByLabel('Purchase date',{exact:true}).fill('2026-09-01');
 await page.getByLabel('Expiry date',{exact:true}).fill('2026-12-01');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('Credits left cannot exceed total credits.');
 await page.getByLabel('Credits left',{exact:true}).fill('3');
 await page.screenshot({path:`test-results/admin-package-editor-${testInfo.project.name}.png`,fullPage:true});
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Synthetic manual pack',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Edit package',exact:true}).click();
 await page.getByLabel('Credits left',{exact:true}).fill('2');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 await expect(page.getByText('Changes saved.',{exact:true})).toBeVisible();
 expect(api.clientWrites.at(-1).p_details.credits_left).toBe(2);
 expect(api.clientWrites.at(-1).p_client_id).toBe('manual:synthetic-new-client');
 await page.getByRole('button',{name:'Back to clients',exact:true}).click();
 const before=api.clientReads.length;
 api.clientDirectory.sync={last_ok_at:now,failed:false,matched:1,pending:3};
 api.clientDirectory.rows[0].credits_left=1;
 await page.clock.install({time:new Date(now)});
 await page.clock.fastForward(60001);
 await expect.poll(()=>api.clientReads.length).toBeGreaterThan(before);
 await expect(page.getByText('This page updates automatically.',{exact:false})).toBeVisible();
 await expect(page.locator('.admin-clients-table tbody tr').filter({hasText:'Example Package Holder'})).toContainText('8 / 25');
});

test('admin assigns a client login once and keeps temporary credentials out of storage',async({page})=>{
  const api=await setup(page,{role:'admin'});
  await page.goto('/#admin');
  await page.getByLabel('Email',{exact:true}).fill('admin@example.test');
  await page.getByLabel('Password',{exact:true}).fill('synthetic-password');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('navigation',{name:'Admin navigation'}).getByRole('button',{name:'Clients',exact:true}).click();
  await page.getByRole('button',{name:'Example Package Holder',exact:true}).click();
  await expect(page.getByRole('button',{name:'Create login',exact:true})).toBeDisabled();
  await page.getByRole('checkbox',{name:/I have verified/}).check();
  await page.getByRole('button',{name:'Create login',exact:true}).click();
  await expect(page.getByText('SyntheticMapleTea4826',{exact:true})).toBeVisible();
  expect(api.accountApi.calls).toEqual([{action:'create',clientId:'1000000000000000000001',email:'holder@example.test',confirmedEmail:true}]);
  expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toMatch(/SyntheticMapleTea4826|holder@example.test/);
  await page.getByRole('button',{name:'Back to clients',exact:true}).click();
  await page.getByRole('button',{name:'Example Package Holder',exact:true}).click();
  await expect(page.getByText('Created · Waiting for password change',{exact:true})).toBeVisible();
  await expect(page.getByText('SyntheticMapleTea4826',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Create login',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Reset password',exact:true}).click();
  await expect(page.getByRole('button',{name:'Confirm reset',exact:true})).toBeDisabled();
  await page.getByLabel('Temporary password',{exact:true}).fill('Sample123*');
  await page.getByRole('checkbox',{name:/Reset the password for/}).check();
  await page.getByRole('button',{name:'Confirm reset',exact:true}).click();
  await expect(page.getByText('Sample123*',{exact:true})).toBeVisible();
  expect(api.accountApi.calls.at(-1)).toEqual({action:'reset-password',clientId:'1000000000000000000001',email:'holder@example.test',confirmReset:true,temporaryPassword:'Sample123*'});
  expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toContain('Sample123*');
});

test('client changes temporary password before seeing own packages and visit dates',async({page},testInfo)=>{
  const api=await setup(page,{role:'client'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/?account=1#client');
  await page.getByLabel('Email',{exact:true}).fill('holder@example.test');
  await page.getByLabel('Password',{exact:true}).fill('SyntheticMapleTea4826');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Choose your own password',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'My packages',exact:true})).toHaveCount(0);
  await page.getByLabel('Current password',{exact:true}).fill('SyntheticMapleTea4826');
  await page.getByLabel('New password',{exact:true}).fill('ChosenPassword1234');
  await page.getByLabel('Confirm new password',{exact:true}).fill('ChosenPassword4321');
  await page.getByRole('button',{name:'Set password',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('do not match');expect(api.accountApi.calls).toHaveLength(0);
  await page.getByLabel('Confirm new password',{exact:true}).fill('ChosenPassword1234');
  await page.getByRole('button',{name:'Set password',exact:true}).click();
  await expect(page.getByText('Password updated. Sign in with your new password.',{exact:true})).toBeVisible();
  await page.getByLabel('Password',{exact:true}).fill('ChosenPassword1234');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Example Package Holder',exact:true})).toBeVisible();
  await expect(page.getByLabel('Your progress')).toContainText('2 sessions');
  await expect(page.getByLabel('Your progress')).toContainText('30-session milestone');
  await page.screenshot({path:`test-results/client-profile-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Payment & packages',exact:true}).click();
  await expect(page.getByRole('heading',{name:'My packages',exact:true})).toBeVisible();
  await expect(page.locator('.client-account-packages')).toContainText('4/ 10 sessions remaining');
  await expect(page.locator('.client-account-packages')).toContainText('10 Oct 2026');
  await page.getByRole('button',{name:'Profile',exact:true}).first().click();
  await page.getByRole('button',{name:'Progress log',exact:true}).click();
  await expect(page.locator('.client-account-visits')).toContainText('24 Sept 2026');
  await expect(page.locator('.client-account-visits')).toContainText('2 Oct 2026, 10:30 HKT');
  expect(await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}))).not.toMatch(/ChosenPassword1234|SyntheticMapleTea4826|Example Private 10/);
  expect(api.clientReads).toHaveLength(0);
  await page.screenshot({path:`test-results/client-account-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Profile',exact:true}).first().click();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(page.getByText('Example Private 10',{exact:true})).toHaveCount(0);expect(errors).toEqual([]);
});


test('prototype pages retain navigation and never display sample client records',async({page},testInfo)=>{
  const api=await setup(page,{role:'client'});api.accountApi.needsPassword=false;
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Senses Studio',exact:true})).toBeVisible();
  await expect(page.getByRole('navigation',{name:'Client navigation'}).getByRole('button')).toHaveCount(5);
  await page.getByRole('button',{name:'Profile',exact:true}).click();
  await page.getByLabel('Email',{exact:true}).fill('holder@example.test');
  await page.getByLabel('Password',{exact:true}).fill('SyntheticPersonal1234');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await page.getByRole('button',{name:'See full progress',exact:true}).click();
  await expect(page.getByText('28 sessions recorded so far. Your next milestone is 30 sessions.',{exact:true})).toBeVisible();
  for(const [label,text] of [['About me','Your details'],['Bookings','Upcoming'],['Favourite teachers','Saved favourites are not connected yet.'],['Progress log','Your session story'],['Payment & packages','Payment history'],['Studios & locations','Central'],['Preferences','Booking reminders'],['Terms & Conditions','Re-scheduling'],['Liability waiver','Online signing and your waiver status are not connected yet.']]) {
    await page.getByRole('button',{name:label,exact:true}).click();
    await expect(page.getByText(text,{exact:false}).first()).toBeVisible();
    await page.getByRole('button',{name:'Profile',exact:true}).first().click();
  }
  await page.getByRole('button',{name:'Home',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Example Package Holder',exact:true})).toBeVisible();
  await expect(page.getByText(/Mara Whitfield|Hailey Saw|Visa ···· 8842/)).toHaveCount(0);
  expect(api.clientReads).toHaveLength(0);
  await page.screenshot({path:`test-results/client-home-${testInfo.project.name}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('teacher prototype workspace has empty session and finance frames with a real profile',async({page},testInfo)=>{
  await setup(page);
  await page.goto('/#teacher');
  await page.getByLabel('Email',{exact:true}).fill('test@example.test');
  await page.getByLabel('Password',{exact:true}).fill('test-password-only');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  const nav=page.getByRole('navigation',{name:'Teacher navigation'});
  await expect(nav.getByRole('button')).toHaveCount(5);
  await nav.getByRole('button',{name:'Sessions',exact:true}).click();
  await expect(page.getByText('Upcoming sessions are not connected yet',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Past',exact:true}).click();
  await expect(page.getByText('Past sessions are not connected yet',{exact:true})).toBeVisible();
  await nav.getByRole('button',{name:'Earnings',exact:true}).click();
  await expect(page.getByText('Payout records are not connected yet.',{exact:true})).toBeVisible();
  await nav.getByRole('button',{name:'Profile',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Your profile',exact:true})).toBeVisible();
  await expect(page.getByText(/Hailey Saw|Mara Whitfield|HK\$520/)).toHaveCount(0);
  await page.screenshot({path:`test-results/teacher-profile-${testInfo.project.name}.png`,fullPage:true});
});


test('progress distinguishes zero attendance, a new milestone and unknown records; reset removes private cards',async({page})=>{
  const api=await setup(page,{role:'client'});api.accountApi.needsPassword=false;
  api.accountApi.records={status:'active',name:'Synthetic Empty Client',private_lifetime:{sessions:0,as_of:'2026-09-30'},packages:[]};
  await page.goto('/?account=1#client');
  await page.getByLabel('Email',{exact:true}).fill('holder@example.test');
  await page.getByLabel('Password',{exact:true}).fill('SyntheticPersonal1234');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByLabel('Your progress')).toContainText('10-session milestone');
  await expect(page.getByRole('progressbar')).toHaveAttribute('value','0');
  api.accountApi.records.private_lifetime.sessions=10;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('Your progress')).toContainText('20-session milestone');
  await expect(page.getByRole('progressbar')).toHaveAttribute('value','0');
  api.accountApi.records.private_lifetime=null;
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('progressbar')).toHaveCount(0);
  await expect(page.getByText('No packages recorded yet.',{exact:true})).toBeVisible();
  api.accountApi.records={status:'sign_in_required'};
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await expect(page.getByText('Your session is no longer current.',{exact:false})).toBeVisible();
  await expect(page.getByLabel('Your progress')).toHaveCount(0);
  await expect(page.getByText('Synthetic Empty Client',{exact:true})).toHaveCount(0);
});


test('Google stays unavailable until configured; email sign-in remains usable',async({page})=>{
  const api=await setup(page,{role:'client'});
  await page.goto('/?account=1');
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeDisabled();
  await expect(page.getByText('Google sign-in is coming soon. Please use email for now.')).toBeVisible();
  await page.getByRole('textbox',{name:'Email',exact:true}).fill('holder@example.test');
  await page.getByLabel('Password',{exact:true}).fill('SyntheticPassword123');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Choose your own password'})).toBeVisible();
  expect(api.googleApi.authorize).toEqual([]);
});

for (const destination of ['account','pricing']) test(`Google PKCE returns to ${destination} without starting a payment`,async({page},testInfo)=>{
  const api=await setup(page,{role:'client'});api.googleApi.enabled=true;api.accountApi.needsPassword=false;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`/?${destination}=1`);
  if(destination==='pricing') await page.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeEnabled();
  if(destination==='account') await page.screenshot({path:`test-results/google-sign-in-${testInfo.project.name}.png`,fullPage:true});
  await page.getByRole('button',{name:'Continue with Google'}).click();
  await expect(page.getByRole('button',{name:'Sign out',exact:true})).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`\\?${destination}=1#client$`));
  expect(api.googleApi.authorize).toHaveLength(1);
  const params=api.googleApi.authorize[0];
  expect(params.provider).toBe('google');expect(params.code_challenge_method).toBe('s256');
  expect(params.code_challenge.length).toBeGreaterThan(30);
  expect(params.redirect_to).toBe(`http://127.0.0.1:4173/?${destination}=1&oauth=google`);
  expect(api.googleApi.exchanges).toHaveLength(1);
  expect(api.googleApi.exchanges[0].auth_code).toBe('synthetic-oauth-code');
  expect(api.googleApi.exchanges[0].code_verifier.length).toBeGreaterThan(30);
  expect(api.paymentApi.checkouts).toEqual([]);
  if(destination==='account') {
    await expect(page.getByRole('heading',{name:'Choose your own password'})).toHaveCount(0);
    await page.getByRole('button',{name:'Payment & packages'}).click();
    await expect(page.locator('.client-account-packages')).toContainText('Example Private 10');
  }
  expect(errors).toEqual([]);
});

test('Google cancellation returns a safe message and allows another attempt',async({page})=>{
  const api=await setup(page,{role:'client'});api.googleApi.enabled=true;api.googleApi.error=true;
  await page.goto('/?account=1');
  await page.getByRole('button',{name:'Continue with Google'}).click();
  await expect(page.getByRole('alert')).toHaveText('Google sign-in was not completed. You can try again or sign in with email.');
  await expect(page).toHaveURL(/\?account=1#client$/);
  await expect(page.getByRole('button',{name:'Continue with Google'})).toBeEnabled();
  expect(api.googleApi.exchanges).toEqual([]);
  await expect(page.locator('body')).not.toContainText('Private-provider-error');
});

test('An expired Google callback cannot reveal a client account',async({page})=>{
  await setup(page,{role:'client'});
  await page.route('**/auth/v1/token?grant_type=pkce',route=>route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'invalid_grant',error_description:'Synthetic expired callback'})}));
  await page.goto('/?account=1&oauth=google&code=expired-synthetic-code');
  await expect(page.getByRole('alert')).toContainText('Google sign-in could not be completed.');
  await expect(page).toHaveURL(/\?account=1#client$/);
  await expect(page.getByRole('heading',{name:'My account'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Sign out',exact:true})).toHaveCount(0);
});
