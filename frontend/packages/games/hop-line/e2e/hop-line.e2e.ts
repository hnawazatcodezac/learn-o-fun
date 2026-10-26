import type { LearningEvent } from '@learnofun/contracts';
import { test as base, expect, type Page } from '@playwright/test';

/** Every test fails on a page error or a console error. */
const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await use(errors);
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});

/** One item of the story in the game sandbox. */
const url = (item: string, params: Record<string, string> = {}) =>
  `/?${new URLSearchParams({ game: 'hop-line', band: 'early-primary', story: 'early-primary', item, seed: '1', ...params }).toString()}`;

const THREE_PLUS_SIX = 'hop-line-addition-3-plus-6';
const stage = (page: Page) => page.getByTestId('sandbox-stage');
const line = (page: Page) => stage(page).getByRole('slider');
const message = (page: Page) => stage(page).getByRole('status');
const sandboxStatus = (page: Page) => page.getByTestId('sandbox-status');
const events = async (page: Page) =>
  (await page.getByTestId('event-log').locator('pre').allTextContents()).map(
    (text) => JSON.parse(text) as LearningEvent,
  );

/** Opens an item and waits until the game is ready for keys: the number line has focus. */
async function open(page: Page, item: string, params: Record<string, string> = {}) {
  await page.goto(url(item, params));
  await expect(line(page)).toBeFocused();
}

async function press(page: Page, key: string, times = 1) {
  for (let count = 0; count < times; count += 1) await page.keyboard.press(key);
}

test('hops with the arrow keys, Home, the buttons and the frog, and lands with Space', async ({
  page,
}) => {
  await open(page, THREE_PLUS_SIX);
  await expect(line(page)).toHaveAttribute('aria-valuetext', 'Frog on 3, no hops yet');
  await expect(stage(page).locator('.g-hop-line__sum')).toHaveText('3 + 6');
  await expect(stage(page).locator('.g-hop-line__instructions')).toHaveText(
    'Start on 3. Hop 6 times. Where does the frog land?',
  );

  await press(page, 'ArrowRight', 2);
  await expect(line(page)).toHaveAttribute('aria-valuetext', 'Frog on 5, 2 hops');
  await expect(stage(page).locator('.g-hop-line__counter')).toHaveText('2 hops');
  await press(page, 'Home');
  await expect(line(page)).toHaveAttribute('aria-valuenow', '3');

  await stage(page).getByRole('button', { name: 'Hop' }).click();
  await stage(page).getByRole('button', { name: 'Hop' }).click();
  await stage(page).getByRole('button', { name: 'Back' }).click();
  await stage(page).locator('.g-hop-line__frog').click();
  await expect(line(page)).toHaveAttribute('aria-valuenow', '5');

  await line(page).focus();
  await press(page, 'ArrowLeft', 4);
  await expect(line(page)).toHaveAttribute('aria-valuetext', 'Frog on 1, 2 hops back');
  await press(page, 'ArrowRight', 8);
  await press(page, ' ');

  await expect(sandboxStatus(page)).toContainText('Session complete');
  const response = (await events(page)).find((event) => event.type === 'response_submitted');
  expect(response).toMatchObject({ response: { at: { kind: 'line', position: 9 } }, attempt: 1 });
});

test('explains each misconception and sends the frog back, then hints, then shows the way', async ({
  page,
}) => {
  await open(page, THREE_PLUS_SIX);

  // One short: the starting number counted as a hop.
  await press(page, 'ArrowRight', 5);
  await press(page, 'Enter');
  await expect(message(page)).toHaveText('The frog starts on 3. Its first hop takes it to 4.');
  await expect(line(page)).toHaveAttribute('aria-valuenow', '3');

  // On the second number itself; the second wrong answer brings the footprints hint.
  await press(page, 'ArrowRight', 3);
  await press(page, 'Enter');
  await expect(message(page)).toHaveText('Hop 6 times from 3. Don’t hop to 6.');
  await expect(stage(page).locator('.g-hop-line__footprint')).toHaveCount(6);

  // One past, on the third try: the frog shows the way by itself.
  await press(page, 'ArrowRight', 7);
  await press(page, 'Enter');
  await expect(message(page)).toHaveText('Watch the frog hop from 3.');
  await expect(message(page)).toHaveText('9', { timeout: 10_000 });
  await expect(message(page)).toHaveText('Count each hop once, and stop at 6.');
  await expect(stage(page).locator('.g-hop-line__sum')).toHaveText('3 + 6 = 9');
  await expect(stage(page).locator('.g-hop-line__marker--answer')).toHaveCount(1);
  await expect(sandboxStatus(page)).toContainText('Session complete', { timeout: 10_000 });

  const log = await events(page);
  const responses = log.filter((event) => event.type === 'response_submitted');
  expect(responses.map((event) => [event.attempt, event.support])).toEqual([
    [1, 'none'],
    [2, 'encouragement'],
    [3, 'hint'],
  ]);
  expect(log.find((event) => event.type === 'explanation_shown')).toMatchObject({
    misconceptionId: 'extra-hop',
  });
});

test('a hint the child asks for shows footprints that fill in as the frog hops', async ({
  page,
}) => {
  await open(page, THREE_PLUS_SIX);
  const footprints = stage(page).getByRole('img', { name: /hops made$/ });
  await expect(footprints).toBeHidden();

  await page.getByRole('button', { name: 'Hint' }).click();

  await expect(message(page)).toHaveText('Make 6 hops. Each footprint is one hop.');
  await expect(footprints).toHaveAccessibleName('0 of 6 hops made');
  await line(page).focus();
  await press(page, 'ArrowRight', 2);
  await expect(footprints).toHaveAccessibleName('2 of 6 hops made');
  await expect(stage(page).locator('.g-hop-line__footprint--made')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Hint' })).toBeDisabled();
});

test('labels only the landmarks until a hint labels every number', async ({ page }) => {
  await open(page, 'hop-line-addition-9-plus-8-every-5');
  const labels = stage(page).locator('.g-hop-line__label');

  // The landmarks, and the start.
  await expect(labels).toHaveText(['0', '5', '9', '10', '15', '20']);

  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(labels).toHaveCount(21);
});

test('Challenge hides the hop counter, gives no hint, and shows the answer after one try', async ({
  page,
}) => {
  await open(page, THREE_PLUS_SIX, { mode: 'challenge' });
  await expect(line(page)).toHaveAttribute('aria-valuetext', 'Frog on 3');
  await expect(stage(page).locator('.g-hop-line__counter')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Hint' })).toBeDisabled();

  await press(page, 'ArrowRight', 5);
  await press(page, 'Enter');

  await expect(message(page)).toHaveText('The frog lands on 9.');
  await expect(stage(page).locator('.g-hop-line__marker--answer')).toHaveCount(1);
  await expect(sandboxStatus(page)).toContainText('Session complete');
  const log = await events(page);
  expect(log.filter((event) => event.type === 'response_submitted')).toHaveLength(1);
  expect(log.filter((event) => event.type === 'hint_shown')).toEqual([]);
});

test('keeps the number line left to right in a right-to-left locale', async ({ page }) => {
  await open(page, THREE_PLUS_SIX, { locale: 'en-XB' });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(line(page)).toHaveAttribute('dir', 'ltr');

  const labels = stage(page).locator('.g-hop-line__label');
  const zero = await labels.first().boundingBox();
  const twenty = await labels.last().boundingBox();
  expect(zero?.x).toBeLessThan(twenty?.x ?? 0);

  await press(page, 'ArrowRight');
  await expect(line(page)).toHaveAttribute('aria-valuenow', '4');
});
