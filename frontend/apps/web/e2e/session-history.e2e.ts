import { expect, test, type Page } from '@playwright/test';
import {
  ALEX,
  answerRight,
  meetsWcag,
  playAs,
  ROBIN,
  SAM,
  signInAs,
  untranslatedText,
} from './helpers';

/* A child's sessions with plan 5.2's measures (ADR 0029). */
const NIA = '0192f4c1-0000-7000-8000-00000000c003';

/** The session cards, newest first, across the weeks. */
const sessions = (page: Page) => page.locator('main .parent-session');

test.describe('on the free plan', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, SAM);
    await page.goto('/parent');
    await page.getByRole('link', { name: 'Sessions for Robin' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Robin’s sessions');
  });

  test('lists every session by week, newest first, with the headline measures', async ({
    page,
  }) => {
    await expect(sessions(page)).toHaveCount(21);
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(/^Week of /);
    const latest = sessions(page).first();
    await expect(latest).toContainText('Hop Line: subtract within 20');
    await expect(latest).toContainText('Finished');
    await expect(latest).toContainText('5 of 7 first tries right');
    // The rest of the measures, and each question, come with premium.
    await expect(latest).not.toContainText('right in the end');
    await expect(page.locator('main summary')).toHaveCount(0);
    await expect(page.getByText('With the premium plan, you also see every measure')).toBeVisible();
  });

  test('never shows a score or a percentage', async ({ page }) => {
    await expect(sessions(page)).toHaveCount(21);
    await expect(page.locator('main')).not.toContainText(/score|points|stars|%/i);
  });
});

test('on premium, every measure, and each session question by question', async ({ page }) => {
  await signInAs(page, ALEX);
  await page.goto(`/parent/child/sessions?id=${NIA}`);
  // 9 October: eight right first time, and one right after a hint.
  const session = sessions(page).filter({ hasText: 'October 9' });

  await expect(session).toContainText('8 of 9 first tries right');
  await expect(session).toContainText('9 of 9 right in the end');
  await expect(session).toContainText('1 with a hint or a worked example');
  await expect(session).toContainText('Kept going: 1 right after a first miss');

  await session.getByText('Question by question').click();
  const questions = session.getByRole('listitem').filter({ hasText: /^Question \d/ });
  await expect(questions).toHaveCount(9);
  await expect(questions.first()).toHaveText(
    /Question 1: Make and count equal groups.*Right first time/,
  );
  await expect(questions.last()).toHaveText(
    /Question 9: Multiply as repeated addition.*Right with a hint/,
  );
});

test('a session just played in child mode appears, unfinished, its answer graded again', async ({
  page,
}) => {
  await playAs(page, ROBIN);
  await page.goto('/play?activity=hop-line-add-within-20');
  await answerRight(page);
  await expect(page.getByRole('img', { name: 'Question 2 of 8' })).toBeVisible();

  await signInAs(page, SAM);
  // The outbox delivers the session's events once the app is back on its feet (ADR 0023).
  await expect(async () => {
    await page.goto(`/parent/child/sessions?id=${ROBIN}`);
    const latest = sessions(page).first();
    await expect(latest).toContainText('Hop Line: add within 20', { timeout: 2_000 });
    await expect(latest).toContainText('1 of 1 first tries right', { timeout: 2_000 });
  }).toPass({ timeout: 30_000 });
  await expect(sessions(page).first()).toContainText('Paused, and can carry on');
});

test('another family’s child’s sessions cannot be opened (CLAUDE.md rule 4)', async ({ page }) => {
  await signInAs(page, ALEX);
  await page.goto(`/parent/child/sessions?id=${ROBIN}`);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'We can’t find that child in this family.',
  );
  await expect(page.locator('main')).not.toContainText('Robin');
});

test('every session-history string comes from the catalog', async ({ page }) => {
  const plainText = () =>
    untranslatedText(page, '[data-testid="parent-root"]', ['Sam', 'Alex', 'Robin', 'Nia']);

  await signInAs(page, SAM);
  await page.goto(`/parent/child/sessions?id=${ROBIN}&locale=en-XA`);
  await expect(sessions(page)).toHaveCount(21);
  expect(await plainText()).toEqual([]);

  await signInAs(page, ALEX);
  await page.goto(`/parent/child/sessions?id=${NIA}&locale=en-XA`);
  await expect(sessions(page)).toHaveCount(8);
  await page.locator('summary').first().click();
  expect(await plainText()).toEqual([]);
});

test.describe('accessibility (WCAG 2.2 AA)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`session history on both plans, ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await signInAs(page, SAM);
      await page.goto(`/parent/child/sessions?id=${ROBIN}`);
      await expect(sessions(page)).toHaveCount(21);
      await meetsWcag(page);

      await signInAs(page, ALEX);
      await page.goto(`/parent/child/sessions?id=${NIA}`);
      await page.getByText('Question by question').first().click();
      await expect(sessions(page).first().getByRole('listitem').first()).toBeVisible();
      await meetsWcag(page);
    });
  }
});
