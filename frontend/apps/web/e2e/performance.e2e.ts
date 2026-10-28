import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  expect,
  test,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { BUNDLE_CAPS, type BundleArea } from './budgets';
import { playAs, ROBIN, SAM, signInAs } from './helpers';

/*
 * The performance budgets (ADR 0040, FRONTEND-KICKOFF 15g), against the production build: every
 * screen shows its main content in under 3 seconds on a throttled mid-range profile, each bundle
 * stays under its cap, and no development code is in the build (ADR 0041).
 */

const LOAD_BUDGET_MS = 3000;
const GAMES = {
  'hop-line': 'hop-line-add-within-20',
  'ten-frame-cafe': 'ten-frame-cafe-count',
  'tile-farm': 'tile-farm-equal-groups',
} as const;

/** Lighthouse's mobile profile: a 4G network, 150 ms away, and a CPU four times slower. */
async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
  });
}

/** Milliseconds from the start of the page's navigation until its main content shows. */
async function timeToContent(page: Page, path: string, content: (page: Page) => Locator) {
  await page.goto(path, { waitUntil: 'commit' });
  await expect(content(page)).toBeVisible({ timeout: 15_000 });
  return page.evaluate(() => performance.now());
}

const cards = (page: Page) => page.getByRole('main').getByRole('listitem').first();
const firstItem = (page: Page) => page.getByRole('img', { name: 'Question 1 of 8' });

interface Timed {
  name: string;
  path: string;
  content: (page: Page) => Locator;
  /** Prepares the page before it is timed. */
  before?: (page: Page) => Promise<void>;
}

/** A first visit: nothing is cached and no service worker is installed. */
const FIRST_VISITS: readonly Timed[] = [
  { name: 'the profile picker', path: '/', content: cards },
  {
    name: 'Today',
    path: '/today',
    content: cards,
    before: (page) => playAs(page, ROBIN),
  },
  {
    name: 'the library',
    path: '/library',
    content: cards,
    before: (page) => playAs(page, ROBIN),
  },
  ...Object.entries(GAMES).map(([game, activity]) => ({
    name: `a game: ${game}`,
    path: `/play?activity=${activity}`,
    content: firstItem,
    before: (page: Page) => playAs(page, ROBIN),
  })),
  {
    name: 'the dashboard sign-in',
    path: '/parent/login',
    content: (page: Page) => page.getByRole('button', { name: 'Sam' }),
  },
];

/** The dashboard after signing in, which loads and caches the app first. */
const SIGNED_IN: readonly Timed[] = [
  {
    name: 'the overview',
    path: '/parent',
    content: (page) => page.locator('main').getByRole('heading', { level: 3 }).first(),
  },
  {
    name: 'progress',
    path: `/parent/child/progress?id=${ROBIN}`,
    content: (page) => page.locator('.parent-reasons__card').first(),
  },
  {
    name: 'goals and time',
    path: `/parent/child/learning?id=${ROBIN}`,
    content: (page) => page.getByRole('main').getByRole('combobox').first(),
  },
  {
    name: 'session history',
    path: `/parent/child/sessions?id=${ROBIN}`,
    content: (page) => page.locator('main .parent-session').first(),
  },
  {
    name: 'the plan',
    path: '/parent/plan',
    content: (page) => page.getByTestId('plan-features'),
  },
];

test.describe(`every screen shows its main content in under ${String(LOAD_BUDGET_MS / 1000)} s, throttled`, () => {
  for (const screen of FIRST_VISITS) {
    test(`${screen.name}, on a first visit`, async ({ page }) => {
      await screen.before?.(page);
      await throttle(page);
      const elapsed = await timeToContent(page, screen.path, screen.content);
      test
        .info()
        .annotations.push({ type: 'load', description: `${String(Math.round(elapsed))} ms` });
      expect(elapsed).toBeLessThan(LOAD_BUDGET_MS);
    });
  }

  for (const screen of SIGNED_IN) {
    test(`${screen.name}, signed in`, async ({ page }) => {
      await signInAs(page, SAM);
      await throttle(page);
      const elapsed = await timeToContent(page, screen.path, screen.content);
      test
        .info()
        .annotations.push({ type: 'load', description: `${String(Math.round(elapsed))} ms` });
      expect(elapsed).toBeLessThan(LOAD_BUDGET_MS);
    });
  }
});

