import { Item, ItemResponse, type Instruction } from '@learnofun/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_GRADER_CONFIG, grade } from './graders';

const base = { skillIds: ['add-within-20'], difficulty: 0 };
const item = (value: unknown) => Item.parse({ ...base, ...(value as object) });
const answer = (value: unknown) => ItemResponse.parse(value);

const choice = item({
  id: 'seven-times-three',
  type: 'choice',
  options: [
    { id: 'a', label: { en: '21' } },
    { id: 'b', label: { en: '10' }, misconceptionId: 'adds-instead-of-multiplying' },
    { id: 'c', label: { en: '73' } },
  ],
  correctOptionIds: ['a'],
  multiple: false,
});

describe('grade: choice', () => {
  it('marks the correct option right', () => {
    expect(grade(choice, answer({ type: 'choice', optionIds: ['a'] }))).toEqual({
      correct: true,
      score: 1,
    });
  });

  it('names the misconception behind a wrong option', () => {
    expect(grade(choice, answer({ type: 'choice', optionIds: ['b'] }))).toEqual({
      correct: false,
      score: 0,
      misconceptionId: 'adds-instead-of-multiplying',
    });
    expect(grade(choice, answer({ type: 'choice', optionIds: ['c'] }))).toEqual({
      correct: false,
      score: 0,
    });
  });

  it('needs exactly the correct set for multiple choice', () => {
    const multiple = item({
      ...choice,
      multiple: true,
      correctOptionIds: ['a', 'c'],
      options:
        choice.type === 'choice' ? choice.options.map(({ id, label }) => ({ id, label })) : [],
    });
    expect(grade(multiple, answer({ type: 'choice', optionIds: ['c', 'a'] })).correct).toBe(true);
    expect(grade(multiple, answer({ type: 'choice', optionIds: ['a'] })).correct).toBe(false);
    expect(grade(multiple, answer({ type: 'choice', optionIds: ['a', 'b', 'c'] })).correct).toBe(
      false,
    );
  });
});

describe('grade: audio-choice', () => {
  const audio = item({
    id: 'find-the-s-sound',
    type: 'audio-choice',
    promptAudio: 'sound-s',
    options: [
      { id: 'sun', image: 'sun' },
      { id: 'moon', image: 'moon' },
    ],
    correctOptionId: 'sun',
  });

  it('marks the spoken answer right or wrong', () => {
    expect(grade(audio, answer({ type: 'audio-choice', optionId: 'sun' })).correct).toBe(true);
    expect(grade(audio, answer({ type: 'audio-choice', optionId: 'moon' })).correct).toBe(false);
  });
});

describe('grade: numeric', () => {
  const decimal = (value: number, tolerance = 0) =>
    item({ id: 'n', type: 'numeric', answer: { kind: 'decimal', value }, tolerance });
  const fraction = (numerator: number, denominator: number, acceptEquivalentFractions = false) =>
    item({
      id: 'f',
      type: 'numeric',
      answer: { kind: 'fraction', numerator, denominator },
      acceptEquivalentFractions,
    });
  const said = (value: number) => answer({ type: 'numeric', value: { kind: 'decimal', value } });
  const saidFraction = (numerator: number, denominator: number) =>
    answer({ type: 'numeric', value: { kind: 'fraction', numerator, denominator } });

  it('needs the exact number when there is no tolerance', () => {
    expect(grade(decimal(14), said(14)).correct).toBe(true);
    expect(grade(decimal(14), said(15)).correct).toBe(false);
  });

  it('allows the tolerance, without floating-point surprises', () => {
    expect(grade(decimal(0.3, 0.05), said(0.35)).correct).toBe(true);
    expect(grade(decimal(0.3), said(0.1 + 0.2)).correct).toBe(true);
    expect(grade(decimal(0.3, 0.05), said(0.36)).correct).toBe(false);
  });

  it('accepts a fraction that equals a decimal answer', () => {
    expect(grade(decimal(0.5), saidFraction(1, 2)).correct).toBe(true);
  });

  it('accepts equivalent fractions only where the item allows', () => {
    expect(grade(fraction(1, 2), saidFraction(1, 2)).correct).toBe(true);
    expect(grade(fraction(1, 2), saidFraction(2, 4)).correct).toBe(false);
    expect(grade(fraction(1, 2, true), saidFraction(2, 4)).correct).toBe(true);
    expect(grade(fraction(1, 2, true), saidFraction(2, 3)).correct).toBe(false);
  });

  it('wants a fraction for a fraction answer', () => {
    expect(grade(fraction(1, 2, true), said(0.5)).correct).toBe(false);
  });
});

