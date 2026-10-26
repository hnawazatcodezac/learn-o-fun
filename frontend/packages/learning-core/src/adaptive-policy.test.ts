import {
  SESSION_REASONS,
  type ItemRole,
  type Mode,
  type NumericItem,
  type SessionReason,
} from '@learnofun/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  ADAPTIVE_POLICY_VERSION,
  createAdaptivePolicy,
  DEFAULT_ADAPTIVE_CONFIG,
  easyLevel,
  levelForZone,
  zoneFor,
} from './adaptive-policy';
import { corePlan, SESSION_PLANS, type SessionPlan } from './plan';
import { createPlaceholderPolicy, type FinishedItem, type PolicyView } from './policy';
import { seedRandom } from './random';
import { createSessionEngine, type EngineResult, type ItemMaker } from './session';

const policy = createAdaptivePolicy({ band: 'early-primary' });
/** Five levels; at ability 0 their predicted success is 0.88, 0.73, 0.5, 0.27 and 0.12. */
const LEVELS = [-2, -1, 0, 1, 2];
const LONG: SessionPlan = { warmUp: 2, core: 12, ending: 2 };
const SHORT = SESSION_PLANS['early-primary'];
const at = (ability: number) => ({ ability, uncertainty: 0.5 });

type Done = Omit<FinishedItem, 'index'> & { index?: number };
const right = (role: ItemRole, level: number): Done => ({
  role,
  level,
  firstTry: true,
  supported: false,
  succeeded: true,
  skipped: false,
  latencyMs: 8000,
});
/** Wrong, then right on the retry. */
const retried = (role: ItemRole, level: number): Done => ({
  ...right(role, level),
  firstTry: false,
});
/** Wrong three times, then shown. */
const shown = (role: ItemRole, level: number): Done => ({
  ...right(role, level),
  firstTry: false,
  supported: true,
  succeeded: false,
});
const skipped = (role: ItemRole, level: number): Done => ({
  role,
  level,
  firstTry: false,
  supported: false,
  succeeded: false,
  skipped: true,
});
/** A missed item asked again: the item at `index`. */
const asked = (index: number, item: Done): Done => ({ ...item, role: 're-ask', index });
const history = (...items: Done[]): FinishedItem[] =>
  items.map((item, at) => ({ index: at, ...item }));
const warm = right('warm-up', 0);

const fixedView = (change: Partial<PolicyView> = {}): PolicyView => ({
  mode: 'practice',
  plan: corePlan(3),
  finished: 0,
  wrappingUp: false,
  history: [],
  itemCount: 3,
  learner: at(0),
  ...change,
});
const view = (items: FinishedItem[], change: Partial<PolicyView> = {}) =>
  fixedView({
    plan: LONG,
    finished: items.length,
    history: items,
    itemCount: items.length,
    levels: LEVELS,
    ...change,
  });
const next = (items: FinishedItem[], change: Partial<PolicyView> = {}) =>
  policy.chooseNext(view(items, change));
const make = (level: number, role: ItemRole, reason: SessionReason) => ({
  kind: 'make',
  level,
  role,
  reason,
});

