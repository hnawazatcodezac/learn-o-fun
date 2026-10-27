import { expect, test, type Locator, type Page } from '@playwright/test';

/** Each area's first page, and two things on it, side by side, that swap places right to left. */
const AREAS = [
  {
    name: 'child area',
    path: '/',
    heading: 'Learnofun',
    pair: (page: Page): [Locator, Locator] => [
      page.getByTestId('placeholder-shape'),
      page.getByRole('heading', { level: 1 }),
    ],
  },
  {
    // Signed out, the parent area opens on its sign-in page (ADR 0025): the accounts in a row.
    name: 'parent area',
    path: '/parent/login',
    heading: 'Sign in to Learnofun for families',
    pair: (page: Page): [Locator, Locator] => {
      const accounts = page.locator('main').getByRole('listitem');
      return [accounts.first(), accounts.nth(1)];
    },
  },
] as const;

async function leftEdge(locator: Locator): Promise<number> {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element is not visible');
  return box.x;
}

for (const area of AREAS) {
  test.describe(area.name, () => {
    test('starts in English, left to right', async ({ page }) => {
      await page.goto(area.path);

      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(area.heading);
    });

    test('switches to right to left at runtime and mirrors the layout', async ({ page }) => {
      await page.goto(area.path);
      const [start, end] = area.pair(page);
      const heading = page.getByRole('heading', { level: 1 });
      expect(await leftEdge(start)).toBeLessThan(await leftEdge(end));

      await openDevTools(page);
      await page.getByLabel('Language').selectOption('en-XB');

      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(heading).toHaveText(new RegExp(`^\\[${area.heading} ·+\\]$`));
      expect(await leftEdge(start)).toBeGreaterThan(await leftEdge(end));
      await expect(page).toHaveURL(/locale=en-XB/);
    });

    test('shows long accented text in the en-XA pseudo-locale', async ({ page }) => {
      await page.goto(`${area.path}?locale=en-XA`);
      await expect(page.getByRole('list')).toBeVisible();

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^\[[^A-Za-z]+\]$/);
      // Nicknames are the family's own text, never translated, so they are left out.
      const translatable = await page.locator('main').evaluate((main) => {
        const copy = main.cloneNode(true) as HTMLElement;
        copy.querySelectorAll('[data-user-content]').forEach((node) => {
          node.remove();
        });
        return copy.textContent;
      });
      expect(translatable).not.toMatch(/[A-Za-z]/);
    });
  });
}
