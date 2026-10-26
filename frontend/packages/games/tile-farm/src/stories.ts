import { NumericItem, type FieldTask } from '@learnofun/contracts';
import type { GameStory } from '@learnofun/game-sdk';

interface FieldItem {
  id: string;
  skillIds: string[];
  difficulty: number;
  task: FieldTask;
  rows: number;
  rowLength: number;
  crop: string;
  answer: number;
  misconceptions: { answer: number; misconceptionId: string }[];
}

/** A farm item: a field scene and the plants in all (ADR 0038). */
function field({ task, rows, rowLength, crop, answer, ...item }: FieldItem) {
  return NumericItem.parse({
    ...item,
    type: 'numeric',
    answer: { kind: 'decimal', value: answer },
    tolerance: 0,
    acceptEquivalentFractions: false,
    scene: { kind: 'field', task, rows, rowLength, crop },
  });
}

const GROUPS = ['equal-groups', 'repeated-addition'];

/**
 * Items to try the game with (`.claude/rules/games.md`), one story per activity. They are copies
 * of what the catalog's farm templates make (learning-core `levelItems`, ADR 0038), easiest to
 * hardest. Game packages do not import learning-core, so the items are kept here as data.
 */
export const stories: readonly GameStory[] = [
  {
    id: 'equal-groups',
    title: 'Ages 6–8: planting equal groups',
    band: 'early-primary',
    items: [
      field({
        id: 'tile-farm-groups-2-rows-of-5-carrot',
        skillIds: GROUPS,
        difficulty: -0.75,
        task: 'equal-groups',
        rows: 2,
        rowLength: 5,
        crop: 'carrot',
        answer: 10,
        misconceptions: [
          { answer: 2, misconceptionId: 'counts-the-rows' },
          { answer: 7, misconceptionId: 'adds-the-numbers' },
          { answer: 15, misconceptionId: 'skips-a-row' },
        ],
      }),
      field({
        id: 'tile-farm-groups-5-rows-of-2-sunflower',
        skillIds: GROUPS,
        difficulty: -0.45,
        task: 'equal-groups',
        rows: 5,
        rowLength: 2,
        crop: 'sunflower',
        answer: 10,
        misconceptions: [
          { answer: 2, misconceptionId: 'counts-one-row' },
          { answer: 5, misconceptionId: 'counts-the-rows' },
          { answer: 7, misconceptionId: 'adds-the-numbers' },
          { answer: 8, misconceptionId: 'skips-a-row' },
          { answer: 12, misconceptionId: 'skips-a-row' },
        ],
      }),
      field({
        id: 'tile-farm-groups-3-rows-of-4-carrot',
        skillIds: GROUPS,
        difficulty: -0.22,
        task: 'equal-groups',
        rows: 3,
        rowLength: 4,
        crop: 'carrot',
        answer: 12,
        misconceptions: [
          { answer: 3, misconceptionId: 'counts-the-rows' },
          { answer: 4, misconceptionId: 'counts-one-row' },
          { answer: 7, misconceptionId: 'adds-the-numbers' },
          { answer: 8, misconceptionId: 'skips-a-row' },
          { answer: 16, misconceptionId: 'skips-a-row' },
        ],
      }),
    ],
  },
  {
    id: 'arrays',
    title: 'Ages 6–8: filling the field',
    band: 'early-primary',
    items: [
      field({
        id: 'tile-farm-arrays-3-rows-of-5-sunflower',
        // Rows of 5 are the 5 times table too (ADR 0038).
        skillIds: ['arrays', 'multiply-by-2-5-10'],
        difficulty: 0.03,
        task: 'array',
        rows: 3,
        rowLength: 5,
        crop: 'sunflower',
        answer: 15,
        misconceptions: [
          { answer: 3, misconceptionId: 'counts-the-rows' },
          { answer: 5, misconceptionId: 'counts-one-row' },
          { answer: 8, misconceptionId: 'adds-the-numbers' },
          { answer: 10, misconceptionId: 'skips-a-row' },
          { answer: 20, misconceptionId: 'skips-a-row' },
        ],
      }),
      field({
        id: 'tile-farm-arrays-4-rows-of-10-cabbage',
        skillIds: ['arrays', 'multiply-by-2-5-10'],
        difficulty: 0.5,
        task: 'array',
        rows: 4,
        rowLength: 10,
        crop: 'cabbage',
        answer: 40,
        misconceptions: [
          { answer: 4, misconceptionId: 'counts-the-rows' },
          { answer: 10, misconceptionId: 'counts-one-row' },
          { answer: 14, misconceptionId: 'adds-the-numbers' },
          { answer: 30, misconceptionId: 'skips-a-row' },
          { answer: 50, misconceptionId: 'skips-a-row' },
        ],
      }),
      field({
        id: 'tile-farm-arrays-6-rows-of-4-carrot',
        skillIds: ['arrays'],
        difficulty: 0.86,
        task: 'array',
        rows: 6,
        rowLength: 4,
        crop: 'carrot',
        answer: 24,
        misconceptions: [
          { answer: 4, misconceptionId: 'counts-one-row' },
          { answer: 6, misconceptionId: 'counts-the-rows' },
          { answer: 10, misconceptionId: 'adds-the-numbers' },
          { answer: 20, misconceptionId: 'skips-a-row' },
          { answer: 28, misconceptionId: 'skips-a-row' },
        ],
      }),
    ],
  },
];
