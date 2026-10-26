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
  `/?${new URLSearchParams({ game: 'ten-frame-cafe', band: 'early-primary', story, item, seed: '1', ...params }).toString()}`;

const stage = (page: Page) => page.getByTestId('sandbox-stage');
const trays = (page: Page) => stage(page).getByRole('spinbutton');
const message = (page: Page) => stage(page).getByRole('status');
const order = (page: Page) => stage(page).locator('.g-ten-frame-cafe__order');
const sandboxStatus = (page: Page) => page.getByTestId('sandbox-status');
const events = async (page: Page) =>
  (await page.getByTestId('event-log').locator('pre').allTextContents()).map(
    (text) => JSON.parse(text) as LearningEvent,
  );

/** Opens an item and waits until the game is ready for keys: the trays have focus. */
async function open(page: Page, story: string, item: string, params: Record<string, string> = {}) {
  await page.goto(url(story, item, params));
  await expect(trays(page)).toBeFocused();
}

async function press(page: Page, key: string, times = 1) {
  for (let count = 0; count < times; count += 1) await page.keyboard.press(key);
}

test('counting: adds fruit with the Up arrow and the buttons, a second tray above ten, and serves', async ({
  page,
}) => {
  await open(page, 'early-primary', 'ten-frame-counting-13-strawberry');
  await expect(order(page)).toHaveText('13 strawberries, please.');
  await expect(trays(page)).toHaveAttribute('aria-valuetext', '0 strawberries in the trays');

  await press(page, 'ArrowUp', 12);
  await stage(page).getByRole('button', { name: 'Add' }).click();
  await expect(trays(page)).toHaveAttribute('aria-valuetext', '13 strawberries in the trays');
  await expect(stage(page).locator('.g-ten-frame-cafe__tray-count')).toHaveText([
    '10 of 10',
    '3 of 10',
  ]);
  await expect(stage(page).locator('.g-ten-frame-cafe__tray--full')).toHaveCount(1);
  await trays(page).focus();
  await press(page, 'ArrowDown');
  await press(page, 'ArrowUp');
  await press(page, 'Enter');

  // Right, so the one-item session completes.
  await expect(sandboxStatus(page)).toContainText('Session complete');
  const answered = (await events(page)).find((event) => event.type === 'response_submitted');
  expect(answered).toMatchObject({ response: { type: 'numeric', value: { value: 13 } } });
});

test('bonds to 10: extra fruit spill onto the counter, and serving the part shown names it', async ({
  page,
}) => {
  await open(page, 'bonds-to-10', 'ten-frame-bonds-10-7-lemon');
  await expect(order(page)).toHaveText('Fill the tray. It has 7 lemons already.');
  await expect(trays(page)).toHaveAttribute('aria-valuetext', 'Tray: 7 of 10');

  // Adding 7, the number already there: the tray fills, and 4 spill onto the counter.
  await press(page, 'ArrowUp', 7);
  await expect(trays(page)).toHaveAttribute('aria-valuetext', 'Tray: 10 of 10, 4 on the counter');
  await press(page, 'Enter');
  await expect(message(page)).toHaveText('The tray has 7. How many more make 10?');

  // The trays stay as the child left them, to fix.
  await expect(trays(page)).toBeFocused();
  await press(page, 'ArrowDown', 4);
  await expect(trays(page)).toHaveAttribute('aria-valuetext', 'Tray: 10 of 10');
  await press(page, 'Enter');
  await expect(sandboxStatus(page)).toContainText('Session complete');
  const answers = (await events(page)).flatMap((event) =>
    event.type === 'response_submitted' && event.response.type === 'numeric'
      ? [event.response.value]
      : [],
  );
  expect(answers).toEqual([
    { kind: 'decimal', value: 7 },
    { kind: 'decimal', value: 3 },
  ]);
});

test('making ten: moves fruit into the first tray, then counts on, with both mistakes explained', async ({
  page,
}) => {
  await open(page, 'making-ten', 'ten-frame-make-ten-8-plus-5-apple');
  await expect(order(page)).toHaveText('8 apples and 5 apples, in one box.');
  await expect(trays(page)).toHaveAttribute(
    'aria-valuetext',
    'First tray 8 of 10, second tray 5. Altogether 8.',
  );

  await press(page, 'ArrowRight', 2);
  await expect(trays(page)).toHaveAttribute(
    'aria-valuetext',
    'First tray 10 of 10, second tray 3. Altogether 10.',
  );
  // Serving the full tray alone: the second tray is forgotten.
  await press(page, 'Enter');
  await expect(message(page)).toHaveText('One tray is full. What is left in the other?');

  // Counting on 5 from ten counts the moved apples twice.
  await expect(trays(page)).toBeFocused();
  await press(page, 'ArrowUp', 5);
  await expect(stage(page).locator('.g-ten-frame-cafe__total')).toHaveText('Altogether: 15');
  await press(page, 'Enter');
  await expect(message(page)).toHaveText('Those 2 moved. Count them once.');
});

test('the hint outlines the empty cells, and "show me" fills the trays counting aloud', async ({
  page,
}) => {
  await open(page, 'early-primary', 'ten-frame-counting-4-apple');
  await expect(stage(page).locator('.g-ten-frame-cafe__cell--outlined')).toHaveCount(0);

  await page.getByRole('button', { name: 'Hint' }).click();
  await expect(message(page)).toHaveText('Here’s a hint: the empty cells are outlined.');
  await expect(stage(page).locator('.g-ten-frame-cafe__cell--outlined')).toHaveCount(10);
  await expect(page.getByRole('button', { name: 'Hint' })).toBeDisabled();

  // Three wrong answers bring the worked "show me".
  await trays(page).focus();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await expect(trays(page)).toHaveAttribute('aria-disabled', 'false');
    await press(page, 'Enter');
    if (attempt < 2) await expect(message(page)).not.toHaveText('');
  }
  await expect(message(page)).toHaveText('That makes 4.', { timeout: 10_000 });
  await expect(order(page)).toHaveText('4');
  await expect(sandboxStatus(page)).toContainText('Session complete', { timeout: 10_000 });
});

test('Challenge hides the tray counts, gives no hint, and shows the order after one try', async ({
  page,
}) => {
  await open(page, 'bonds-to-10', 'ten-frame-bonds-10-4-apple', { mode: 'challenge' });
  await expect(stage(page).locator('.g-ten-frame-cafe__tray-count')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hint' })).toBeDisabled();

  await press(page, 'ArrowUp', 5);
  await press(page, 'Enter');

  await expect(message(page)).toHaveText('4 and 6 make 10.');
  await expect(order(page)).toHaveText('4 + 6 = 10');
  await expect(sandboxStatus(page)).toContainText('Session complete');
  const log = await events(page);
  expect(log.filter((event) => event.type === 'response_submitted')).toHaveLength(1);
  expect(log.filter((event) => event.type === 'hint_shown')).toEqual([]);
});

test('fills the trays left to right in a right-to-left locale', async ({ page }) => {
  await open(page, 'making-ten', 'ten-frame-make-ten-9-plus-3-pear', { locale: 'en-XB' });
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(trays(page)).toHaveAttribute('dir', 'ltr');

  const [first, second] = await stage(page).locator('.g-ten-frame-cafe__tray').all();
  const firstBox = await first?.boundingBox();
  const secondBox = await second?.boundingBox();
  expect(firstBox?.x).toBeLessThan(secondBox?.x ?? 0);
});
