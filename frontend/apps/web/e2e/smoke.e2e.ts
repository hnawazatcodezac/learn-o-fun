import { expect, test } from '@playwright/test';

const AREAS = [
  { name: 'child area', path: '/', testId: 'child-root' },
  { name: 'parent area', path: '/parent/login', testId: 'parent-login' },
] as const;

for (const area of AREAS) {
  test(`the ${area.name} loads without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(area.path);

    await expect(page.getByTestId(area.testId)).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('an unknown address shows the not-found page, linking back to the child area', async ({
  page,
}) => {
  await page.goto('/nowhere');

  await expect(page.getByTestId('not-found')).toBeVisible();
  await expect(page.getByRole('link')).toHaveAttribute('href', '/');
});

test('an unknown parent address links back to the parent area', async ({ page }) => {
  await page.goto('/parent/nowhere');

  await expect(page.getByTestId('not-found')).toBeVisible();
  await expect(page.getByRole('link')).toHaveAttribute('href', '/parent');
});
