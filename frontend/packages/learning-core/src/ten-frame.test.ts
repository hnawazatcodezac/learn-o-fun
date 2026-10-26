import {
  Item,
  TenFrameBondsTemplate,
  TenFrameCountingTemplate,
  TenFrameMakeTenTemplate,
  type ItemTemplate,
} from '@learnofun/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { grade } from './graders';
import {
  DEFAULT_GENERATOR_CONFIG,
  generateItem,
  itemFromId,
  levelItems,
  templateMaker,
} from './templates';
import { bondsItem, countingItem, makeTenItem } from './ten-frame';

const fruits = ['apple', 'pear', 'lemon'];
const config = DEFAULT_GENERATOR_CONFIG;

/** The café's three templates, as the mock catalog has them (ADR 0037). */
const counting = TenFrameCountingTemplate.parse({
  id: 'ten-frame-counting',
  generator: 'ten-frame-fill-to',
  skillIds: ['count-to-20'],
  fruits,
  difficulty: { base: -1.8, perFruit: 0, aboveTen: 0.5 },
  misconceptions: { countsOneTwice: 'counts-one-twice' },
  levels: [
    { min: 1, max: 5 },
    { min: 6, max: 10 },
    { min: 11, max: 15 },
    { min: 16, max: 20 },
  ],
});
const bonds = TenFrameBondsTemplate.parse({
  id: 'ten-frame-bonds-10',
  generator: 'ten-frame-fill-up',
  skillIds: ['number-bonds-to-10'],
  fruits,
  difficulty: { base: -1.2, perMissing: 0, largeMissing: 0.4, largeMissingFrom: 5 },
  misconceptions: { givesThePart: 'gives-the-part', countsAll: 'counts-all' },
  levels: [
    { minShown: 6, maxShown: 9 },
    { minShown: 3, maxShown: 5 },
    { minShown: 1, maxShown: 2 },
  ],
});
const makeTen = TenFrameMakeTenTemplate.parse({
  id: 'ten-frame-make-ten',
  generator: 'ten-frame-make-ten',
  skillIds: ['make-ten-to-add', 'number-bonds-to-20', 'add-within-20'],
  fruits,
  difficulty: { base: 0, farFromTen: 0.3, farFrom: 3, aboveFifteen: 0.3 },
  misconceptions: { stopsAtTen: 'stops-at-ten', countsMovedTwice: 'counts-moved-twice' },
  levels: [
    { minFirst: 8, maxFirst: 9, minSecond: 2, maxSecond: 5 },
    { minFirst: 7, maxFirst: 9, minSecond: 4, maxSecond: 9 },
    { minFirst: 5, maxFirst: 7, minSecond: 6, maxSecond: 9 },
  ],
});
const TEMPLATES: ItemTemplate[] = [counting, bonds, makeTen];

const answered = (item: Item, value: number) =>
  grade(item, { type: 'numeric', value: { kind: 'decimal', value } });

