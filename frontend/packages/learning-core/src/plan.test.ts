import {
  EXPERIENCE_BANDS,
  NumberLineAdditionTemplate,
  type LearningEvent,
} from '@learnofun/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { SESSION_PLANS, activeMs, corePlan, planLevels, planSize, plannedItems } from './plan';

const START = Date.UTC(2026, 9, 21, 9, 0);
const SESSION = '0192f4c1-0000-7000-8000-00000000e001';

/** A session's events, a type and a time each, numbered in order. */
function events(...steps: [type: LearningEvent['type'], atMs: number][]): LearningEvent[] {
  return steps.map(
    ([type, atMs], sequence) =>
      ({
        id: `0192f4c1-0000-7000-8000-${String(sequence).padStart(12, '0')}`,
        sessionId: SESSION,
        sequence,
        occurredAt: new Date(START + atMs).toISOString(),
        schemaVersion: 1,
        type,
        ...(type === 'session_paused' || type === 'session_resumed' ? { reason: 'break' } : {}),
        ...(type === 'session_ended' ? { reason: 'child-left' } : {}),
      }) as LearningEvent,
  );
}

/** The Hop Line template, as in the mock catalog (ADR 0015): six levels. */
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

describe('session plans (ADR 0022)', () => {
  it('have a plan for every experience band, warming up and keeping easy items to end on', () => {
    for (const band of EXPERIENCE_BANDS) {
      const plan = SESSION_PLANS[band];
      expect(plan.warmUp, band).toBeGreaterThan(0);
      expect(plan.core, band).toBeGreaterThan(0);
      expect(plan.ending, band).toBeGreaterThan(0);
    }
    expect(SESSION_PLANS['early-years'].core).toBeLessThan(SESSION_PLANS['early-primary'].core);
  });

  it('count the items they need, and the ones a child sees without an ending', () => {
    const plan = { warmUp: 2, core: 6, ending: 2 };
    expect(planSize(plan)).toBe(10);
    expect(plannedItems(plan)).toBe(8);
    expect(corePlan(3)).toEqual({ warmUp: 0, core: 3, ending: 0 });
  });

  it('start and end at the easiest level, and ramp up through the core block', () => {
    expect(planLevels(template, { warmUp: 2, core: 6, ending: 2 })).toEqual([
      0, 0, 0, 1, 2, 3, 4, 5, 0, 0,
    ]);
  });
});

describe('activeMs', () => {
  it('counts play from the start to the end', () => {
    expect(activeMs(events(['session_started', 0], ['session_completed', 90_000]))).toBe(90_000);
  });

  it('leaves out time paused', () => {
    expect(
      activeMs(
        events(
          ['session_started', 0],
          ['session_paused', 60_000],
          ['session_resumed', 300_000],
          ['session_ended', 330_000],
        ),
      ),
    ).toBe(90_000);
  });

  it('counts a running session up to now, or to its last event', () => {
    const running = events(['session_started', 0], ['item_presented', 20_000]);
    expect(activeMs(running, START + 45_000)).toBe(45_000);
    expect(activeMs(running)).toBe(20_000);
    expect(
      activeMs(events(['session_started', 0], ['session_paused', 10_000]), START + 99_000),
    ).toBe(10_000);
  });

  it('is never negative and never more than the time from first to last event', () => {
    const kinds = fc.constantFrom<LearningEvent['type']>(
      'session_started',
      'item_presented',
      'session_paused',
      'session_resumed',
      'session_completed',
    );
    fc.assert(
      fc.property(
        fc.array(fc.tuple(kinds, fc.nat(1000)), { minLength: 1, maxLength: 30 }),
        (raw) => {
          let at = 0;
          const steps = raw.map(([type, gap]): [LearningEvent['type'], number] => {
            at += gap * 1000;
            return [type, at];
          });
          const total = activeMs(events(...steps));
          expect(total).toBeGreaterThanOrEqual(0);
          expect(total).toBeLessThanOrEqual(at);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
