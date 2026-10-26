import { PlacementItem } from '@learnofun/contracts';
import type { GameStory } from '@learnofun/game-sdk';

interface LineItem {
  id: string;
  skillIds: string[];
  difficulty: number;
  start: number;
  target: number;
  labelEvery: number;
  misconceptions: { position: number; misconceptionId: string }[];
}

/** A Hop Line item: a sum on the number line from 0 to 20, answered exactly. */
function line({ start, target, labelEvery, misconceptions, ...item }: LineItem) {
  return PlacementItem.parse({
    ...item,
    type: 'placement',
    surface: {
      kind: 'line',
      min: 0,
      max: 20,
      start,
      target,
      tolerance: 0,
      labelEvery,
      misconceptions,
    },
  });
}

/**
 * Items to try the game with (`.claude/rules/games.md`). They are a copy of what the
 * `hop-line-addition` template in the catalog generates for a six-item session from seed 2026,
 * easiest to hardest (learning-core `generateItems` with `rampLevels`, ADR 0015). Game packages do
 * not import learning-core, so the items are kept here as data.
 */
export const stories: readonly GameStory[] = [
  {
    id: 'early-primary',
    title: 'Ages 6–8: add within 20, easiest to hardest',
    band: 'early-primary',
    items: [
      line({
        id: 'hop-line-addition-3-plus-1',
        skillIds: ['add-within-10', 'add-within-20'],
        difficulty: -1.2,
        start: 3,
        target: 4,
        labelEvery: 1,
        misconceptions: [
          { position: 0, misconceptionId: 'hops-backwards' },
          { position: 2, misconceptionId: 'hops-backwards' },
          { position: 3, misconceptionId: 'counts-the-start' },
          { position: 5, misconceptionId: 'extra-hop' },
        ],
      }),
      line({
        id: 'hop-line-addition-3-plus-6',
        skillIds: ['add-within-10', 'add-within-20'],
        difficulty: -0.9,
        start: 3,
        target: 9,
        labelEvery: 1,
        misconceptions: [
          { position: 0, misconceptionId: 'hops-backwards' },
          { position: 1, misconceptionId: 'hops-backwards' },
          { position: 2, misconceptionId: 'hops-backwards' },
          { position: 6, misconceptionId: 'goes-to-the-number' },
          { position: 8, misconceptionId: 'counts-the-start' },
          { position: 10, misconceptionId: 'extra-hop' },
        ],
      }),
      line({
        id: 'hop-line-addition-15-plus-3',
        skillIds: ['add-within-20'],
        difficulty: -0.8,
        start: 15,
        target: 18,
        labelEvery: 1,
        misconceptions: [
          { position: 0, misconceptionId: 'hops-backwards' },
          { position: 1, misconceptionId: 'hops-backwards' },
          { position: 2, misconceptionId: 'hops-backwards' },
          { position: 4, misconceptionId: 'hops-backwards' },
          { position: 5, misconceptionId: 'hops-backwards' },
          { position: 6, misconceptionId: 'hops-backwards' },
          { position: 7, misconceptionId: 'hops-backwards' },
          { position: 8, misconceptionId: 'hops-backwards' },
          { position: 9, misconceptionId: 'hops-backwards' },
          { position: 10, misconceptionId: 'hops-backwards' },
          { position: 11, misconceptionId: 'hops-backwards' },
          { position: 12, misconceptionId: 'hops-backwards' },
          { position: 13, misconceptionId: 'hops-backwards' },
          { position: 14, misconceptionId: 'hops-backwards' },
          { position: 17, misconceptionId: 'counts-the-start' },
          { position: 19, misconceptionId: 'extra-hop' },
        ],
      }),
      line({
        id: 'hop-line-addition-11-plus-4',
        skillIds: ['add-within-20'],
        difficulty: -0.5,
        start: 11,
        target: 15,
        labelEvery: 1,
        misconceptions: [
          { position: 0, misconceptionId: 'hops-backwards' },
          { position: 1, misconceptionId: 'hops-backwards' },
          { position: 2, misconceptionId: 'hops-backwards' },
          { position: 3, misconceptionId: 'hops-backwards' },
          { position: 5, misconceptionId: 'hops-backwards' },
          { position: 6, misconceptionId: 'hops-backwards' },
          { position: 7, misconceptionId: 'hops-backwards' },
          { position: 8, misconceptionId: 'hops-backwards' },
          { position: 9, misconceptionId: 'hops-backwards' },
          { position: 10, misconceptionId: 'hops-backwards' },
          { position: 14, misconceptionId: 'counts-the-start' },
          { position: 16, misconceptionId: 'extra-hop' },
        ],
      }),
      line({
        id: 'hop-line-addition-9-plus-3',
        skillIds: ['add-within-20'],
        difficulty: -0.4,
        start: 9,
        target: 12,
        labelEvery: 1,
        misconceptions: [
          { position: 0, misconceptionId: 'hops-backwards' },
          { position: 1, misconceptionId: 'hops-backwards' },
          { position: 2, misconceptionId: 'hops-backwards' },
          { position: 4, misconceptionId: 'hops-backwards' },
          { position: 5, misconceptionId: 'hops-backwards' },
          { position: 6, misconceptionId: 'hops-backwards' },
          { position: 7, misconceptionId: 'hops-backwards' },
          { position: 8, misconceptionId: 'hops-backwards' },
          { position: 11, misconceptionId: 'counts-the-start' },
          { position: 13, misconceptionId: 'extra-hop' },
        ],
      }),
      line({
        id: 'hop-line-addition-9-plus-8-every-5',
        skillIds: ['add-within-20'],
        difficulty: 0.3,
        start: 9,
        target: 17,
        labelEvery: 5,
        misconceptions: [
          { position: 0, misconceptionId: 'hops-backwards' },
          { position: 1, misconceptionId: 'hops-backwards' },
          { position: 2, misconceptionId: 'hops-backwards' },
          { position: 3, misconceptionId: 'hops-backwards' },
          { position: 4, misconceptionId: 'hops-backwards' },
          { position: 5, misconceptionId: 'hops-backwards' },
          { position: 6, misconceptionId: 'hops-backwards' },
          { position: 7, misconceptionId: 'hops-backwards' },
          { position: 16, misconceptionId: 'counts-the-start' },
          { position: 18, misconceptionId: 'extra-hop' },
        ],
      }),
    ],
  },
];
