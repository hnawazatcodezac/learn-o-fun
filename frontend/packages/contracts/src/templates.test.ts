import { describe, expect, it } from 'vitest';
import { ItemTemplate, ItemTemplates } from './templates';
import { problems } from './testing';

const level = {
  minSum: 2,
  maxSum: 10,
  minHops: 1,
  maxHops: 3,
  crossesTen: 'never',
  labelEvery: 1,
};

const template = {
  id: 'hop-line-addition',
  generator: 'number-line-addition',
  line: { min: 0, max: 20 },
  skillIds: ['add-within-20'],
  skillIdsWithinTen: ['add-within-10', 'add-within-20'],
  difficulty: {
    base: -1.2,
    sumAboveTen: 0.4,
    largeHops: 0.3,
    largeHopsFrom: 4,
    crossesTen: 0.4,
    landmarksOnly: 0.4,
  },
  misconceptions: {
    countsTheStart: 'counts-the-start',
    extraHop: 'extra-hop',
    goesToTheNumber: 'goes-to-the-number',
    hopsBackwards: 'hops-backwards',
  },
  levels: [level],
};

describe('ItemTemplate', () => {
  it('accepts a number-line addition template', () => {
    expect(problems(ItemTemplate, template)).toEqual([]);
  });

  it('rejects an unknown generator', () => {
    expect(problems(ItemTemplate, { ...template, generator: 'magic' })).toHaveLength(1);
  });

  it('needs at least one level, each with its ranges the right way round', () => {
    expect(problems(ItemTemplate, { ...template, levels: [] })).toHaveLength(1);
    expect(
      problems(ItemTemplate, { ...template, levels: [{ ...level, minSum: 11, minHops: 4 }] }),
    ).toEqual([
      { path: 'levels.0.minSum', message: 'minSum is above maxSum' },
      { path: 'levels.0.minHops', message: 'minHops is above maxHops' },
    ]);
  });

  describe('the ten-frame templates (ADR 0037)', () => {
    const fruits = ['apple', 'pear'];
    const counting = {
      id: 'ten-frame-counting',
      generator: 'ten-frame-fill-to',
      skillIds: ['count-to-20'],
      fruits,
      difficulty: { base: -1.8, perFruit: 0, aboveTen: 0.5 },
      misconceptions: { countsOneTwice: 'counts-one-twice' },
      levels: [{ min: 3, max: 10 }],
    };
    const bonds = {
      id: 'ten-frame-bonds-10',
      generator: 'ten-frame-fill-up',
      skillIds: ['number-bonds-to-10'],
      fruits,
      difficulty: { base: -1.2, perMissing: 0, largeMissing: 0.4, largeMissingFrom: 5 },
      misconceptions: { givesThePart: 'gives-the-part', countsAll: 'counts-all' },
      levels: [{ minShown: 5, maxShown: 9 }],
    };
    const makeTen = {
      id: 'ten-frame-make-ten',
      generator: 'ten-frame-make-ten',
      skillIds: ['make-ten-to-add', 'add-within-20'],
      fruits,
      difficulty: { base: 0, farFromTen: 0.3, farFrom: 3, aboveFifteen: 0.3 },
      misconceptions: { stopsAtTen: 'stops-at-ten', countsMovedTwice: 'counts-moved-twice' },
      levels: [{ minFirst: 7, maxFirst: 9, minSecond: 3, maxSecond: 6 }],
    };

    it('accepts counting, bonds to 10 and making ten', () => {
      expect(problems(ItemTemplate, counting)).toEqual([]);
      expect(problems(ItemTemplate, bonds)).toEqual([]);
      expect(problems(ItemTemplate, makeTen)).toEqual([]);
    });

    it('keeps each level’s ranges the right way round, and within the trays', () => {
      expect(problems(ItemTemplate, { ...counting, levels: [{ min: 12, max: 8 }] })).toEqual([
        { path: 'levels.0.min', message: 'min is above max' },
      ]);
      expect(problems(ItemTemplate, { ...counting, levels: [{ min: 3, max: 21 }] })).toHaveLength(
        1,
      );
      expect(problems(ItemTemplate, { ...bonds, levels: [{ minShown: 8, maxShown: 6 }] })).toEqual([
        { path: 'levels.0.minShown', message: 'minShown is above maxShown' },
      ]);
    });

    it('making ten: some two parts make more than ten', () => {
      expect(
        problems(ItemTemplate, {
          ...makeTen,
          levels: [{ minFirst: 2, maxFirst: 4, minSecond: 2, maxSecond: 5 }],
        }),
      ).toEqual([{ path: 'levels.0.maxSecond', message: 'No two parts make more than ten' }]);
    });
  });

  describe('the field templates (ADR 0038)', () => {
    const field = {
      id: 'tile-farm-groups',
      generator: 'field-equal-groups',
      skillIds: ['equal-groups', 'repeated-addition'],
      crops: ['carrot', 'cabbage'],
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
      levels: [{ minRows: 2, maxRows: 3, rowLengths: [2, 5, 10] }],
    };

    it('accepts equal groups and arrays', () => {
      expect(problems(ItemTemplate, field)).toEqual([]);
      expect(problems(ItemTemplate, { ...field, generator: 'field-array' })).toEqual([]);
    });

    it('lets rows of some lengths count for times-table skills too, each length once', () => {
      const timesTables = { rowLengths: [2, 5, 10], skillIds: ['multiply-by-2-5-10'] };
      expect(problems(ItemTemplate, { ...field, generator: 'field-array', timesTables })).toEqual(
        [],
      );
      expect(
        problems(ItemTemplate, { ...field, timesTables: { ...timesTables, rowLengths: [5, 5] } }),
      ).toEqual([
        { path: 'timesTables.rowLengths.1', message: 'Row length 5 appears more than once' },
      ]);
    });

    it('keeps each level’s rows the right way round, and its row lengths distinct', () => {
      expect(
        problems(ItemTemplate, {
          ...field,
          levels: [{ minRows: 4, maxRows: 2, rowLengths: [3, 3] }],
        }),
      ).toEqual([
        { path: 'levels.0.minRows', message: 'minRows is above maxRows' },
        { path: 'levels.0.rowLengths.1', message: 'Row length 3 appears more than once' },
      ]);
    });
  });

  it('keeps every level’s sums on the line', () => {
    expect(problems(ItemTemplate, { ...template, levels: [{ ...level, maxSum: 30 }] })).toEqual([
      { path: 'levels.0.maxSum', message: 'The largest sum is off the line' },
    ]);
  });

  it('starts large hops at 2 or more, and needs a line that goes up', () => {
    expect(
      problems(ItemTemplate, {
        ...template,
        line: { min: 5, max: 5 },
        difficulty: { ...template.difficulty, largeHopsFrom: 1 },
      }),
    ).toEqual(expect.arrayContaining([{ path: 'line.max', message: 'max must be above min' }]));
    expect(
      problems(ItemTemplate, {
        ...template,
        difficulty: { ...template.difficulty, largeHopsFrom: 1 },
      }),
    ).toHaveLength(1);
  });

  it('gives every template in a list its own ID', () => {
    expect(problems(ItemTemplates, [template, template])).toEqual([
      { path: '1', message: 'Item template hop-line-addition appears more than once' },
    ]);
  });
});
