import {
  Item,
  NumberLineAdditionTemplate,
  type ItemResponse,
  type PlacementItem,
} from '@learnofun/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { grade } from './graders';
import {
  additionCandidates,
  additionItem,
  additionItemId,
  generateItem,
  generateItems,
  itemFromId,
  rampLevels,
  templateMaker,
} from './templates';

/** The Hop Line template, as in the mock catalog (ADR 0015). */
const template = NumberLineAdditionTemplate.parse({
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
  levels: [
    { minSum: 2, maxSum: 10, minHops: 1, maxHops: 3, crossesTen: 'never', labelEvery: 1 },
    { minSum: 5, maxSum: 10, minHops: 4, maxHops: 9, crossesTen: 'never', labelEvery: 1 },
    { minSum: 11, maxSum: 20, minHops: 1, maxHops: 3, crossesTen: 'never', labelEvery: 1 },
    { minSum: 11, maxSum: 20, minHops: 4, maxHops: 9, crossesTen: 'never', labelEvery: 1 },
    { minSum: 11, maxSum: 20, minHops: 2, maxHops: 9, crossesTen: 'always', labelEvery: 1 },
    { minSum: 11, maxSum: 20, minHops: 2, maxHops: 9, crossesTen: 'always', labelEvery: 5 },
  ],
});

/** The line of a generated item: every one is a placement on a line. */
function lineOf(item: Item): Extract<PlacementItem['surface'], { kind: 'line' }> {
  if (item.type !== 'placement' || item.surface.kind !== 'line') {
    throw new Error(`${item.id} is not a line placement`);
  }
  return item.surface;
}

const land = (item: Item, position: number) =>
  grade(item, { type: 'placement', at: { kind: 'line', position } } satisfies ItemResponse);

describe('additionItem', () => {
  it('builds 3 + 4: start, answer, skills, difficulty and every wrong landing the brief names', () => {
    const item = additionItem(template, { start: 3, hops: 4, labelEvery: 1 });

    expect(item.id).toBe('hop-line-addition-3-plus-4');
    expect(item.skillIds).toEqual(['add-within-10', 'add-within-20']);
    expect(item.difficulty).toBeCloseTo(-0.9);
    expect(lineOf(item)).toEqual({
      kind: 'line',
      min: 0,
      max: 20,
      start: 3,
      target: 7,
      tolerance: 0,
      labelEvery: 1,
      misconceptions: [
        { position: 0, misconceptionId: 'hops-backwards' },
        { position: 1, misconceptionId: 'hops-backwards' },
        { position: 2, misconceptionId: 'hops-backwards' },
        { position: 4, misconceptionId: 'goes-to-the-number' },
        { position: 6, misconceptionId: 'counts-the-start' },
        { position: 8, misconceptionId: 'extra-hop' },
      ],
    });
  });

  it('leaves out a position two misconceptions would share', () => {
    // 3 + 1: going to 1 is also a backwards hop, so 1 points to neither.
    const positions = lineOf(
      additionItem(template, { start: 3, hops: 1, labelEvery: 1 }),
    ).misconceptions;

    expect(positions).toEqual([
      { position: 0, misconceptionId: 'hops-backwards' },
      { position: 2, misconceptionId: 'hops-backwards' },
      { position: 3, misconceptionId: 'counts-the-start' },
      { position: 5, misconceptionId: 'extra-hop' },
    ]);
  });

  it('keeps two decimal places of difficulty, or as many as the config says', () => {
    const features = { start: 11, hops: 4, labelEvery: 1 };
    // -1.2 + 0.4 + 0.3 is -0.49999999999999994 in floating point.
    expect(additionItem(template, features).difficulty).toBe(-0.5);
    expect(additionItem(template, features, { difficultyDecimals: 0 }).difficulty).toBe(-0);
  });

  it('adds up every feature into the difficulty, and names landmark labels in the ID', () => {
    const item = additionItem(template, { start: 8, hops: 5, labelEvery: 5 });

    expect(item.id).toBe('hop-line-addition-8-plus-5-every-5');
    expect(item.skillIds).toEqual(['add-within-20']);
    // Base, a sum above 10, 5 hops, crossing 10 and landmarks only.
    expect(item.difficulty).toBeCloseTo(-1.2 + 0.4 + 0.3 + 0.4 + 0.4);
    expect(lineOf(item).labelEvery).toBe(5);
  });

  it('never maps the answer itself, or a number past the line', () => {
    // 19 + 1: one hop too many would be 21, off the line.
    const positions = lineOf(
      additionItem(template, { start: 19, hops: 1, labelEvery: 1 }),
    ).misconceptions.map(({ position }) => position);

    expect(positions).not.toContain(20);
    expect(positions).not.toContain(21);
    expect(positions).toContain(19);
  });
});