describe('createAdaptivePolicy (plan 4.2, ADR 0032)', () => {
  it('has its own version, and plays a fixed list as the placeholder does', () => {
    const placeholder = createPlaceholderPolicy();
    expect(policy.version).toBe(ADAPTIVE_POLICY_VERSION);
    for (const fixed of [
      fixedView(),
      fixedView({ last: { index: 0, succeeded: true } }),
      fixedView({ plan: { warmUp: 1, core: 1, ending: 1 }, last: { index: 1, succeeded: false } }),
      fixedView({ wrappingUp: true, last: { index: 0, succeeded: true } }),
    ]) {
      expect(policy.chooseNext(fixed)).toEqual(placeholder.chooseNext(fixed));
    }
    for (const mode of ['practice', 'challenge'] as const) {
      for (const attempts of [1, 2, 3]) {
        for (const correct of [true, false]) {
          const answered = {
            ...fixedView({ mode }),
            current: { index: 0, attempts, lastResult: { correct, score: correct ? 1 : 0 } },
          };
          expect(policy.afterResponse(answered)).toEqual(placeholder.afterResponse(answered));
        }
      }
    }
  });

  it('aims at the success zone for the mode and band', () => {
    const config = DEFAULT_ADAPTIVE_CONFIG;
    expect(zoneFor('practice', 'early-years', config)).toEqual([0.8, 0.9]);
    expect(zoneFor('practice', 'early-primary', config)).toEqual([0.7, 0.85]);
    expect(zoneFor('challenge', 'early-years', config)).toEqual([0.6, 0.8]);
    expect(zoneFor('challenge', 'early-primary', config)).toEqual([0.6, 0.8]);
  });

  it('chooses the level whose predicted success sits in the zone, nearest its middle', () => {
    expect(levelForZone(at(0), LEVELS, [0.7, 0.85])).toBe(1);
    expect(levelForZone(at(3), LEVELS, [0.7, 0.85])).toBe(4);
    expect(levelForZone(at(0), LEVELS, [0.8, 0.9])).toBe(0);
    expect(levelForZone(at(0), LEVELS, [0.6, 0.8])).toBe(1);
    // None inside: the nearest.
    expect(levelForZone(at(-5), LEVELS, [0.7, 0.85])).toBe(0);
    expect(levelForZone(at(10), LEVELS, [0.7, 0.85])).toBe(4);
  });

  it('warms up at the hardest level still very likely right, then starts in the zone', () => {
    expect(easyLevel(at(0), LEVELS, 0.9)).toBe(0);
    expect(easyLevel(at(3), LEVELS, 0.9)).toBe(2);
    expect(easyLevel(at(-5), LEVELS, 0.9)).toBe(0);

    expect(next([])).toEqual(make(0, 'warm-up', 'WARM_UP'));
    expect(next([], { learner: at(3) })).toEqual(make(2, 'warm-up', 'WARM_UP'));
    expect(next(history(warm))).toEqual(make(0, 'warm-up', 'WARM_UP'));
    expect(next(history(warm, warm))).toEqual(make(1, 'target', 'SUCCESS_ZONE'));
  });

  describe('difficulty on windows, never single answers', () => {
    const t = (level: number) => right('target', level);

    it('steps up after 3 of the last 4 right first time', () => {
      expect(next(history(warm, warm, t(1), t(1), retried('target', 1), t(1)))).toEqual(
        make(2, 'target', 'DIFFICULTY_STEP'),
      );
    });

    it('steps as far as the ability, kept up to date, says, when that is further', () => {
      expect(next(history(warm, warm, t(1), t(1), t(1), t(1)), { learner: at(3) })).toEqual(
        make(4, 'target', 'DIFFICULTY_STEP'),
      );
    });

    it('waits for 2 answers at a level before changing it again', () => {
      const climbed = [warm, warm, t(1), t(1), t(1), t(1), t(2)];
      expect(next(history(...climbed))).toEqual(make(2, 'target', 'SUCCESS_ZONE'));
      expect(next(history(...climbed, t(2)))).toEqual(make(3, 'target', 'DIFFICULTY_STEP'));
    });

    it('steps down after 2 errors in a row, as far as the ability says', () => {
      const missed = history(warm, warm, retried('target', 3), retried('target', 3));
      expect(next(missed)).toEqual(make(1, 'target', 'DIFFICULTY_STEP'));
      expect(next(missed, { learner: at(3) })).toEqual(make(2, 'target', 'DIFFICULTY_STEP'));
    });

    it('steps down after 3 of the last 5 wrong', () => {
      // Re-asks turned off, to see the window alone.
      const windowOnly = createAdaptivePolicy({
        band: 'early-primary',
        config: { ...DEFAULT_ADAPTIVE_CONFIG, reAskBy: 0 },
      });
      const wrong = retried('target', 2);
      const items = history(warm, warm, wrong, t(2), wrong, t(2), wrong);
      expect(windowOnly.chooseNext(view(items))).toEqual(make(1, 'target', 'DIFFICULTY_STEP'));
    });

    it('stays at the easiest level when it cannot go lower', () => {
      expect(next(history(warm, warm, retried('target', 0), retried('target', 0)))).toEqual(
        make(0, 'target', 'SUCCESS_ZONE'),
      );
    });

    it('leaves skipped items out of the windows', () => {
      const withSkip = [warm, warm, t(1), t(1), skipped('target', 1), t(1)];
      expect(next(history(...withSkip))).toEqual(make(1, 'target', 'SUCCESS_ZONE'));
      expect(next(history(...withSkip, t(1)))).toEqual(make(2, 'target', 'DIFFICULTY_STEP'));
    });
  });

  describe('stepping back, then forward', () => {
    const struggled = [warm, warm, shown('target', 3), shown('target', 3)];

    it('puts in a scaffold at the easiest level after 2 supported items in a row, then a bridge', () => {
      expect(next(history(...struggled))).toEqual(make(0, 'scaffold', 'SCAFFOLD'));
      const scaffolded = [...struggled, right('scaffold', 0)];
      // The bridge sits a level below where the target goes next.
      expect(next(history(...scaffolded), { learner: at(3) })).toEqual(make(1, 'bridge', 'BRIDGE'));
      // Then back to the target: here, a missed item asked again.
      expect(next(history(...scaffolded, right('bridge', 1)))).toEqual({
        kind: 'present',
        index: 2,
        role: 're-ask',
        reason: 'RE_ASK',
      });
    });

    it('keeps scaffolds within their share of the session and their run', () => {
      for (const limit of [{ maxScaffoldShare: 0.15 }, { maxScaffoldRun: 0 }]) {
        const guarded = createAdaptivePolicy({
          band: 'early-primary',
          config: { ...DEFAULT_ADAPTIVE_CONFIG, ...limit },
        });
        expect(guarded.chooseNext(view(history(...struggled)))).toEqual(
          make(1, 'target', 'DIFFICULTY_STEP'),
        );
      }
    });
  });

  describe('asking a missed item again (plan 4.2)', () => {
    const missed = retried('target', 1);
    const t = right('target', 1);

    it('asks it once, after 2 other items', () => {
      expect(next(history(warm, warm, missed, t)).kind).toBe('make');
      expect(next(history(warm, warm, missed, t, t))).toEqual({
        kind: 'present',
        index: 2,
        role: 're-ask',
        reason: 'RE_ASK',
      });
      // Once, even when the window would allow it again.
      const wide = createAdaptivePolicy({
        band: 'early-primary',
        config: { ...DEFAULT_ADAPTIVE_CONFIG, reAskBy: 6 },
      });
      expect(
        wide.chooseNext(view(history(warm, warm, missed, t, t, asked(2, t), t))),
      ).toMatchObject({ role: 'target' });
    });

    it('never asks two in a row, and lets one go after 3 other items', () => {
      const twoMissed = [warm, warm, missed, missed, right('target', 0), asked(2, t)];
      expect(next(history(...twoMissed))).toMatchObject({ role: 'target' });
      expect(next(history(...twoMissed, right('target', 0)))).toEqual({
        kind: 'present',
        index: 3,
        role: 're-ask',
        reason: 'RE_ASK',
      });
      expect(next(history(warm, warm, missed, t, t, t, t))).toMatchObject({ role: 'target' });
    });

    it('never asks a skipped item again', () => {
      expect(next(history(warm, warm, skipped('target', 1), t, t))).toMatchObject({
        role: 'target',
      });
    });
  });

  describe('guarding against loops', () => {
    const stuck = [
      warm,
      warm,
      shown('target', 3),
      shown('target', 3),
      right('scaffold', 0),
      retried('bridge', 1),
      retried('target', 2),
    ];

    it('ends on an easy success when first tries stay under 40% after scaffolding', () => {
      const lastShown = [...stuck, shown('target', 2)];
      expect(next(history(...lastShown))).toEqual(make(0, 'ending', 'LOOP_GUARD'));
      expect(next(history(...lastShown), { learner: at(3) })).toEqual(
        make(2, 'ending', 'LOOP_GUARD'),
      );
      const loopEnd = {
        kind: 'complete',
        reason: 'LOOP_GUARD',
        ended: 'activity-switched',
      };
      expect(next(history(...lastShown, right('ending', 0)))).toEqual(loopEnd);
      // When the easy items run out, it stops anyway.
      const failedEnding = shown('ending', 0);
      expect(next(history(...lastShown, failedEnding))).toEqual(make(0, 'ending', 'LOOP_GUARD'));
      expect(next(history(...lastShown, failedEnding, failedEnding))).toEqual(loopEnd);
      // A success already on screen ends it there.
      expect(next(history(...stuck, retried('target', 2)))).toEqual(loopEnd);
    });

    it('carries on while first tries after scaffolding hold at 40% or more', () => {
      const holding = [...stuck, right('target', 2), right('target', 2)];
      expect(next(history(...holding)).reason).not.toBe('LOOP_GUARD');
    });
  });

  describe('noticing disengagement, never as a penalty', () => {
    const quickMiss = { ...retried('target', 1), latencyMs: 900 };

    it('offers a break after a wrong answer faster than plausible reading', () => {
      expect(next(history(warm, warm, quickMiss))).toEqual({
        ...make(1, 'target', 'SUCCESS_ZONE'),
        offerBreak: true,
      });
    });

    it('offers it once, however often the child drifts', () => {
      expect(next(history(warm, warm, quickMiss, right('target', 1)))).not.toHaveProperty(
        'offerBreak',
      );
      expect(
        next(history(warm, warm, quickMiss, right('target', 1), right('target', 1), quickMiss)),
      ).not.toHaveProperty('offerBreak');
    });

    it('offers a break after 2 skips in a row, or a long idle', () => {
      const skip = skipped('target', 1);
      expect(next(history(warm, warm, skip))).not.toHaveProperty('offerBreak');
      expect(next(history(warm, warm, skip, skip))).toHaveProperty('offerBreak', true);
      expect(
        next(history(warm, warm, { ...right('target', 1), latencyMs: 61_000 })),
      ).toHaveProperty('offerBreak', true);
    });

    it('does not take a quick right answer for drifting', () => {
      expect(
        next(history(warm, warm, { ...right('target', 1), latencyMs: 900 })),
      ).not.toHaveProperty('offerBreak');
    });
  });

  describe('ending on a success (plan 4.2, ADR 0022)', () => {
    const core = Array.from({ length: 5 }, () => right('target', 1));

    it('completes after the core block when its last item was right', () => {
      expect(next(history(warm, warm, ...core, right('target', 1)), { plan: SHORT })).toEqual({
        kind: 'complete',
        reason: 'SESSION_COMPLETE',
      });
    });

    it('adds easy items to end on when the last was not right, until one is or they run out', () => {
      const missedLast = [warm, warm, ...core, shown('target', 1)];
      const short = { plan: SHORT };
      const complete = { kind: 'complete', reason: 'SESSION_COMPLETE' };
      expect(next(history(...missedLast), short)).toEqual(make(0, 'ending', 'END_ON_SUCCESS'));
      expect(next(history(...missedLast), { ...short, learner: at(3) })).toEqual(
        make(2, 'ending', 'END_ON_SUCCESS'),
      );
      expect(next(history(...missedLast, right('ending', 0)), short)).toEqual(complete);
      const failed = shown('ending', 0);
      expect(next(history(...missedLast, failed), short)).toEqual(
        make(0, 'ending', 'END_ON_SUCCESS'),
      );
      expect(next(history(...missedLast, failed, failed), short)).toEqual(complete);
    });

    it('wraps up when time is up, still ending on a success', () => {
      const timeUp = { wrappingUp: true };
      const complete = { kind: 'complete', reason: 'TIME_UP' };
      expect(next([], timeUp)).toEqual(complete);
      expect(next(history(warm, right('target', 1)), timeUp)).toEqual(complete);
      expect(next(history(warm, shown('target', 1)), timeUp)).toEqual(
        make(0, 'ending', 'END_ON_SUCCESS'),
      );
      expect(next(history(warm, shown('target', 1), right('ending', 0)), timeUp)).toEqual(complete);
    });
  });
});