/**
 * The compressed size of each script and style sheet a page loads, by path, in a browser that has
 * seen nothing else, after `prepare` (which may sign in first).
 */
async function filesLoaded(
  browser: Browser,
  path: string,
  content: (page: Page) => Locator,
  prepare?: (page: Page) => Promise<void>,
): Promise<Map<string, number>> {
  const { baseURL } = test.info().project.use;
  const context: BrowserContext = await browser.newContext(baseURL ? { baseURL } : {});
  const page = await context.newPage();
  await prepare?.(page);
  const files = new Map<string, number>();
  const reading: Promise<unknown>[] = [];
  page.on('response', (response) => {
    const file = new URL(response.url()).pathname;
    if (!/\.(?:js|css)$/.test(file) || !file.startsWith('/_next/')) return;
    reading.push(response.body().then((body) => files.set(file, gzipSync(body).length)));
  });
  await page.goto(path);
  await expect(content(page)).toBeVisible();
  await page.waitForLoadState('networkidle');
  await Promise.all(reading);
  await context.close();
  return files;
}

const total = (files: Map<string, number>, keep: (file: string) => boolean) =>
  [...files].filter(([file]) => keep(file)).reduce((sum, [, size]) => sum + size, 0);

test('each bundle stays under its cap: its size on the day the budget was set, plus 10%', async ({
  browser,
}) => {
  const child = await filesLoaded(browser, '/', cards);
  // The parent area: the dashboard's overview, beyond what the child area loads.
  const parent = await filesLoaded(
    browser,
    '/parent',
    (page) => page.locator('main').getByRole('heading', { level: 3 }).first(),
    (page) => signInAs(page, SAM),
  );
  const games = new Map<string, Map<string, number>>();
  for (const [game, activity] of Object.entries(GAMES)) {
    games.set(
      game,
      await filesLoaded(browser, `/play?activity=${activity}`, firstItem, (page) =>
        playAs(page, ROBIN),
      ),
    );
  }

  // The play route is what every game loads beyond the child area's first load.
  const loads = [...games.values()];
  const playRoute = (file: string) => !child.has(file) && loads.every((files) => files.has(file));

  const sizes: Record<BundleArea, number> = {
    'child-first-load': total(child, () => true),
    'parent-area': total(parent, (file) => !child.has(file)),
    'play-route': total(loads[0] ?? new Map<string, number>(), playRoute),
    'game:hop-line': 0,
    'game:ten-frame-cafe': 0,
    'game:tile-farm': 0,
  };
  for (const [game, files] of games) {
    sizes[`game:${game}` as BundleArea] = total(
      files,
      (file) => !child.has(file) && !playRoute(file),
    );
  }

  test.info().annotations.push({ type: 'sizes', description: JSON.stringify(sizes) });
  const over = Object.entries(sizes)
    .filter(([area, size]) => size > BUNDLE_CAPS[area as BundleArea])
    .map(
      ([area, size]) =>
        `${area}: ${String(size)} bytes, cap ${String(BUNDLE_CAPS[area as BundleArea])}`,
    );
  expect(over).toEqual([]);
});

test('no development code is in the production build (ADR 0041)', () => {
  const out = fileURLToPath(new URL('../out/', import.meta.url));
  const scripts = readdirSync(out, { recursive: true, encoding: 'utf8' }).filter((file) =>
    file.endsWith('.js'),
  );
  expect(scripts.length).toBeGreaterThan(0);
  // Strings only the development tools use: the panel, the Language menu and the mock controls.
  const markers = [
    'learnofun.devTools.open',
    'dev.tools.title',
    'dev.mock.title',
    'dev.localeSwitcher.',
  ];
  const found = scripts.filter((file) => {
    const text = readFileSync(join(out, file), 'utf8');
    return markers.some((marker) => text.includes(marker));
  });
  expect(found).toEqual([]);
});
