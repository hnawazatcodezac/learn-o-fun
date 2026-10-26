import { expect, test, type Page } from '@playwright/test';
import { ALEX, ARI, meetsWcag, ROBIN, SAM, signInAs, untranslatedText } from './helpers';

/* A child's goal, subject balance and time limits in the dashboard (ADR 0027). */
const NIA = '0192f4c1-0000-7000-8000-00000000c003';
const PREMIUM = '0192f4c1-0000-7000-8000-00000000f002';

const section = (page: Page, name: string) => page.getByRole('region', { name });

/** A date some days from now, as a date field takes it. */
function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** The child's settings as the device reads them, through the mock API. */
function snapshotSettings(page: Page, childId: string) {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/children/${id}/snapshot`);
    const body = (await response.json()) as { settings: Record<string, unknown> };
    return body.settings;
  }, childId);
}

test.describe('on the free plan', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, SAM);
    await page.goto('/parent');
    await page.getByRole('link', { name: 'Goals and time for Ari' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Goals and time for Ari');
  });

  test('pins a subject focus, one at a time, and can clear it', async ({ page }) => {
    const goal = section(page, 'Goal');
    // Ari's goal from the mock data.
    await expect(goal.getByRole('radio', { name: 'Maths' })).toBeChecked();
    // Skills and end dates come with premium, which the page says, with the way to the plan.
    await expect(goal.getByLabel('Skill (optional)')).toHaveCount(0);
    await expect(goal).toContainText('With the premium plan, you can also choose');
    await expect(goal.getByRole('link', { name: 'See what your plan includes' })).toBeVisible();

    await goal.getByRole('radio', { name: 'Reading and writing' }).check();
    await goal.getByRole('button', { name: 'Save goal' }).click();
    await expect(goal.getByRole('status')).toHaveText('Goal saved.');
    await page.reload();
    await expect(goal.getByRole('radio', { name: 'Reading and writing' })).toBeChecked();

    await goal.getByRole('radio', { name: 'No focus' }).check();
    await goal.getByRole('button', { name: 'Save goal' }).click();
    await expect(goal.getByRole('status')).toHaveText('Goal cleared.');
    await page.reload();
    await expect(goal.getByRole('radio', { name: 'No focus' })).toBeChecked();
  });

  test('shares practice between subjects, the other subject taking the rest', async ({ page }) => {
    const balance = section(page, 'Subject balance');
    const maths = balance.getByLabel('Maths');
    const literacy = balance.getByLabel('Reading and writing');
    await expect(maths).toHaveValue('50');
    await expect(literacy).toHaveValue('50');

    await maths.selectOption('70');
    await expect(literacy).toHaveValue('30');
    await balance.getByRole('button', { name: 'Save balance' }).click();
    await expect(balance.getByRole('status')).toHaveText('Balance saved.');

    // 0% pauses a subject.
    await literacy.selectOption('0');
    await expect(maths).toHaveValue('100');
    await balance.getByRole('button', { name: 'Save balance' }).click();
    await page.reload();
    await expect(maths).toHaveValue('100');
    await expect(literacy).toHaveValue('0');
  });

  test('sets time limits from the steps, which the device then plays by', async ({ page }) => {
    const time = section(page, 'Time');
    const session = time.getByLabel('Length of a session');
    const day = time.getByLabel('Play a day');
    // Ari's limits from the mock data.
    await expect(session).toHaveValue('10');
    await expect(day).toHaveValue('15');

    await session.selectOption('30');
    await day.selectOption('15');
    await time.getByRole('button', { name: 'Save time limits' }).click();
    await expect(time.getByText('A session can’t be longer than the day’s play.')).toBeVisible();

    await session.selectOption('15');
    await day.selectOption('45');
    await time.getByLabel('Break reminder after').selectOption('15');
    await time.getByRole('button', { name: 'Save time limits' }).click();
    await expect(time.getByRole('status')).toHaveText('Time limits saved.');
    expect(await snapshotSettings(page, ARI)).toMatchObject({
      sessionMinutes: 15,
      dailyLimitMinutes: 45,
      breakReminderMinutes: 15,
    });
  });
});

test('on premium, a goal can name a skill and the last day it applies', async ({ page }) => {
  await signInAs(page, ALEX);
  await page.goto(`/parent/child/learning?id=${NIA}`);
  const goal = section(page, 'Goal');
  const endsOn = daysFromNow(30);

  await goal.getByRole('radio', { name: 'Maths' }).check();
  await goal.getByLabel('Skill (optional)').selectOption({ label: 'Number bonds to 10' });
  await goal.getByLabel('Until (optional)').fill(endsOn);
  await goal.getByRole('button', { name: 'Save goal' }).click();
  await expect(goal.getByRole('status')).toHaveText('Goal saved.');
  await expect(goal).not.toContainText('With the premium plan');

  await page.reload();
  await expect(goal.getByLabel('Skill (optional)')).toHaveValue('number-bonds-to-10');
  await expect(goal.getByLabel('Until (optional)')).toHaveValue(endsOn);
});

test('a child aged 3 to 5 has maths alone, so no balance to set', async ({ page }) => {
  await signInAs(page, ALEX);
  const kit = await page.evaluate(
    async ({ familyId, birthYear }) => {
      const response = await fetch(`/api/families/${familyId}/children`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nickname: 'Kit',
          birthYear,
          birthMonth: 1,
          learningLanguage: 'en',
          avatarId: 'purple-star',
        }),
      });
      return ((await response.json()) as { child: { id: string } }).child.id;
    },
    // Born in January four years ago: 4 all year.
    { familyId: PREMIUM, birthYear: new Date().getFullYear() - 4 },
  );

  await page.goto(`/parent/child/learning?id=${kit}`);
  await expect(section(page, 'Time')).toBeVisible();
  await expect(section(page, 'Subject balance')).toHaveCount(0);
  await expect(section(page, 'Goal').getByRole('radio')).toHaveCount(2);
});

test('another family’s child cannot be opened (CLAUDE.md rule 4)', async ({ page }) => {
  await signInAs(page, ALEX);
  await page.goto(`/parent/child/learning?id=${ROBIN}`);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'We can’t find that child in this family.',
  );
  await expect(page.locator('main')).not.toContainText('Robin');
});

test('every goals-and-time string comes from the catalog', async ({ page }) => {
  const plainText = () =>
    untranslatedText(page, '[data-testid="parent-root"]', ['Sam', 'Alex', 'Ari', 'Nia']);

  await signInAs(page, SAM);
  await page.goto(`/parent/child/learning?id=${ARI}&locale=en-XA`);
  await expect(page.locator('form')).toHaveCount(3);
  // With a message showing: a session longer than the day.
  const time = page.locator('form').nth(2);
  await time.locator('select').first().selectOption('30');
  await time.locator('select').nth(1).selectOption('15');
  await time.locator('button[type="submit"]').focus();
  await page.keyboard.press('Enter');
  await expect(time.locator('.parent-field__error')).toHaveCount(1);
  expect(await plainText()).toEqual([]);

  await signInAs(page, ALEX);
  await page.goto(`/parent/child/learning?id=${NIA}&locale=en-XA`);
  await page.locator('input[type="radio"][value="mathematics"]').check();
  await expect(page.locator('select').first().locator('option')).not.toHaveCount(1);
  expect(await plainText()).toEqual([]);
});

test.describe('accessibility (WCAG 2.2 AA)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`goals and time, on both plans, ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await signInAs(page, SAM);
      await page.goto(`/parent/child/learning?id=${ARI}`);
      const time = section(page, 'Time');
      await time.getByLabel('Length of a session').selectOption('30');
      await time.getByLabel('Play a day').selectOption('15');
      await time.getByRole('button', { name: 'Save time limits' }).click();
      await expect(time.getByText('A session can’t be longer than the day’s play.')).toBeVisible();
      await meetsWcag(page);

      await signInAs(page, ALEX);
      await page.goto(`/parent/child/learning?id=${NIA}`);
      await section(page, 'Goal').getByRole('radio', { name: 'Maths' }).check();
      await expect(section(page, 'Goal').getByLabel('Skill (optional)')).toBeVisible();
      await meetsWcag(page);
    });
  }
});