describe('additionCandidates', () => {
  it('offers items at every level, each with the level’s features', () => {
    template.levels.forEach((level) => {
      const candidates = additionCandidates(template, level);
      expect(candidates.length).toBeGreaterThan(0);
      for (const { start, hops } of candidates) {
        const sum = start + hops;
        expect(sum).toBeGreaterThanOrEqual(level.minSum);
        expect(sum).toBeLessThanOrEqual(level.maxSum);
        expect(hops).toBeGreaterThanOrEqual(level.minHops);
        expect(hops).toBeLessThanOrEqual(level.maxHops);
        if (level.crossesTen === 'always') expect(start < 10 && sum > 10).toBe(true);
        if (level.crossesTen === 'never') expect(start < 10 && sum > 10).toBe(false);
      }
    });
  });

  it('never starts on the line’s first number, where the answer would be the second number', () => {
    for (const level of template.levels) {
      expect(additionCandidates(template, level).map(({ start }) => start)).not.toContain(0);
    }
  });

  it('gives every candidate its own ID', () => {
    const ids = template.levels.flatMap((level) =>
      additionCandidates(template, level).map((features) => additionItemId(template, features)),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('generateItem and generateItems', () => {
  it('make a session with one item per level and no repeats, replayed exactly from its seed', () => {
    const levels = rampLevels(template, 6);
    const session = generateItems(template, levels, 2026);

    expect(session).toEqual(generateItems(template, levels, 2026));
    expect(new Set(session.map((item) => item.id)).size).toBe(6);
    expect(session.map((item) => lineOf(item).labelEvery)).toEqual([1, 1, 1, 1, 1, 5]);
  });

  it('draw other items from another seed', () => {
    const levels = rampLevels(template, 6);
    const ids = (seed: number) => generateItems(template, levels, seed).map((item) => item.id);

    expect(ids(1)).not.toEqual(ids(2));
  });

  it('repeat an item only once a level has nothing else left', () => {
    const tiny = NumberLineAdditionTemplate.parse({
      ...template,
      levels: [
        { minSum: 2, maxSum: 2, minHops: 1, maxHops: 1, crossesTen: 'never', labelEvery: 1 },
      ],
    });

    expect(generateItems(tiny, [0, 0], 7).map((item) => item.id)).toEqual([
      'hop-line-addition-1-plus-1',
      'hop-line-addition-1-plus-1',
    ]);
  });

  it('refuse a level the template does not have, or one that allows no items', () => {
    expect(() => generateItem(template, 6, 1)).toThrow('hop-line-addition has levels 0 to 5');
    const empty = NumberLineAdditionTemplate.parse({
      ...template,
      levels: [
        { minSum: 3, maxSum: 4, minHops: 9, maxHops: 9, crossesTen: 'never', labelEvery: 1 },
      ],
    });
    expect(() => generateItem(empty, 0, 1)).toThrow('Level 0 of hop-line-addition allows no items');
  });
});

describe('itemFromId', () => {
  it('rebuilds an item from an ID its template makes, and nothing else', () => {
    const item = additionItem(template, { start: 5, hops: 3, labelEvery: 1 });
    expect(itemFromId([template], item.id)).toEqual(item);
    expect(itemFromId([template], `${template.id}-5-plus-3-every-1`)).toBeUndefined();
    expect(itemFromId([template], `${template.id}-five-plus-3`)).toBeUndefined();
    expect(itemFromId([template], 'script-1-item-1')).toBeUndefined();
    expect(itemFromId([], item.id)).toBeUndefined();
  });
});

describe('rampLevels', () => {
  it('spreads a session evenly from the easiest level to the hardest', () => {
    expect(rampLevels(template, 6)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(rampLevels(template, 3)).toEqual([0, 2, 4]);
    expect(rampLevels(template, 4)).toEqual([0, 1, 3, 4]);
    expect(rampLevels(template, 12)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
    expect(rampLevels(template, 0)).toEqual([]);
  });
});

describe('generated items, for any seed and level (property tests)', () => {
  /** A thousand random seeds per property, rather than fast-check's default hundred. */
  const runs = { numRuns: 1000 };
  const seeds = fc.integer({ min: 0, max: 2 ** 32 - 1 });
  const levels = fc.integer({ min: 0, max: template.levels.length - 1 });

  it('are valid items whose answer fits the level and sits on the line', () => {
    fc.assert(
      fc.property(seeds, levels, (seed, levelIndex) => {
        const item = generateItem(template, levelIndex, seed);
        const level = template.levels[levelIndex];
        const line = lineOf(item);
        expect(Item.safeParse(item).success).toBe(true);
        expect(line.target).toBeGreaterThanOrEqual(level?.minSum ?? Number.NaN);
        expect(line.target).toBeLessThanOrEqual(level?.maxSum ?? Number.NaN);
        expect(line.start).toBeGreaterThan(line.min);
        expect(line.labelEvery).toBe(level?.labelEvery);
      }),
      runs,
    );
  });

  it('rebuild exactly from their ID alone, as the server grades answers again (ADR 0028)', () => {
    fc.assert(
      fc.property(seeds, levels, (seed, level) => {
        const item = generateItem(template, level, seed);
        expect(itemFromId([template], item.id)).toEqual(item);
      }),
      runs,
    );
  });

  it('rebuild exactly from their seed, and from the features their ID names', () => {
    fc.assert(
      fc.property(seeds, levels, (seed, level) => {
        const item = generateItem(template, level, seed);
        const line = lineOf(item);
        const start = line.start ?? Number.NaN;
        expect(generateItem(template, level, seed)).toEqual(item);
        expect(
          additionItem(template, { start, hops: line.target - start, labelEvery: line.labelEvery }),
        ).toEqual(item);
      }),
      runs,
    );
  });

  it('grade the answer right, and each mapped wrong landing as its misconception', () => {
    fc.assert(
      fc.property(seeds, levels, (seed, level) => {
        const item = generateItem(template, level, seed);
        const line = lineOf(item);
        expect(land(item, line.target)).toEqual({ correct: true, score: 1 });
        for (const { position, misconceptionId } of line.misconceptions) {
          expect(position).not.toBe(line.target);
          expect(land(item, position)).toEqual({ correct: false, score: 0, misconceptionId });
        }
      }),
      runs,
    );
  });

  it('never put the same item twice in a session while the level has others', () => {
    fc.assert(
      fc.property(seeds, fc.integer({ min: 1, max: 12 }), (seed, length) => {
        const session = generateItems(template, rampLevels(template, length), seed);
        expect(new Set(session.map((item) => item.id)).size).toBe(session.length);
      }),
      runs,
    );
  });
});

describe('templateMaker (ADR 0032)', () => {
  const maker = templateMaker(template);

  it('gives each level its typical difficulty: the average over every item the level allows', () => {
    expect(maker.levelDifficulty).toHaveLength(template.levels.length);
    template.levels.forEach((level, index) => {
      const difficulties = additionCandidates(template, level).map(
        (features) => additionItem(template, features).difficulty,
      );
      const average = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
      expect(maker.levelDifficulty[index]).toBeCloseTo(average, 10);
    });
    // Hop Line's levels get harder in order.
    for (let level = 1; level < template.levels.length; level += 1) {
      expect(maker.levelDifficulty[level]).toBeGreaterThan(maker.levelDifficulty[level - 1] ?? 0);
    }
  });

  it('makes the same item from the same level and seed, and never one the session has', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: template.levels.length - 1 }),
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        (level, seed) => {
          const item = maker.make(level, seed, new Set());
          expect(maker.make(level, seed, new Set())).toEqual(item);
          expect(item).toEqual(generateItem(template, level, seed));
          expect(maker.make(level, seed, new Set([item.id])).id).not.toBe(item.id);
        },
      ),
    );
  });
});
