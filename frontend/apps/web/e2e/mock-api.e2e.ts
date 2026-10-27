import { expect, test, type Page } from '@playwright/test';
import { SAM, signInAs } from './helpers';

const ARI = '0192f4c1-0000-7000-8000-00000000c002';
const ROBIN = '0192f4c1-0000-7000-8000-00000000c001';
const SESSION = '0192f4c1-0000-7000-8000-000000005001';
const AT = '2026-10-20T09:15:00.000Z';

/** Calls the API from inside the page, through MSW's service worker, as the app does. */
function call(page: Page, method: string, path: string, body?: unknown) {
  return page.evaluate(
    async ({ method, path, body }) => {
      const response = await fetch(`/api${path}`, {
        method,
        headers: { 'content-type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: (await response.json()) as unknown };
    },
    { method, path, body },
  );
}

const event = (n: number) => ({
  id: `0192f4c1-0000-7000-8000-00000000600${String(n)}`,
  sessionId: SESSION,
  sequence: n,
  occurredAt: AT,
  schemaVersion: 1,
  type: 'item_skipped',
  itemId: 'hop-to-14',
});

test('the child area loads the children from the mock data', async ({ page }) => {
  await page.goto('/');
  const list = page.getByRole('list');

  await expect(list.getByText('Robin')).toBeVisible();
  await expect(list.getByText('Ari')).toBeVisible();
});

test('the parent area loads the family from the mock data', async ({ page }) => {
  await signInAs(page, SAM);
  await page.goto('/parent');

  await expect(page.getByRole('heading', { name: 'Your children' })).toBeVisible();
  await expect(page.getByRole('list').getByText('Robin')).toBeVisible();
});

test.describe('failure modes from the development panel', () => {
  test('server error shows a friendly message, and recovers once switched off', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByText('Robin')).toBeVisible();

    await openDevTools(page);

    await page.getByLabel('Failure').selectOption('server-error');

    await expect(
      page.getByRole('alert').filter({ hasText: 'We can’t reach Learnofun right now' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();

    await openDevTools(page);

    await page.getByLabel('Failure').selectOption('none');
    await expect(page.getByText('Robin')).toBeVisible();
  });

  test('offline shows the same message in the parent area too', async ({ page }) => {
    await page.goto('/parent/login');
    await expect(page.getByRole('button', { name: 'Sam' })).toBeVisible();

    // The switch reloads the page. Wait for the page, then check it.
    await openDevTools(page);
    await Promise.all([
      page.waitForEvent('load'),
      page.getByLabel('Failure').selectOption('offline'),
    ]);
    await expect(page.getByTestId('parent-login')).toBeVisible({ timeout: 30_000 });

    await expect(
      page.getByRole('alert').filter({ hasText: 'We can’t reach Learnofun right now' }),
    ).toBeVisible();
    expect((await call(page, 'GET', '/catalog').catch(() => ({ status: 0 }))).status).toBe(0);
  });

  test('slow shows the loading state first', async ({ page }) => {
    await page.goto('/');

    await openDevTools(page);

    await page.getByLabel('Speed').selectOption('slow');

    await expect(page.getByRole('status').filter({ hasText: 'Loading…' })).toBeVisible();
    await expect(page.getByText('Robin')).toBeVisible({ timeout: 5_000 });
  });
});

test('event ingest is idempotent, and the mock state survives a reload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Robin')).toBeVisible();

  const start = await call(page, 'POST', '/sessions', {
    id: SESSION,
    childId: ROBIN,
    activityId: 'hop-line-add-within-20',
    gameId: 'hop-line',
    gameVersion: '0.1.0',
    contentRelease: 'mock-2026-10-20',
    policyVersion: 'placeholder-2',
    mode: 'practice',
    startedAt: AT,
  });
  expect(start.status).toBe(201);
  expect((await call(page, 'POST', '/events', { events: [event(0), event(1)] })).body).toEqual({
    accepted: 2,
    duplicates: 0,
  });

  await page.reload();
  await expect(page.getByText('Robin')).toBeVisible();

  expect(
    (await call(page, 'POST', '/events', { events: [event(0), event(1), event(2)] })).body,
  ).toEqual({ accepted: 1, duplicates: 2 });
});

test('reset restores the data file', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Robin')).toBeVisible();
  const snapshot = await call(page, 'GET', `/children/${ARI}/snapshot`);
  const settings = (snapshot.body as { settings: Record<string, unknown> }).settings;

  await call(page, 'PUT', `/children/${ARI}/settings`, { ...settings, textScale: 1.5 });
  expect(await call(page, 'GET', `/children/${ARI}/snapshot`)).toMatchObject({
    body: { settings: { textScale: 1.5 } },
  });

  await openDevTools(page);
  await page.getByRole('button', { name: 'Reset mock data' }).click();
  await expect(page.getByText('Robin')).toBeVisible();

  expect(await call(page, 'GET', `/children/${ARI}/snapshot`)).toMatchObject({
    body: { settings: { textScale: 1.25 } },
  });
});

test('without service workers, as on a tablet over plain HTTP, the mock API answers from the page', async ({
  page,
}) => {
  // A secure context has service workers; plain HTTP at a network address has none, not even the
  // property (ADR 0017).
  await page.addInitScript(() => {
    Reflect.deleteProperty(Navigator.prototype, 'serviceWorker');
  });
  const network: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) network.push(request.url());
  });

  await page.goto('/');
  await expect(page.getByText('Robin')).toBeVisible();

  await page.evaluate((childId) => {
    localStorage.setItem('learnofun.childMode.childId', childId);
  }, ROBIN);
  await page.goto('/play?activity=hop-line-add-within-20');
  await expect(page.getByRole('slider')).toBeFocused();
  const sum = await page.locator('.g-hop-line__sum').textContent();
  const hops = Number(/\+ (\d+)$/.exec(sum ?? '')?.[1]);
  for (let hop = 0; hop < hops; hop += 1) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('img', { name: 'Question 2 of 8' })).toBeVisible();

  // The mock API stored the session and its events in the browser, and nothing went to a network.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const key = Object.keys(localStorage).find((name) => name.includes('state'));
        const state = JSON.parse((key && localStorage.getItem(key)) || '{}') as {
          sessions?: { id: string; gameVersion: string }[];
          events?: { sessionId: string }[];
        };
        // Sessions played in a game; the past-session scripts have version 0.0.0 (ADR 0028).
        const played = (state.sessions ?? []).filter((s) => s.gameVersion !== '0.0.0');
        const ids = new Set(played.map((s) => s.id));
        return {
          sessions: played.length,
          hasEvents: (state.events ?? []).some((event) => ids.has(event.sessionId)),
        };
      }),
    )
    .toEqual({ sessions: 1, hasEvents: true });
  expect(network).toEqual([]);
});