describe('grade: placement', () => {
  const line = item({
    id: 'hop-to-14',
    type: 'placement',
    surface: { kind: 'line', min: 0, max: 20, target: 14, tolerance: 0.5 },
  });
  const grid = item({
    id: 'plant-row-2',
    type: 'placement',
    surface: { kind: 'grid', rows: 3, columns: 4, target: { row: 1, column: 3 } },
  });

  it('accepts a position within the tolerance of the target', () => {
    expect(
      grade(line, answer({ type: 'placement', at: { kind: 'line', position: 14.5 } })).correct,
    ).toBe(true);
    expect(
      grade(line, answer({ type: 'placement', at: { kind: 'line', position: 13.4 } })).correct,
    ).toBe(false);
  });

  it('needs the exact grid cell', () => {
    expect(
      grade(grid, answer({ type: 'placement', at: { kind: 'grid', row: 1, column: 3 } })).correct,
    ).toBe(true);
    expect(
      grade(grid, answer({ type: 'placement', at: { kind: 'grid', row: 3, column: 1 } })).correct,
    ).toBe(false);
  });

  it('names the misconception a wrong landing points to, and never for a right one', () => {
    const hop = item({
      id: 'hop-line-addition-3-plus-4',
      type: 'placement',
      surface: {
        kind: 'line',
        min: 0,
        max: 20,
        start: 3,
        target: 7,
        tolerance: 0,
        misconceptions: [
          { position: 6, misconceptionId: 'counts-the-start' },
          { position: 8, misconceptionId: 'extra-hop' },
        ],
      },
    });
    const land = (position: number) =>
      grade(hop, answer({ type: 'placement', at: { kind: 'line', position } }));

    expect(land(6)).toEqual({ correct: false, score: 0, misconceptionId: 'counts-the-start' });
    expect(land(8)).toEqual({ correct: false, score: 0, misconceptionId: 'extra-hop' });
    expect(land(12)).toEqual({ correct: false, score: 0 });
    expect(land(7)).toEqual({ correct: true, score: 1 });
  });

  it('marks a line answer to a grid item wrong', () => {
    expect(
      grade(grid, answer({ type: 'placement', at: { kind: 'line', position: 1 } })).correct,
    ).toBe(false);
  });
});

describe('grade', () => {
  it('marks an answer for another item type wrong', () => {
    expect(grade(choice, answer({ type: 'audio-choice', optionId: 'a' }))).toEqual({
      correct: false,
      score: 0,
    });
  });
});

const right = { correct: true, score: 1 };
const wrong = { correct: false, score: 0 };

describe('grade: match-sort (ADR 0030)', () => {
  const part = (id: string) => ({ id, label: { en: id } });
  const match = (partialCredit: boolean) =>
    item({
      id: 'match-doubles',
      type: 'match-sort',
      partialCredit,
      task: {
        mode: 'match',
        left: ['one', 'two', 'three'].map(part),
        right: ['two-r', 'four-r', 'six-r'].map(part),
        pairs: [
          { leftId: 'one', rightId: 'two-r' },
          { leftId: 'two', rightId: 'four-r' },
          { leftId: 'three', rightId: 'six-r' },
        ],
      },
    });
  const pairs = (...list: [string, string][]) =>
    answer({
      type: 'match-sort',
      answer: { mode: 'match', pairs: list.map(([leftId, rightId]) => ({ leftId, rightId })) },
    });

  it('is right only with exactly the item’s pairs, in any order', () => {
    expect(
      grade(match(true), pairs(['three', 'six-r'], ['one', 'two-r'], ['two', 'four-r'])),
    ).toEqual(right);
  });

  it('gives the share of pairs right as partial credit, where the item allows', () => {
    const twoOfThree = pairs(['one', 'two-r'], ['two', 'four-r'], ['three', 'two-r']);
    expect(grade(match(true), twoOfThree)).toEqual({ correct: false, score: 2 / 3 });
    expect(grade(match(false), twoOfThree)).toEqual(wrong);
  });

  it('is never right with a pair missing or an extra one', () => {
    expect(grade(match(true), pairs(['one', 'two-r'], ['two', 'four-r']))).toEqual({
      correct: false,
      score: 2 / 3,
    });
    expect(
      grade(
        match(true),
        pairs(['one', 'two-r'], ['two', 'four-r'], ['three', 'six-r'], ['one', 'six-r']),
      ).correct,
    ).toBe(false);
  });

  it('sorts cards into buckets, and a sort answer to a match item is wrong', () => {
    const sort = item({
      id: 'odd-even',
      type: 'match-sort',
      partialCredit: true,
      task: {
        mode: 'sort',
        cards: ['c1', 'c2', 'c3', 'c4'].map(part),
        buckets: ['odd', 'even'].map(part),
        placements: [
          { cardId: 'c1', bucketId: 'odd' },
          { cardId: 'c2', bucketId: 'even' },
          { cardId: 'c3', bucketId: 'odd' },
          { cardId: 'c4', bucketId: 'even' },
        ],
      },
    });
    const placed = (...list: [string, string][]) =>
      answer({
        type: 'match-sort',
        answer: {
          mode: 'sort',
          placements: list.map(([cardId, bucketId]) => ({ cardId, bucketId })),
        },
      });
    expect(
      grade(sort, placed(['c1', 'odd'], ['c2', 'even'], ['c3', 'odd'], ['c4', 'even'])),
    ).toEqual(right);
    expect(
      grade(sort, placed(['c1', 'odd'], ['c2', 'odd'], ['c3', 'odd'], ['c4', 'even'])),
    ).toEqual({ correct: false, score: 3 / 4 });
    expect(grade(match(true), placed(['one', 'odd']))).toEqual(wrong);
  });
});

