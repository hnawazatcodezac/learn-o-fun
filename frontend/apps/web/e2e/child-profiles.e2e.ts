import { expect, test, type Page } from '@playwright/test';
import { ALEX, meetsWcag, ROBIN, SAM, signInAs, untranslatedText } from './helpers';

/*
 * Child profiles in the dashboard (ADR 0026). Ages count from today, so the birth dates here are
 * made from this year: born in January, a child's age is the same all year.
 */
const THIS_YEAR = new Date().getFullYear();
const NIA = '0192f4c1-0000-7000-8000-00000000c003';

/** The children's names on the overview, one card each. */
const children = (page: Page) => page.locator('main').getByRole('heading', { level: 3 });

async function fillProfile(
  page: Page,
  {
    nickname,
    month,
    year,
    grade,
  }: { nickname: string; month: string; year: number; grade?: string },
) {
  await page.getByLabel('Nickname').fill(nickname);
  await page.getByLabel('Month', { exact: true }).selectOption({ label: month });
  await page.getByLabel('Year', { exact: true }).selectOption(String(year));
  if (grade) await page.getByLabel('School year (optional)').selectOption({ label: grade });
}

test.describe('in a family with room for more children', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, ALEX);
    await page.goto('/parent');
    await expect(children(page)).toHaveText(['Nia']);
  });

  test('adds a child, who then appears with their age and school year', async ({ page }) => {
    await page.getByRole('button', { name: 'Add a child' }).click();
    await expect(page).toHaveURL('/parent/children/new');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Add a child');
    // Only what CLAUDE.md rule 7 allows: no field for a full date of birth.
    await expect(page.locator('input[type="date"]')).toHaveCount(0);
    await expect(page.getByLabel('Learning language')).toHaveValue('en');
    await expect(page.getByRole('radio', { name: 'Circle' })).toBeChecked();

    await fillProfile(page, { nickname: 'Kit', month: 'January', year: THIS_YEAR - 5 });
    await page.getByLabel('School year (optional)').selectOption({ label: 'Reception' });
    await page.getByRole('radio', { name: 'Star' }).check();
    await page.getByRole('button', { name: 'Add child' }).click();

    await expect(page).toHaveURL('/parent');
    await expect(
      page.getByRole('status').filter({ hasText: 'Kit’s profile is saved.' }),
    ).toBeVisible();
    await expect(children(page)).toHaveText(['Nia', 'Kit']);
    const kit = page.getByRole('listitem').filter({ hasText: 'Kit' });
    await expect(kit).toContainText('Age 5');
    await expect(kit).toContainText('Reception');

    // Saved for good, and said only once.
    await page.reload();
    await expect(children(page)).toHaveText(['Nia', 'Kit']);
    await expect(page.getByText('Kit’s profile is saved.')).toBeHidden();
  });

  test('checks the form before saving, and moves focus to what to change', async ({ page }) => {
    await page.getByRole('button', { name: 'Add a child' }).click();
    const nickname = page.getByLabel('Nickname');
    const month = page.getByLabel('Month', { exact: true });

    await page.getByRole('button', { name: 'Add child' }).click();
    await expect(nickname).toBeFocused();
    await expect(nickname).toHaveAttribute('aria-invalid', 'true');
    await expect(nickname).toHaveAccessibleDescription(/Enter a nickname\./);
    await expect(page.getByText('Choose the month and the year.')).toBeVisible();

    await nickname.fill('Kit');
    await page.getByRole('button', { name: 'Add child' }).click();
    await expect(month).toBeFocused();

    // Born in January nine years ago: 9 all year, past this release's ages.
    await fillProfile(page, { nickname: 'Kit', month: 'January', year: THIS_YEAR - 9 });
    await page.getByRole('button', { name: 'Add child' }).click();
    await expect(page.getByText('Learnofun has activities for ages 3 to 8 for now.')).toBeVisible();
    await expect(page).toHaveURL('/parent/children/new');

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL('/parent');
    await expect(children(page)).toHaveText(['Nia']);
  });

  test('edits a profile, and clears a school year', async ({ page }) => {
    await page.getByRole('link', { name: 'Edit profile for Nia' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Edit Nia’s profile');
    await expect(page.getByLabel('Nickname')).toHaveValue('Nia');
    await expect(page.getByLabel('School year (optional)')).toHaveValue('year-2');

    await page.getByLabel('Nickname').fill('Nina');
    await page.getByLabel('School year (optional)').selectOption({ label: 'Not set' });
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(
      page.getByRole('status').filter({ hasText: 'Nina’s profile is saved.' }),
    ).toBeVisible();
    await expect(children(page)).toHaveText(['Nina']);
    await expect(page.getByRole('listitem').filter({ hasText: 'Nina' })).not.toContainText('Year');
  });
});

