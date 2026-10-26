import { expect, test, type Page } from '@playwright/test';
import { ALEX, meetsWcag, SAM, signInAs, untranslatedText } from './helpers';

const SAMS_FAMILY = '0192f4c1-0000-7000-8000-00000000f001';

/** The children's names on the overview, one card each. */
const children = (page: Page) => page.locator('main').getByRole('heading', { level: 3 });
const familySwitcher = (page: Page) => page.getByLabel('Family', { exact: true });

test.describe('the mock sign-in (ADR 0025)', () => {
  test('signed out, every dashboard page asks to sign in, then opens once signed in', async ({
    page,
  }) => {
    await page.goto('/parent');
    await expect(page).toHaveURL('/parent/login?next=%2Fparent');
    await page.goto('/parent/plan');
    await expect(page).toHaveURL('/parent/login?next=%2Fparent%2Fplan');

    const accounts = page.getByRole('list', { name: 'Choose who to sign in as' });
    await expect(accounts.getByRole('button')).toHaveText(['Sam', 'Alex']);
    await accounts.getByRole('button', { name: 'Sam' }).click();

    // Back to the page that asked.
    await expect(page).toHaveURL('/parent/plan');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your plan');
    await expect(page.getByText('Signed in as Sam')).toBeVisible();
  });

  test('signing out goes back to the sign-in, and the dashboard stays closed', async ({ page }) => {
    await signInAs(page, SAM);
    await page.goto('/parent');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Overview');

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL('/parent/login');
    await page.goto('/parent');
    await expect(page).toHaveURL('/parent/login?next=%2Fparent');
  });
});

test.describe('a parent in two families', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, SAM);
    await page.goto('/parent');
  });

  test('switches between them, and the dashboard remembers the choice', async ({ page }) => {
    await expect(familySwitcher(page).locator('option')).toHaveText([
      'Sam’s family',
      'Alex’s family',
    ]);
    await expect(familySwitcher(page)).toHaveValue(SAMS_FAMILY);
    await expect(children(page)).toHaveText(['Robin', 'Ari']);

    await familySwitcher(page).selectOption({ label: 'Alex’s family' });
    await expect(children(page)).toHaveText(['Nia']);

    await page.reload();
    await expect(children(page)).toHaveText(['Nia']);
    await expect(familySwitcher(page).locator('option:checked')).toHaveText('Alex’s family');
  });

  test('the plan page shows what each family’s own plan includes', async ({ page }) => {
    await page.getByRole('link', { name: 'Plan', exact: true }).click();
    await expect(page).toHaveURL('/parent/plan');
    await expect(page.getByRole('link', { name: 'Plan', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const values = page.getByTestId('plan-features').locator('dd');

    await expect(values).toHaveText([
      'Up to 2 children',
      'The free activities',
      'The essentials',
      'Not included',
      'Not included',
    ]);

    await familySwitcher(page).selectOption({ label: 'Alex’s family' });
    await expect(values).toHaveText([
      'Up to 4 children',
      'Every activity',
      'Skill by skill, in full',
      'Included',
      'Included',
    ]);
  });
});

test('a parent in one family has no switcher, and never sees another family', async ({ page }) => {
  // A family remembered on this device from someone else's sign-in is not Alex's to see.
  await page.addInitScript((familyId) => {
    localStorage.setItem('learnofun.parent.familyId', familyId);
  }, SAMS_FAMILY);
  await signInAs(page, ALEX);
  await page.goto('/parent');

  await expect(page.getByText('Signed in as Alex')).toBeVisible();
  await expect(children(page)).toHaveText(['Nia']);
  await expect(familySwitcher(page)).toHaveCount(0);
});

test('every dashboard string comes from the catalog', async ({ page }) => {
  const plainText = (selector: string) => untranslatedText(page, selector, ['Sam', 'Alex']);

  await page.goto('/parent/login?locale=en-XA');
  await expect(page.locator('main').getByRole('button')).toHaveCount(2);
  expect(await plainText('main')).toEqual([]);

  await signInAs(page, SAM);
  await page.goto('/parent?locale=en-XA');
  await expect(children(page)).toHaveCount(2);
  expect(await plainText('[data-testid="parent-root"]')).toEqual([]);

  await page.goto('/parent/plan?locale=en-XA');
  await expect(page.getByTestId('plan-features').locator('dd')).toHaveCount(5);
  expect(await plainText('[data-testid="parent-root"]')).toEqual([]);
});

test.describe('accessibility (WCAG 2.2 AA)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the sign-in, the overview and the plan, ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/parent/login');
      await expect(page.getByRole('button', { name: 'Sam' })).toBeVisible();
      await meetsWcag(page);

      await page.getByRole('button', { name: 'Sam' }).click();
      await expect(children(page)).toHaveCount(2);
      await meetsWcag(page);

      await page.getByRole('link', { name: 'Plan', exact: true }).click();
      await expect(page.getByTestId('plan-features')).toBeVisible();
      await meetsWcag(page);
    });
  }
});
