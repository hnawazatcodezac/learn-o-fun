import AxeBuilder from '@axe-core/playwright';
import type { TimeLimits } from '@learnofun/contracts';
import { expect, test, type Page } from '@playwright/test';
import { answerRight, passGate, playAs, ROBIN, SAM, signInAs } from './helpers';

const ACTIVITY = '/play?activity=hop-line-add-within-20';
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function meetsWcag(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`)).toEqual([]);
}

/**
 * Sets Robin's time limits in the dashboard, as a parent does (ADR 0027), before play starts. The
 * mock API answers on the real clock; the page's clock is fast-forwarded a quarter of an hour at
 * most, so both stay on the same day.
 */
async function setLimits(page: Page, limits: TimeLimits) {
  await signInAs(page, SAM);
  const status = await page.evaluate(
    async ({ childId, body }) => {
      const familyId = '0192f4c1-0000-7000-8000-00000000f001';
      const response = await fetch(`/api/families/${familyId}/children/${childId}/time-limits`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.status;
    },
    { childId: ROBIN, body: limits },
  );
  expect(status, 'the limits are saved').toBe(200);
}

test.beforeEach(async ({ page }) => {
  await playAs(page, ROBIN);
  await page.clock.install();
});

// Each test moves the clock only once the second item is on screen: moved during the first
// item's feedback, the time is already up before the second item is chosen.

test('reminds the child to stretch before the next item, then carries on (ADR 0022)', async ({
  page,
}) => {
  await setLimits(page, { breakReminderMinutes: 10, sessionMinutes: 30, dailyLimitMinutes: 60 });
  await page.goto(ACTIVITY);
  await answerRight(page);
  await expect(page.getByRole('img', { name: 'Question 2 of 8' })).toBeVisible();

  // Ten minutes on the second item: the reminder comes before the third.
  await page.clock.fastForward('10:30');
  await answerRight(page);
  const reminder = page.getByRole('dialog', { name: 'Time for a stretch' });
  await expect(reminder).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled();
  await meetsWcag(page);

  await reminder.getByRole('button', { name: 'Keep playing' }).click();
  await expect(reminder).toBeHidden();
  await expect(page.getByRole('img', { name: 'Question 3 of 8' })).toBeVisible();
  await answerRight(page);
  await expect(page.getByRole('img', { name: 'Question 4 of 8' })).toBeVisible();
});

test('stopping for now at the reminder goes back to Today', async ({ page }) => {
  await setLimits(page, { breakReminderMinutes: 10, sessionMinutes: 30, dailyLimitMinutes: 60 });
  await page.goto(ACTIVITY);
  await answerRight(page);
  await expect(page.getByRole('img', { name: 'Question 2 of 8' })).toBeVisible();
  await page.clock.fastForward('10:30');
  await answerRight(page);

  await page
    .getByRole('dialog', { name: 'Time for a stretch' })
    .getByRole('button', { name: 'Stop for now' })
    .click();
  await expect(page).toHaveURL('/today');
});

test('the session’s minutes end it on a success, with the celebration', async ({ page }) => {
  await setLimits(page, { sessionMinutes: 5, breakReminderMinutes: 30, dailyLimitMinutes: 60 });
  await page.goto(ACTIVITY);
  await answerRight(page);
  await expect(page.getByRole('img', { name: 'Question 2 of 8' })).toBeVisible();
  await page.clock.fastForward('05:30');
  await answerRight(page);
  await expect(page.getByText('You did it!')).toBeVisible();
  await expect(page.getByRole('img', { name: 'Question 2 of 2' })).toBeVisible();
});

test('at the daily limit the session ends well, Today says so, and a grown-up can allow more', async ({
  page,
}) => {
  // The shortest day, which a session may not be longer than; reached together, the day wins.
  await setLimits(page, { dailyLimitMinutes: 15, sessionMinutes: 15, breakReminderMinutes: 30 });
  await page.goto(ACTIVITY);
  await answerRight(page);
  await expect(page.getByRole('img', { name: 'Question 2 of 8' })).toBeVisible();
  await page.clock.fastForward('15:30');
  await answerRight(page);

  // The session ends on that success, and celebrates it.
  await expect(page.getByText('You did it!')).toBeVisible();
  await page.getByRole('button', { name: 'Back to my games' }).click();
  await expect(page).toHaveURL('/today');
  await expect(page.getByTestId('time-up')).toContainText('That’s all for today');
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(0);
  await meetsWcag(page);

  // A game cannot be started another way either.
  await page.goto(ACTIVITY);
  await expect(page.getByTestId('time-up')).toBeVisible();
  await page.getByRole('button', { name: 'Back to Today' }).click();

  // Behind the gate, a grown-up allows one more session today.
  await page.getByRole('button', { name: 'Grown-ups' }).click();
  await passGate(page);
  const settings = page.getByRole('dialog', { name: 'Settings for Robin' });
  // One more session: the session's minutes.
  await settings.getByRole('button', { name: 'Allow 15 more minutes today' }).click();
  await expect(settings.getByRole('status')).toHaveText('Robin can play 15 more minutes today.');
  await settings.getByRole('button', { name: 'Done' }).click();

  await expect(page.getByTestId('time-up')).toHaveCount(0);
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(3);
});
