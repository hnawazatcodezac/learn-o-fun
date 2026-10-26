import type { GameManifest, Item } from '@learnofun/contracts';
import { GAME_IDS } from '@learnofun/game-registry';
import type { GameStory } from '@learnofun/game-sdk';
import type { Locator } from '@playwright/test';

/** What every game package exports as `./conformance` (ADR 0014). */
export interface ConformanceEntry {
  manifest: GameManifest;
  stories: readonly GameStory[];
  /** Answers the item on screen, right or wrong, with the keyboard only. */
  answer: (stage: Locator, item: Item, correct: boolean) => Promise<void>;
}

/**
 * Every game's conformance entry, by ID, loaded without the game's styles so the suite can read
 * it outside a browser. `npm run create-game` adds new games here.
 */
export const ENTRIES: Readonly<Record<string, () => Promise<ConformanceEntry>>> = {
  // create-game: new games go below this line.
  'demo-choice': () => import('@learnofun/game-demo-choice/conformance'),
  'hop-line': () => import('@learnofun/game-hop-line/conformance'),
  'ten-frame-cafe': () => import('@learnofun/game-ten-frame-cafe/conformance'),
  'tile-farm': () => import('@learnofun/game-tile-farm/conformance'),
};

export interface ConformanceGame extends ConformanceEntry {
  id: string;
}

/** Loads the entry of every game in the registry. A registered game without one fails here. */
export async function loadGames(): Promise<ConformanceGame[]> {
  return Promise.all(
    GAME_IDS.map(async (id) => {
      const load = Object.hasOwn(ENTRIES, id) ? ENTRIES[id] : undefined;
      if (!load) {
        throw new Error(
          `Game ${id} has no conformance entry in tools/conformance/src/games.ts (ADR 0014)`,
        );
      }
      return { id, ...(await load()) };
    }),
  );
}
