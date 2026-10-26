import { GameManifest, Item } from '@learnofun/contracts';
import { GAME_IDS } from '@learnofun/game-registry';
import { createI18n } from '@learnofun/i18n';
import { describe, expect, it } from 'vitest';
import { BUNDLE_BUDGET_BYTES, measureGameBundle } from './bundle';
import { ENTRIES, loadGames } from './games';

/**
 * The checks that need no browser (ADR 0014): the manifest, the stories, the strings and the
 * bundle budget, for every registered game.
 */
const games = await loadGames();
const catalog = createI18n('en');

it('has a conformance entry for every registered game, and no others', () => {
  expect(Object.keys(ENTRIES).sort()).toEqual([...GAME_IDS].sort());
});

describe.each(games)('$id', (game) => {
  const { manifest, stories } = game;

  it('has a valid manifest with the game’s ID', () => {
    expect(GameManifest.safeParse(manifest).success).toBe(true);
    expect(manifest.id).toBe(game.id);
  });

  it('has a story for every band it supports, and only those', () => {
    expect(new Set(stories.map((story) => story.band))).toEqual(new Set(manifest.experienceBands));
  });

  it('has stories with distinct IDs, made of valid items it can render', () => {
    expect(new Set(stories.map((story) => story.id)).size).toBe(stories.length);
    for (const story of stories) {
      expect(story.items.length, story.id).toBeGreaterThan(0);
      expect(new Set(story.items.map((item) => item.id)).size, story.id).toBe(story.items.length);
      for (const item of story.items) {
        expect(Item.safeParse(item).success, item.id).toBe(true);
        expect(manifest.itemTypes, item.id).toContain(item.type);
      }
    }
  });

  it('has every string its manifest lists in the English catalog', () => {
    const missing = manifest.strings.filter((key) => !catalog.exists(key));
    expect(missing).toEqual([]);
  });

  it('has a keyboard driver', () => {
    expect(typeof game.answer).toBe('function');
  });

  it('stays within the bundle budget', { timeout: 60_000 }, async () => {
    const size = await measureGameBundle(game.id);

    expect(size.files.length).toBeGreaterThan(0);
    expect(size.bytes, JSON.stringify(size.files)).toBeLessThanOrEqual(BUNDLE_BUDGET_BYTES);
  });
});
