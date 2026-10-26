import type { Item, LearningEvent, NumericItem } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  answerWeight,
  DEFAULT_EVIDENCE_CONFIG,
  noEvidence,
  observations,
  skillEvidence,
  type WeighedAnswer,
} from './evidence';
import { corePlan } from './plan';
import { createPlaceholderPolicy } from './policy';
import { seedRandom } from './random';
import { createSessionEngine, type EngineResult } from './session';

const engine = createSessionEngine(createPlaceholderPolicy());
const START = Date.UTC(2026, 9, 20, 15, 0);

const item = (id: string, skillId: string, answer: number): NumericItem => ({
  id,
  type: 'numeric',
  skillIds: [skillId],
  difficulty: 0,
  answer: { kind: 'decimal', value: answer },
  tolerance: 0,
  acceptEquivalentFractions: false,
});

/** How a child takes one item: answers right or wrong in turn, a hint first, or a skip. */
type Turn = readonly boolean[] | 'hint-then-right' | 'skip';

/** Plays one session through the real engine, returning its events. */
function play(items: readonly NumericItem[], turns: readonly Turn[], seed = 1): LearningEvent[] {
  let now = START + seed * 86_400_000;
  const tick = () => (now += 10_000);
  let result: EngineResult = engine.start(
    {
      childId: '0192f4c1-0000-7000-8000-00000000c001',
      activityId: 'hop-line-add-within-20',
      gameId: 'hop-line',
      gameVersion: '0.1.0',
      contentRelease: 'test',
      mode: 'practice',
    },
    items,
    seedRandom(seed),
    now,
    corePlan(items.length),
  );
  const events = [...result.events];
  turns.forEach((turn, index) => {
    const current = items[index];
    if (!current || result.step.kind !== 'present') throw new Error('No item to take');
    const answer = (right: boolean) => ({
      type: 'numeric' as const,
      value: {
        kind: 'decimal' as const,
        value: current.answer.kind === 'decimal' ? current.answer.value + (right ? 0 : 1) : 0,
      },
    });
    if (turn === 'skip') {
      result = engine.skip(result.state, tick());
      events.push(...result.events);
      return;
    }
    const answers = turn === 'hint-then-right' ? [true] : turn;
    if (turn === 'hint-then-right') {
      const hinted = engine.requestHint(result.state, tick());
      result = { ...result, state: hinted.state };
      events.push(...hinted.events);
    }
    for (const right of answers) {
      result = engine.respond(result.state, answer(right), tick());
      events.push(...result.events);
    }
    result = engine.advance(result.state, tick());
    events.push(...result.events);
  });
  return events;
}

const lookup = (items: readonly Item[]) => (id: string) => items.find((i) => i.id === id);

