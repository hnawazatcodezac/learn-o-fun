import { NumericItem, type TenFrameTask } from '@learnofun/contracts';
import type { GameStory } from '@learnofun/game-sdk';

interface TrayItem {
  id: string;
  skillIds: string[];
  difficulty: number;
  task: TenFrameTask;
  trays: number[];
  fruit: string;
  answer: number;
  misconceptions: { answer: number; misconceptionId: string }[];
}

/** A café item: a ten-frame scene and the whole number it asks for (ADR 0037). */
function tray({ task, trays, fruit, answer, ...item }: TrayItem) {
  return NumericItem.parse({
    ...item,
    type: 'numeric',
    answer: { kind: 'decimal', value: answer },
    tolerance: 0,
    acceptEquivalentFractions: false,
    scene: { kind: 'ten-frame', task, trays, fruit },
  });
}

const COUNTING = ['count-to-20'];
const BONDS = ['number-bonds-to-10'];
const MAKE_TEN = ['make-ten-to-add', 'number-bonds-to-20', 'add-within-20'];

/**
 * Items to try the game with (`.claude/rules/games.md`), one story per activity. They are copies
 * of what the catalog's café templates make (learning-core `levelItems`, ADR 0037), easiest to
 * hardest. Game packages do not import learning-core, so the items are kept here as data.
 */
export const stories: readonly GameStory[] = [
  {
    id: 'early-primary',
    title: 'Ages 6–8: counting into the trays',
    band: 'early-primary',
    items: [
      tray({
        id: 'ten-frame-counting-4-apple',
        skillIds: COUNTING,
        difficulty: -2.14,
        task: 'fill-to',
        trays: [0],
        fruit: 'apple',
        answer: 4,
        misconceptions: [
          { answer: 3, misconceptionId: 'counts-one-twice' },
          { answer: 5, misconceptionId: 'counts-one-twice' },
        ],
      }),
      tray({
        id: 'ten-frame-counting-9-pear',
        skillIds: COUNTING,
        difficulty: -1.94,
        task: 'fill-to',
        trays: [0],
        fruit: 'pear',
        answer: 9,
        misconceptions: [
          { answer: 8, misconceptionId: 'counts-one-twice' },
          { answer: 10, misconceptionId: 'counts-one-twice' },
        ],
      }),
      tray({
        id: 'ten-frame-counting-13-strawberry',
        skillIds: COUNTING,
        difficulty: -1.48,
        task: 'fill-to',
        trays: [0, 0],
        fruit: 'strawberry',
        answer: 13,
        misconceptions: [
          { answer: 12, misconceptionId: 'counts-one-twice' },
          { answer: 14, misconceptionId: 'counts-one-twice' },
        ],
      }),
    ],
  },
  {
    id: 'bonds-to-10',
    title: 'Ages 6–8: filling the tray to 10',
    band: 'early-primary',
    items: [
      tray({
        id: 'ten-frame-bonds-10-7-lemon',
        skillIds: BONDS,
        difficulty: -1.36,
        task: 'fill-up',
        trays: [7],
        fruit: 'lemon',
        answer: 3,
        misconceptions: [
          { answer: 7, misconceptionId: 'gives-the-part' },
          { answer: 10, misconceptionId: 'counts-all' },
        ],
      }),
      tray({
        id: 'ten-frame-bonds-10-4-apple',
        skillIds: BONDS,
        difficulty: -0.92,
        task: 'fill-up',
        trays: [4],
        fruit: 'apple',
        answer: 6,
        misconceptions: [
          { answer: 4, misconceptionId: 'gives-the-part' },
          { answer: 10, misconceptionId: 'counts-all' },
        ],
      }),
      tray({
        id: 'ten-frame-bonds-10-1-pear',
        skillIds: BONDS,
        difficulty: -0.68,
        task: 'fill-up',
        trays: [1],
        fruit: 'pear',
        answer: 9,
        misconceptions: [
          { answer: 1, misconceptionId: 'gives-the-part' },
          { answer: 10, misconceptionId: 'counts-all' },
        ],
      }),
    ],
  },
  {
    id: 'making-ten',
    title: 'Ages 6–8: making ten to add',
    band: 'early-primary',
    items: [
      tray({
        id: 'ten-frame-make-ten-9-plus-3-pear',
        skillIds: MAKE_TEN,
        difficulty: -0.1,
        task: 'make-ten',
        trays: [9, 3],
        fruit: 'pear',
        answer: 12,
        misconceptions: [
          { answer: 10, misconceptionId: 'stops-at-ten' },
          { answer: 13, misconceptionId: 'counts-moved-twice' },
        ],
      }),
      tray({
        id: 'ten-frame-make-ten-8-plus-5-apple',
        skillIds: MAKE_TEN,
        difficulty: -0.1,
        task: 'make-ten',
        trays: [8, 5],
        fruit: 'apple',
        answer: 13,
        misconceptions: [
          { answer: 10, misconceptionId: 'stops-at-ten' },
          { answer: 15, misconceptionId: 'counts-moved-twice' },
        ],
      }),
      tray({
        id: 'ten-frame-make-ten-6-plus-8-lemon',
        skillIds: MAKE_TEN,
        difficulty: 0.2,
        task: 'make-ten',
        trays: [6, 8],
        fruit: 'lemon',
        answer: 14,
        misconceptions: [
          { answer: 10, misconceptionId: 'stops-at-ten' },
          { answer: 18, misconceptionId: 'counts-moved-twice' },
        ],
      }),
    ],
  },
];
