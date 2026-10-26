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

/** One item of a story in the game sandbox. */
const url = (story: string, item: string, params: Record<string, string> = {}) =>
  `/?${new URLSearchParams({ game: 'tile-farm', band: 'early-primary', story, item, seed: '1', ...params }).toString()}`;

const stage = (page: Page) => page.getByTestId('sandbox-stage');
const field = (page: Page) => stage(page).getByRole('spinbutton');
const message = (page: Page) => stage(page).getByRole('status');
const order = (page: Page) => stage(page).locator('.g-tile-farm__order');
const ticks = (page: Page) => stage(page).locator('.g-tile-farm__tick');
const totals = (page: Page) => stage(page).locator('.g-tile-farm__total');
const sandboxStatus = (page: Page) => page.getByTestId('sandbox-status');
const events = async (page: Page) =>
  (await page.getByTestId('event-log').locator('pre').allTextContents()).map(
    (text) => JSON.parse(text) as LearningEvent,
  );
const answers = async (page: Page) =>
  (await events(page)).flatMap((event) =>
    event.type === 'response_submitted' && event.response.type === 'numeric'
      ? [event.response.value]
      : [],
  );

/** Opens an item and waits until the game is ready for keys: the field has focus. */
async function open(page: Page, story: string, item: string, params: Record<string, string> = {}) {
  await page.goto(url(story, item, params));
  await expect(field(page)).toBeFocused();
}

async function press(page: Page, key: string, times = 1) {
  for (let count = 0; count < times; count += 1) await page.keyboard.press(key);
}

test('equal groups: plants a row per tap, counts a row at a time with ticks, and gives the count', async ({
  page,
}) => {
  await open(page, 'equal-groups', 'tile-farm-groups-3-rows-of-4-carrot');
  await expect(order(page)).toHaveText('Plant 3 rows of 4 carrots.');
  await expect(field(page)).toHaveAttribute('aria-valuetext', '0 rows of 4 planted. Counted: 0.');

  await press(page, 'ArrowUp', 2);
  await stage(page).getByRole('button', { name: 'Plant a row' }).click();
  await expect(stage(page).locator('.g-tile-farm__plant')).toHaveCount(12);
  await field(page).focus();
  await press(page, 'ArrowRight', 2);
  await expect(field(page)).toHaveAttribute('aria-valuetext', '3 rows of 4 planted. Counted: 8.');
  await expect(stage(page).locator('.g-tile-farm__count')).toHaveText('Counted: 8');
  await expect(ticks(page)).toHaveCount(2);
  await stage(page).getByRole('button', { name: 'Add a row' }).click();
  await expect(ticks(page)).toHaveCount(3);
  await field(page).focus();
  await press(page, 'Enter');

  // Right, so the one-item session completes.
  await expect(sandboxStatus(page)).toContainText('Session complete');
  expect(await answers(page)).toEqual([{ kind: 'decimal', value: 12 }]);
});

test('equal groups: adding the numbers, or a row too many, each gets its explanation', async ({
  page,
}) => {
  await open(page, 'equal-groups', 'tile-farm-groups-3-rows-of-4-carrot');
  await press(page, 'ArrowUp', 3);
  await press(page, '+', 7);
  await press(page, 'Enter');
  await expect(message(page)).toHaveText(
    'There are 3 rows, and each row has 4. Count every plant.',
  );

  // The field and the count stay as the child left them, to fix.
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveAttribute('aria-valuetext', '3 rows of 4 planted. Counted: 7.');
  await press(page, 'ArrowUp');
  await press(page, '-', 7);
  await press(page, 'ArrowRight', 4);
  await press(page, 'Enter');
  await expect(message(page)).toHaveText('Count each row once: 4, 8, 12.');
  // The second wrong answer brings the hint: each row's running total.
  await expect(totals(page)).toHaveText(['4', '8', '12', '16']);

  // Digging up the extra row leaves the counter as it was: the child counts again.
  await stage(page).getByRole('button', { name: 'Dig up a row' }).click();
  await expect(field(page)).toHaveAttribute('aria-valuetext', '3 rows of 4 planted. Counted: 16.');
  expect(await answers(page)).toEqual([
    { kind: 'decimal', value: 7 },
    { kind: 'decimal', value: 16 },
  ]);
});

