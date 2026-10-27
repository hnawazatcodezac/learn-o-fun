import { expect, test, type Page } from '@playwright/test';

/**
 * Collects the text of every script the page loads from now on. A script whose body the browser
 * no longer has, such as one cut short by a navigation, is `undefined`.
 */
function recordScripts(page: Page) {
  const scripts: Promise<string | undefined>[] = [];
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script') {
      scripts.push(response.text().then(String, () => undefined));
    }
  });
  return () => Promise.all(scripts);
}

/**
 * Only the parent area's sign-in page has this test ID, so a script that holds it holds parent
 * code, however the build splits it into files (ADR 0042).
 */
const PARENT_MARKER = 'parent-login';

test('the child area never downloads parent-area code', async ({ page }) => {
  const scripts = recordScripts(page);

  await page.goto('/');
  await expect(page.getByTestId('child-root')).toBeVisible();
  await page.waitForLoadState('networkidle');

  // Every script the child area loaded was read, so none escapes the check: parent code is not in
  // a file of its own, nor bundled into the child area's files, nor prefetched.
  const childScripts = await scripts();
  expect(childScripts.filter((text) => text === undefined)).toEqual([]);
  expect(childScripts.filter((text) => text?.includes(PARENT_MARKER))).toEqual([]);

  // The same check sees parent code once the parent area is opened, so it is not passing blindly.
  // Signed out, it opens on the sign-in page, which is parent-area code too (ADR 0025).
  await page.goto('/parent');
  await expect(page.getByTestId('parent-login')).toBeVisible();
  expect((await scripts()).some((text) => text?.includes(PARENT_MARKER))).toBe(true);
});

test('the child area uses the child experience band', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-band', 'early-primary');
});

test('the parent area has no experience band', async ({ page }) => {
  await page.goto('/parent/login');

  await expect(page.getByTestId('parent-login')).toBeVisible();
  await expect(page.locator('html')).not.toHaveAttribute('data-band');
});
