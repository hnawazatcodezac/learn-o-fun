import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { passGate, playAs, ROBIN } from './helpers';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Taps pictures on the picture PIN pad that is open now. */
async function enterPin(page: Page, pictures: string[]) {
  const pad = page.getByRole('group', { name: /picture PIN$/ });
  for (const picture of pictures) {
    await pad.getByRole('button', { name: picture, exact: true }).click();
  }
}

const cards = (page: Page) => page.getByRole('main').getByRole('listitem');

test('Robin opens Today with one tap: a review, a new skill and a free choice', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Robin' }).click();

  await expect(page).toHaveURL('/today');
  await expect(page.getByText('Hi, Robin!')).toBeVisible();
  // The planner's three cards, each its own activity (ADR 0035).
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).nth(0)).toContainText('Ten Frame Café: fill the tray to 10');
  await expect(cards(page).nth(0)).toContainText('Review');
  await expect(cards(page).nth(1)).toContainText('Ten Frame Café: make ten to add');
  await expect(cards(page).nth(1)).toContainText('New skill');
  await expect(cards(page).nth(2)).toContainText('Hop Line: add within 20');
  await expect(cards(page).nth(2)).toContainText('Your choice');
  await expect(cards(page).nth(2)).toContainText('About 5 minutes');

  // The whole card is one button (the ActivityCard spec).
  await cards(page)
    .getByRole('button', { name: /Hop Line: add within 20/ })
    .click();
  // The card names its skill, so the session aims at it (ADR 0036).
  await expect(page).toHaveURL('/play?activity=hop-line-add-within-20&skill=add-within-20');
  await expect(page.getByRole('slider')).toBeFocused();
  await page.getByRole('button', { name: 'Pause' }).click();
  await page
    .getByRole('dialog', { name: 'Paused' })
    .getByRole('button', { name: 'Back to my games' })
    .click();
  await expect(page).toHaveURL('/today');
});

test('Ari’s profile asks for the picture PIN, and refuses a wrong one', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Ari' }).click();
  const dialog = page.getByRole('dialog', { name: 'Ari’s picture PIN' });
  await expect(dialog).toBeVisible();

  await enterPin(page, ['Star', 'Fish', 'Sun']);
  await expect(dialog.getByRole('alert')).toHaveText('That’s not it. Try again.');
  await expect(page).toHaveURL('/');

  await enterPin(page, ['Sun', 'Fish', 'Star']);
  await expect(page).toHaveURL('/today');
  await expect(page.getByText('Hi, Ari!')).toBeVisible();
  // Counting, still building and in Ari's goal, on the review card (ADR 0035).
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).first()).toContainText('Ten Frame Café: count the order');
  await expect(cards(page).first()).toContainText('Review');
});

test('the library lists only what the child can play', async ({ page }) => {
  await playAs(page, ROBIN);
  await page.goto('/library');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('All games');
  // Hop Line's addition, the café's three and Tile Farm's equal groups: subtraction has no items
  // yet (ADR 0035), and arrays are premium, beyond Robin's family's plan.
  await expect(cards(page)).toHaveCount(5);
  await expect(cards(page).first()).toContainText('Hop Line: add within 20');
  await expect(page.getByRole('main')).toContainText('Ten Frame Café: make ten to add');
  await expect(cards(page).last()).toContainText('Tile Farm: plant equal groups');
  await expect(page.getByRole('main')).not.toContainText(/arrays|subtract/);
});

test('the way to the parent dashboard is behind the parental gate', async ({ page }) => {
  await page.goto('/');
  const gate = page.getByRole('dialog', { name: 'For grown-ups' });

  await page.getByRole('button', { name: 'Grown-ups' }).click();
  await expect(gate).toBeVisible();
  await gate.getByRole('button', { name: 'Close' }).click();
  await expect(page).toHaveURL('/');

  await page.getByRole('button', { name: 'Grown-ups' }).click();
  await passGate(page);
  // Signed out, the dashboard asks a grown-up to sign in (ADR 0025).
  await expect(page).toHaveURL('/parent/login?next=%2Fparent');
  await expect(page.getByTestId('parent-login')).toBeVisible();
});

test('remembers who is playing across a refresh; switching player goes back to the picker', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Robin' }).click();
  await expect(page.getByText('Hi, Robin!')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Hi, Robin!')).toBeVisible();

  await page.getByRole('button', { name: 'Switch player' }).click();
  await expect(page).toHaveURL('/');
  await page.goto('/today');
  await expect(page).toHaveURL('/');
});

