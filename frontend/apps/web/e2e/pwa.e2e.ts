import { expect, test, type Page } from '@playwright/test';
import { answerRight, playAs, ROBIN } from './helpers';

/** Waits until the app's service worker is active and controls the page (ADR 0024). */
async function controlled(page: Page): Promise<string> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // A plain check: given a promise, waitForFunction would take the promise itself as the answer.
  const url = await page.waitForFunction(
    () => navigator.serviceWorker.controller?.scriptURL ?? false,
  );
  return String(await url.jsonValue());
}

interface Manifest {
  name: string;
  display: string;
  start_url: string;
  theme_color: string;
  background_color: string;
  icons: { src: string; sizes: string; purpose: string }[];
}

test('is installable: a manifest with icons, and one service worker for the app and the mock API', async ({
  page,
  request,
}) => {
  await page.goto('/');
  expect(await controlled(page)).toMatch(/\/sw\.js$/);

  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  const manifest = (await (await request.get(href ?? '')).json()) as Manifest;
  expect(manifest).toMatchObject({ name: 'Learnofun', display: 'standalone', start_url: '/' });
  // The design system's navy and play ground.
  expect(manifest.theme_color).toBe('#1d2b53');
  expect(manifest.background_color).toBe('#fff8ec');
  expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual([
    '192x192 any',
    '512x512 any',
    '512x512 maskable',
  ]);
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok(), icon.src).toBe(true);
    expect(response.headers()['content-type']).toBe('image/png');
  }

  // The mock API answers through the same worker.
  await expect(page.getByRole('button', { name: 'Robin' })).toBeVisible();
});

test('opens and plays with no network, once it has been opened before (ADR 0024)', async ({
  page,
  context,
}) => {
  await playAs(page, ROBIN);
  // Online, once: the worker caches the app, and the child area keeps its last data.
  await page.goto('/today');
  await controlled(page);
  await expect(page.getByRole('button', { name: /Hop Line: add within 20/ })).toBeVisible();

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Hi, Robin!')).toBeVisible();
  await page.getByRole('button', { name: /Hop Line: add within 20/ }).click();

  // The game's own bundle comes from the cache, and play goes to the outbox.
  await answerRight(page);
  await expect(page.getByRole('img', { name: 'Question 2 of 8' })).toBeVisible();
});

test('caches every game’s bundle with the app, not only the ones opened', async ({ page }) => {
  await page.goto('/');
  await controlled(page);

  const cached = await page.evaluate(async () => {
    const entries: { url: string; script: string }[] = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const response = request.url.includes('.js') ? await cache.match(request) : undefined;
        entries.push({ url: request.url, script: response ? await response.text() : '' });
      }
    }
    return entries;
  });
  expect(cached.some(({ url }) => /\/index\.html/.test(url))).toBe(true);
  // Every game's own code is cached, wherever the build puts it: a message key only it uses.
  for (const key of [
    'games.demoChoice.hintCrossedOut',
    'games.hopLine.line',
    'games.tenFrameCafe.trays',
    'games.tileFarm.field',
  ]) {
    expect(
      cached.some(({ script }) => script.includes(key)),
      key,
    ).toBe(true);
  }
  expect(cached.some(({ url }) => /\.woff2/.test(url))).toBe(true);
});

test('leaves out the development tools that the test build keeps (ADR 0041)', async ({ page }) => {
  await playAs(page, ROBIN);
  // A pseudo-locale in the address is ignored: the page stays in English.
  await page.goto('/today?locale=en-XA');
  await expect(page.getByText('Hi, Robin!')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Language' })).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: 'Mock API' })).toHaveCount(0);
  await expect(page.getByTestId('dev-tools')).toHaveCount(0);

  // The game stories route does not exist.
  await page.goto('/play/dev?game=hop-line');
  await expect(page.getByTestId('not-found')).toBeVisible();
});
