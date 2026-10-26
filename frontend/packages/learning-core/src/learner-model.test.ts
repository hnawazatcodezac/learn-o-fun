import type { Skill } from '@learnofun/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Observation } from './evidence';
import {
  abilityAfter,
  DEFAULT_LEARNER_CONFIG,
  LEARNER_MODEL_VERSION,
  skillState,
  successChance,
  updateAbility,
} from './learner-model';

const DAY = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 8, 1, 15, 0);

const skill: Skill = {
  id: 'add-within-10',
  subjectId: 'mathematics',
  strand: 'addition-and-subtraction',
  title: { en: 'Add within 10' },
  masteryDifficulty: -1,
  uncertaintyThreshold: 0.35,
  broad: false,
  fluency: false,
};

let counter = 0;
/** An observation: by default full weight, right, on a fresh item, on day 0 of session 1. */
const obs = (overrides: Partial<Observation> & { day?: number } = {}): Observation => {
  counter += 1;
  const { day = 0, ...rest } = overrides;
  return {
    skillId: skill.id,
    itemId: `item-${String(counter)}`,
    sessionId: `session-${String(day)}`,
    at: START + day * DAY + counter * 1000,
    correct: true,
    firstTry: true,
    weight: 1,
    difficulty: -1,
    guessFloor: 0,
    ...rest,
  };
};
const many = (count: number, overrides: Partial<Observation> & { day?: number } = {}) =>
  Array.from({ length: count }, () => obs(overrides));
/**
 * Enough for the gate, as a strong child gives it: 24 fresh items a day near their level, 4 of
 * every 5 right, on 2 days, each day its own session unless `sessions` says otherwise. Answers on
 * items far below a child's level show little, so all-right answers on easy items are not enough.
 */
const enough = (days: readonly [number, number] = [0, 1], sessions?: readonly [string, string]) =>
  days.flatMap((day, half) =>
    Array.from({ length: 24 }, (_, index) =>
      obs({
        day,
        difficulty: 0.5,
        correct: index % 5 !== 2,
        ...(sessions ? { sessionId: sessions[half] } : {}),
      }),
    ),
  );
const at = (day: number) => START + day * DAY;
/** The time of the latest observation, so the state is read with no days away after it. */
const lastAt = (list: readonly Observation[]) => Math.max(...list.map((o) => o.at));
/** The update alone: no widening with practice or days away. */
const pure = { ...DEFAULT_LEARNER_CONFIG, practiceVariance: 0, dailyVariance: 0 };

describe('successChance (plan 4.1)', () => {
  it('is a half when ability meets difficulty, and lifted by the guessing floor', () => {
    expect(successChance(0, 0)).toBe(0.5);
    expect(successChance(0, 0, 0.5)).toBe(0.75);
    expect(successChance(2, 0)).toBeCloseTo(0.8808, 4);
  });
});