test('without a chosen child, child pages go back to the picker', async ({ page }) => {
  for (const path of ['/today', '/library', '/play?activity=hop-line-add-within-20']) {
    await page.goto(path);
    await expect(page).toHaveURL('/');
  }
});

test.describe('the grown-ups’ settings, behind the parental gate', () => {
  test.beforeEach(async ({ page }) => {
    await playAs(page, ROBIN);
    await page.goto('/today');
    await page.getByRole('button', { name: 'Grown-ups' }).click();
    await passGate(page);
    await expect(page.getByRole('dialog', { name: 'Settings for Robin' })).toBeVisible();
  });

  test('set a picture PIN, chosen twice, which the picker then asks for', async ({ page }) => {
    const settings = page.getByRole('dialog', { name: 'Settings for Robin' });
    await expect(settings).toContainText('Robin has no picture PIN.');

    await settings.getByRole('button', { name: 'Add a picture PIN' }).click();
    await enterPin(page, ['Moon', 'Leaf', 'Raindrop']);
    await enterPin(page, ['Moon', 'Leaf', 'Sun']);
    await expect(settings).toContainText('Those were different. Let’s start again.');
    await enterPin(page, ['Moon', 'Leaf', 'Raindrop']);
    await enterPin(page, ['Moon', 'Leaf', 'Raindrop']);
    await expect(settings).toContainText('Picture PIN saved.');
    await expect(settings).toContainText('Robin has a picture PIN.');
    await settings.getByRole('button', { name: 'Done' }).click();

    await page.getByRole('button', { name: 'Switch player' }).click();
    await page.getByRole('button', { name: 'Robin' }).click();
    await expect(page.getByRole('dialog', { name: 'Robin’s picture PIN' })).toBeVisible();
    await enterPin(page, ['Moon', 'Leaf', 'Raindrop']);
    await expect(page).toHaveURL('/today');
  });

  test('change play settings, which apply at once and are saved for the child', async ({
    page,
  }) => {
    const settings = page.getByRole('dialog', { name: 'Settings for Robin' });

    await settings.getByRole('switch', { name: 'High contrast' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
    await settings.getByRole('button', { name: 'Done' }).click();

    await page.reload();
    await expect(page.getByText('Hi, Robin!')).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'contrast');
  });

  test('open the parent dashboard from there', async ({ page }) => {
    await page.getByRole('button', { name: 'Open the parent dashboard' }).click();
    await expect(page).toHaveURL('/parent/login?next=%2Fparent');
  });
});

test('every child-mode string comes from the catalog', async ({ page }) => {
  // en-XA accents every catalog letter, so a plain letter is hard-coded. Nicknames are the
  // family's own text, so they are left out.
  const plainText = (selector: string) =>
    page.locator(selector).evaluate((root) => {
      const copy = root.cloneNode(true) as HTMLElement;
      for (const own of copy.querySelectorAll('[data-user-content]')) own.remove();
      return copy.innerText.split('\n').filter((line) => /[A-Za-z]/.test(line));
    });

  await page.goto('/?locale=en-XA');
  await expect(page.getByRole('listitem')).toHaveCount(2);
  expect(await plainText('main')).toEqual([]);

  await playAs(page, ROBIN);
  await page.goto('/today?locale=en-XA');
  await expect(cards(page)).toHaveCount(3);
  expect(await plainText('[data-testid="today"]')).toEqual([]);
});

test.describe('accessibility (WCAG 2.2 AA)', () => {
  const check = async (page: Page) => {
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
    expect(violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`)).toEqual([]);
  };

  test('the profile picker, and its picture PIN', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Ari' })).toBeVisible();
    await check(page);

    await page.getByRole('button', { name: 'Ari' }).click();
    await expect(page.getByRole('dialog', { name: 'Ari’s picture PIN' })).toBeVisible();
    await check(page);
  });

  test('Today, the library and the grown-ups’ settings', async ({ page }) => {
    await playAs(page, ROBIN);
    await page.goto('/today');
    await expect(cards(page)).toHaveCount(3);
    await check(page);

    await page.goto('/library');
    await expect(cards(page)).toHaveCount(5);
    await check(page);

    await page.getByRole('button', { name: 'Grown-ups' }).click();
    await passGate(page);
    await expect(page.getByRole('dialog', { name: 'Settings for Robin' })).toBeVisible();
    await check(page);
  });
});