/** Items at each of LEVELS, every one new, with 7 as the answer. */
const maker: ItemMaker = {
  levelDifficulty: LEVELS,
  make: (level, _seed, used) => {
    let n = 0;
    while (used.has(`item-${String(level)}-${String(n)}`)) n += 1;
    const item: NumericItem = {
      id: `item-${String(level)}-${String(n)}`,
      type: 'numeric',
      skillIds: ['add-within-20'],
      difficulty: LEVELS[level] ?? 0,
      answer: { kind: 'decimal', value: 7 },
      tolerance: 0,
      acceptEquivalentFractions: false,
    };
    return item;
  },
};

/** How a child answers one item: wrong this many times before right (3 means shown). */
type Answer = { wrong: number; latencyMs?: number } | 'skip';
const RIGHT: Answer = { wrong: 0 };
const RETRIED: Answer = { wrong: 1 };
const SHOWN: Answer = { wrong: 3 };

/**
 * Plays a session through the engine, answering each item in turn, the last answer for every
 * item after, and lists every decision.
 */
function playOut(
  answers: readonly Answer[],
  {
    plan = LONG,
    mode = 'practice',
    ability = 0,
    levels = LEVELS,
  }: { plan?: SessionPlan; mode?: Mode; ability?: number; levels?: readonly number[] } = {},
) {
  const engine = createSessionEngine(createAdaptivePolicy({ band: 'early-primary' }), {
    maker: { ...maker, levelDifficulty: levels },
  });
  let now = Date.UTC(2026, 9, 22, 9);
  let step: EngineResult = engine.start(
    {
      childId: '0192f4c1-0000-7000-8000-00000000c001',
      activityId: 'hop-line-add-within-20',
      gameId: 'hop-line',
      gameVersion: '0.1.0',
      contentRelease: 'mock-2026-10-20',
      mode,
    },
    [],
    seedRandom(5),
    now,
    plan,
    { ability, uncertainty: 1 },
  );
  const decisions: { role: ItemRole; level?: number; reason: SessionReason; id: string }[] = [];
  const events = [...step.events];
  let answered = 0;
  while (step.step.kind === 'present') {
    const { item, role, reason } = step.step;
    const index = step.state.current?.index ?? -1;
    const level = step.state.itemLevels?.[index];
    decisions.push({ role, reason, id: item.id, ...(level === undefined ? {} : { level }) });
    const answer = answers[Math.min(answered, answers.length - 1)] ?? RIGHT;
    answered += 1;
    if (answer === 'skip') {
      step = engine.skip(step.state, (now += 5000));
    } else {
      let wrong = answer.wrong;
      now += answer.latencyMs ?? 8000;
      for (;;) {
        const value = wrong > 0 ? 8 : 7;
        wrong -= 1;
        step = engine.respond(
          step.state,
          { type: 'numeric', value: { kind: 'decimal', value } },
          now,
        );
        events.push(...step.events);
        if (step.step.kind !== 'feedback' || step.step.then === 'advance') break;
        now += 4000;
      }
      step = engine.advance(step.state, (now += 2000));
    }
    events.push(...step.events);
  }
  const summary = decisions.map(({ role, level, reason }) => `${role} ${String(level)} ${reason}`);
  return { decisions, summary, end: step.step, events };
}