describe('grade: sequence (ADR 0030)', () => {
  const sequence = (scoring: 'positional' | 'adjacency') =>
    item({
      id: 'count-on',
      type: 'sequence',
      elements: ['a', 'b', 'c', 'd'].map((id) => ({ id, label: { en: id } })),
      correctOrder: ['a', 'b', 'c', 'd'],
      scoring,
    });
  const order = (...ids: string[]) => answer({ type: 'sequence', order: ids });

  it('is right only in exactly the right order', () => {
    expect(grade(sequence('positional'), order('a', 'b', 'c', 'd'))).toEqual(right);
    expect(grade(sequence('positional'), order('a', 'b', 'd', 'c')).correct).toBe(false);
  });

  it('scores the share of elements in their place, by position', () => {
    // a and b are in place; c and d are swapped.
    expect(grade(sequence('positional'), order('a', 'b', 'd', 'c'))).toEqual({
      correct: false,
      score: 2 / 4,
    });
  });

  it('scores the share of neighbouring pairs kept, by adjacency', () => {
    // Shifted by one: every element out of place, but b>c and c>d kept of the three pairs.
    expect(grade(sequence('adjacency'), order('d', 'a', 'b', 'c'))).toEqual({
      correct: false,
      score: 2 / 3,
    });
    expect(grade(sequence('positional'), order('d', 'a', 'b', 'c')).score).toBe(0);
  });

  it('scores 0 for an answer that leaves an element out or names one twice', () => {
    expect(grade(sequence('positional'), order('a', 'b', 'c'))).toEqual(wrong);
    expect(grade(sequence('adjacency'), order('a', 'b', 'c', 'c'))).toEqual(wrong);
    expect(grade(sequence('positional'), order('a', 'b', 'c', 'x'))).toEqual(wrong);
  });

  it('always scores between 0 and 1, right only at 1 (property)', () => {
    const ids = ['a', 'b', 'c', 'd'];
    fc.assert(
      fc.property(
        fc.shuffledSubarray(ids, { minLength: 1, maxLength: 4 }),
        fc.constantFrom<'positional' | 'adjacency'>('positional', 'adjacency'),
        (shuffled, scoring) => {
          const result = grade(sequence(scoring), order(...shuffled));
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(1);
          expect(result.correct).toBe(result.score === 1);
        },
      ),
      { numRuns: 500 },
    );
  });
});

describe('grade: build-spell (ADR 0030)', () => {
  const spell = item({
    id: 'spell-colour',
    type: 'build-spell',
    locale: 'en',
    tiles: [
      { id: 'c', text: 'c' },
      { id: 'o1', text: 'o' },
      { id: 'l', text: 'l' },
      { id: 'o2', text: 'o' },
      { id: 'u', text: 'u' },
      { id: 'r', text: 'r' },
    ],
    accepted: ['colour', 'color'],
  });
  const tiles = (...ids: string[]) => answer({ type: 'build-spell', tileIds: ids });

  it('accepts every spelling the item lists', () => {
    expect(grade(spell, tiles('c', 'o1', 'l', 'o2', 'u', 'r'))).toEqual(right);
    expect(grade(spell, tiles('c', 'o2', 'l', 'o1', 'r'))).toEqual(right);
  });

  it('marks other words, unknown tiles and a tile used twice wrong', () => {
    expect(grade(spell, tiles('c', 'o1', 'l', 'r'))).toEqual(wrong);
    expect(grade(spell, tiles('c', 'o1', 'l', 'o2', 'x', 'r'))).toEqual(wrong);
    expect(grade(spell, tiles('c', 'o1', 'l', 'o1', 'r'))).toEqual(wrong);
  });

  it('counts capitals, and compares after Unicode normalisation', () => {
    const cafe = item({
      id: 'spell-cafe',
      type: 'build-spell',
      locale: 'en',
      // "é" as one character in the list, and as e plus a combining accent on the tile.
      tiles: [
        { id: 'c', text: 'c' },
        { id: 'big-c', text: 'C' },
        { id: 'a', text: 'a' },
        { id: 'f', text: 'f' },
        { id: 'e', text: 'e\u0301' },
      ],
      accepted: ['caf\u00e9'],
    });
    expect(grade(cafe, tiles('c', 'a', 'f', 'e'))).toEqual(right);
    expect(grade(cafe, tiles('big-c', 'a', 'f', 'e'))).toEqual(wrong);
  });
});

