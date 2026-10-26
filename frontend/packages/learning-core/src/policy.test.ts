import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { corePlan, type SessionPlan } from './plan';
import { createPlaceholderPolicy, PLACEHOLDER_POLICY_VERSION, type PolicyView } from './policy';

const policy = createPlaceholderPolicy();
const right = { correct: true, score: 1 };
const wrong = { correct: false, score: 0 };
const SHAPED: SessionPlan = { warmUp: 2, core: 3, ending: 2 };

const view = (change: Partial<PolicyView> = {}): PolicyView => ({
  mode: 'practice',
  plan: corePlan(3),
  finished: 0,
  wrappingUp: false,
  history: [],
  itemCount: 3,
  learner: { ability: 0, uncertainty: 1 },
  ...change,
});

const afterAnswer = (
  attempts: number,
  result: typeof right,
  mode: 'practice' | 'challenge' = 'practice',
) =>
  policy.afterResponse({ ...view({ mode }), current: { index: 0, attempts, lastResult: result } });

/** What comes after the item at `index` ended, rightly or not. */
const after = (index: number, succeeded: boolean, change: Partial<PolicyView> = {}) =>
  policy.chooseNext(view({ plan: SHAPED, last: { index, succeeded }, ...change }));

describe('placeholder policy', () => {
  it('has a version', () => {
    expect(policy.version).toBe(PLACEHOLDER_POLICY_VERSION);
  });

  it('presents a core block in a fixed order, then completes', () => {
    expect(policy.chooseNext(view({ plan: corePlan(2) }))).toEqual({
      kind: 'present',
      index: 0,
      role: 'target',
      reason: 'NEXT_IN_ORDER',
    });
    expect(
      policy.chooseNext(view({ plan: corePlan(2), last: { index: 0, succeeded: true } })),
    ).toEqual({ kind: 'present', index: 1, role: 'target', reason: 'NEXT_IN_ORDER' });
    expect(
      policy.chooseNext(view({ plan: corePlan(2), last: { index: 1, succeeded: false } })),
    ).toEqual({ kind: 'complete', reason: 'SESSION_COMPLETE' });
  });

  it('completes at once when there are no items', () => {
    expect(policy.chooseNext(view({ plan: corePlan(0) }))).toEqual({
      kind: 'complete',
      reason: 'SESSION_COMPLETE',
    });
  });

  describe('session shape (plan 4.2, ADR 0022)', () => {
    it('warms up first, then plays the core block', () => {
      expect(policy.chooseNext(view({ plan: SHAPED }))).toEqual({
        kind: 'present',
        index: 0,
        role: 'warm-up',
        reason: 'WARM_UP',
      });
      expect(after(0, false)).toMatchObject({ index: 1, role: 'warm-up', reason: 'WARM_UP' });
      expect(after(1, true)).toMatchObject({ index: 2, role: 'target', reason: 'NEXT_IN_ORDER' });
      expect(after(3, false)).toMatchObject({ index: 4, role: 'target' });
    });

    it('stops after the core block when its last item ended in a correct answer', () => {
      expect(after(4, true)).toEqual({ kind: 'complete', reason: 'SESSION_COMPLETE' });
    });

    it('offers easy items until one is right, so the session ends on a success', () => {
      expect(after(4, false)).toEqual({
        kind: 'present',
        index: 5,
        role: 'ending',
        reason: 'END_ON_SUCCESS',
      });
      expect(after(5, false)).toMatchObject({ index: 6, role: 'ending' });
      expect(after(5, true)).toEqual({ kind: 'complete', reason: 'SESSION_COMPLETE' });
    });

    it('stops when the easy items run out', () => {
      expect(after(6, false)).toEqual({ kind: 'complete', reason: 'SESSION_COMPLETE' });
    });

    it('skips to the ending when time is up', () => {
      expect(after(2, true, { wrappingUp: true })).toEqual({ kind: 'complete', reason: 'TIME_UP' });
      expect(after(2, false, { wrappingUp: true })).toEqual({
        kind: 'present',
        index: 5,
        role: 'ending',
        reason: 'END_ON_SUCCESS',
      });
      expect(after(5, true, { wrappingUp: true })).toEqual({ kind: 'complete', reason: 'TIME_UP' });
    });

    it('never presents an item twice, and ends on a success whenever an easy item allows', () => {
      const plans = fc.record({
        warmUp: fc.integer({ min: 0, max: 3 }),
        core: fc.integer({ min: 0, max: 8 }),
        ending: fc.integer({ min: 0, max: 3 }),
      });
      // The outcome of each item, and the item after which time runs out, if it does.
      const runs = fc.tuple(
        plans,
        fc.array(fc.boolean(), { maxLength: 20 }),
        fc.option(fc.nat(12)),
      );
      fc.assert(
        fc.property(runs, ([plan, outcomes, wrapAfter]) => {
          const seen: number[] = [];
          const succeeded: boolean[] = [];
          let last: PolicyView['last'];
          for (let step = 0; step <= 20; step += 1) {
            const decision = policy.chooseNext(
              view({
                plan,
                ...(last ? { last } : {}),
                wrappingUp: wrapAfter !== null && step > wrapAfter,
              }),
            );
            if (decision.kind === 'complete') break;
            // The placeholder plays a fixed list: it never asks for a new item.
            if (decision.kind !== 'present') throw new Error('Expected an item from the list');
            expect(seen).not.toContain(decision.index);
            expect(decision.index).toBeLessThan(plan.warmUp + plan.core + plan.ending);
            seen.push(decision.index);
            const success = outcomes[step] ?? true;
            succeeded.push(success);
            last = { index: decision.index, succeeded: success };
          }
          const endingLeft =
            seen.filter((index) => index >= plan.warmUp + plan.core).length < plan.ending;
          // With easy items left, a session that played anything ends on a success.
          if (seen.length > 0 && endingLeft) expect(succeeded.at(-1)).toBe(true);
        }),
        { numRuns: 1000 },
      );
    });
  });

  it('moves on after a correct answer', () => {
    expect(afterAnswer(1, right)).toEqual({
      kind: 'advance',
      support: 'none',
      reason: 'NEXT_IN_ORDER',
    });
    expect(afterAnswer(2, right)).toEqual({
      kind: 'advance',
      support: 'none',
      reason: 'NEXT_IN_ORDER',
    });
  });

  it('climbs the support ladder: wrong, wrong, wrong → retry, hint, show me (plan 4.2)', () => {
    expect([1, 2, 3].map((attempts) => afterAnswer(attempts, wrong))).toEqual([
      { kind: 'retry', support: 'encouragement', reason: 'RETRY' },
      { kind: 'retry', support: 'hint', reason: 'HINT' },
      { kind: 'advance', support: 'worked-example', reason: 'SHOW_ME' },
    ]);
  });

  it('allows one attempt and no support in challenge mode', () => {
    expect(afterAnswer(1, wrong, 'challenge')).toEqual({
      kind: 'advance',
      support: 'none',
      reason: 'NEXT_IN_ORDER',
    });
  });

  it('takes its ceiling from configuration', () => {
    const strict = createPlaceholderPolicy({ maxAttempts: 2 });
    expect(
      strict.afterResponse({
        ...view({ plan: corePlan(1) }),
        current: { index: 0, attempts: 2, lastResult: wrong },
      }),
    ).toEqual({ kind: 'advance', support: 'worked-example', reason: 'SHOW_ME' });
  });
});
