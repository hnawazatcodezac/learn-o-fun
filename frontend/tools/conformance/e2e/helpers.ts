import type { Item, LearningEvent } from '@learnofun/contracts';
import type { GameStory } from '@learnofun/game-sdk';
import { test as base, expect, type Locator, type Page } from '@playwright/test';
import type { ConformanceGame } from '../src/games';
import { SANDBOX_URL, SHELL_URL } from './servers';

export { expect };

/** The smallest screens every game must fit (ADR 0012). */
export const VIEWPORTS = [
  { width: 1024, height: 600 },
  { width: 768, height: 1024 },
  { width: 360, height: 640 },
] as const;

export const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Every test fails on a page error or a console error. */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text());
      });
      await use(errors);
      expect(errors, 'page errors and console errors').toEqual([]);
    },
    { auto: true },
  ],
});

/** Where the suite plays a game: the game shell in the web app, or the game sandbox. */
export interface Surface {
  url(game: ConformanceGame, story: GameStory, params?: Record<string, string>): string;
  /** The element the game is mounted in. */
  stage(page: Page): Locator;
  /** The session's learning events so far. */
  events(page: Page): Promise<LearningEvent[]>;
}

export const shell: Surface = {
  url: (game, story, params = {}) =>
    `${SHELL_URL}/play/dev?${new URLSearchParams({ game: game.id, story: story.id, seed: '1', ...params }).toString()}`,
  stage: (page) => page.getByTestId('game-stage'),
  // The development route keeps its events in the page (apps/web/src/child/play/dev-events.ts).
  events: (page) =>
    page.evaluate(
      () =>
        (window as unknown as { learnofunDevEvents?: LearningEvent[] }).learnofunDevEvents ?? [],
    ),
};

export const sandbox: Surface = {
  url: (game, story, params = {}) =>
    `${SANDBOX_URL}/?${new URLSearchParams({ game: game.id, band: story.band, story: story.id, seed: '1', ...params }).toString()}`,
  stage: (page) => page.getByTestId('sandbox-stage'),
  // The sandbox's event log shows every event in full.
  events: async (page) =>
    (await page.getByTestId('event-log').locator('pre').allTextContents()).map(
      (text) => JSON.parse(text) as LearningEvent,
    ),
};

const ended = (event: LearningEvent) =>
  event.type === 'session_completed' || event.type === 'session_ended';

/**
 * Plays a session through with the game's keyboard driver: for each item the session presents,
 * `beforeAnswer` runs, the driver answers, then `afterAnswer` runs. Returns the session's events.
 * Answering wrong suits Challenge mode, where a wrong answer moves on.
 */
export async function playThrough(
  page: Page,
  surface: Surface,
  game: ConformanceGame,
  story: GameStory,
  options: {
    correct?: boolean;
    beforeAnswer?: (item: Item) => Promise<void>;
    afterAnswer?: (item: Item) => Promise<void>;
  } = {},
): Promise<LearningEvent[]> {
  const { correct = true } = options;
  let handled = 0;
  for (;;) {
    let events: LearningEvent[] = [];
    await expect
      .poll(
        async () => {
          events = await surface.events(page);
          const presented = events.filter((event) => event.type === 'item_presented').length;
          return events.some(ended) || presented > handled;
        },
        { message: 'The next item or the end of the session' },
      )
      .toBe(true);
    if (events.some(ended)) return events;

    const presented = events.filter((event) => event.type === 'item_presented');
    handled = presented.length;
    const itemId = presented.at(-1)?.itemId;
    const item = story.items.find((candidate) => candidate.id === itemId);
    if (!item) throw new Error(`Item ${String(itemId)} is not in story ${story.id}`);
    await options.beforeAnswer?.(item);
    await game.answer(surface.stage(page), item, correct);
    await options.afterAnswer?.(item);
  }
}

/** Waits for the session to have `count` events of a type, and returns the latest of them. */
export async function waitForEvent<T extends LearningEvent['type']>(
  page: Page,
  surface: Surface,
  type: T,
  count = 1,
): Promise<Extract<LearningEvent, { type: T }>> {
  let found: LearningEvent[] = [];
  await expect
    .poll(async () => {
      found = (await surface.events(page)).filter((event) => event.type === type);
      return found.length;
    })
    .toBeGreaterThanOrEqual(count);
  return found.at(-1) as Extract<LearningEvent, { type: T }>;
}

/** What sticks out of the screen: page scrolling, and any element of the shell outside it. */
export function overflowProblems(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const { scrollWidth, scrollHeight, clientWidth, clientHeight } = document.documentElement;
    if (scrollWidth > clientWidth) {
      problems.push(
        `The page scrolls sideways: ${String(scrollWidth)}px in ${String(clientWidth)}px`,
      );
    }
    if (scrollHeight > clientHeight) {
      problems.push(
        `The page scrolls down: ${String(scrollHeight)}px in ${String(clientHeight)}px`,
      );
    }
    const shell = document.querySelector('[data-testid="game-shell"]');
    for (const element of shell?.querySelectorAll('*') ?? []) {
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (
        box.left < -1 ||
        box.top < -1 ||
        box.right > clientWidth + 1 ||
        box.bottom > clientHeight + 1
      ) {
        const name = element.getAttribute('class') ?? element.tagName.toLowerCase();
        problems.push(`${name} is partly off the screen`);
      }
    }
    return problems;
  });
}

/** Plain letters in en-XA, where every catalog and content letter is accented, are hard-coded. */
export async function hardCodedText(region: Locator): Promise<string[]> {
  const text = await region.innerText();
  return text.split('\n').filter((line) => /[A-Za-z]/.test(line));
}

/** Animations running in the region, which reduced motion should have turned off. */
export function runningAnimations(region: Locator): Promise<string[]> {
  return region.evaluate((root) =>
    root
      .getAnimations({ subtree: true })
      .filter((animation) => {
        const duration = Number(animation.effect?.getComputedTiming().duration ?? 0);
        return animation.playState === 'running' && duration > 0;
      })
      .map((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return `${animation.constructor.name} on ${target?.getAttribute('class') ?? 'an element'}`;
      }),
  );
}

/** Makes the page look hidden or visible, as switching apps or tabs does. */
export async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((value) => {
    Object.defineProperty(document, 'visibilityState', { value, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, state);
}

/** Presses Tab until focus is inside the region; returns whether it got there. */
export async function tabInto(page: Page, region: Locator, maxPresses = 60): Promise<boolean> {
  for (let presses = 0; presses < maxPresses; presses += 1) {
    await page.keyboard.press('Tab');
    if (await region.evaluate((root) => root.contains(document.activeElement))) return true;
  }
  return false;
}
