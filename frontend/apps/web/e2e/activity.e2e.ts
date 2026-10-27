import type { LearningEvent, StartSessionRequest } from '@learnofun/contracts';
import { expect, test, type Page } from '@playwright/test';
import { answerRight, answerWrong } from './helpers';

const ACTIVITY = '/play?activity=hop-line-add-within-20';
const ROBIN = '0192f4c1-0000-7000-8000-00000000c001';

// Robin is the child playing on this device, as if chosen in the profile picker (ADR 0018).
test.beforeEach(async ({ page }) => {
  await page.addInitScript((childId) => {
    localStorage.setItem('learnofun.childMode.childId', childId);
  }, ROBIN);
});

/** What the page sends to the mock API, and what it answers about events. */
function watchApi(page: Page) {
  const sessions: StartSessionRequest[] = [];
  const sent: LearningEvent[] = [];
  const ingested: { accepted: number; duplicates: number }[] = [];
  const order: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'POST') return;
    if (request.url().endsWith('/api/sessions')) {
      order.push('session');
      sessions.push(request.postDataJSON() as StartSessionRequest);
    }
    if (request.url().endsWith('/api/events')) {
      order.push('events');
      sent.push(...(request.postDataJSON() as { events: LearningEvent[] }).events);
    }
  });
  page.on('response', async (response) => {
    if (response.request().method() === 'POST' && response.url().endsWith('/api/events')) {
      ingested.push((await response.json()) as { accepted: number; duplicates: number });
    }
  });
  const accepted = () => ingested.reduce((total, batch) => total + batch.accepted, 0);
  return { sessions, sent, ingested, order, accepted };
}

/** Ages 6 to 8: two warm-ups and a core block of six (ADR 0022). */
const PLANNED = 8;

test('plays Hop Line from the catalog, and every event reaches the mock API once', async ({
  page,
}) => {
  const api = watchApi(page);
  await page.goto(ACTIVITY);

  for (let done = 0; done < PLANNED; done += 1) {
    await expect(
      page.getByRole('img', { name: `Question ${String(done + 1)} of ${String(PLANNED)}` }),
    ).toBeVisible();
    await answerRight(page);
  }
  await expect(page.getByText('You did it!')).toBeVisible();

  // The session is created first, as the first child on the device, then its events follow.
  expect(api.order[0]).toBe('session');
  expect(api.sessions).toEqual([
    expect.objectContaining({
      childId: ROBIN,
      activityId: 'hop-line-add-within-20',
      gameId: 'hop-line',
      mode: 'practice',
    }),
  ]);
  await expect.poll(() => api.sent.at(-1)?.type).toBe('session_completed');
  await expect.poll(api.accepted).toBe(api.sent.length);
  expect(api.ingested.every((batch) => batch.duplicates === 0)).toBe(true);
  expect(api.sent.map((event) => event.sequence)).toEqual(api.sent.map((_, index) => index));
  expect(new Set(api.sent.map((event) => event.sessionId))).toEqual(new Set([api.sessions[0]?.id]));
  // It warms up, then plays the core block; the last was right, so no easy item was needed.
  expect(
    api.sent.flatMap((event) => (event.type === 'item_presented' ? [event.role] : [])),
  ).toEqual(['warm-up', 'warm-up', 'target', 'target', 'target', 'target', 'target', 'target']);

  await page.getByRole('button', { name: 'Back to my games' }).click();
  await expect(page).toHaveURL('/today');
});

test('leaving early sends the session’s end to the mock API', async ({ page }) => {
  const api = watchApi(page);
  await page.goto(ACTIVITY);
  await answerRight(page);
  await expect(page.getByRole('img', { name: `Question 2 of ${String(PLANNED)}` })).toBeVisible();

  await page.getByRole('button', { name: 'Pause' }).click();
  await page
    .getByRole('dialog', { name: 'Paused' })
    .getByRole('button', { name: 'Back to my games' })
    .click();

  await expect(page).toHaveURL('/today');
  await expect
    .poll(() => api.sent.at(-1))
    .toMatchObject({ type: 'session_ended', reason: 'child-left' });
  await expect.poll(api.accepted).toBe(api.sent.length);
});

test('always ends on a success: an easy item follows a last item that went wrong', async ({
  page,
}) => {
  const api = watchApi(page);
  await page.goto(`${ACTIVITY}&mode=challenge`);

  // Challenge takes one answer per item: the last core item is answered wrongly.
  for (let done = 0; done < PLANNED - 1; done += 1) await answerRight(page);
  await answerWrong(page);

  await expect(page.getByRole('img', { name: 'Question 9 of 9' })).toBeVisible();
  await answerRight(page);
  await expect(page.getByText('You did it!')).toBeVisible();
  await expect
    .poll(() => api.sent.filter((event) => event.type === 'item_presented').at(-1))
    .toMatchObject({ role: 'ending' });
});

test('plays Challenge when asked, with no hint button', async ({ page }) => {
  const api = watchApi(page);
  await page.goto(`${ACTIVITY}&mode=challenge`);

  await expect(page.getByRole('slider')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Hint' })).toHaveCount(0);
  await expect.poll(() => api.sessions[0]?.mode).toBe('challenge');
});

test('an unknown activity, or one beyond the family’s plan, is not found', async ({ page }) => {
  // Tile Farm's arrays are premium, and Robin's family is on the free plan.
  for (const activity of ['no-such-activity', 'tile-farm-arrays']) {
    await page.goto(`/play?activity=${activity}`);
    await expect(page.getByTestId('not-found')).toBeVisible();
  }
});

test('plays Tile Farm from the library, and its answer reaches the mock API', async ({ page }) => {
  const api = watchApi(page);
  await page.goto('/library');
  await page
    .getByRole('main')
    .getByRole('listitem')
    .filter({ hasText: 'Tile Farm: plant equal groups' })
    .getByRole('button')
    .click();
  await expect(page).toHaveURL('/play?activity=tile-farm-equal-groups');

  // The policy makes the item, so read what the farmer asks for, then plant and count by rows.
  const field = page.getByRole('spinbutton');
  await expect(field).toBeFocused();
  const order = (await page.locator('.g-tile-farm__order').textContent()) ?? '';
  const [, rows = '', length = ''] = /Plant (\d+) rows? of (\d+)/.exec(order) ?? [];
  expect(Number(rows)).toBeGreaterThan(0);
  for (let row = 0; row < Number(rows); row += 1) await page.keyboard.press('ArrowUp');
  for (let row = 0; row < Number(rows); row += 1) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');

  await expect
    .poll(() => api.sent.find((event) => event.type === 'response_submitted'))
    .toMatchObject({
      response: {
        type: 'numeric',
        value: { kind: 'decimal', value: Number(rows) * Number(length) },
      },
    });
  expect(api.sessions[0]).toMatchObject({
    childId: ROBIN,
    activityId: 'tile-farm-equal-groups',
    gameId: 'tile-farm',
    gameVersion: '0.1.0',
  });
});