describe('the ten-frame generators (the Ten Frame Café brief, ADR 0037)', () => {
  it('counting: fills the trays to the number asked for, a second tray above ten', () => {
    expect(countingItem(counting, { count: 13, fruit: 'pear' }, config)).toEqual({
      id: 'ten-frame-counting-13-pear',
      type: 'numeric',
      skillIds: ['count-to-20'],
      difficulty: -1.3,
      answer: { kind: 'decimal', value: 13 },
      tolerance: 0,
      acceptEquivalentFractions: false,
      scene: { kind: 'ten-frame', task: 'fill-to', trays: [0, 0], fruit: 'pear' },
      misconceptions: [
        { answer: 12, misconceptionId: 'counts-one-twice' },
        { answer: 14, misconceptionId: 'counts-one-twice' },
      ],
    });
    // One fruit: serving none is not counting one twice, and one tray holds it.
    expect(countingItem(counting, { count: 1, fruit: 'apple' }, config)).toMatchObject({
      difficulty: -1.8,
      scene: { trays: [0] },
      misconceptions: [{ answer: 2, misconceptionId: 'counts-one-twice' }],
    });
  });

  it('bonds to 10: the answer is what fills the tray, harder with five or more missing', () => {
    expect(bondsItem(bonds, { shown: 6, fruit: 'lemon' }, config)).toMatchObject({
      id: 'ten-frame-bonds-10-6-lemon',
      difficulty: -1.2,
      answer: { value: 4 },
      scene: { task: 'fill-up', trays: [6], fruit: 'lemon' },
      misconceptions: [
        { answer: 6, misconceptionId: 'gives-the-part' },
        { answer: 10, misconceptionId: 'counts-all' },
      ],
    });
    expect(bondsItem(bonds, { shown: 3, fruit: 'lemon' }, config)?.difficulty).toBe(-0.8);
    // With 5 shown, the part shown is the right answer, so it names no misconception.
    expect(bondsItem(bonds, { shown: 5, fruit: 'lemon' }, config)).toMatchObject({
      misconceptions: [{ answer: 10, misconceptionId: 'counts-all' }],
    });
  });

  it('making ten: the total, with its two mistakes, harder far from ten or above 15', () => {
    expect(makeTenItem(makeTen, { first: 8, second: 5, fruit: 'pear' }, config)).toMatchObject({
      id: 'ten-frame-make-ten-8-plus-5-pear',
      skillIds: ['make-ten-to-add', 'number-bonds-to-20', 'add-within-20'],
      difficulty: 0,
      answer: { value: 13 },
      scene: { task: 'make-ten', trays: [8, 5] },
      misconceptions: [
        { answer: 10, misconceptionId: 'stops-at-ten' },
        { answer: 15, misconceptionId: 'counts-moved-twice' },
      ],
    });
    expect(makeTenItem(makeTen, { first: 6, second: 9, fruit: 'pear' }, config)?.difficulty).toBe(
      0.3,
    );
    expect(makeTenItem(makeTen, { first: 7, second: 9, fruit: 'pear' }, config)?.difficulty).toBe(
      0.6,
    );
  });

  it('makes each fruit counted, or missing, a little harder when the template says so', () => {
    const graded = TenFrameCountingTemplate.parse({
      ...counting,
      difficulty: { base: -2.3, perFruit: 0.04, aboveTen: 0.3 },
    });
    expect(countingItem(graded, { count: 3, fruit: 'pear' }, config)?.difficulty).toBe(-2.18);
    expect(countingItem(graded, { count: 13, fruit: 'pear' }, config)?.difficulty).toBe(-1.48);
    const missing = TenFrameBondsTemplate.parse({
      ...bonds,
      difficulty: { base: -1.6, perMissing: 0.08, largeMissing: 0.2, largeMissingFrom: 6 },
    });
    expect(bondsItem(missing, { shown: 9, fruit: 'pear' }, config)?.difficulty).toBe(-1.52);
    expect(bondsItem(missing, { shown: 3, fruit: 'pear' }, config)?.difficulty).toBe(-0.84);
  });

  it('makes no item from features outside the trays, or a fruit the template does not have', () => {
    expect(countingItem(counting, { count: 21, fruit: 'pear' }, config)).toBeUndefined();
    expect(countingItem(counting, { count: 3, fruit: 'kiwi' }, config)).toBeUndefined();
    expect(bondsItem(bonds, { shown: 10, fruit: 'pear' }, config)).toBeUndefined();
    expect(makeTenItem(makeTen, { first: 4, second: 5, fruit: 'pear' }, config)).toBeUndefined();
  });

  it('gives every level items that fit it, every fruit for every number', () => {
    expect(levelItems(counting, 2, config)).toHaveLength(5 * fruits.length);
    const sums = levelItems(makeTen, 0, config).map((item) =>
      item.type === 'numeric' && item.answer.kind === 'decimal' ? item.answer.value : 0,
    );
    expect(Math.min(...sums)).toBeGreaterThan(10);
    expect(Math.max(...sums)).toBeLessThanOrEqual(20);
  });

  it('rebuilds an item from its ID alone, and nothing from an ID no template makes', () => {
    for (const id of [
      'ten-frame-counting-13-pear',
      'ten-frame-bonds-10-6-lemon',
      'ten-frame-make-ten-8-plus-5-pear',
    ]) {
      expect(itemFromId(TEMPLATES, id)?.id).toBe(id);
    }
    for (const id of [
      'ten-frame-counting-0-pear',
      'ten-frame-counting-13-kiwi',
      'ten-frame-bonds-10-12-apple',
      'ten-frame-make-ten-4-plus-5-pear',
      'ten-frame-make-ten-8-pear',
      'ten-frame-counting-8-plus-5-pear',
    ]) {
      expect(itemFromId(TEMPLATES, id)).toBeUndefined();
    }
  });

  it('gives each level its typical difficulty, and makes items as a session asks', () => {
    const maker = templateMaker(makeTen);
    makeTen.levels.forEach((_, level) => {
      const items = levelItems(makeTen, level, config);
      const average = items.reduce((sum, item) => sum + item.difficulty, 0) / items.length;
      expect(maker.levelDifficulty[level]).toBeCloseTo(average, 10);
    });
    const first = maker.make(1, 42, new Set());
    expect(maker.make(1, 42, new Set())).toEqual(first);
    expect(generateItem(makeTen, 1, 42)).toEqual(first);
    expect(maker.make(1, 42, new Set([first.id])).id).not.toBe(first.id);
  });

  describe('properties of every item of every level', () => {
    const everyItem = TEMPLATES.flatMap((template) =>
      template.levels.flatMap((_, level) => levelItems(template, level, config)),
    );

    it('are valid, distinct, right on their answer, and rebuilt exactly from their IDs', () => {
      // Levels may share items; within a level, every item is its own.
      for (const template of TEMPLATES) {
        template.levels.forEach((_, level) => {
          const ids = levelItems(template, level, config).map((item) => item.id);
          expect(new Set(ids).size).toBe(ids.length);
        });
      }
      for (const item of everyItem) {
        expect(Item.parse(item)).toEqual(item);
        expect(itemFromId(TEMPLATES, item.id)).toEqual(item);
        if (item.type !== 'numeric' || item.answer.kind !== 'decimal') throw new Error(item.id);
        expect(answered(item, item.answer.value).correct).toBe(true);
      }
    });

    it('name the misconception for each wrong answer they list, and none for others', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...everyItem),
          fc.integer({ min: 0, max: 25 }),
          (item, value) => {
            if (item.type !== 'numeric' || item.answer.kind !== 'decimal') return;
            const result = answered(item, value);
            const listed = item.misconceptions?.find((mistake) => mistake.answer === value);
            if (value === item.answer.value) expect(result.correct).toBe(true);
            else
              expect(result).toEqual({
                correct: false,
                score: 0,
                ...(listed ? { misconceptionId: listed.misconceptionId } : {}),
              });
          },
        ),
        { numRuns: 500 },
      );
    });
  });
});
