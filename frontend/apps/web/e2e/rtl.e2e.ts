import { expect, test, type Page } from '@playwright/test';
import { SCREENS } from './screens';

/*
 * The right-to-left pass over every screen (FRONTEND-KICKOFF 15f), in the right-to-left
 * pseudo-locale and, for long text, the accented one, on a phone, a tablet and a desktop: nothing
 * scrolls sideways or cuts its text off, the icons that point along the line turn round, and rows
 * read from the right. Games' scenes keep their own direction (a number line runs as maths does),
 * so the row check leaves them out; their controls are checked in the conformance suite.
 */

const VIEWPORTS = [
  { name: 'phone', width: 360, height: 640 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 800 },
] as const;

/** What breaks a layout in a direction or a length it was not written for. */
function layoutProblems(page: Page, rightToLeft: boolean) {
  return page.evaluate((rtl) => {
    const found: string[] = [];
    const describe = (element: Element) =>
      `<${element.tagName.toLowerCase()} class="${element.getAttribute('class')?.slice(0, 60) ?? ''}">`;
    const shown = (element: Element) =>
      element.checkVisibility({ visibilityProperty: true }) &&
      !element.closest('[data-testid="dev-tools"]');

    const page = document.documentElement;
    if (page.scrollWidth > page.clientWidth + 1) {
      found.push(
        `the page scrolls sideways: ${String(page.scrollWidth)} > ${String(page.clientWidth)}`,
      );
    }

    for (const element of document.querySelectorAll('body *')) {
      if (!shown(element)) continue;
      const style = getComputedStyle(element);
      const ownText = [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
      );
      // Text cut off where its box hides what overflows, without an ellipsis to say so. Text for
      // screen readers only sits in a box a pixel wide on purpose.
      if (
        ownText &&
        element.clientWidth > 1 &&
        ['hidden', 'clip'].includes(style.overflowX) &&
        style.textOverflow !== 'ellipsis' &&
        element.scrollWidth > element.clientWidth + 1
      ) {
        found.push(`text is cut off in ${describe(element)}`);
      }
      // A mirrored icon turns round right to left, and only then.
      if (element.matches('.lf-icon--mirrored')) {
        const matrix = new DOMMatrixReadOnly(
          style.transform === 'none' ? undefined : style.transform,
        );
        const turned = matrix.a < 0 || style.scale.startsWith('-');
        if (turned !== rtl)
          found.push(`${describe(element)} is ${turned ? '' : 'not '}turned round`);
      }
    }

    // A row of things reads from the inline start: the first is on the right, right to left.
    for (const row of document.querySelectorAll('body *')) {
      if (!shown(row) || row.closest('[dir="ltr"], [data-testid="game-stage"]')) continue;
      const style = getComputedStyle(row);
      if (!style.display.endsWith('flex') || !style.flexDirection.startsWith('row')) continue;
      const items = [...row.children].filter(
        (child) => shown(child) && getComputedStyle(child).position !== 'absolute',
      );
      const [first, second] = items.map((item) => item.getBoundingClientRect());
      if (!first || !second || Math.abs(first.top - second.top) > 2) continue;
      const reversed = style.flexDirection === 'row-reverse';
      const firstOnRight = first.left > second.left;
      if (firstOnRight !== (rtl !== reversed)) {
        found.push(`${describe(row)} runs the wrong way`);
      }
    }
    return found;
  }, rightToLeft);
}

test('the checks find what they look for', async ({ page }) => {
  const today = SCREENS.find((screen) => screen.name === 'Today');
  if (!today) throw new Error('No Today screen');
  await today.open(page, 'en-XB');

  // Read as if it ran left to right, the right-to-left page runs the wrong way.
  expect(await layoutProblems(page, false)).toContainEqual(
    expect.stringContaining('runs the wrong way'),
  );

  await page.evaluate(() => {
    const wide = document.createElement('div');
    wide.style.inlineSize = '200vw';
    wide.style.blockSize = '1px';
    document.body.append(wide);
  });
  expect(await layoutProblems(page, true)).toContainEqual(
    expect.stringContaining('scrolls sideways'),
  );
});

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    for (const viewport of VIEWPORTS) {
      test(`right to left, ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await screen.open(page, 'en-XB');
        await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
        expect(await layoutProblems(page, true)).toEqual([]);
      });

      test(`long text, ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await screen.open(page, 'en-XA');
        expect(await layoutProblems(page, false)).toEqual([]);
      });
    }
  });
}