describe('the ability update (plan 4.1, ADR 0034)', () => {
  it('follows θ′ = θ + K(σ)·w·(x − P), K the variance left once the answer is read', () => {
    // From θ = 0, σ = 1.5, a wrong answer at difficulty 0: P = 0.5, the answer shows 0.25, so σ²
    // becomes 2.25 / (1 + 2.25 × 0.25) = 1.44 and θ moves by 1.44 × (0 − 0.5).
    const first = obs({ correct: false, difficulty: 0 });
    const one = skillState(skill, [first], first.at, pure);
    expect(one.ability).toBeCloseTo(-0.72, 12);
    expect(one.uncertainty).toBeCloseTo(1.2, 12);

    const second = obs({ correct: false, difficulty: 0 });
    const two = skillState(skill, [first, second], second.at, pure);
    const chance = successChance(-0.72, 0);
    const variance = 1.44 / (1 + 1.44 * chance * (1 - chance));
    expect(two.ability).toBeCloseTo(-0.72 + variance * (0 - chance), 12);
    expect(two.uncertainty).toBeCloseTo(Math.sqrt(variance), 12);
  });

  it('moves less once it is surer, and less for an answer it expected than a surprising one', () => {
    const wrong = { weight: 1, correct: false, difficulty: 0, guessFloor: 0 };
    const unsure = updateAbility({ ability: 0, uncertainty: 1.5 }, wrong);
    const sure = updateAbility({ ability: 0, uncertainty: 0.5 }, wrong);
    expect(Math.abs(sure.ability)).toBeLessThan(Math.abs(unsure.ability));

    // At θ = 2 a right answer at difficulty 0 was expected (P = 0.88); a wrong one was not.
    const strong = { ability: 2, uncertainty: 0.5 };
    const expected = updateAbility(strong, { ...wrong, correct: true });
    const surprising = updateAbility(strong, wrong);
    expect(expected.ability - 2).toBeLessThan(2 - surprising.ability);
    expect(expected.ability.toFixed(4)).toBe('2.0291');
    expect(surprising.ability.toFixed(4)).toBe('1.7850');
  });

  it('gives an observation of weight 0 no effect, and less weight a smaller step', () => {
    const zero = obs({ weight: 0, correct: false });
    const later = skillState(skill, [zero], zero.at);
    expect(later.ability).toBe(DEFAULT_LEARNER_CONFIG.initialAbility);
    expect(later.uncertainty).toBe(DEFAULT_LEARNER_CONFIG.initialUncertainty);

    const full = skillState(skill, [obs({ difficulty: 0 })], at(1)).ability;
    const half = skillState(skill, [obs({ difficulty: 0, weight: 0.5 })], at(1)).ability;
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(full);
  });

  it('widens σ a little with each answer and with days away, never beyond where it starts', () => {
    // An answer that shows nothing, far below the child's level, leaves only the widening.
    const easy = { weight: 1, correct: true, difficulty: -60, guessFloor: 0 };
    const practised = updateAbility({ ability: 1, uncertainty: 0.3 }, easy);
    expect(practised.uncertainty).toBeCloseTo(
      Math.sqrt(0.09 + DEFAULT_LEARNER_CONFIG.practiceVariance),
      12,
    );

    const away = abilityAfter({ ability: 1, uncertainty: 0.3 }, 10);
    expect(away).toEqual({
      ability: 1,
      uncertainty: Math.sqrt(0.09 + 10 * DEFAULT_LEARNER_CONFIG.dailyVariance),
    });
    expect(abilityAfter({ ability: 1, uncertainty: 1.4 }, 10_000).uncertainty).toBe(
      DEFAULT_LEARNER_CONFIG.initialUncertainty,
    );
    // The state is read as of now: σ has widened since the last answer.
    const answer = obs({ difficulty: 0 });
    const then = skillState(skill, [answer], answer.at);
    const now = skillState(skill, [answer], answer.at + 10 * DAY);
    expect(now.ability).toBe(then.ability);
    expect(now.uncertainty).toBeCloseTo(
      Math.sqrt(then.uncertainty ** 2 + 10 * DEFAULT_LEARNER_CONFIG.dailyVariance),
      12,
    );
  });

  it('takes the guessing floor into account: a right guess on a two-option item moves less', () => {
    const open = skillState(skill, [obs({ difficulty: 0 })], at(1)).ability;
    const twoOptions = skillState(skill, [obs({ difficulty: 0, guessFloor: 0.5 })], at(1)).ability;
    expect(twoOptions).toBeLessThan(open);
  });

  it('never lets σ fall below its floor', () => {
    const floor = { ...pure, minUncertainty: 0.6 };
    const evidence = enough();
    expect(skillState(skill, evidence, lastAt(evidence), floor).uncertainty).toBe(0.6);
  });

  it('reads evidence in time order, whatever order it comes in', () => {
    const list = enough();
    const shuffled = [...list].reverse();
    expect(skillState(skill, shuffled, at(2))).toEqual(skillState(skill, list, at(2)));
  });
});

