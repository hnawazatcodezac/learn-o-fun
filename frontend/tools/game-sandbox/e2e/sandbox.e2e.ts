import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

const answers = (page: Page) => page.getByRole('group', { name: 'Answers' });
const answer = (page: Page, label: string) =>
  answers(page).getByRole('button', { name: label, exact: true });
const prompt = (page: Page) => page.getByTestId('sandbox-stage').locator('.g-demo-choice__prompt');
const status = (page: Page) => page.getByTestId('sandbox-status');
const logEntries = (page: Page) => page.getByTestId('event-log').locator('li');
const eventTypes = (page: Page) =>
  logEntries(page).evaluateAll((entries) =>
    entries.map((entry) => entry.getAttribute('data-event-type')),
  );

/** Fails the test on any page error or console error, such as a missing message key. */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') errors.push(message.text());
  });
  return errors;
}

test('plays the demo game through to the end, logging every learning event', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?game=demo-choice&band=early-primary');

  await expect(prompt(page)).toHaveText('3 + 4');
  await answer(page, '7').click();
  await expect(prompt(page)).toHaveText('5 + 5');
  await answer(page, '10').click();
  await expect(prompt(page)).toHaveText('6 + 2');
  await answer(page, '8').click();

  await expect(status(page)).toContainText('Session complete');
  await expect
    .poll(() => eventTypes(page))
    .toEqual([
      'session_started',
      'item_presented',
      'response_submitted',
      'item_presented',
      'response_submitted',
      'item_presented',
      'response_submitted',
      'session_completed',
    ]);
  await expect(page.getByTestId('problems')).toHaveCount(0);
  await expect(logEntries(page).and(page.locator('[data-invalid]'))).toHaveCount(0);

  await logEntries(page).first().locator('summary').click();
  await expect(logEntries(page).first().locator('pre')).toContainText(
    '"activityId": "sandbox-demo-choice"',
  );
  expect(errors).toEqual([]);
});

test('a wrong answer gets encouragement and another try', async ({ page }) => {
  await page.goto('/?game=demo-choice&band=early-primary');

  await answer(page, '6').click();

  await expect(page.getByTestId('last-answer')).toHaveText(
    'Last answer: not right. Next: encouragement and another try',
  );
  await expect(prompt(page)).toHaveText('3 + 4');
  await expect(answer(page, '7')).toBeEnabled();
  await answer(page, '7').click();
  await expect(prompt(page)).toHaveText('5 + 5');
  await expect(page.getByTestId('last-answer')).toHaveText('Last answer: right');
});

test('a hint crosses out one wrong answer, once per item (ADR 0013)', async ({ page }) => {
  await page.goto('/?game=demo-choice&band=early-primary');
  await expect(prompt(page)).toHaveText('3 + 4');
  const hint = page.getByRole('button', { name: 'Hint' });

  await hint.click();

  // A crossed-out answer is the shared tile's ruled-out state (ADR 0020).
  const crossedOut = answers(page).locator('.lf-answer--ruled-out .lf-answer__tile');
  await expect(crossedOut).toHaveCount(1);
  await expect(crossedOut).toBeDisabled();
  await expect(crossedOut).not.toHaveText('7');
  await expect(page.getByTestId('sandbox-stage').getByRole('status')).toHaveText(
    'Here’s a hint: one answer is crossed out.',
  );
  await expect(hint).toBeDisabled();
  await expect.poll(async () => (await eventTypes(page)).at(-1)).toBe('hint_shown');

  await answer(page, '7').click();
  await expect(prompt(page)).toHaveText('5 + 5');
  await expect(hint).toBeEnabled();
  await expect(answers(page).locator('.lf-answer--ruled-out')).toHaveCount(0);
});

test('the address reproduces a setup, down to a single item', async ({ page }) => {
  await page.goto('/?game=demo-choice&band=early-years&item=demo-choice-ey-2');

  await expect(page).toHaveURL(/story=early-years/);
  await expect(page.locator('html')).toHaveAttribute('data-band', 'early-years');
  await expect(prompt(page)).toHaveText('2 + 1');
  await answer(page, '3').click();

  await expect(status(page)).toContainText('Session complete');
  expect((await eventTypes(page)).filter((type) => type === 'item_presented')).toHaveLength(1);
});

test('changing what the game receives starts a new session; the theme does not', async ({
  page,
}) => {
  await page.goto('/?game=demo-choice&band=early-primary');
  await answer(page, '7').click();
  await expect(prompt(page)).toHaveText('5 + 5');

  await page.getByLabel('Theme').selectOption('dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(prompt(page)).toHaveText('5 + 5');

  await page.getByLabel('Age band').selectOption('early-years');
  await expect(page).toHaveURL(/band=early-years/);
  await expect(page.locator('html')).toHaveAttribute('data-band', 'early-years');
  await expect(prompt(page)).toHaveText('1 + 1');
  await expect.poll(() => eventTypes(page)).toEqual(['session_started', 'item_presented']);

  await page.getByRole('button', { name: 'Restart' }).click();
  await expect(prompt(page)).toHaveText('1 + 1');
  await expect.poll(() => eventTypes(page)).toEqual(['session_started', 'item_presented']);
  await expect(page.getByTestId('sandbox-stage').locator('.g-demo-choice')).toHaveCount(1);
});

test('pauses, resumes, skips and ends a session', async ({ page }) => {
  await page.goto('/?game=demo-choice&band=early-primary');
  await expect(prompt(page)).toHaveText('3 + 4');

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(status(page)).toContainText('Paused');
  await expect(answer(page, '7')).toBeDisabled();

  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(status(page)).toContainText('Playing');
  await expect(answer(page, '7')).toBeEnabled();

  await page.getByRole('button', { name: 'Skip item' }).click();
  await expect(prompt(page)).toHaveText('5 + 5');

  await page.getByRole('button', { name: 'End session' }).click();
  await expect(status(page)).toContainText('Session ended');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled();
  await expect
    .poll(() => eventTypes(page))
    .toEqual([
      'session_started',
      'item_presented',
      'session_paused',
      'session_resumed',
      'item_skipped',
      'item_presented',
      'session_ended',
    ]);
});

test('shows game text and content in the pseudo-locales', async ({ page }) => {
  await page.goto('/?game=demo-choice&band=early-primary&locale=en-XA');

  const instructions = page.getByTestId('sandbox-stage').locator('.g-demo-choice__instructions');
  await expect(instructions).toHaveText(/^\[Çĥööšé ţĥé ŕîĝĥţ åñšŵéŕ\. ·+\]$/);
  await expect(prompt(page)).toHaveText(/^\[3 \+ 4 ·+\]$/);
  // The group's accessible name is game text too.
  await expect(
    page.getByRole('group', { name: /^\[Åñšŵéŕš ·+\]$/ }).getByRole('button'),
  ).toHaveCount(3);

  await page.getByLabel(/Ļåñĝûåĝé/).selectOption('en-XB');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page).toHaveURL(/locale=en-XB/);
  await expect(prompt(page)).toHaveText(/^\[3 \+ 4 ·+\]$/);
  await expect.poll(() => eventTypes(page)).toEqual(['session_started', 'item_presented']);
});

for (const band of ['early-years', 'early-primary'] as const) {
  for (const theme of ['light', 'dark', 'contrast'] as const) {
    test(`the sandbox · ${band} · ${theme} meets WCAG 2.2 AA`, async ({ page }) => {
      await page.goto(`/?game=demo-choice&band=${band}&theme=${theme}`);
      await expect(answers(page)).toBeVisible();

      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();

      expect(violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`)).toEqual([]);
    });
  }
}