describe('golden scenarios (plan 4.6)', () => {
  it('three wrong, then right: easier after two misses, the misses asked again, and back to the target level after three right (plan 4.4)', () => {
    const { summary, end } = playOut([RIGHT, RIGHT, RETRIED, RETRIED, RETRIED, RIGHT], {
      plan: { warmUp: 2, core: 10, ending: 2 },
    });
    // After the first six answers, every answer is right.
    expect(summary).toEqual([
      'warm-up 0 WARM_UP',
      'warm-up 0 WARM_UP',
      'target 1 SUCCESS_ZONE',
      'target 1 SUCCESS_ZONE',
      'target 0 DIFFICULTY_STEP',
      're-ask 1 RE_ASK',
      'target 0 SUCCESS_ZONE',
      're-ask 1 RE_ASK',
      'target 1 DIFFICULTY_STEP',
      'target 1 SUCCESS_ZONE',
      'target 2 DIFFICULTY_STEP',
      'target 2 SUCCESS_ZONE',
    ]);
    expect(end).toEqual({ kind: 'complete', reason: 'SESSION_COMPLETE' });
  });

  it('two shown in a row: a scaffold, a bridge, and with first tries still low, an easy success to end on', () => {
    const { summary, end, events } = playOut(
      [RIGHT, RIGHT, SHOWN, SHOWN, RETRIED, RETRIED, SHOWN, SHOWN, RIGHT],
      { plan: { warmUp: 2, core: 10, ending: 2 } },
    );
    expect(summary).toEqual([
      'warm-up 0 WARM_UP',
      'warm-up 0 WARM_UP',
      'target 1 SUCCESS_ZONE',
      'target 1 SUCCESS_ZONE',
      'scaffold 0 SCAFFOLD',
      'bridge 0 BRIDGE',
      're-ask 1 RE_ASK',
      'target 0 DIFFICULTY_STEP',
      'ending 0 LOOP_GUARD',
    ]);
    expect(end).toEqual({ kind: 'complete', reason: 'LOOP_GUARD', ended: 'activity-switched' });
    expect(events.at(-1)).toMatchObject({ type: 'session_ended', reason: 'activity-switched' });
  });

  it('an able child climbs once the windows allow', () => {
    const { summary, end } = playOut([RIGHT], { plan: SHORT });
    expect(summary).toEqual([
      'warm-up 0 WARM_UP',
      'warm-up 0 WARM_UP',
      'target 1 SUCCESS_ZONE',
      'target 1 SUCCESS_ZONE',
      'target 1 SUCCESS_ZONE',
      'target 1 SUCCESS_ZONE',
      'target 2 DIFFICULTY_STEP',
      'target 2 SUCCESS_ZONE',
    ]);
    expect(end).toEqual({ kind: 'complete', reason: 'SESSION_COMPLETE' });
  });
});

