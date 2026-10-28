import { expect, test, type Page } from '@playwright/test';
import {
  answerRight,
  meetsWcag,
  named,
  playAs,
  ROBIN,
  setLimits,
  type TestLocale,
} from './helpers';
import { ACTIVITY, cards, SCREENS, withLocale } from './screens';

/*
 * The accessibility pass over every screen (FRONTEND-KICKOFF 15e): WCAG 2.2 AA with axe in every
 * locale and theme, the structure a screen reader navigates by, a keyboard walk with Tab, and the
 * main journeys with a switch's two actions. The screen-reader listening checklist for the human
 * is docs/screen-reader-checklist.md.
 */

const LOCALES: readonly TestLocale[] = ['en', 'en-XA', 'en-XB'];

/**
 * The structure a screen reader navigates by (WCAG 1.3.1, 2.4.6, 3.1.1, 4.1.2): the page's
 * language and direction, one main landmark, one top heading and no skipped heading levels,
 * every dialog named, and landmarks of a kind told apart by their names.
 */
async function structureIsSound(page: Page, locale: TestLocale) {
  const problems = await page.evaluate((expected) => {
    const found: string[] = [];
    const html = document.documentElement;
    if (html.lang !== expected.lang) found.push(`lang is "${html.lang}"`);
    if (html.dir !== expected.dir) found.push(`dir is "${html.dir}"`);

    const shown = (element: Element) =>
      element.checkVisibility() && !element.closest('[aria-hidden="true"], [inert]');
    const nameOf = (element: Element) =>
      element.getAttribute('aria-label') ??
      (element.getAttribute('aria-labelledby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' ')
        .trim();

    const mains = document.querySelectorAll('main, [role="main"]');
    if (mains.length !== 1) found.push(`${String(mains.length)} main landmarks`);

    const headings = [
      ...document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'),
    ].filter((heading) => shown(heading) || heading.closest('dialog:modal'));
    const level = (heading: Element) =>
      /^H[1-6]$/.test(heading.tagName)
        ? Number(heading.tagName.slice(1))
        : Number(heading.getAttribute('aria-level') ?? '2');
    const tops = headings.filter((heading) => level(heading) === 1);
    if (tops.length !== 1) found.push(`${String(tops.length)} level-1 headings`);
    let previous = 0;
    for (const heading of headings) {
      if (level(heading) > previous + 1) {
        found.push(`"${heading.textContent}" at level ${String(level(heading))}`);
      }
      previous = level(heading);
    }

    for (const dialog of document.querySelectorAll('dialog[open], [role="dialog"]')) {
      if (nameOf(dialog) === '') found.push('a dialog without a name');
    }
    for (const kind of ['nav', 'aside', 'section[aria-label], section[aria-labelledby]']) {
      const names = [...document.querySelectorAll(kind)].filter(shown).map(nameOf);
      if (names.length > 1 && new Set(names).size !== names.length) {
        found.push(`${kind} landmarks share a name: ${names.join(', ')}`);
      }
    }
    return found;
  }, expectedRoot(locale));
  expect(problems).toEqual([]);
}

function expectedRoot(locale: TestLocale) {
  return { lang: locale, dir: locale === 'en-XB' ? 'rtl' : 'ltr' };
}

/** What a focus ring changes: the shadow and outline of a control and of what it is drawn with. */
function installFocusLook(page: Page) {
  return page.evaluate(() => {
    (window as unknown as { focusLook: (element: Element) => string }).focusLook = (element) => {
      // A covering input draws its ring on its label's track or box.
      const scope = element.closest('label') ?? element;
      return [scope, ...scope.querySelectorAll('*')]
        .map((part) => {
          const style = getComputedStyle(part);
          return `${style.boxShadow}|${style.outlineStyle}|${style.outlineWidth}`;
        })
        .join(';');
    };
  });
}

/**
 * Tabs through the screen as a keyboard user does (WCAG 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11):
 * every control is reached once, in the order of the page, nothing hidden is reached, focus never
 * sticks, and each focused control shows its focus ring and is not hidden behind anything.
 */
async function walkWithTab(page: Page) {
  // The development tools load after the page; they are controls too, until production.
  await page.getByTestId('dev-tools').waitFor({ state: 'attached' });
  await installFocusLook(page);
  const count = await page.evaluate(() => {
    const look = (window as unknown as { focusLook: (element: Element) => string }).focusLook;
    (document.activeElement as HTMLElement | null)?.blur();
    const root = document.querySelector('dialog:modal') ?? document;
    const stops = [
      ...root.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable="true"]',
      ),
    ].filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(':disabled, [type="hidden"]') &&
        !element.closest('[inert]') &&
        element.checkVisibility({ visibilityProperty: true }),
    );
    // Tab reaches one radio button of a group: the chosen one, or else the first.
    const reachable = stops.filter((element) => {
      if (!(element instanceof HTMLInputElement) || element.type !== 'radio') return true;
      const group = stops.filter(
        (other) =>
          other instanceof HTMLInputElement &&
          other.type === 'radio' &&
          other.name === element.name &&
          other.form === element.form,
      ) as HTMLInputElement[];
      return (group.find((radio) => radio.checked) ?? group[0]) === element;
    });
    reachable.forEach((element, index) => {
      element.dataset.tabStop = String(index);
      element.dataset.tabLook = look(element);
    });
    return reachable.length;
  });
  expect(count, 'controls to reach').toBeGreaterThan(0);

  const reached: number[] = [];
  const problems: string[] = [];
  for (let press = 0; press < count * 2 + 4; press += 1) {
    await page.keyboard.press('Tab');
    // The ring fades in, so it is given a moment to start.
    const ringShown = await page
      .waitForFunction(
        () => {
          const look = (window as unknown as { focusLook: (element: Element) => string }).focusLook;
          const element = document.activeElement;
          return (
            element instanceof HTMLElement &&
            element.dataset.tabLook !== undefined &&
            look(element) !== element.dataset.tabLook
          );
        },
        undefined,
        { timeout: 1000 },
      )
      .then(
        () => true,
        () => false,
      );
    const stop = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement) || element === document.body) return null;
      const label = element.getAttribute('aria-label') ?? element.textContent.trim().slice(0, 40);
      const name = `<${element.tagName.toLowerCase()}> ${label}`;
      if (element.dataset.tabStop === undefined) {
        // Chrome lets Tab reach a scrolling box, so that the keyboard can scroll it.
        const style = getComputedStyle(element);
        const scrolls =
          /auto|scroll/.test(`${style.overflowX} ${style.overflowY}`) &&
          (element.scrollHeight > element.clientHeight ||
            element.scrollWidth > element.clientWidth);
        return { index: -1, name, issues: [], scrolls };
      }

      const issues: string[] = [];
      const scope = element.closest('label') ?? element;
      const box = scope.getBoundingClientRect();
      const inView =
        box.width > 0 &&
        box.height > 0 &&
        box.bottom > 0 &&
        box.right > 0 &&
        box.top < innerHeight &&
        box.left < innerWidth;
      if (!inView) issues.push('is out of view');
      // Some of it can be seen. The development tools, which production leaves out, don't count.
      const points = [
        [0.5, 0.5],
        [0.1, 0.1],
        [0.9, 0.1],
        [0.1, 0.9],
        [0.9, 0.9],
      ] as const;
      const seen = points.some(([x, y]) => {
        const hit = document.elementFromPoint(box.left + box.width * x, box.top + box.height * y);
        return hit !== null && (scope.contains(hit) || hit.closest('[data-testid="dev-tools"]'));
      });
      if (inView && !seen) issues.push('is hidden behind something');
      return { index: Number(element.dataset.tabStop), name, issues };
    });
    if (stop === null) continue;
    if (stop.index === -1) {
      if (!('scrolls' in stop) || !stop.scrolls) {
        problems.push(`${stop.name}: reached, but hidden or not a control`);
      }
      continue;
    }
    if (reached.length > 0 && stop.index === reached[0]) break;
    reached.push(stop.index);
    if (!ringShown) problems.push(`${stop.name}: shows no focus ring`);
    for (const issue of stop.issues) problems.push(`${stop.name}: ${issue}`);
  }

  expect(problems).toEqual([]);
  // Every control once, in the page's order, from wherever the walk began.
  const start = reached[0] ?? 0;
  const inOrder = Array.from({ length: count }, (_, step) => (start + step) % count);
  expect(reached, 'the controls Tab reaches, in order').toEqual(inOrder);
}

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    for (const locale of LOCALES) {
      test(`meets WCAG 2.2 AA and reads well with a screen reader, ${locale}`, async ({ page }) => {
        await screen.open(page, locale);
        await structureIsSound(page, locale);
        await meetsWcag(page);
      });
    }

    test('meets WCAG 2.2 AA in the dark theme', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await screen.open(page, 'en');
      await meetsWcag(page);
    });

    test('meets WCAG 2.2 AA in the high-contrast theme', async ({ page }) => {
      await page.emulateMedia({ contrast: 'more' });
      await screen.open(page, 'en');
      await meetsWcag(page);
    });

    test('works with the keyboard alone', async ({ page }) => {
      await screen.open(page, 'en');
      await walkWithTab(page);
    });
  });
}

