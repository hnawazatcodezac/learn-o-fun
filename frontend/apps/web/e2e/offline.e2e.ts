import type { LearningEvent, LearningSession } from '@learnofun/contracts';
import { expect, test, type Page } from '@playwright/test';
import { answerRight, playAs, ROBIN } from './helpers';

const ACTIVITY = '/play?activity=hop-line-add-within-20';
/** Ages 6 to 8: two warm-ups and a core block of six (ADR 0022). */
const PLANNED = 8;

/**
 * The events the mock API has stored for sessions played in a game: it keeps them in the page's
 * storage (ADR 0011). The past-session scripts, never played in a game, have version 0.0.0
 * (ADR 0028), and are left out.
 */
async function storedEvents(page: Page): Promise<LearningEvent[]> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('learnofun.mock-api.state.v1');
    if (raw === null) return [];
    const state = JSON.parse(raw) as { sessions: LearningSession[]; events: LearningEvent[] };
    const played = new Set(
      state.sessions.filter((s) => s.gameVersion !== '0.0.0').map((s) => s.id),
    );
    return state.events.filter((event) => played.has(event.sessionId));
  });
}

/** What still waits in the device's outbox (ADR 0023). */
async function outboxSize(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const opening = indexedDB.open('learnofun');
        opening.onsuccess = () => {
          const count = opening.result.transaction('outbox').objectStore('outbox').count();
          count.onsuccess = () => {
            resolve(count.result);
          };
        };
      }),
  );
}

const question = (page: Page, n: number) =>
  page.getByRole('img', { name: `Question ${String(n)} of ${String(PLANNED)}` });

/** The session's events, stored once each and in an unbroken sequence from the start. */
async function expectWholeSession(page: Page) {
  await expect.poll(async () => (await storedEvents(page)).at(-1)?.type).toBe('session_completed');
  const events = await storedEvents(page);
  expect(new Set(events.map((event) => event.sessionId)).size).toBe(1);
  expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
  expect(events.map((event) => event.sequence)).toEqual(events.map((_, index) => index));
  expect(events.filter((event) => event.type === 'item_presented')).toHaveLength(PLANNED);
  await expect.poll(() => outboxSize(page)).toBe(0);
  return events;
}

test.beforeEach(async ({ page }) => {
  await playAs(page, ROBIN);
});

test('a session played with the network off midway reaches the mock API once reconnected (ADR 0023)', async ({
  page,
  context,
}) => {
  await page.goto(ACTIVITY);
  await answerRight(page);
  await expect(question(page, 2)).toBeVisible();

  // Four items with no network: play carries on, and everything waits on the device.
  await context.setOffline(true);
  for (let n = 2; n <= 5; n += 1) {
    await expect(question(page, n)).toBeVisible();
    await answerRight(page);
  }
  await expect.poll(() => outboxSize(page)).toBeGreaterThan(0);

  await context.setOffline(false);
  for (let n = 6; n <= PLANNED; n += 1) {
    await expect(question(page, n)).toBeVisible();
    await answerRight(page);
  }
  await expect(page.getByText('You did it!')).toBeVisible();

  await expectWholeSession(page);
});

test('a refresh mid-session carries it on, paused on the same item', async ({ page }) => {
  await page.goto(ACTIVITY);
  await answerRight(page);
  await answerRight(page);
  await expect(question(page, 3)).toBeVisible();

  await page.reload();

  // Back on the third item, with the pause menu open.
  const paused = page.getByRole('dialog', { name: 'Paused' });
  await expect(paused).toBeVisible();
  await expect(question(page, 3)).toBeVisible();
  await paused.getByRole('button', { name: 'Keep playing' }).click();
  for (let n = 3; n <= PLANNED; n += 1) {
    await expect(question(page, n)).toBeVisible();
    await answerRight(page);
  }
  await expect(page.getByText('You did it!')).toBeVisible();

  const events = await expectWholeSession(page);
  // The time away was a pause, and play resumed for the same reason.
  const pauses = events.filter((event) => event.type === 'session_paused');
  const resumes = events.filter((event) => event.type === 'session_resumed');
  expect(pauses.length).toBeGreaterThan(0);
  expect(resumes.map((event) => event.reason)).toEqual(pauses.map((event) => event.reason));
});

test('going elsewhere and opening the same activity again carries the session on', async ({
  page,
}) => {
  await page.goto('/today');
  await page.getByRole('button', { name: /Hop Line: add within 20/ }).click();
  await answerRight(page);
  await expect(question(page, 2)).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL('/today');
  await page.getByRole('button', { name: /Hop Line: add within 20/ }).click();

  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
  await expect(question(page, 2)).toBeVisible();
});

test('back to my games ends the session: the activity starts afresh next time', async ({
  page,
}) => {
  await page.goto(ACTIVITY);
  await answerRight(page);
  await expect(question(page, 2)).toBeVisible();

  await page.getByRole('button', { name: 'Pause' }).click();
  await page
    .getByRole('dialog', { name: 'Paused' })
    .getByRole('button', { name: 'Back to my games' })
    .click();
  await expect(page).toHaveURL('/today');
  await page.goto(ACTIVITY);

  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeHidden();
  await expect(question(page, 1)).toBeVisible();
});
