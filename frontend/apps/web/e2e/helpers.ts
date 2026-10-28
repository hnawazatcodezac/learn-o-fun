import AxeBuilder from '@axe-core/playwright';
import type { TimeLimits } from '@learnofun/contracts';
import { expect, type Page } from '@playwright/test';

/** The locales the app is checked in: English and the two pseudo-locales (plan 7). */
export type TestLocale = 'en' | 'en-XA' | 'en-XB';

/**
 * A name as a locale shows it, for finding a control by its English name in any locale. Both
 * pseudo-locales bracket and pad the text; en-XA also accents every letter, so each letter
 * matches any letter.
 */
export function named(text: string, locale: TestLocale = 'en'): string | RegExp {
  if (locale === 'en') return text;
  const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = locale === 'en-XA' ? escaped.replace(/[A-Za-z]/g, '\\p{L}') : escaped;
  return new RegExp(`^\\[${body} ·+\\]$`, 'u');
}

/** English letters back from en-XA's accents, enough to read the gate's number words. */
function unaccented(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ƒ', 'f');
}

const WORDS: Record<string, number> = {
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
};

/** Answers the parental gate's times-table question, as an adult would, in any test locale. */
export async function passGate(page: Page, locale: TestLocale = 'en') {
  const gate = page.getByRole('dialog', { name: named('For grown-ups', locale) });
  // The entry is labelled by the question, "What is three times four?".
  const questionId = await gate.locator('output').getAttribute('aria-labelledby');
  const question = await gate.locator(`[id="${String(questionId)}"]`).textContent();
  const [a, b] = unaccented(question ?? '')
    .split(/[^a-z]+/)
    .flatMap((word) => (word in WORDS ? [WORDS[word] ?? 0] : []));
  if (a === undefined || b === undefined) {
    throw new Error(`Unexpected question: ${String(question)}`);
  }
  const keypad = gate.getByRole('group', { name: named('Number pad', locale) });
  for (const digit of String(a * b)) {
    await keypad.getByRole('button', { name: digit, exact: true }).click();
  }
  await keypad.getByRole('button', { name: named('Done', locale) }).click();
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

/**
 * Sets Robin's time limits in the dashboard, as a parent does (ADR 0027), before play starts. The
 * mock API answers on the real clock; the page's clock is fast-forwarded a quarter of an hour at
 * most, so both stay on the same day.
 */
export async function setLimits(page: Page, limits: TimeLimits) {
  await signInAs(page, SAM);
  const status = await page.evaluate(
    async ({ childId, body }) => {
      const familyId = '0192f4c1-0000-7000-8000-00000000f001';
      const response = await fetch(`/api/families/${familyId}/children/${childId}/time-limits`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.status;
    },
    { childId: ROBIN, body: limits },
  );
  expect(status, 'the limits are saved').toBe(200);
}

export const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

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

/** A Hop Line sum not yet answered, "3 + 4", bracketed and padded in the pseudo-locales. */
const UNANSWERED_SUM = /^\[?(\d+) \+ (\d+)(?: ·+\])?$/;

/** Answers the item on screen with the keyboard: hop from the start as many times as the sum says. */
export async function answerRight(page: Page) {
  // Wait for the next item: the last one's sum shows its answer until it goes.
  const unanswered = page.locator('.g-hop-line__sum');
  await expect(unanswered).toHaveText(UNANSWERED_SUM);
  const sum = await unanswered.textContent();
  const match = UNANSWERED_SUM.exec(sum ?? '');
  if (!match) throw new Error(`Unexpected sum: ${String(sum)}`);
  const line = page.getByRole('slider');
  await expect(line).toBeFocused();
  for (let hop = 0; hop < Number(match[2]); hop += 1) await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
}

/** Answers the item on screen wrongly: lands without hopping, on the start. */
export async function answerWrong(page: Page) {
  await expect(page.locator('.g-hop-line__sum')).toHaveText(UNANSWERED_SUM);
  await expect(page.getByRole('slider')).toBeFocused();
  await page.keyboard.press('Enter');
}