test.describe('the end of a session', () => {
  for (const locale of LOCALES) {
    test(`the stretch reminder, the celebration and the day's end meet WCAG 2.2 AA, ${locale}`, async ({
      page,
    }) => {
      await playAs(page, ROBIN);
      await page.clock.install();
      await setLimits(page, {
        breakReminderMinutes: 10,
        sessionMinutes: 15,
        dailyLimitMinutes: 15,
      });
      await page.goto(withLocale(ACTIVITY, locale));
      await answerRight(page);
      await expect(page.getByRole('img', { name: named('Question 2 of 8', locale) })).toBeVisible();

      await page.clock.fastForward('10:30');
      await answerRight(page);
      const reminder = page.getByRole('dialog', { name: named('Time for a stretch', locale) });
      await expect(reminder).toBeVisible();
      await structureIsSound(page, locale);
      await meetsWcag(page);

      await reminder.getByRole('button', { name: named('Keep playing', locale) }).click();
      await page.clock.fastForward('05:00');
      await answerRight(page);
      await expect(page.getByText(named('You did it!', locale))).toBeVisible();
      await structureIsSound(page, locale);
      await meetsWcag(page);

      await page.getByRole('button', { name: named('Back to my games', locale) }).click();
      await expect(page.getByTestId('time-up')).toBeVisible();
      await structureIsSound(page, locale);
      await meetsWcag(page);

      // A game opened another way says the same, on a page of its own.
      await page.goto(withLocale(ACTIVITY, locale));
      await expect(page.getByTestId('time-up')).toBeVisible();
      await structureIsSound(page, locale);
      await meetsWcag(page);
    });
  }
});