test.describe('in a family at its plan’s child limit (plan 9)', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, SAM);
    await page.goto('/parent');
    await expect(children(page)).toHaveText(['Robin', 'Ari']);
  });

  test('"Add a child" is unavailable, says why and leads to the plan', async ({ page }) => {
    const add = page.getByRole('button', { name: 'Add a child' });

    await expect(add).toBeDisabled();
    await expect(add).toHaveAccessibleDescription(/Your plan includes up to 2 children\./);
    await page.getByRole('link', { name: 'See what your plan includes' }).click();
    await expect(page).toHaveURL('/parent/plan');

    // The address itself explains too, with no form.
    await page.goto('/parent/children/new');
    await expect(page.getByText('Your plan includes up to 2 children.')).toBeVisible();
    await expect(page.getByLabel('Nickname')).toHaveCount(0);
  });

  test('renames a child, which the child area’s picker then shows', async ({ page }) => {
    await page.getByRole('link', { name: 'Edit profile for Robin' }).click();
    await page.getByLabel('Nickname').fill('Robbie');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(
      page.getByRole('status').filter({ hasText: 'Robbie’s profile is saved.' }),
    ).toBeVisible();

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Robbie' })).toBeVisible();
  });
});

test('another family’s child cannot be opened (CLAUDE.md rule 4)', async ({ page }) => {
  await signInAs(page, ALEX);
  await page.goto(`/parent/child?id=${ROBIN}`);

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'We can’t find that child in this family.',
  );
  await expect(page.locator('main')).not.toContainText('Robin');
  await expect(page.getByLabel('Nickname')).toHaveCount(0);
});

test('every profile string comes from the catalog', async ({ page }) => {
  await signInAs(page, ALEX);
  const plainText = () =>
    untranslatedText(page, '[data-testid="parent-root"]', ['Sam', 'Alex', 'Nia']);

  await page.goto('/parent?locale=en-XA');
  await expect(children(page)).toHaveCount(1);
  expect(await plainText()).toEqual([]);

  await page.goto('/parent/children/new?locale=en-XA');
  await expect(page.locator('form')).toBeVisible();
  // With every message showing. Enter submits the form, as a keyboard user would.
  await page.locator('form input[type="text"]').press('Enter');
  await expect(page.locator('.parent-field__error')).toHaveCount(2);
  expect(await plainText()).toEqual([]);

  await page.goto(`/parent/child?id=${NIA}&locale=en-XA`);
  await expect(page.locator('form')).toBeVisible();
  expect(await plainText()).toEqual([]);
});

test.describe('accessibility (WCAG 2.2 AA)', () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`the overview, and the profile form with its messages, ${colorScheme}`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await signInAs(page, SAM);
      await page.goto('/parent');
      await expect(page.getByRole('button', { name: 'Add a child' })).toBeDisabled();
      await meetsWcag(page);

      await page.getByRole('link', { name: 'Edit profile for Ari' }).click();
      await page.getByLabel('Nickname').fill('');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByText('Enter a nickname.')).toBeVisible();
      await meetsWcag(page);
    });
  }
});
