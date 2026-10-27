import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { passGate } from './helpers';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const DEMO = '/play/dev?game=demo-choice&story=early-primary&seed=1';

const answer = (page: Page, label: string) =>
  page.getByRole('group', { name: 'Answers' }).getByRole('button', { name: label, exact: true });
/** The words beside an answer tile: "Correct", "Try again", or nothing. */
const tileState = (page: Page, label: string) =>
  page
    .locator('.lf-answer', { has: page.getByRole('button', { name: label, exact: true }) })
    .locator('.lf-answer__state');
const prompt = (page: Page) => page.locator('.g-demo-choice__prompt');
const progress = (page: Page) => page.getByRole('img', { name: /^Question \d+ of \d+$/ });
const leaveButton = (page: Page) => page.getByRole('button', { name: 'Back to my games' });

/** The learning events the development route has recorded so far. */
const eventTypes = (page: Page) =>
  page.evaluate(() => (window.learnofunDevEvents ?? []).map((event) => event.type));
const lastEvent = (page: Page) => page.evaluate(() => window.learnofunDevEvents?.at(-1));

async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { value, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

test('plays the demo game in the shell, through to the celebration', async ({ page }) => {
  await page.goto(DEMO);

  await expect(prompt(page)).toHaveText('3 + 4');
  await expect(progress(page)).toHaveAccessibleName('Question 1 of 3');
  await answer(page, '7').click();
  await expect(page.getByText('That’s it!')).toBeVisible();
  // The chosen tile says so too, in words beside it (ADR 0020).
  await expect(tileState(page, '7')).toHaveText('Correct');
  await expect(prompt(page)).toHaveText('5 + 5');
  await expect(progress(page)).toHaveAccessibleName('Question 2 of 3');
  await answer(page, '10').click();
  await expect(prompt(page)).toHaveText('6 + 2');
  await answer(page, '8').click();

  await expect(page.getByText('You did it!')).toBeVisible();
  await expect(progress(page)).toHaveAccessibleName('Question 3 of 3');
  await expect(leaveButton(page)).toBeFocused();
  expect(await eventTypes(page)).toEqual([
    'session_started',
    'item_presented',
    'response_submitted',
    'item_presented',
    'response_submitted',
    'item_presented',
    'response_submitted',
    'session_completed',
  ]);

  await leaveButton(page).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('child-root')).toBeVisible();
});

test('a wrong answer gets encouragement and another try', async ({ page }) => {
  await page.goto(DEMO);

  await answer(page, '6').click();

  await expect(page.getByText('Nearly. Have another go!')).toBeVisible();
  await expect(tileState(page, '6')).toHaveText('Try again');
  await expect(prompt(page)).toHaveText('3 + 4');
  await answer(page, '7').click();
  await expect(prompt(page)).toHaveText('5 + 5');
});

test('the hint button gives one hint per item, in Practice only (ADR 0013)', async ({ page }) => {
  await page.goto(DEMO);
  const hint = page.getByRole('button', { name: 'Hint' });
  await expect(prompt(page)).toHaveText('3 + 4');

  await hint.click();

  // A crossed-out answer is the shared tile's ruled-out state (ADR 0020).
  await expect(page.locator('.lf-answer--ruled-out .lf-answer__tile')).toHaveCount(1);
  await expect(hint).toBeDisabled();
  expect(await lastEvent(page)).toMatchObject({ type: 'hint_shown', level: 1 });
  await answer(page, '7').click();
  await expect(prompt(page)).toHaveText('5 + 5');
  await expect(hint).toBeEnabled();

  await page.goto(`${DEMO}&mode=challenge`);
  await expect(prompt(page)).toHaveText('3 + 4');
  await expect(hint).toHaveCount(0);
});

