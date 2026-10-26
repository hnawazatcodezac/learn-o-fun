import { expect, test } from '@playwright/test';
import { COMPONENTS, TESTED_THEMES, bandsFor, previewUrl } from '../src/matrix';

const LOCALES = ['en', 'en-XB'] as const;

test.beforeEach(async ({ page }) => {
  // Screenshots only compare reliably from the Linux browser in Playwright's Docker image
  // (ADR 0006). Run these with `npm run visual`, never against a local browser.
  expect(await page.evaluate(() => navigator.platform)).toContain('Linux');
});

for (const component of COMPONENTS) {
  for (const band of bandsFor(component)) {
    for (const theme of TESTED_THEMES) {
      for (const locale of LOCALES) {
        test(`${component} · ${band} · ${theme} · ${locale}`, async ({ page }) => {
          await page.goto(previewUrl({ component, band, theme, locale, toolbar: 'hidden' }));
          await expect(page.getByTestId('preview-stage')).toBeVisible();

          // The whole viewport, because dialogs and toasts sit outside the page flow.
          await expect(page).toHaveScreenshot(`${component}-${band}-${theme}-${locale}.png`, {
            animations: 'disabled',
          });
        });
      }
    }
  }

  test(`${component} · 150% text · dyslexia-friendly font`, async ({ page }) => {
    await page.goto(
      previewUrl({
        component,
        band: bandsFor(component).includes('early-primary') ? 'early-primary' : 'parent',
        theme: 'light',
        locale: 'en',
        textScale: 1.5,
        font: 'dyslexia',
        toolbar: 'hidden',
      }),
    );
    await expect(page.getByTestId('preview-stage')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot(`${component}-large-text-andika.png`, {
      animations: 'disabled',
    });
  });
}
