import { describe, expect, it } from 'vitest';
import { Item, ItemResponse } from './items';
import { problems } from './testing';

const base = { skillIds: ['add-within-20'], difficulty: 0.4 };

const valid = {
  choice: {
    ...base,
    id: 'seven-times-three',
    type: 'choice',
    options: [
      { id: 'a', label: { en: '21' } },
      { id: 'b', label: { en: '10' }, misconceptionId: 'adds-instead-of-multiplying' },
    ],
    correctOptionIds: ['a'],
    multiple: false,
  },
  numeric: {
    ...base,
    id: 'half-of-ten',
    type: 'numeric',
    answer: { kind: 'fraction', numerator: 1, denominator: 2 },
    acceptEquivalentFractions: true,
  },
  placementLine: {
    ...base,
    id: 'hop-to-14',
    type: 'placement',
    surface: { kind: 'line', min: 0, max: 20, target: 14, tolerance: 0.5 },
  },
  placementGrid: {
    ...base,
    id: 'plant-row-2',
    type: 'placement',
    surface: { kind: 'grid', rows: 3, columns: 4, target: { row: 1, column: 3 } },
  },
  match: {
    ...base,
    id: 'match-bonds',
    type: 'match-sort',
    task: {
      mode: 'match',
      left: [
        { id: 'l3', label: { en: '3' } },
        { id: 'l6', label: { en: '6' } },
      ],
      right: [
        { id: 'r7', label: { en: '7' } },
        { id: 'r4', label: { en: '4' } },
      ],
      pairs: [
        { leftId: 'l3', rightId: 'r7' },
        { leftId: 'l6', rightId: 'r4' },
      ],
    },
    partialCredit: true,
  },
  sort: {
    ...base,
    id: 'odd-or-even',
    type: 'match-sort',
    task: {
      mode: 'sort',
      cards: [
        { id: 'c3', label: { en: '3' } },
        { id: 'c4', label: { en: '4' } },
      ],
      buckets: [
        { id: 'odd', label: { en: 'Odd' } },
        { id: 'even', label: { en: 'Even' } },
      ],
      placements: [
        { cardId: 'c3', bucketId: 'odd' },
        { cardId: 'c4', bucketId: 'even' },
      ],
    },
    partialCredit: false,
  },
  sequence: {
    ...base,
    id: 'count-up',
    type: 'sequence',
    elements: [
      { id: 'one', label: { en: '1' } },
      { id: 'two', label: { en: '2' } },
      { id: 'three', image: 'three-apples' },
    ],
    correctOrder: ['one', 'two', 'three'],
    scoring: 'positional',
  },
  buildSpell: {
    ...base,
    id: 'spell-colour',
    type: 'build-spell',
    tiles: ['c', 'o', 'l', 'o', 'u', 'r'].map((text, index) => ({ id: `t${String(index)}`, text })),
    accepted: ['colour'],
    locale: 'en-GB',
  },
  audioChoice: {
    ...base,
    id: 'find-the-s-sound',
    type: 'audio-choice',
    promptAudio: 'sound-s',
    options: [
      { id: 'sun', image: 'sun' },
      { id: 'moon', image: 'moon', audio: 'word-moon' },
    ],
    correctOptionId: 'sun',
  },
  program: {
    ...base,
    id: 'robot-to-flag',
    type: 'program',
    world: {
      columns: 4,
      rows: 4,
      start: { column: 0, row: 0, facing: 'east' },
      goal: { column: 3, row: 0 },
      walls: [{ column: 1, row: 1 }],
    },
    allowedCommands: ['forward', 'turn-left', 'turn-right', 'repeat'],
    maxInstructions: 6,
  },
};

