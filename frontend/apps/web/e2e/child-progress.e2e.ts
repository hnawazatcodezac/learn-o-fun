import { expect, test, type Page } from '@playwright/test';
import { ALEX, ARI, meetsWcag, ROBIN, SAM, signInAs, untranslatedText } from './helpers';

/* A child's progress by skill, and why Today's activities were chosen (ADR 0028). */
const NIA = '0192f4c1-0000-7000-8000-00000000c003';

const today = (page: Page) => page.getByRole('region', { name: 'Why these activities today' });
const subject = (page: Page, name: string) => page.getByRole('region', { name });
const skillRow = (page: Page, title: string) =>
  subject(page, 'Maths').getByRole('listitem').filter({ hasText: title });

/**
 * Plays one Hop Line item for a child through the mock API, as the device does: 5 + 12 on the
 * line, landed right first time. The API grades it again from the item its ID names.
 */
async function playOneItem(page: Page, childId: string) {
  const accepted = await page.evaluate(async (child) => {
    const at = (seconds: number) => new Date(Date.now() - 60_000 + seconds * 1000).toISOString();
    const sessionId = '0192f4c1-0000-7000-8000-000000009001';
    const post = (path: string, body: unknown) =>
      fetch(`/api${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
    const start = {
      activityId: 'hop-line-add-within-20',
      gameId: 'hop-line',
      gameVersion: '0.1.0',
      contentRelease: 'mock-2026-10-20',
      mode: 'practice',
      policyVersion: 'placeholder-2',
    };
    await post('/sessions', { id: sessionId, childId: child, ...start, startedAt: at(0) });
    const envelope = (n: number) => ({
      id: `0192f4c1-0000-7000-8000-00000000${String(9100 + n)}`,
      sessionId,
      sequence: n,
      occurredAt: at(n),
      schemaVersion: 1,
    });
    const itemId = 'hop-line-addition-5-plus-12';
    const response = await post('/events', {
      events: [
        { ...envelope(0), type: 'session_started', ...start },
        {
          ...envelope(1),
          type: 'item_presented',
          itemId,
          skillIds: ['add-within-20'],
          difficulty: 0,
          role: 'target',
        },
        {
          ...envelope(2),
          type: 'response_submitted',
          itemId,
          attempt: 1,
          response: { type: 'placement', at: { kind: 'line', position: 17 } },
          latencyMs: 8000,
          support: 'none',
        },
      ],
    });
    return ((await response.json()) as { accepted?: number }).accepted;
  }, childId);
  expect(accepted, 'the events are stored').toBe(3);
}

test.describe('on the free plan', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, SAM);
    await page.goto('/parent');
  });

  test('explains Today from reason codes, with counts from the events', async ({ page }) => {
    await page.getByRole('link', { name: 'Progress for Robin' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Robin’s progress');

    // The planner's three cards, explained from their reasons (ADR 0035).
    await expect(today(page).getByRole('listitem')).toHaveCount(3);
    await expect(today(page)).toContainText(
      /We’re revisiting “Number bonds to 10”\. Robin mastered it on .+, and a quick review helps it stick\./,
    );
    await expect(today(page)).toContainText(
      'Robin is starting “Number bonds to 20”, building on “Number bonds to 10”: 62 of 78 first tries right over 5 sessions.',
    );
    await expect(today(page)).toContainText('A game Robin can choose freely.');
  });

  test('summarises each strand, with the way to see every skill', async ({ page }) => {
    await page.goto(`/parent/child/progress?id=${ROBIN}`);
    const maths = subject(page, 'Maths');

    await expect(maths.getByRole('heading', { name: 'Addition and subtraction' })).toBeVisible();
    await expect(maths).toContainText('Mastered');
    await expect(maths).not.toContainText('first tries');
    await expect(page.getByText('With the premium plan, you see every skill')).toBeVisible();
    await expect(page.getByRole('link', { name: 'See what your plan includes' })).toBeVisible();
    await expect(subject(page, 'Reading and writing')).toContainText('Not started');
  });

  test('quotes a child’s goal and the evidence of a skill still building', async ({ page }) => {
    await page.goto(`/parent/child/progress?id=${ARI}`);

    await expect(today(page)).toContainText(
      'Ari is building “Count objects and numbers to 20”: 9 of 16 first tries right over 2 sessions so far.',
    );
    await expect(today(page)).toContainText('You asked us to focus on Maths.');
  });
});

test.describe('on premium', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, ALEX);
  });

  test('lists every skill with its status and evidence', async ({ page }) => {
    await page.goto(`/parent/child/progress?id=${NIA}`);

    await expect(
      page.getByText('“Early signal” means there aren’t enough first tries'),
    ).toBeVisible();
    const addWithin10 = skillRow(page, 'Add within 10');
    await expect(addWithin10).toContainText('Review due');
    await expect(addWithin10).toContainText('70 of 90 first tries right over 5 sessions');
    await expect(skillRow(page, 'Multiply as repeated addition')).toContainText(
      '11 of 13 first tries right over 3 sessions',
    );
    await expect(today(page)).toContainText(
      /We’re revisiting “Add within 10”\. Nia mastered it on .+, and a quick review helps it stick\./,
    );
    await expect(skillRow(page, 'Thirds of shapes and amounts')).toContainText('Not started');
  });

  test('shows an early signal for a skill with only a first try, played on a device', async ({
    page,
  }) => {
    await playOneItem(page, NIA);
    await page.goto(`/parent/child/progress?id=${NIA}`);
    const row = skillRow(page, 'Add within 20 by counting on');

    // The learner model reads the answer: the skill has begun, too early to judge (ADR 0031).
    await expect(row).toContainText('Exploring');
    await expect(row).toContainText('Early signal');
    await expect(row).toContainText('1 first try so far');
  });
});

test('another family’s child’s progress cannot be opened (CLAUDE.md rule 4)', async ({ page }) => {
  await signInAs(page, ALEX);
  await page.goto(`/parent/child/progress?id=${ROBIN}`);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'We can’t find that child in this family.',
  );
  await expect(page.locator('main')).not.toContainText('Robin');
});

test('no progress screen uses the words weak, failing or behind', async ({ page }) => {
  for (const [account, child] of [
    [SAM, ROBIN],
    [SAM, ARI],
    [ALEX, NIA],
  ] as const) {
    await signInAs(page, account);
    await page.goto(`/parent/child/progress?id=${child}`);
    await expect(today(page).getByRole('listitem')).toHaveCount(3);
    await expect(page.locator('main')).not.toContainText(/\b(weak|fail|behind|slow)/i);
  }
});

test('every progress string comes from the catalog', async ({ page }) => {
  const plainText = () =>
    untranslatedText(page, '[data-testid="parent-root"]', ['Sam', 'Alex', 'Robin', 'Nia']);

  await signInAs(page, SAM);
  await page.goto(`/parent/child/progress?id=${ROBIN}&locale=en-XA`);
  await expect(page.locator('.parent-reasons__card')).toHaveCount(3);
  expect(await plainText()).toEqual([]);

  await signInAs(page, ALEX);
  await page.goto(`/parent/child/progress?id=${NIA}&locale=en-XA`);
  await expect(page.locator('.parent-skills__skill').first()).toBeVisible();
  expect(await plainText()).toEqual([]);
});

test.describe('accessibility (WCAG 2.2 AA)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`progress on both plans, ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await signInAs(page, SAM);
      await page.goto(`/parent/child/progress?id=${ROBIN}`);
      await expect(today(page).getByRole('listitem')).toHaveCount(3);
      await meetsWcag(page);

      await signInAs(page, ALEX);
      await page.goto(`/parent/child/progress?id=${NIA}`);
      await expect(skillRow(page, 'Add within 10')).toBeVisible();
      await meetsWcag(page);
    });
  }
});
