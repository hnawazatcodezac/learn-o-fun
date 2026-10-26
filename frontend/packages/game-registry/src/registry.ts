import type { GamePackage } from '@learnofun/game-sdk';

/**
 * Every game, by ID, loaded only when it is played. `npm run create-game` adds new games here.
 */
export const GAMES: Readonly<Record<string, () => Promise<GamePackage>>> = {
  // create-game: new games go below this line.
  'demo-choice': () => import('@learnofun/game-demo-choice'),
  'hop-line': () => import('@learnofun/game-hop-line'),
  'ten-frame-cafe': () => import('@learnofun/game-ten-frame-cafe'),
  'tile-farm': () => import('@learnofun/game-tile-farm'),
};

export const GAME_IDS: readonly string[] = Object.keys(GAMES);

/** Loads a game package, or returns undefined for an unknown game ID. */
export function loadGame(id: string): Promise<GamePackage> | undefined {
  return Object.hasOwn(GAMES, id) ? GAMES[id]?.() : undefined;
}