describe('grade: program (ADR 0030)', () => {
  // A 4 by 3 world: start at the left of the middle row facing east, goal at its right end,
  // and a wall in the top row.
  const program = (overrides: Record<string, unknown> = {}) =>
    item({
      id: 'robot-to-goal',
      type: 'program',
      world: {
        columns: 4,
        rows: 3,
        start: { column: 0, row: 1, facing: 'east' },
        goal: { column: 3, row: 1 },
        walls: [{ column: 1, row: 0 }],
      },
      allowedCommands: ['forward', 'turn-left', 'turn-right', 'repeat'],
      maxInstructions: 6,
      ...overrides,
    });
  const forward: Instruction = { op: 'forward' };
  const run = (...instructions: Instruction[]) => answer({ type: 'program', instructions });

  it('is right when the robot ends on the goal', () => {
    expect(grade(program(), run(forward, forward, forward))).toEqual(right);
    expect(grade(program(), run({ op: 'repeat', times: 3, body: [forward] }))).toEqual(right);
  });

  it('is wrong when it ends anywhere else, even having passed the goal', () => {
    expect(grade(program(), run(forward, forward))).toEqual(wrong);
    const there = program({ world: { ...worldOf(program()), columns: 5 } });
    expect(grade(there, run(forward, forward, forward, forward))).toEqual(wrong);
  });

  it('ends the run, wrong, at a wall or the edge of the grid', () => {
    // Turning left faces north: the top row's wall is in the way after one step east.
    expect(grade(program(), run(forward, { op: 'turn-left' }, forward))).toEqual(wrong);
    // Off the grid to the south, then back up and on to the goal: the bump already ended it.
    expect(
      grade(
        program({ maxInstructions: 10 }),
        run(
          { op: 'turn-right' },
          forward,
          forward,
          { op: 'turn-left' },
          { op: 'turn-left' },
          forward,
          { op: 'turn-right' },
          forward,
          forward,
          forward,
        ),
      ),
    ).toEqual(wrong);
  });

  it('uses only the allowed commands, within the limit, counting repeats and their bodies', () => {
    const noRepeat = program({ allowedCommands: ['forward', 'turn-left', 'turn-right'] });
    expect(grade(noRepeat, run({ op: 'repeat', times: 3, body: [forward] }))).toEqual(wrong);
    // A repeat with three in its body is four instructions: over a limit of three.
    expect(
      grade(
        program({ maxInstructions: 3 }),
        run({ op: 'repeat', times: 2, body: [forward, { op: 'turn-left' }, { op: 'turn-right' }] }),
      ),
    ).toEqual(wrong);
  });

  it('stops a program that would run too long', () => {
    const spin: Instruction = {
      op: 'repeat',
      times: 10,
      body: [
        {
          op: 'repeat',
          times: 10,
          body: [{ op: 'repeat', times: 10, body: [{ op: 'turn-left' }] }],
        },
      ],
    };
    expect(grade(program({ maxInstructions: 10 }), run(spin, forward, forward, forward))).toEqual(
      wrong,
    );
    expect(
      grade(program({ maxInstructions: 10 }), run(spin, forward, forward, forward), {
        ...DEFAULT_GRADER_CONFIG,
        maxProgramSteps: 10_000,
      }),
    ).toEqual(right);
  });

  it('always ends, for any program (property)', () => {
    const instruction: fc.Arbitrary<Instruction> = fc.letrec<{ instruction: Instruction }>(
      (tie) => ({
        instruction: fc.oneof(
          { depthSize: 'small', withCrossShrink: true },
          fc.constant<Instruction>({ op: 'forward' }),
          fc.constant<Instruction>({ op: 'turn-left' }),
          fc.constant<Instruction>({ op: 'turn-right' }),
          fc.record({
            op: fc.constant('repeat' as const),
            times: fc.integer({ min: 2, max: 10 }),
            body: fc.array(tie('instruction'), { minLength: 1, maxLength: 3 }),
          }),
        ),
      }),
    ).instruction;
    fc.assert(
      fc.property(fc.array(instruction, { minLength: 1, maxLength: 6 }), (instructions) => {
        const result = grade(program({ maxInstructions: 50 }), run(...instructions));
        expect([0, 1]).toContain(result.score);
      }),
      { numRuns: 500 },
    );
  });
});

function worldOf(programItem: Item) {
  if (programItem.type !== 'program') throw new Error('Not a program item');
  return programItem.world;
}
