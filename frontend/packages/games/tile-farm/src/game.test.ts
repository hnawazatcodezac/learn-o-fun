import { GameManifest, Item } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { CROPS, EXPLAINED_MISCONCEPTIONS, manifest } from './manifest';
import { stories } from './stories';

const items = stories.flatMap((story) => story.items);

describe('Tile Farm', () => {
  it('has a valid manifest', () => {
    expect(GameManifest.safeParse(manifest).success).toBe(true);
  });

  it('has a story for every band it supports', () => {
    expect(new Set(stories.map((story) => story.band))).toEqual(new Set(manifest.experienceBands));
  });

  it('has a story for each of its activities: equal groups and arrays', () => {
    const tasks = stories.map((story) =>
      story.items.map((item) => (item.type === 'numeric' ? item.scene?.task : undefined)),
    );
    expect(tasks).toEqual([
      ['equal-groups', 'equal-groups', 'equal-groups'],
      ['array', 'array', 'array'],
    ]);
  });

  it('only uses items it can render: field numbers, with crops it can draw', () => {
    for (const item of items) {
      expect(Item.safeParse(item).success).toBe(true);
      expect(manifest.itemTypes).toContain(item.type);
      if (item.type !== 'numeric' || item.scene?.kind !== 'field') {
        throw new Error(`${item.id} is not a field number`);
      }
      expect(CROPS as readonly string[], item.id).toContain(item.scene.crop);
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

  it('counts arrays of 2, 5 and 10 for the times tables, and others for arrays alone', () => {
    for (const item of items) {
      if (item.type !== 'numeric' || item.scene?.kind !== 'field') continue;
      if (item.scene.task !== 'array') continue;
      const tables = [2, 5, 10].includes(item.scene.rowLength);
      expect(item.skillIds, item.id).toEqual(
        tables ? ['arrays', 'multiply-by-2-5-10'] : ['arrays'],
      );
    }
  });

  it('lists every string it uses in its manifest, under its own name', () => {
    for (const key of manifest.strings) expect(key).toMatch(/^games\.tileFarm\./);
  });
});
