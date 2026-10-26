import {
  FieldArrayTemplate,
  FieldEqualGroupsTemplate,
  Item,
  type ItemTemplate,
} from '@learnofun/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fieldItem } from './field';
import { grade } from './graders';
import {
  DEFAULT_GENERATOR_CONFIG,
  generateItem,
  itemFromId,
  levelItems,
  templateMaker,
} from './templates';

const config = DEFAULT_GENERATOR_CONFIG;
const shape = {
  skillIds: ['equal-groups', 'repeated-addition'],
  crops: ['carrot', 'cabbage', 'sunflower'],
  difficulty: {
    base: -0.6,
    perRow: 0.05,
    perTen: 0.1,
    awkwardLength: 0.3,
    easyLengths: [2, 5, 10],
  },
  misconceptions: {
    addsTheNumbers: 'adds-the-numbers',
    countsOneRow: 'counts-one-row',
    countsTheRows: 'counts-the-rows',
    skipsARow: 'skips-a-row',
  },
  levels: [
    { minRows: 1, maxRows: 3, rowLengths: [2, 5, 10] },
    { minRows: 2, maxRows: 4, rowLengths: [3, 4] },
    { minRows: 4, maxRows: 6, rowLengths: [3, 4, 5] },
  ],
};
/** Tile Farm's two templates (ADR 0038). */
const groups = FieldEqualGroupsTemplate.parse({
  ...shape,
  id: 'tile-farm-groups',
  generator: 'field-equal-groups',
});
const arrays = FieldArrayTemplate.parse({
  ...shape,
  id: 'tile-farm-arrays',
  generator: 'field-array',
  skillIds: ['arrays'],
  timesTables: { rowLengths: [2, 5, 10], skillIds: ['multiply-by-2-5-10'] },
});
const TEMPLATES: ItemTemplate[] = [groups, arrays];

const answered = (item: Item, value: number) =>
  grade(item, { type: 'numeric', value: { kind: 'decimal', value } });