/** Moves focus on with Tab, as a switch's "next" does, until it reaches the control. */
async function tabTo(page: Page, name: string, role: 'button' | 'link' = 'button') {
  const control = page.getByRole(role, { name, exact: true }).first();
  for (let press = 0; press < 80; press += 1) {
    if (await control.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached the ${role} "${name}"`);
}

test.describe('with a switch: only "next" (Tab) and "choose" (Space or Enter)', () => {
  test('a child picks their profile, opens a game, answers, pauses and carries on', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(2);
    await tabTo(page, 'Robin');
    await page.keyboard.press('Space');
    await expect(cards(page)).toHaveCount(3);

    const hopLine = cards(page).filter({ hasText: 'Hop Line' }).getByRole('button');
    for (let press = 0; press < 40; press += 1) {
      if (await hopLine.evaluate((element) => element === document.activeElement)) break;
      await page.keyboard.press('Tab');
    }
    await page.keyboard.press('Enter');
    await expect(page.getByRole('img', { name: 'Question 1 of 8' })).toBeVisible();

    const sum = await page.locator('.g-hop-line__sum').textContent();
    const hops = Number(/\+ (\d+)/.exec(sum ?? '')?.[1]);
    await tabTo(page, 'Hop');
    for (let hop = 0; hop < hops; hop += 1) await page.keyboard.press('Space');
    await tabTo(page, 'Land');
    await page.keyboard.press('Space');
    await expect(page.getByRole('img', { name: 'Question 2 of 8' })).toBeVisible();

    await tabTo(page, 'Pause');
    await page.keyboard.press('Space');
    const paused = page.getByRole('dialog', { name: 'Paused' });
    await expect(paused).toBeVisible();
    await tabTo(page, 'Keep playing');
    await page.keyboard.press('Space');
    await expect(paused).toBeHidden();
  });

  test('a grown-up signs in, opens a profile and goes back to the overview', async ({ page }) => {
    await page.goto('/parent/login');
    await expect(page.locator('main').getByRole('button')).toHaveCount(2);
    await tabTo(page, 'Sam');
    await page.keyboard.press('Enter');
    await expect(page.locator('main').getByRole('heading', { level: 3 })).toHaveCount(2);

    await tabTo(page, 'Edit profile for Ari', 'link');
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Nickname')).toHaveValue('Ari');

    await tabTo(page, 'Overview', 'link');
    await page.keyboard.press('Enter');
    await expect(page.locator('main').getByRole('heading', { level: 3 })).toHaveCount(2);
  });
});
