import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { COMPONENTS, TESTED_THEMES, bandsFor, previewUrl } from '../src/matrix';

const LOCALES = ['en', 'en-XA', 'en-XB'] as const;
const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const component of COMPONENTS) {
  for (const band of bandsFor(component)) {
    for (const theme of TESTED_THEMES) {
      for (const locale of LOCALES) {
        test(`${component} · ${band} · ${theme} · ${locale} meets WCAG 2.2 AA`, async ({
          page,
        }) => {
          await page.goto(previewUrl({ component, band, theme, locale }));
          await expect(page.getByTestId('preview-stage')).toBeVisible();

          const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();

          expect(violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`)).toEqual(
            [],
          );
        });
      }
    }
  }
}