test('the pause menu goes back to the game, or to settings through the gate', async ({ page }) => {
  await page.goto(DEMO);
  await expect(prompt(page)).toHaveText('3 + 4');
  const menu = page.getByRole('dialog', { name: 'Paused' });

  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(menu).toBeVisible();
  await menu.getByRole('button', { name: 'Keep playing' }).click();
  await expect(menu).toBeHidden();
  await expect(answer(page, '7')).toBeEnabled();

  // Settings sit behind the parental gate, and the session pauses while a grown-up is there.
  await page.getByRole('button', { name: 'Pause' }).click();
  await menu.getByRole('button', { name: 'Settings' }).click();
  const gate = page.getByRole('dialog', { name: 'For grown-ups' });
  await expect(gate).toBeVisible();
  expect(await lastEvent(page)).toMatchObject({ type: 'session_paused', reason: 'parent-gate' });
  await gate.getByRole('button', { name: 'Close' }).click();
  await expect(menu).toBeVisible();
  expect(await lastEvent(page)).toMatchObject({ type: 'session_resumed', reason: 'parent-gate' });

  await menu.getByRole('button', { name: 'Settings' }).click();
  await passGate(page);
  const settings = page.getByRole('dialog', { name: 'Settings' });
  await expect(settings).toBeVisible();
  await settings.getByRole('switch', { name: 'High contrast' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
  await settings.getByRole('button', { name: 'Done' }).click();
  await menu.getByRole('button', { name: 'Keep playing' }).click();

  await answer(page, '7').click();
  await expect(prompt(page)).toHaveText('5 + 5');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
});

test('back to my games ends the session, with no gate (ADR 0012)', async ({ page }) => {
  await page.goto(DEMO);
  await expect(prompt(page)).toHaveText('3 + 4');

  await page.getByRole('button', { name: 'Pause' }).click();
  await page
    .getByRole('dialog', { name: 'Paused' })
    .getByRole('button', { name: 'Back to my games' })
    .click();

  await expect(page).toHaveURL('/');
  expect(await lastEvent(page)).toMatchObject({ type: 'session_ended', reason: 'child-left' });
});

test('going to the background pauses the session and shows the pause menu on return', async ({
  page,
}) => {
  await page.goto(DEMO);
  await expect(prompt(page)).toHaveText('3 + 4');

  await setVisibility(page, 'hidden');
  expect(await lastEvent(page)).toMatchObject({ type: 'session_paused', reason: 'backgrounded' });
  await expect(answer(page, '7')).toBeDisabled();

  await setVisibility(page, 'visible');
  expect(await lastEvent(page)).toMatchObject({ type: 'session_resumed', reason: 'backgrounded' });
  await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
});

test('leaving the shell any other way pauses the session as navigated away', async ({ page }) => {
  // To the game from the profile picker, inside the app, so the back button stays in the app too.
  await page.goto('/');
  await expect(page.getByTestId('child-root')).toBeVisible();
  await page.evaluate((url) => {
    // Next.js's router, which it exposes for debugging and tests (ADR 0042).
    (window as unknown as { next: { router: { push: (href: string) => void } } }).next.router.push(
      url,
    );
  }, DEMO);
  await expect(prompt(page)).toHaveText('3 + 4');

  await page.goBack();

  await expect(page.getByTestId('child-root')).toBeVisible();
  await expect
    .poll(() => lastEvent(page))
    .toMatchObject({ type: 'session_paused', reason: 'navigated-away' });
  expect((await eventTypes(page)).filter((type) => type === 'session_started')).toHaveLength(1);
});

test('a game that stops working shows the way back', async ({ page }) => {
  // Breaks the demo game as it mounts. (The mock API's service worker serves the game's code, so
  // page.route cannot swap the module itself.)
  await page.addInitScript(() => {
    const append = Object.getOwnPropertyDescriptor(Element.prototype, 'append')?.value as (
      this: Element,
      ...nodes: (Node | string)[]
    ) => void;
    Element.prototype.append = function (...nodes) {
      if (
        nodes.some((node) => node instanceof Element && node.classList.contains('g-demo-choice'))
      ) {
        throw new Error('broken on purpose');
      }
      append.apply(this, nodes);
    };
  });
  await page.goto(DEMO);

  await expect(page.getByTestId('play-error')).toContainText('This game stopped working');
  await expect(page.getByRole('button', { name: 'Pause' })).toBeDisabled();
  await leaveButton(page).click();
  await expect(page).toHaveURL('/');
});

test('an unknown game is not found', async ({ page }) => {
  await page.goto('/play/dev?game=no-such-game');

  await expect(page.getByTestId('not-found')).toBeVisible();
});

test('on a phone, Pause and Hint show only their icons, keep their names and share one row', async ({
  page,
}) => {
  const pause = page.getByRole('button', { name: 'Pause' });
  const hint = page.getByRole('button', { name: 'Hint' });

  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto(DEMO);
  await expect(prompt(page)).toBeVisible();
  const phonePause = await pause.boundingBox();
  const phoneHint = await hint.boundingBox();
  // Square buttons the band's target size, side by side (ADR 0019).
  expect(phonePause?.width).toBe(phonePause?.height);
  expect(phoneHint?.width).toBe(phoneHint?.height);
  expect(phoneHint?.y).toBe(phonePause?.y);

  await page.setViewportSize({ width: 1024, height: 600 });
  const tabletPause = await pause.boundingBox();
  // On a tablet, the words show beside the icon.
  expect(tabletPause?.width).toBeGreaterThan(tabletPause?.height ?? Infinity);
});

test('every shell string comes from the catalog, game text included', async ({ page }) => {
  await page.goto(`${DEMO}&locale=en-XA`);
  await expect(prompt(page)).toHaveText(/^\[3 \+ 4 ·+\]$/);

  // en-XA accents every catalog letter, so a plain letter on screen is a hard-coded string.
  const text = await page.getByTestId('game-shell').innerText();
  expect(text).not.toMatch(/[A-Za-z]/);
});

test.describe('accessibility (WCAG 2.2 AA)', () => {
  const check = async (page: Page) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    expect(violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`)).toEqual([]);
  };

  for (const story of ['early-years', 'early-primary']) {
    test(`while playing · ${story}`, async ({ page }) => {
      await page.goto(`/play/dev?game=demo-choice&story=${story}&seed=1`);
      await expect(prompt(page)).toBeVisible();
      await check(page);
    });
  }

  test('the pause menu, the gate and settings', async ({ page }) => {
    await page.goto(DEMO);
    await expect(prompt(page)).toBeVisible();

    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.getByRole('dialog', { name: 'Paused' })).toBeVisible();
    await check(page);

    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'For grown-ups' })).toBeVisible();
    await check(page);

    await passGate(page);
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await check(page);
  });

  test('the celebration', async ({ page }) => {
    await page.goto('/play/dev?game=demo-choice&story=early-primary&seed=1');
    for (const [label, next] of [
      ['7', '5 + 5'],
      ['10', '6 + 2'],
    ] as const) {
      await answer(page, label).click();
      await expect(prompt(page)).toHaveText(next);
    }
    await answer(page, '8').click();
    await expect(page.getByText('You did it!')).toBeVisible();
    await check(page);
  });
});