describe('the field generators (the Tile Farm brief, ADR 0038)', () => {
  it('equal groups: the rows named, the plants in all, and the four mistakes', () => {
    expect(fieldItem(groups, { rows: 3, rowLength: 4, crop: 'carrot' }, config)).toEqual({
      id: 'tile-farm-groups-3-rows-of-4-carrot',
      type: 'numeric',
      skillIds: ['equal-groups', 'repeated-addition'],
      // The base, 3 rows, 12 plants, and rows of 4, which are awkward.
      difficulty: -0.03,
      answer: { kind: 'decimal', value: 12 },
      tolerance: 0,
      acceptEquivalentFractions: false,
      scene: { kind: 'field', task: 'equal-groups', rows: 3, rowLength: 4, crop: 'carrot' },
      misconceptions: [
        { answer: 3, misconceptionId: 'counts-the-rows' },
        { answer: 4, misconceptionId: 'counts-one-row' },
        { answer: 7, misconceptionId: 'adds-the-numbers' },
        { answer: 8, misconceptionId: 'skips-a-row' },
        { answer: 16, misconceptionId: 'skips-a-row' },
      ],
    });
  });

  it('leaves out an answer two mistakes share, the right answer, and a count of nothing', () => {
    // 2 rows of 2: adding gives the answer, and one row, the rows and a row short are all 2.
    expect(fieldItem(groups, { rows: 2, rowLength: 2, crop: 'carrot' }, config)).toMatchObject({
      skillIds: ['equal-groups', 'repeated-addition'],
      difficulty: -0.46,
      misconceptions: [{ answer: 6, misconceptionId: 'skips-a-row' }],
    });
    // 1 row of 5: one row is the answer, and a row short is nothing.
    expect(fieldItem(groups, { rows: 1, rowLength: 5, crop: 'carrot' }, config)).toMatchObject({
      misconceptions: [
        { answer: 1, misconceptionId: 'counts-the-rows' },
        { answer: 6, misconceptionId: 'adds-the-numbers' },
        { answer: 10, misconceptionId: 'skips-a-row' },
      ],
    });
  });

  it('arrays: the same field with its outline drawn, for their own skills', () => {
    expect(fieldItem(arrays, { rows: 3, rowLength: 5, crop: 'sunflower' }, config)).toMatchObject({
      id: 'tile-farm-arrays-3-rows-of-5-sunflower',
      skillIds: ['arrays', 'multiply-by-2-5-10'],
      answer: { value: 15 },
      scene: { kind: 'field', task: 'array', rows: 3, rowLength: 5 },
    });
  });

  it('counts rows of 2, 5 and 10 for the times tables too, and rows of 3 or 4 as arrays alone', () => {
    const skillsOf = (template: typeof arrays, rowLength: number) =>
      fieldItem(template, { rows: 3, rowLength, crop: 'carrot' }, config)?.skillIds;
    expect(skillsOf(arrays, 10)).toEqual(['arrays', 'multiply-by-2-5-10']);
    expect(skillsOf(arrays, 4)).toEqual(['arrays']);
    // A times-table skill the template names already is listed once.
    const both = FieldArrayTemplate.parse({
      ...arrays,
      skillIds: ['arrays', 'multiply-by-2-5-10'],
    });
    expect(skillsOf(both, 5)).toEqual(['arrays', 'multiply-by-2-5-10']);
  });

  it('makes no item from a crop the template lacks, or rows outside the field', () => {
    expect(fieldItem(groups, { rows: 3, rowLength: 4, crop: 'potato' }, config)).toBeUndefined();
    expect(fieldItem(groups, { rows: 11, rowLength: 4, crop: 'carrot' }, config)).toBeUndefined();
    expect(fieldItem(groups, { rows: 0, rowLength: 4, crop: 'carrot' }, config)).toBeUndefined();
  });

  it('rebuilds an item from its ID alone, and nothing from an ID no template makes', () => {
    for (const id of [
      'tile-farm-groups-3-rows-of-4-carrot',
      'tile-farm-arrays-6-rows-of-5-cabbage',
    ]) {
      expect(itemFromId(TEMPLATES, id)?.id).toBe(id);
    }
    for (const id of [
      'tile-farm-groups-3-rows-of-4-potato',
      'tile-farm-groups-11-rows-of-4-carrot',
      'tile-farm-groups-3-carrot',
      'tile-farm-arrays-3-plus-4-carrot',
    ]) {
      expect(itemFromId(TEMPLATES, id)).toBeUndefined();
    }
  });

  it('gives each level its typical difficulty, and makes items as a session asks', () => {
    const maker = templateMaker(arrays);
    arrays.levels.forEach((_, level) => {
      const items = levelItems(arrays, level, config);
      const average = items.reduce((sum, item) => sum + item.difficulty, 0) / items.length;
      expect(maker.levelDifficulty[level]).toBeCloseTo(average, 10);
    });
    // Rows of 2, 5 and 10 in the first level are easier than rows of 3 and 4 in the second.
    expect(maker.levelDifficulty[0]).toBeLessThan(maker.levelDifficulty[1] ?? -Infinity);
    expect(maker.levelDifficulty[1]).toBeLessThan(maker.levelDifficulty[2] ?? -Infinity);
    const first = maker.make(2, 42, new Set());
    expect(maker.make(2, 42, new Set())).toEqual(first);
    expect(generateItem(arrays, 2, 42)).toEqual(first);
    expect(maker.make(2, 42, new Set([first.id])).id).not.toBe(first.id);
  });

  describe('properties of every item of every level', () => {
    const everyItem = TEMPLATES.flatMap((template) =>
      template.levels.flatMap((_, level) => levelItems(template, level, config)),
    );

    it('are valid, right on their answer, and rebuilt exactly from their IDs', () => {
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
          fc.integer({ min: 0, max: 80 }),
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