describe('the mastery gate (plan 4.1): every part must hold', () => {
  it('masters a skill with enough right evidence on 2 days', () => {
    const state = skillState(skill, enough(), at(2));
    expect(state.status).toBe('mastered');
    expect(state.masteredAt).toBeDefined();
  });

  it('needs evidence on 2 different days, from 2 sessions', () => {
    expect(skillState(skill, enough([0, 0]), at(1)).status).not.toBe('mastered');
    // Two sessions on the same day are still one day.
    expect(skillState(skill, enough([0, 0], ['a', 'b']), at(1)).status).not.toBe('mastered');
  });

  it('needs 6 different items', () => {
    const repeats = enough().map((o, index) => ({ ...o, itemId: `same-${String(index % 5)}` }));
    expect(skillState(skill, repeats, at(2)).status).not.toBe('mastered');
  });

  it('needs 4 right of the 5 latest full-weight answers', () => {
    // Every other part of the gate is switched off, to see this one alone.
    const only = {
      ...DEFAULT_LEARNER_CONFIG,
      masteryChance: 0,
      minFullWeight: 1,
      minItems: 1,
      minSessions: 1,
      minDays: 1,
    };
    const easy = { ...skill, uncertaintyThreshold: 2 };
    const answers = (...rights: boolean[]) => rights.map((correct) => obs({ correct }));

    expect(skillState(easy, answers(false, false, true, true, true), at(1), only).status).not.toBe(
      'mastered',
    );
    expect(skillState(easy, answers(false, true, true, true, true), at(1), only).status).toBe(
      'mastered',
    );
  });

  it('needs predicted success of 0.85 at the mastery difficulty, and σ under the threshold', () => {
    const hard = { ...skill, masteryDifficulty: 3 };
    expect(skillState(hard, enough(), at(2)).status).not.toBe('mastered');
    const certain = { ...skill, uncertaintyThreshold: 0.1 };
    expect(skillState(certain, enough(), at(2)).status).not.toBe('mastered');
  });

  it('judges that success on a cautious ability, one σ below the estimate (ADR 0034)', () => {
    // The evidence ends at θ ≈ 1.73, σ ≈ 0.34: predicted success at -0.2 is 0.87 on θ, 0.83 on θ − σ.
    const nearly = { ...skill, masteryDifficulty: -0.2 };
    const pointOnly = { ...DEFAULT_LEARNER_CONFIG, masteryMargin: 0 };
    expect(skillState(nearly, enough(), at(2), pointOnly).status).toBe('mastered');
    expect(skillState(nearly, enough(), at(2)).status).not.toBe('mastered');
  });

  it('needs 2 activities for a broad skill', () => {
    const broad = { ...skill, broad: true };
    expect(
      skillState(
        broad,
        enough().map((o) => ({ ...o, activityId: 'hop' })),
        at(2),
      ).status,
    ).not.toBe('mastered');
    const two = enough().map((o, index) => ({ ...o, activityId: index % 2 ? 'hop' : 'tiles' }));
    expect(skillState(broad, two, at(2)).status).toBe('mastered');
  });

  it('counts only full-weight observations', () => {
    const hinted = enough().map((o) => ({ ...o, weight: 0.5 }));
    expect(skillState(skill, hinted, at(2)).status).toBe('exploring');
  });
});

describe('the statuses before Mastered (ADR 0031)', () => {
  it('is Not started with no evidence', () => {
    expect(skillState(skill, [], at(0)).status).toBe('not-started');
  });

  it('is Exploring while the evidence is an early signal, however it is going', () => {
    expect(skillState(skill, many(7), at(1)).status).toBe('exploring');
  });

  it('is Exploring, Building or Strong by predicted success, short of the gate', () => {
    // One day only, so the gate cannot hold; the difficulty sets the predicted success.
    const statusAt = (masteryDifficulty: number) =>
      skillState({ ...skill, masteryDifficulty }, many(16, { day: 0 }), at(1)).status;
    expect(statusAt(5)).toBe('exploring');
    // Sixteen right at difficulty -1 put θ near 1.66: predicted success 0.59 at 1.3, 0.76 at 0.5.
    expect(statusAt(1.3)).toBe('building');
    expect(statusAt(0.5)).toBe('strong');
    expect(statusAt(-3)).toBe('strong');
  });
});

describe('the review ladder (plan 4.1): 3, 7, 21, then 60 days', () => {
  const mastered = () => {
    const evidence = enough();
    const state = skillState(skill, evidence, at(2));
    if (state.masteredAt === undefined || state.nextReviewAt === undefined) {
      throw new Error('Not mastered');
    }
    return { evidence, masteredAt: state.masteredAt, nextReviewAt: state.nextReviewAt };
  };

  it('falls due 3 days after mastery', () => {
    const { evidence, masteredAt, nextReviewAt } = mastered();
    expect(nextReviewAt - masteredAt).toBe(3 * DAY);
    expect(skillState(skill, evidence, nextReviewAt - 1).status).toBe('mastered');
    expect(skillState(skill, evidence, nextReviewAt).status).toBe('review-due');
  });

  it('moves a rung up after a right review: the next is 7 days on', () => {
    const { evidence, nextReviewAt } = mastered();
    const review = obs({ at: nextReviewAt + 1000, sessionId: 'review' });
    const state = skillState(skill, [...evidence, review], nextReviewAt + DAY);
    expect(state.status).toBe('mastered');
    expect(state.nextReviewAt).toBe(review.at + 7 * DAY);
  });

  it('sets Review due after a wrong review and lowers θ, never back to Not started', () => {
    const { evidence, nextReviewAt } = mastered();
    const before = skillState(skill, evidence, nextReviewAt).ability;
    const failed = obs({ at: nextReviewAt + 1000, sessionId: 'review', correct: false });
    const after = skillState(skill, [...evidence, failed], nextReviewAt + DAY);
    expect(after.status).toBe('review-due');
    expect(after.ability).toBeLessThan(before - DEFAULT_LEARNER_CONFIG.reviewPenalty);

    // A right review afterwards makes it mastered again, on the same rung.
    const again = obs({ at: nextReviewAt + 2 * DAY, sessionId: 'again' });
    const back = skillState(skill, [...evidence, failed, again], nextReviewAt + 2 * DAY + 1);
    expect(back.status).toBe('mastered');
    expect(back.nextReviewAt).toBe(again.at + 3 * DAY);
  });
});

