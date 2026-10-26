import { GameManifest, Item } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { manifest } from './manifest';
import { stories } from './stories';

describe('{{name}}', () => {
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
});