describe('Item', () => {
  it.each(Object.entries(valid))('accepts a valid %s item', (_name, item) => {
    expect(problems(Item, item)).toEqual([]);
  });

  it('rejects an unknown item type', () => {
    expect(problems(Item, { ...valid.choice, type: 'essay' })[0]?.path).toBe('type');
  });

  it('needs at least one skill', () => {
    expect(problems(Item, { ...valid.numeric, skillIds: [] })).toEqual([
      { path: 'skillIds', message: 'An item assesses at least one skill' },
    ]);
  });

  describe('choice', () => {
    it('has exactly one correct option unless it is multiple choice', () => {
      expect(problems(Item, { ...valid.choice, correctOptionIds: ['a', 'b'] })).toContainEqual({
        path: 'correctOptionIds',
        message: 'A single-choice item has exactly one correct option',
      });
    });

    it('points at a correct option that does not exist', () => {
      expect(problems(Item, { ...valid.choice, correctOptionIds: ['z'] })).toEqual([
        { path: 'correctOptionIds.0', message: 'Unknown option z' },
      ]);
    });

    it('puts misconceptions on wrong options only', () => {
      expect(problems(Item, { ...valid.choice, correctOptionIds: ['b'] })).toEqual([
        { path: 'options.1.misconceptionId', message: 'Only wrong options carry a misconception' },
      ]);
    });

    it('needs a label or an image on every option', () => {
      expect(
        problems(Item, {
          ...valid.choice,
          options: [{ id: 'a' }, { id: 'b', label: { en: '10' } }],
        }),
      ).toEqual([{ path: 'options.0', message: 'Give a label, an image or both' }]);
    });
  });

  it('numeric: a fraction needs a positive denominator', () => {
    expect(
      problems(Item, {
        ...valid.numeric,
        answer: { kind: 'fraction', numerator: 1, denominator: 0 },
      }),
    ).toEqual([{ path: 'answer.denominator', message: 'A denominator must be positive' }]);
  });

  it('numeric: tolerance and equivalent fractions have defaults', () => {
    const parsed = Item.parse({ ...valid.numeric, acceptEquivalentFractions: undefined });
    expect(parsed).toMatchObject({ tolerance: 0, acceptEquivalentFractions: false });
  });

  describe('numeric with a ten-frame scene (ADR 0037)', () => {
    const tray = (task: string, trays: number[], answer: number) => ({
      ...base,
      id: `ten-frame-${task}`,
      type: 'numeric',
      answer: { kind: 'decimal', value: answer },
      scene: { kind: 'ten-frame', task, trays, fruit: 'pear' },
    });

    it('accepts each task with an answer that fits it', () => {
      expect(problems(Item, tray('fill-to', [0, 0], 13))).toEqual([]);
      expect(problems(Item, tray('fill-up', [6], 4))).toEqual([]);
      expect(problems(Item, tray('make-ten', [8, 5], 13))).toEqual([]);
    });

    it('fill-to: the trays start empty, and the answer fits in them', () => {
      expect(problems(Item, tray('fill-to', [2], 7))).toEqual([
        { path: 'scene.trays', message: 'The trays start empty' },
      ]);
      expect(problems(Item, tray('fill-to', [0], 13))).toEqual([
        { path: 'answer', message: 'The answer must fit in the trays' },
      ]);
    });

    it('fill-up: one tray, not yet full, and the answer is what fills it', () => {
      expect(problems(Item, tray('fill-up', [6, 0], 4))).toEqual([
        { path: 'scene.trays', message: 'One tray, not yet full' },
      ]);
      expect(problems(Item, tray('fill-up', [6], 6))).toEqual([
        { path: 'answer', message: 'The answer is what fills the tray' },
      ]);
    });

    it('make-ten: two trays whose parts make more than ten, and the answer is the total', () => {
      expect(problems(Item, tray('make-ten', [8], 13))).toEqual([
        { path: 'scene.trays', message: 'Two trays with fruit, the first not yet full' },
      ]);
      expect(problems(Item, tray('make-ten', [4, 5], 9))).toEqual([
        { path: 'scene.trays', message: 'The parts make more than ten' },
      ]);
      expect(problems(Item, tray('make-ten', [8, 5], 15))).toEqual([
        { path: 'answer', message: 'The answer is the total' },
      ]);
    });

    it('wants a whole number for its answer', () => {
      expect(
        problems(Item, {
          ...tray('fill-to', [0], 3),
          answer: { kind: 'fraction', numerator: 1, denominator: 2 },
        }),
      ).toEqual([{ path: 'answer', message: 'A ten-frame answer is a whole number' }]);
    });
  });

  describe('numeric with a field scene (ADR 0038)', () => {
    const field = (task: string, rows: number, rowLength: number, answer: number) => ({
      ...base,
      id: `field-${task}`,
      type: 'numeric',
      answer: { kind: 'decimal', value: answer },
      scene: { kind: 'field', task, rows, rowLength, crop: 'carrot' },
    });

    it('accepts equal groups and arrays whose answer is the rows times their length', () => {
      expect(problems(Item, field('equal-groups', 3, 4, 12))).toEqual([]);
      expect(problems(Item, field('array', 3, 5, 15))).toEqual([]);
    });

    it('refuses any other answer, or one that is not whole', () => {
      expect(problems(Item, field('equal-groups', 3, 4, 7))).toEqual([
        { path: 'answer', message: 'The answer is the rows times their length' },
      ]);
      expect(
        problems(Item, {
          ...field('array', 2, 2, 4),
          answer: { kind: 'fraction', numerator: 1, denominator: 2 },
        }),
      ).toEqual([{ path: 'answer', message: 'A field answer is a whole number' }]);
    });

    it('keeps rows and their length between 1 and 10', () => {
      expect(problems(Item, field('array', 11, 2, 22))).toHaveLength(1);
      expect(problems(Item, field('array', 2, 0, 0))).toHaveLength(1);
    });
  });

  it('numeric: a misconception is a wrong answer, one misconception each', () => {
    const fillUp = {
      ...base,
      id: 'fill-the-tray',
      type: 'numeric',
      answer: { kind: 'decimal', value: 4 },
      misconceptions: [
        { answer: 6, misconceptionId: 'gives-the-part' },
        { answer: 10, misconceptionId: 'counts-all' },
      ],
    };
    expect(problems(Item, fillUp)).toEqual([]);
    expect(
      problems(Item, {
        ...fillUp,
        misconceptions: [
          { answer: 4, misconceptionId: 'gives-the-part' },
          { answer: 10, misconceptionId: 'counts-all' },
          { answer: 10, misconceptionId: 'stops-at-ten' },
        ],
      }),
    ).toEqual([
      { path: 'misconceptions.0.answer', message: 'A right answer is not a misconception' },
      { path: 'misconceptions.2.answer', message: 'Each answer points to one misconception' },
    ]);
  });

  it('placement: the target must be on the line or grid', () => {
    expect(
      problems(Item, {
        ...valid.placementLine,
        surface: { ...valid.placementLine.surface, target: 25 },
      }),
    ).toEqual([{ path: 'surface.target', message: 'The target is off the line' }]);
    expect(
      problems(Item, {
        ...valid.placementGrid,
        surface: { ...valid.placementGrid.surface, target: { row: 3, column: 0 } },
      }),
    ).toEqual([{ path: 'surface.target', message: 'The target is off the grid' }]);
  });

  describe('placement on a line (ADR 0015)', () => {
    const line = (surface: Record<string, unknown>) => ({
      ...valid.placementLine,
      surface: { ...valid.placementLine.surface, tolerance: 0, ...surface },
    });

    it('labels every number and maps no misconceptions unless it says so', () => {
      const parsed = Item.parse(valid.placementLine);
      if (parsed.type !== 'placement' || parsed.surface.kind !== 'line') {
        throw new Error('Expected a line placement');
      }
      expect(parsed.surface.labelEvery).toBe(1);
      expect(parsed.surface.misconceptions).toEqual([]);
    });

    it('takes a start, landmark labels and misconceptions at wrong positions', () => {
      expect(
        problems(
          Item,
          line({
            start: 3,
            target: 7,
            labelEvery: 5,
            misconceptions: [
              { position: 6, misconceptionId: 'counts-the-start' },
              { position: 8, misconceptionId: 'extra-hop' },
            ],
          }),
        ),
      ).toEqual([]);
    });

    it('keeps the start and every misconception on the line', () => {
      expect(
        problems(
          Item,
          line({ start: -1, misconceptions: [{ position: 21, misconceptionId: 'extra-hop' }] }),
        ),
      ).toEqual([
        { path: 'surface.start', message: 'The start is off the line' },
        { path: 'surface.misconceptions.0.position', message: 'The position is off the line' },
      ]);
    });

    it('never maps a right answer, or one position twice', () => {
      expect(
        problems(
          Item,
          line({
            target: 7,
            tolerance: 0.5,
            misconceptions: [
              { position: 7.5, misconceptionId: 'extra-hop' },
              { position: 6, misconceptionId: 'counts-the-start' },
              { position: 6, misconceptionId: 'hops-backwards' },
            ],
          }),
        ),
      ).toEqual([
        {
          path: 'surface.misconceptions.0.position',
          message: 'A right answer is not a misconception',
        },
        {
          path: 'surface.misconceptions.2.position',
          message: 'Each position points to one misconception',
        },
      ]);
    });

    it('labels at a whole-number gap of at least 1', () => {
      expect(problems(Item, line({ labelEvery: 0 }))).toHaveLength(1);
      expect(problems(Item, line({ labelEvery: 2.5 }))).toHaveLength(1);
    });
  });

  it('match-sort: pairs and placements refer to real cards, once each', () => {
    expect(
      problems(Item, {
        ...valid.match,
        task: { ...valid.match.task, pairs: [{ leftId: 'l3', rightId: 'r9' }] },
      }),
    ).toEqual([{ path: 'task.pairs.0', message: 'Unknown right card r9' }]);
    expect(
      problems(Item, {
        ...valid.sort,
        task: {
          ...valid.sort.task,
          placements: [
            { cardId: 'c3', bucketId: 'odd' },
            { cardId: 'c3', bucketId: 'even' },
          ],
        },
      }),
    ).toEqual([{ path: 'task.placements.1', message: 'Card c3 appears more than once' }]);
  });

  it('sequence: the correct order lists every element once', () => {
    expect(problems(Item, { ...valid.sequence, correctOrder: ['one', 'two', 'two'] })).toEqual([
      { path: 'correctOrder', message: 'correctOrder must list every element exactly once' },
    ]);
  });

  it('audio-choice: the correct option must exist', () => {
    expect(problems(Item, { ...valid.audioChoice, correctOptionId: 'star' })).toEqual([
      { path: 'correctOptionId', message: 'Unknown option star' },
    ]);
  });

  it('program: start, goal and walls stay inside the world', () => {
    expect(
      problems(Item, {
        ...valid.program,
        world: { ...valid.program.world, walls: [{ column: 4, row: 0 }] },
      }),
    ).toEqual([{ path: 'world.walls.0', message: 'walls.0 is outside the world' }]);
  });
});

