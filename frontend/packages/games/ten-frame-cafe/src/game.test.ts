import { GameManifest, Item } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { EXPLAINED_MISCONCEPTIONS, FRUITS, manifest } from './manifest';
import { stories } from './stories';

const items = stories.flatMap((story) => story.items);

describe('Ten Frame Café', () => {
  it('has a valid manifest', () => {
    expect(GameManifest.safeParse(manifest).success).toBe(true);
  });

  it('has a story for every band it supports', () => {
    expect(new Set(stories.map((story) => story.band))).toEqual(new Set(manifest.experienceBands));
  });

  it('has a story for each of its activities: counting, bonds to 10 and making ten', () => {
    const tasks = stories.map((story) =>
      story.items.map((item) => (item.type === 'numeric' ? item.scene?.task : undefined)),
    );
    expect(tasks).toEqual([
      ['fill-to', 'fill-to', 'fill-to'],
      ['fill-up', 'fill-up', 'fill-up'],
      ['make-ten', 'make-ten', 'make-ten'],
    ]);
  });

  it('only uses items it can render: ten-frame numbers, with fruit it can draw', () => {
    for (const item of items) {
      expect(Item.safeParse(item).success).toBe(true);
      expect(manifest.itemTypes).toContain(item.type);
      if (item.type !== 'numeric' || item.scene?.kind !== 'ten-frame') {
        throw new Error(`${item.id} is not a ten-frame number`);
      }
      expect(FRUITS as readonly string[], item.id).toContain(item.scene.fruit);
    }
  });

  it('can explain every misconception its items point to', () => {
    for (const item of items) {
      if (item.type !== 'numeric') throw new Error(`${item.id} is not a number`);
      for (const { misconceptionId } of item.misconceptions ?? []) {
        expect(EXPLAINED_MISCONCEPTIONS as readonly string[], item.id).toContain(misconceptionId);
      }
    }
  });

  it('lists every string it uses in its manifest, under its own name', () => {
    for (const key of manifest.strings) expect(key).toMatch(/^games\.tenFrameCafe\./);
  });
});
