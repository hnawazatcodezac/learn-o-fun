import { Item } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { GAME_IDS, loadGame } from './registry';

describe('the game registry', () => {
  it('has at least one game', () => {
    expect(GAME_IDS.length).toBeGreaterThan(0);
  });

  it('returns nothing for an unknown game', () => {
    expect(loadGame('no-such-game')).toBeUndefined();
  });

  describe.each(GAME_IDS)('%s', (id) => {
    it('loads, with a manifest of the same ID', async () => {
      const loaded = await loadGame(id);
      expect(loaded?.game.manifest.id).toBe(id);
    });

    it('has a story for every band it supports, using only items it can render', async () => {
      const loaded = await loadGame(id);
      if (!loaded) throw new Error(`Game ${id} did not load`);
      const { game, stories } = loaded;

      expect(new Set(stories.map((story) => story.band))).toEqual(
        new Set(game.manifest.experienceBands),
      );
      for (const story of stories) {
        expect(story.items.length).toBeGreaterThan(0);
        for (const item of story.items) {
          expect(Item.safeParse(item).success).toBe(true);
          expect(game.manifest.itemTypes).toContain(item.type);
        }
      }
    });
  });
});