describe('skillEvidence (ADR 0028)', () => {
  it('counts first-try answers per skill, graded again', () => {
    const items = [item('a-1', 'count-to-20', 3), item('a-2', 'count-to-20', 4)];
    const events = play(items, [[true], [false, true]]);

    expect(skillEvidence(events, lookup(items)).get('count-to-20')).toEqual({
      skillId: 'count-to-20',
      firstTries: 2,
      firstTriesCorrect: 1,
      items: 2,
      sessions: 1,
      fullWeight: 2,
      fullWeightItems: 2,
      weight: 2,
      earlySignal: true,
    });
  });

  it('leaves out retries, answers after a hint the child asked for, and skips', () => {
    const items = [
      item('b-1', 'add-within-10', 1),
      item('b-2', 'add-within-10', 2),
      item('b-3', 'add-within-10', 3),
    ];
    const events = play(items, [[false, false, true], 'hint-then-right', 'skip']);

    expect(skillEvidence(events, lookup(items)).get('add-within-10')).toMatchObject({
      firstTries: 1,
      firstTriesCorrect: 0,
    });
  });

  it('grades answers itself: the device has no say', () => {
    const items = [item('c-1', 'count-to-20', 3)];
    const events = play(items, [[true]]);
    // The same answer, against an item whose answer differs, is wrong.
    const other = [item('c-1', 'count-to-20', 9)];

    expect(skillEvidence(events, lookup(other)).get('count-to-20')?.firstTriesCorrect).toBe(0);
  });

  it('leaves out answers to items it cannot find', () => {
    const items = [item('d-1', 'count-to-20', 3)];

    expect(skillEvidence(play(items, [[true]]), () => undefined).size).toBe(0);
  });

  it('is early signal below 8 first tries on 6 items (plan 4.1), across sessions', () => {
    const minimum = DEFAULT_EVIDENCE_CONFIG.minFullWeight;
    const session = (seed: number, count: number) => {
      const items = Array.from({ length: count }, (_, i) =>
        item(`e-${String(seed)}-${String(i)}`, 'add-within-20', i + 1),
      );
      return {
        items,
        events: play(
          items,
          items.map(() => [true]),
          seed,
        ),
      };
    };
    const first = session(1, minimum - 3);
    const second = session(2, 3);
    const all = [...first.items, ...second.items];

    expect(skillEvidence(first.events, lookup(all)).get('add-within-20')?.earlySignal).toBe(true);
    expect(
      skillEvidence([...first.events, ...second.events], lookup(all)).get('add-within-20'),
    ).toMatchObject({ firstTries: minimum, items: minimum, sessions: 2, earlySignal: false });
  });

  it('needs different items, not the same one again and again', () => {
    const items = [item('f-1', 'count-to-20', 3)];
    const events = Array.from({ length: 8 }, (_, seed) => play(items, [[true]], seed + 1)).flat();

    expect(skillEvidence(events, lookup(items)).get('count-to-20')).toMatchObject({
      firstTries: 8,
      items: 1,
      sessions: 8,
      earlySignal: true,
    });
  });

  it('takes another minimum from its config', () => {
    const items = [item('g-1', 'count-to-20', 3), item('g-2', 'count-to-20', 4)];
    const events = play(items, [[true], [true]]);

    expect(
      skillEvidence(events, lookup(items), {
        ...DEFAULT_EVIDENCE_CONFIG,
        minFullWeight: 2,
        minItems: 2,
      }).get('count-to-20')?.earlySignal,
    ).toBe(false);
  });

  it('starts every skill at nothing, an early signal', () => {
    expect(noEvidence('arrays')).toEqual({
      skillId: 'arrays',
      firstTries: 0,
      firstTriesCorrect: 0,
      items: 0,
      sessions: 0,
      fullWeight: 0,
      fullWeightItems: 0,
      weight: 0,
      earlySignal: true,
    });
  });
});

const answerOf = (overrides: Partial<WeighedAnswer> = {}): WeighedAnswer => ({
  attempt: 1,
  helped: false,
  correct: true,
  role: 'target',
  seenRecently: false,
  towardTarget: false,
  ...overrides,
});