describe('ItemResponse', () => {
  const responses = {
    choice: { type: 'choice', optionIds: ['a'] },
    numeric: { type: 'numeric', value: { kind: 'decimal', value: 0.5 } },
    placement: { type: 'placement', at: { kind: 'line', position: 14 } },
    matchSort: {
      type: 'match-sort',
      answer: { mode: 'sort', placements: [{ cardId: 'c3', bucketId: 'odd' }] },
    },
    sequence: { type: 'sequence', order: ['one', 'two', 'three'] },
    buildSpell: { type: 'build-spell', tileIds: ['t0', 't1'] },
    audioChoice: { type: 'audio-choice', optionId: 'sun' },
    program: {
      type: 'program',
      instructions: [{ op: 'repeat', times: 3, body: [{ op: 'forward' }] }, { op: 'turn-left' }],
    },
  };

  it.each(Object.entries(responses))('accepts a %s answer', (_name, response) => {
    expect(problems(ItemResponse, response)).toEqual([]);
  });

  it('program: a repeat runs at least twice and has a body', () => {
    expect(
      problems(ItemResponse, {
        type: 'program',
        instructions: [{ op: 'repeat', times: 1, body: [] }],
      }).map((problem) => problem.path),
    ).toEqual(['instructions.0.times', 'instructions.0.body']);
  });

  it('program: rejects an instruction outside the command set', () => {
    expect(
      problems(ItemResponse, { type: 'program', instructions: [{ op: 'jump' }] })[0]?.path,
    ).toBe('instructions.0.op');
  });
});
