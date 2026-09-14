import { test, expect } from '@playwright/test';

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
  const data = makeSnapshot(); let fail = failed; const writes = [], websockets = [];
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
      const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
      const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: userId, role: 'authenticated', exp: 9999999999 })}.test-signature`;
      return respond({ access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'test@example.test', app_metadata: {}, user_metadata: {} } });
    }
    if (path.endsWith('/profiles')) return respond({ id: userId, full_name: role === 'teacher' ? 'Test Instructor' : 'Test Client', role });
    if (path.endsWith('/logout')) return route.fulfill({ status: 204 });
    if (path.includes('/functions/')) return respond({ message: 'not deployed' }, 404);
    return respond([]);
  });
  return { data, writes, setFailure: value => { fail = value; } };
}

test('client uses real HK dates, filters actual slot studios and cannot book a blocked room', async ({ page }) => {
  await setup(page); const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
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
  await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible();
  await expect(page.getByLabel('Studio', { exact: true }).locator('option')).toHaveCount(2);
  const opened = page.getByRole('button', { name: '2026-09-30 11:00 Central Open', exact: true });
  await opened.click();
  await expect(page.getByRole('button', { name: '2026-09-30 11:00 Central Closed', exact: true })).toBeVisible();
  expect(api.writes[0]).toEqual({ p_studio: 'central', p_starts_at: '2026-09-30T03:00:00.000Z', p_open: false });
  await page.getByRole('button', { name: '2026-09-30 11:00 Central Closed', exact: true }).click();
  await expect(opened).toBeVisible();
  await page.getByRole('button', { name: 'Client', exact: true }).click();
  await page.getByRole('button', { name: 'By date', exact: true }).click();
  await expect(page.getByText('11:00', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Teacher', exact: true }).click();
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
});

for (const mode of ['failed', 'stale', 'empty']) test(`${mode} backend has no demo or selectable availability`, async ({ page }) => {
  const api = await setup(page, { [mode]: true });
  await page.goto('/');
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

test('Ask matches the actual studio and disables an earlier suggestion when the room becomes busy', async ({ page }) => {
  const api = await setup(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
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
  await expect(page.getByRole('heading', { name: 'Room schedule' })).toBeVisible();
  await expect(page.getByText('Room schedule is up to date', { exact: false })).toBeVisible();
  await expect(page.locator('.room-table tbody tr')).toHaveCount(2);
  expect(await page.locator('body').innerText()).not.toMatch(/[\u3400-\u9fff]/);
  await expect(page.locator('.room-table')).toContainText('23:30');
  await expect(page.locator('.room-table')).toContainText('00:30');
  await page.getByLabel('Room studio', { exact: true }).selectOption('cwb');
  await expect(page.getByText('No occupied intervals for this selection.', { exact: false })).toBeVisible();
  await page.getByLabel('Room date', { exact: true }).selectOption('2026-10-01');
  await expect(page.locator('.room-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.room-table')).toContainText('12:00');
  await expect(page.locator('.room-table')).toContainText('Causeway Bay');
  await expect(page.getByText('Client names and class titles are not imported.', { exact: false })).toBeVisible();
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
  for (const section of ['Clients', 'Teachers', 'Approvals', 'Prospects', 'Payouts', 'Refunds']) {
    await nav.getByRole('button', { name: section, exact: true }).click();
    await expect(page.getByText('Not connected yet', { exact: true })).toBeVisible();
    expect(await page.locator('body').innerText()).not.toMatch(/[\u3400-\u9fff]/);
    await expect(page.getByText(/Mara Whitfield|Hailey Saw|Yuki Mori|Grace Lau|768,000|49,400/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Approve|Send reminder|Confirm refund/ })).toHaveCount(0);
  }
  await nav.getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.getByRole('button', { name: 'Room schedule', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Room schedule', exact: true })).toBeVisible();
  await expect(page.locator('.room-table tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin sign-in' })).toBeVisible();
  await expect(nav).toHaveCount(0);
  expect(api.writes).toEqual([]);
  expect(errors).toEqual([]);
});
