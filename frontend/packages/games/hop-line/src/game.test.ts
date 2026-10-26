import { GameManifest, Item } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { EXPLAINED_MISCONCEPTIONS, manifest } from './manifest';
import { stories } from './stories';

describe('Hop Line', () => {
  it('has a valid manifest', () => {
    expect(GameManifest.safeParse(manifest).success).toBe(true);
  });

  it('has a story for every band it supports', () => {
    expect(new Set(stories.map((story) => story.band))).toEqual(new Set(manifest.experienceBands));
  });

  it('only uses items it can render', () => {
    for (const story of stories) {
      for (const item of story.items) {
        expect(Item.safeParse(item).success).toBe(true);
        expect(manifest.itemTypes).toContain(item.type);
      }
    }
  });

  it('renders lines with a start, and can explain every misconception they point to', () => {
    for (const story of stories) {
      for (const item of story.items) {
        if (item.type !== 'placement' || item.surface.kind !== 'line') {
          throw new Error(`${item.id} is not a placement on a line`);
        }
        expect(item.surface.start, item.id).toBeDefined();
        for (const { misconceptionId } of item.surface.misconceptions) {
          expect(EXPLAINED_MISCONCEPTIONS, item.id).toContain(misconceptionId);
        }
      }
    }
  });
});
