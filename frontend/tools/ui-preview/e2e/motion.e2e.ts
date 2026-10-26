import { expect, test, type Page } from '@playwright/test';

async function buttonTransitionDuration(page: Page): Promise<string> {
  return page
    .getByRole('button')
    .first()
    .evaluate((button) => getComputedStyle(button).transitionDuration);
}

test('button transitions run when motion is allowed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?component=button');

  expect(await buttonTransitionDuration(page)).not.toBe('0s');
});

test('the device reduced-motion preference turns off button transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?component=button');

  expect(await buttonTransitionDuration(page)).toBe('0s');
});

test('the reduced-motion setting turns off transitions even when the device allows motion', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/?component=button&motion=reduced');

  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  expect(await buttonTransitionDuration(page)).toBe('0s');
});