test('arrays: planting stops when the outline is full, and the counter goes past the field', async ({
  page,
}) => {
  await open(page, 'arrays', 'tile-farm-arrays-3-rows-of-5-sunflower');
  await expect(order(page)).toHaveText('Fill the field: 3 rows and 5 columns.');
  await expect(stage(page).locator('.g-tile-farm__outline')).toHaveCount(1);
  await expect(stage(page).locator('.g-tile-farm__plot--empty')).toHaveCount(15);

  await press(page, 'ArrowUp', 4);
  await expect(field(page)).toHaveAttribute('aria-valuetext', '3 rows of 5 planted. Counted: 0.');
  await expect(stage(page).locator('.g-tile-farm__plot--empty')).toHaveCount(0);
  await expect(stage(page).getByRole('button', { name: 'Plant a row' })).toBeDisabled();

  // Counting one by one never stops at the plants planted: the child decides.
  await press(page, '+', 16);
  await expect(field(page)).toHaveAttribute('aria-valuetext', '3 rows of 5 planted. Counted: 16.');
  await expect(ticks(page)).toHaveCount(3);
  await press(page, '-');
  await press(page, 'Enter');
  await expect(sandboxStatus(page)).toContainText('Session complete');
  expect(await answers(page)).toEqual([{ kind: 'decimal', value: 15 }]);
});

test('the hint shows each row’s total, and "show me" counts the field a row at a time', async ({
  page,
}) => {
  await open(page, 'equal-groups', 'tile-farm-groups-2-rows-of-5-carrot');
  await press(page, 'ArrowUp', 2);
  await expect(totals(page)).toHaveCount(0);

  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(message(page)).toHaveText('Here’s a hint: each row shows its total.');
  await expect(totals(page)).toHaveText(['5', '10']);
  await expect(stage(page).locator('.g-tile-farm__total--dim')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Hint' })).toBeDisabled();
  // Counting a row brings out its total, with a tick.
  await field(page).focus();
  await press(page, 'ArrowRight');
  await expect(stage(page).locator('.g-tile-farm__total--dim')).toHaveCount(1);
  await expect(ticks(page)).toHaveCount(1);

  // Three wrong answers bring the worked "show me".
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(field(page)).toHaveAttribute('aria-disabled', 'false');
    await press(page, 'Enter');
    if (attempt === 0) await expect(message(page)).toHaveText('Nearly! Count the rows again.');
  }
  await expect(message(page)).toHaveText('2 rows of 5 make 10.', { timeout: 10_000 });
  await expect(order(page)).toHaveText('5 + 5 = 10');
  await expect(sandboxStatus(page)).toContainText('Session complete', { timeout: 10_000 });
});

test('Challenge has no Add a row and no hint, and shows the field counted after one try', async ({
  page,
}) => {
  await open(page, 'arrays', 'tile-farm-arrays-3-rows-of-5-sunflower', { mode: 'challenge' });
  await expect(stage(page).getByRole('button', { name: 'Add a row' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hint' })).toBeDisabled();

  await press(page, 'ArrowUp', 3);
  await press(page, 'ArrowRight');
  await expect(field(page)).toHaveAttribute('aria-valuetext', '3 rows of 5 planted. Counted: 0.');
  await press(page, '+', 14);
  await press(page, 'Enter');

  await expect(message(page)).toHaveText('3 rows of 5 make 15.');
  await expect(order(page)).toHaveText('3 rows of 5 = 15');
  await expect(totals(page)).toHaveText(['5', '10', '15']);
  await expect(sandboxStatus(page)).toContainText('Session complete');
  const log = await events(page);
  expect(log.filter((event) => event.type === 'response_submitted')).toHaveLength(1);
  expect(log.filter((event) => event.type === 'hint_shown')).toEqual([]);
});

test('fills rows from the start side, mirrored in a right-to-left locale', async ({ page }) => {
  await open(page, 'equal-groups', 'tile-farm-groups-2-rows-of-5-carrot', { locale: 'en-XB' });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await press(page, 'ArrowUp');

  const [first, second] = await stage(page).locator('.g-tile-farm__plant').all();
  const firstBox = await first?.boundingBox();
  const secondBox = await second?.boundingBox();
  expect(firstBox?.x).toBeGreaterThan(secondBox?.x ?? Infinity);
});
