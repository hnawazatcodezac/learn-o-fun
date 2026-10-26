import { expect, test, type Page } from '@playwright/test';

const WORDS: Record<string, number> = {
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

/** Reads "What is seven times six?" from the gate and works out the answer, as an adult would. */
async function gateAnswer(page: Page): Promise<string> {
  const question = await page.getByText(/^What is \w+ times \w+\?$/).textContent();
  const match = /^What is (\w+) times (\w+)\?$/.exec(question ?? '');
  const a = WORDS[match?.[1] ?? ''];
  const b = WORDS[match?.[2] ?? ''];
  if (a === undefined || b === undefined)
    throw new Error(`Unexpected question: ${String(question)}`);
  return String(a * b);
}

async function enter(page: Page, digits: string) {
  const keypad = page.getByRole('group', { name: 'Number pad' });
  for (const digit of digits) {
    await keypad.getByRole('button', { name: digit, exact: true }).click();
  }
  await keypad.getByRole('button', { name: 'Done' }).click();
}

test.describe('ParentalGate', () => {
  test('lets an adult through with the right times-table answer', async ({ page }) => {
    await page.goto('/?component=parental-gate');
    const gate = page.getByRole('dialog', { name: 'For grown-ups' });
    await expect(gate).toBeVisible();

    await enter(page, await gateAnswer(page));

    await expect(gate).toBeHidden();
    await expect(page.getByText('The gate was passed.')).toBeVisible();
  });

  test('asks a new question after a wrong answer', async ({ page }) => {
    await page.goto('/?component=parental-gate');
    const gate = page.getByRole('dialog', { name: 'For grown-ups' });
    const answer = await gateAnswer(page);

    await enter(page, answer === '1' ? '2' : '1');

    await expect(gate.getByRole('alert')).toHaveText('That’s not it. Here’s another one.');
    await expect(gate).toBeVisible();
    await enter(page, await gateAnswer(page));
    await expect(gate).toBeHidden();
  });

  test('works from the keyboard alone', async ({ page }) => {
    await page.goto('/?component=parental-gate');
    const answer = await gateAnswer(page);
    const keypad = page.getByRole('group', { name: 'Number pad' });

    for (const digit of answer) {
      await keypad.getByRole('button', { name: digit, exact: true }).focus();
      await page.keyboard.press('Enter');
    }
    await keypad.getByRole('button', { name: 'Done' }).focus();
    await page.keyboard.press('Enter');

    await expect(page.getByText('The gate was passed.')).toBeVisible();
  });

  test('reports a cancel, not a pass, when closed with Escape', async ({ page }) => {
    await page.goto('/?component=parental-gate');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page.getByText('The gate was closed without passing.')).toBeVisible();
  });

  test('accepts only the right PIN in PIN mode', async ({ page }) => {
    await page.goto('/?component=parental-gate&band=parent');
    const gate = page.getByRole('dialog', { name: 'For grown-ups' });
    await expect(gate.getByText('Enter your parent PIN.')).toBeVisible();

    await enter(page, '1111');
    await expect(gate.getByRole('alert')).toHaveText('That PIN doesn’t match. Please try again.');

    await enter(page, '2468');
    await expect(gate).toBeHidden();
    await expect(page.getByText('The gate was passed.')).toBeVisible();
  });
});

test.describe('SettingsPanel', () => {
  test('is made of labelled switches that report their state', async ({ page }) => {
    await page.goto('/?component=settings-panel');

    await expect(page.getByRole('switch')).toHaveCount(7);
    await expect(page.getByRole('switch', { name: 'Sound effects' })).toBeChecked();
    await expect(page.getByRole('switch', { name: 'Music' })).not.toBeChecked();

    await page.getByRole('switch', { name: 'Music' }).click();
    await expect(page.getByRole('switch', { name: 'Music' })).toBeChecked();
  });

  test('high contrast switches the theme', async ({ page }) => {
    await page.goto('/?component=settings-panel');

    await page.getByRole('switch', { name: 'High contrast' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
  });

  test('reduce motion turns off transitions', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/?component=settings-panel');

    await page.getByRole('switch', { name: 'Reduce motion' }).click();

    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    expect(
      await page
        .locator('.lf-switch__thumb')
        .first()
        .evaluate((thumb) => getComputedStyle(thumb).transitionDuration),
    ).toBe('0s');
  });

  test('text size scales the whole page', async ({ page }) => {
    await page.goto('/?component=settings-panel');
    const rootFontSize = () =>
      page.locator('html').evaluate((html) => getComputedStyle(html).fontSize);
    expect(await rootFontSize()).toBe('16px');

    await page.getByRole('radio', { name: '150%' }).check({ force: true });

    expect(await rootFontSize()).toBe('24px');
  });

  test('the dyslexia-friendly font loads Andika from this site, never a third party', async ({
    page,
  }) => {
    const fontRequests: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'font') fontRequests.push(request.url());
    });
    await page.goto('/?component=settings-panel');

    await page.getByRole('switch', { name: 'Dyslexia-friendly font' }).click();
    await page.evaluate(() => document.fonts.ready);

    await expect(page.locator('html')).toHaveAttribute('data-font', 'dyslexia');
    expect(await page.evaluate(() => getComputedStyle(document.body).fontFamily)).toContain(
      'Andika',
    );
    expect(await page.evaluate(() => document.fonts.check('16px Andika'))).toBe(true);
    expect(fontRequests.length).toBeGreaterThan(0);
    const site = new URL(page.url()).host;
    for (const url of fontRequests) expect(new URL(url).host).toBe(site);
  });
});