describe('golden scenarios (plan 4.6)', () => {
  // The values were worked out apart from this code, and pinned (ADR 0034).
  it('three wrong, then four right: still exploring, with exactly this ability and uncertainty', () => {
    const answers = [false, false, false, true, true, true, true].map((correct, index) =>
      obs({ correct, difficulty: 0, at: START + index * 1000 }),
    );
    const state = skillState(skill, answers, lastAt(answers));
    expect(state.status).toBe('exploring');
    expect(state.ability.toFixed(4)).toBe('0.3219');
    expect(state.uncertainty.toFixed(4)).toBe('0.7097');
  });

  it('two days of a strong child near their level: mastered at the 44th answer', () => {
    const evidence = enough();
    const state = skillState(skill, evidence, lastAt(evidence));
    expect(state.status).toBe('mastered');
    expect(state.masteredAt).toBe(evidence[43]?.at);
    expect(state.ability.toFixed(4)).toBe('1.7277');
    expect(state.uncertainty.toFixed(4)).toBe('0.3376');
  });

  it('has a version, stored with every state it gives', () => {
    expect(LEARNER_MODEL_VERSION).toBe('elo-2');
  });
});

describe('properties', () => {
  const observation = fc.record({
    correct: fc.boolean(),
    weight: fc.constantFrom(0, 0.3, 0.5, 1),
    difficulty: fc.double({ min: -3, max: 3, noNaN: true }),
    day: fc.integer({ min: 0, max: 30 }),
    item: fc.integer({ min: 0, max: 12 }),
  });
  const build = (
    list: { correct: boolean; weight: number; difficulty: number; day: number; item: number }[],
  ) =>
    list.map(({ day, item, ...rest }, index) =>
      obs({ ...rest, day, itemId: `p-${String(item)}`, at: START + day * DAY + index * 1000 }),
    );

  it('never goes back to Not started once there is evidence', () => {
    fc.assert(
      fc.property(fc.array(observation, { minLength: 1, maxLength: 40 }), (list) => {
        expect(skillState(skill, build(list), at(40)).status).not.toBe('not-started');
      }),
      { numRuns: 500 },
    );
  });

  it('keeps σ between its floor and its start, and θ finite', () => {
    fc.assert(
      fc.property(fc.array(observation, { maxLength: 60 }), (list) => {
        const state = skillState(skill, build(list), at(40));
        expect(state.uncertainty).toBeGreaterThanOrEqual(DEFAULT_LEARNER_CONFIG.minUncertainty);
        expect(state.uncertainty).toBeLessThanOrEqual(DEFAULT_LEARNER_CONFIG.initialUncertainty);
        expect(Number.isFinite(state.ability)).toBe(true);
      }),
      { numRuns: 500 },
    );
  });

  it('is never moved by an observation of weight 0', () => {
    fc.assert(
      fc.property(fc.array(observation, { maxLength: 30 }), observation, (list, extra) => {
        const evidence = build(list);
        const zero = build([{ ...extra, weight: 0 }]);
        const with0 = skillState(skill, [...evidence, ...zero], at(40));
        const without = skillState(skill, evidence, at(40));
        // It splits the days away around it in two: the same, but for floating-point rounding.
        expect(with0.ability).toBeCloseTo(without.ability, 12);
        expect(with0.uncertainty).toBeCloseTo(without.uncertainty, 12);
      }),
      { numRuns: 300 },
    );
  });
});