describe('properties of any session it runs', () => {
  const answer: fc.Arbitrary<Answer> = fc.oneof(
    fc.constant<Answer>('skip'),
    fc.record({
      wrong: fc.constantFrom(0, 0, 1, 2, 3),
      latencyMs: fc.integer({ min: 300, max: 70_000 }),
    }),
  );
  const session = fc.record({
    answers: fc.array(answer, { minLength: 1, maxLength: 30 }),
    plan: fc.record({
      warmUp: fc.integer({ min: 0, max: 2 }),
      core: fc.integer({ min: 1, max: 12 }),
      ending: fc.integer({ min: 0, max: 2 }),
    }),
    mode: fc.constantFrom<Mode>('practice', 'challenge'),
    ability: fc.double({ min: -5, max: 5, noNaN: true }),
    levels: fc
      .array(fc.double({ min: -4, max: 4, noNaN: true }), { minLength: 1, maxLength: 8 })
      .map((levels) => [...levels].sort((a, b) => a - b)),
  });

  it('ends within the plan, at levels it has, with a reason code for every decision', () => {
    fc.assert(
      fc.property(session, ({ answers, ...options }) => {
        const { decisions, end } = playOut(answers, options);
        const { plan, levels } = options;
        expect(decisions.length).toBeLessThanOrEqual(plan.warmUp + plan.core + plan.ending);
        expect(end.kind).toBe('complete');
        for (const decision of decisions) {
          expect(SESSION_REASONS).toContain(decision.reason);
          expect(decision.level).toBeGreaterThanOrEqual(0);
          expect(decision.level).toBeLessThan(levels.length);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('never repeats an item but for one planned re-ask, and keeps scaffolds within their limits', () => {
    fc.assert(
      fc.property(session, ({ answers, ...options }) => {
        const { decisions } = playOut(answers, options);
        const { maxScaffoldRun, maxScaffoldShare } = DEFAULT_ADAPTIVE_CONFIG;
        const shownBefore = new Map<string, number>();
        let run = 0;
        let scaffolds = 0;
        decisions.forEach((decision, at) => {
          const times = (shownBefore.get(decision.id) ?? 0) + 1;
          shownBefore.set(decision.id, times);
          expect(times === 1 || (times === 2 && decision.role === 're-ask')).toBe(true);
          if (decision.role !== 'scaffold') {
            run = 0;
            return;
          }
          run += 1;
          scaffolds += 1;
          // Never more than 3 in a row, nor 30% of the items so far.
          expect(run).toBeLessThanOrEqual(maxScaffoldRun);
          expect(scaffolds / (at + 1)).toBeLessThanOrEqual(maxScaffoldShare);
        });
      }),
      { numRuns: 300 },
    );
  });

  it('plays out the same every time from the same seed and answers', () => {
    fc.assert(
      fc.property(session, ({ answers, ...options }) => {
        expect(playOut(answers, options).events).toEqual(playOut(answers, options).events);
      }),
      { numRuns: 50 },
    );
  });
});
