import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

const WORDS: Record<string, number> = {
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

/** Answers the parental gate's times-table question, as an adult would. */
export async function passGate(page: Page) {
  const gate = page.getByRole('dialog', { name: 'For grown-ups' });
  const question = await gate.getByText(/^What is \w+ times \w+\?$/).textContent();
  const match = /^What is (\w+) times (\w+)\?$/.exec(question ?? '');
  const a = WORDS[match?.[1] ?? ''];
  const b = WORDS[match?.[2] ?? ''];
  if (a === undefined || b === undefined) {
    throw new Error(`Unexpected question: ${String(question)}`);
  }
  const keypad = gate.getByRole('group', { name: 'Number pad' });
  for (const digit of String(a * b)) {
    await keypad.getByRole('button', { name: digit, exact: true }).click();
  }
  await keypad.getByRole('button', { name: 'Done' }).click();
}

/** Opens the development panel in the corner, unless it is open already (FRONTEND-KICKOFF 15b). */
export async function openDevTools(page: Page) {
  const panel = page.getByTestId('dev-tools');
  if (!(await panel.evaluate((details) => (details as HTMLDetailsElement).open))) {
    await page.getByTestId('dev-tools-toggle').click();
  }
}

/** Makes a child the one playing on this device, as the profile picker does (ADR 0018). */
export async function playAs(page: Page, childId: string) {
  await page.addInitScript((id) => {
    localStorage.setItem('learnofun.childMode.childId', id);
  }, childId);
}

export const ROBIN = '0192f4c1-0000-7000-8000-00000000c001';
export const ARI = '0192f4c1-0000-7000-8000-00000000c002';
export const SAM = '0192f4c1-0000-7000-8000-00000000a001';
export const ALEX = '0192f4c1-0000-7000-8000-00000000a002';

/**
 * Signs in to the parent dashboard as a fixture account through the mock API, as the mock sign-in
 * does (ADR 0025). The app renders once the mock API answers, so it waits for the child area first.
 */
export async function signInAs(page: Page, accountId: string) {
  await page.goto('/');
  await expect(page.getByTestId('child-root')).toBeVisible();
  const status = await page.evaluate(async (id) => {
    const response = await fetch('/api/parent/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ accountId: id }),
    });
    return response.status;
  }, accountId);
  expect(status, 'the mock sign-in').toBe(200);
}

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Checks the page as it stands against WCAG 2.2 AA, listing every rule it breaks. */
export async function meetsWcag(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_22_AA).analyze();
  expect(violations.map((v) => `${v.id}: ${v.help} (${String(v.nodes.length)})`)).toEqual([]);
}

/**
 * The text in part of the page that is not from the catalog. en-XA accents every catalog letter,
 * so a plain letter is hard-coded. The family's own text is never translated: marked with
 * `data-user-content` where it stands alone, and named here where a message holds it. Each text
 * node is read on its own, so a name is never run together with its neighbours.
 */
export function untranslatedText(page: Page, selector: string, names: readonly string[]) {
  return page.locator(selector).evaluate((root, ownNames) => {
    const own = new RegExp(`\\b(${ownNames.join('|')})\\b`, 'g');
    const found: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest('[data-user-content]')) continue;
      const text = (node as Text).data.replaceAll(own, '');
      if (/[A-Za-z]/.test(text)) found.push(text);
    }
    return found;
  }, names);
}

/** Answers the item on screen with the keyboard: hop from the start as many times as the sum says. */
export async function answerRight(page: Page) {
  // Wait for the next item: the last one's sum shows its answer until it goes.
  const unanswered = page.locator('.g-hop-line__sum');
  await expect(unanswered).toHaveText(/^\d+ \+ \d+$/);
  const sum = await unanswered.textContent();
  const match = /^(\d+) \+ (\d+)$/.exec(sum ?? '');
  if (!match) throw new Error(`Unexpected sum: ${String(sum)}`);
  const line = page.getByRole('slider');
  await expect(line).toBeFocused();
  for (let hop = 0; hop < Number(match[2]); hop += 1) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
}

/** Answers the item on screen wrongly: lands without hopping, on the start. */
export async function answerWrong(page: Page) {
  await expect(page.locator('.g-hop-line__sum')).toHaveText(/^\d+ \+ \d+$/);
  await expect(page.getByRole('slider')).toBeFocused();
  await page.keyboard.press('Enter');
}