describe('answerWeight: plan 5.3, row by row (ADR 0030)', () => {
  it('weighs a first answer with no help, on a fresh item, fully, right or wrong', () => {
    expect(answerWeight(answerOf())).toBe(1);
    expect(answerWeight(answerOf({ correct: false }))).toBe(1);
  });

  it('weighs a first answer after a hint at 0.5 if right and 1.0 if wrong', () => {
    expect(answerWeight(answerOf({ helped: true }))).toBe(0.5);
    expect(answerWeight(answerOf({ helped: true, correct: false }))).toBe(1);
  });

  it('gives a second or later answer no weight', () => {
    expect(answerWeight(answerOf({ attempt: 2 }))).toBe(0);
    expect(answerWeight(answerOf({ attempt: 3, correct: false }))).toBe(0);
  });

  it('weighs a planned re-ask and an item seen in the last 14 days at 0.3', () => {
    expect(answerWeight(answerOf({ role: 're-ask' }))).toBe(0.3);
    expect(answerWeight(answerOf({ seenRecently: true }))).toBe(0.3);
  });

  it('gives a scaffold item no weight toward the target, and its own toward its skill', () => {
    expect(answerWeight(answerOf({ role: 'scaffold', towardTarget: true }))).toBe(0);
    expect(answerWeight(answerOf({ role: 'scaffold' }))).toBe(1);
  });

  it('takes the smallest weight when several rules apply', () => {
    expect(answerWeight(answerOf({ role: 're-ask', helped: true }))).toBe(0.3);
    expect(answerWeight(answerOf({ seenRecently: true, helped: true }))).toBe(0.3);
    expect(answerWeight(answerOf({ seenRecently: true, attempt: 2 }))).toBe(0);
  });

  it('takes its weights from config', () => {
    const weights = { ...DEFAULT_EVIDENCE_CONFIG.weights, reAsk: 0.2 };
    expect(answerWeight(answerOf({ role: 're-ask' }), weights)).toBe(0.2);
  });

  it('always weighs between 0 and 1 (property)', () => {
    fc.assert(
      fc.property(
        fc.record({
          attempt: fc.integer({ min: 1, max: 3 }),
          helped: fc.boolean(),
          correct: fc.boolean(),
          role: fc.constantFrom<WeighedAnswer['role']>(
            'target',
            'scaffold',
            'bridge',
            'review',
            're-ask',
            'warm-up',
            'ending',
          ),
          seenRecently: fc.boolean(),
          towardTarget: fc.boolean(),
        }),
        (answer) => {
          const weight = answerWeight(answer);
          expect(weight).toBeGreaterThanOrEqual(0);
          expect(weight).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

describe('observations: weighted answers from the events (ADR 0030)', () => {
  it('moves only on the first attempt: wrong twice then right weighs 1, 0 and 0 (plan 5.3)', () => {
    const items = [item('h-1', 'add-within-10', 4)];
    const weights = observations(play(items, [[false, false, true]]), {
      itemOf: lookup(items),
    }).map((o) => o.weight);
    expect(weights).toEqual([1, 0, 0]);
  });

  it('weighs an item seen in an earlier session within 14 days at 0.3, and fully after', () => {
    const items = [item('i-1', 'add-within-10', 4)];
    const first = play(items, [[true]], 1);
    const soon = play(items, [[true]], 2);
    const later = play(items, [[true]], 20);
    const weightsOf = (events: typeof first) =>
      observations(events, { itemOf: lookup(items) }).map((o) => o.weight);

    expect(weightsOf([...first, ...soon])).toEqual([1, 0.3]);
    expect(weightsOf([...first, ...later])).toEqual([1, 1]);
  });

  it('gives a scaffold item no weight toward the session’s target skill', () => {
    const items = [item('j-1', 'count-to-20', 4)];
    const events = play(items, [[true]]).map((event) =>
      event.type === 'item_presented' ? { ...event, role: 'scaffold' as const } : event,
    );
    const toward = (targets: string[]) =>
      observations(events, { itemOf: lookup(items), targetSkillsOf: () => targets }).map(
        (o) => o.weight,
      );

    expect(toward(['add-within-20'])).toEqual([1]);
    expect(toward(['count-to-20'])).toEqual([0]);
  });
});

describe('repeats and later attempts never add evidence (property, ADR 0030)', () => {
  const turn = fc.constantFrom<Turn>(
    [true],
    [false, true],
    [false, false, true],
    [false, false, false],
    'hint-then-right',
    'skip',
  );
  const itemsFor = (count: number) =>
    Array.from({ length: count }, (_, i) => item(`p-${String(i)}`, 'add-within-20', i + 1));
  const totals = (events: LearningEvent[], items: NumericItem[]) => {
    const evidence = skillEvidence(events, lookup(items)).get('add-within-20');
    return { fullWeight: evidence?.fullWeight ?? 0, weight: evidence?.weight ?? 0 };
  };

  it('later attempts: leaving them out of a session never changes its evidence', () => {
    fc.assert(
      fc.property(fc.array(turn, { minLength: 1, maxLength: 8 }), (turns) => {
        const items = itemsFor(turns.length);
        const events = play(items, turns);
        const firstAnswersOnly = events.filter(
          (event) => event.type !== 'response_submitted' || event.attempt === 1,
        );
        expect(totals(firstAnswersOnly, items)).toEqual(totals(events, items));
      }),
      { numRuns: 200 },
    );
  });

  it('repeats: the same items again within 14 days add no full-weight evidence, and 0.3 at most each', () => {
    fc.assert(
      fc.property(
        fc.array(turn, { minLength: 1, maxLength: 8 }),
        fc.array(turn, { minLength: 1, maxLength: 8 }),
        fc.integer({ min: 2, max: 14 }),
        (firstTurns, againTurns, day) => {
          // The second session shows only items the first one showed: every one is a repeat.
          const items = itemsFor(firstTurns.length);
          const turnsAgain = againTurns.slice(0, firstTurns.length);
          const first = play(items, firstTurns, 1);
          const again = play(items.slice(0, turnsAgain.length), turnsAgain, day);
          const before = totals(first, items);
          const after = totals([...first, ...again], items);
          const answers = again.filter((e) => e.type === 'response_submitted').length;

          expect(after.fullWeight).toBe(before.fullWeight);
          expect(after.weight - before.weight).toBeLessThanOrEqual(answers * 0.3 + 1e-9);
        },
      ),
      { numRuns: 200 },
    );
  });
});
