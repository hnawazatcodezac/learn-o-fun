import type { Skill, SkillStatus } from '@learnofun/contracts';
import type { Observation } from './evidence';

/** The learner model's version: stored with every state it produces (plan 3.3). */
export const LEARNER_MODEL_VERSION = 'elo-2';

/**
 * Plan 4.1's learner model, every number a starting default for a learning designer to tune
 * with real data (ADR 0031, ADR 0034).
 */
export interface LearnerConfig {
  /** Where a skill starts: ability θ and its uncertainty σ. σ never rises above where it starts. */
  initialAbility: number;
  initialUncertainty: number;
  /** σ never falls below this. */
  minUncertainty: number;
  /** A child changes as they practise and over time: σ² grows by this with each answer… */
  practiceVariance: number;
  /** …and by this for each day between answers. */
  dailyVariance: number;
  /** The gate: predicted success at the skill's mastery difficulty… */
  masteryChance: number;
  /** …judged on a cautious ability, this many σ below the estimate (ADR 0034). */
  masteryMargin: number;
  minFullWeight: number;
  minItems: number;
  minSessions: number;
  minDays: number;
  /** At least `recentRight` right of the `recentWindow` latest full-weight observations. */
  recentWindow: number;
  recentRight: number;
  /** Broad skills need evidence from this many activities. */
  broadActivities: number;
  /** Predicted success where Building and Strong begin. */
  buildingFrom: number;
  strongFrom: number;
  /** Days to each review after mastery, in turn (plan 4.1). */
  reviewDays: readonly number[];
  /** How much a failed review lowers θ. */
  reviewPenalty: number;
}

export const DEFAULT_LEARNER_CONFIG: LearnerConfig = {
  initialAbility: 0,
  initialUncertainty: 1.5,
  minUncertainty: 0.15,
  practiceVariance: 0.0005,
  dailyVariance: 0.001,
  masteryChance: 0.85,
  masteryMargin: 1,
  minFullWeight: 8,
  minItems: 6,
  minSessions: 2,
  minDays: 2,
  recentWindow: 5,
  recentRight: 4,
  broadActivities: 2,
  buildingFrom: 0.5,
  strongFrom: 0.7,
  reviewDays: [3, 7, 21, 60],
  reviewPenalty: 0.3,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** The chance of a right answer for ability θ on an item of difficulty b, guessing floor c. */
export function successChance(ability: number, difficulty: number, guessFloor = 0): number {
  return guessFloor + (1 - guessFloor) / (1 + Math.exp(-(ability - difficulty)));
}

/** Ability with its uncertainty: what one observation updates. */
export interface Ability {
  ability: number;
  uncertainty: number;
}

/** σ from a variance, kept between its floor and where a skill starts. */
function uncertaintyOf(variance: number, config: LearnerConfig): number {
  return Math.min(
    config.initialUncertainty,
    Math.max(config.minUncertainty, Math.sqrt(Math.max(0, variance))),
  );
}

/** The ability after days away: θ as before, σ wider (ADR 0034). */
export function abilityAfter(
  current: Ability,
  days: number,
  config: LearnerConfig = DEFAULT_LEARNER_CONFIG,
): Ability {
  if (days <= 0) return current;
  return {
    ...current,
    uncertainty: uncertaintyOf(current.uncertainty ** 2 + config.dailyVariance * days, config),
  };
}

/**
 * Plan 4.1's update for one observation, θ′ = θ + K(σ)·w·(x − P), with K from the information the
 * answer carries (ADR 0034): an answer the model was sure of moves it little, a surprising one
 * more, and K shrinks as σ shrinks. σ first widens a little, since the child changes as they
 * practise, then shrinks by what the answer shows. An observation of weight 0 changes nothing.
 * The session engine uses it to keep the ability up to date within a session, as the learner
 * model does over all of them (ADR 0032).
 */
export function updateAbility(
  current: Ability,
  observation: { weight: number; correct: boolean; difficulty: number; guessFloor: number },
  config: LearnerConfig = DEFAULT_LEARNER_CONFIG,
): Ability {
  const { weight, correct, difficulty, guessFloor } = observation;
  if (weight <= 0) return current;
  const before = uncertaintyOf(current.uncertainty ** 2 + config.practiceVariance, config) ** 2;
  // P = c + (1 − c)·L, with L the logistic chance of knowing; (dP/dθ) / (P(1 − P)) is L / P.
  const knows = 1 / (1 + Math.exp(-(current.ability - difficulty)));
  const chance = guessFloor + (1 - guessFloor) * knows;
  const ratio = chance > 0 ? knows / chance : 0;
  const information = weight * (1 - guessFloor) * knows * (1 - knows) * ratio;
  const variance = before / (1 + before * information);
  return {
    ability: current.ability + variance * weight * ratio * ((correct ? 1 : 0) - chance),
    uncertainty: uncertaintyOf(variance, config),
  };
}

/** One skill's state, as the model reads it from the evidence (plan 3.3, 4.1). */
export interface LearnerSkillState extends Ability {
  skillId: string;
  status: SkillStatus;
  /** When the gate first held, if it has. */
  masteredAt?: number;
  /** When the next review falls due, once mastered. */
  nextReviewAt?: number;
  /** The latest observation's time. */
  updatedAt?: number;
}

/** What else the model needs: the calendar day of a moment, in the child's time zone. */
export interface LearnerContext {
  dayOf?: (at: number) => string;
}

const utcDay = (at: number) => new Date(at).toISOString().slice(0, 10);

/** Whether plan 4.1's mastery gate holds, given the full-weight observations so far. */
function gateHolds(
  skill: Skill,
  ability: number,
  uncertainty: number,
  full: readonly Observation[],
  config: LearnerConfig,
  dayOf: (at: number) => string,
): boolean {
  const recent = full.slice(-config.recentWindow);
  return (
    successChance(ability - config.masteryMargin * uncertainty, skill.masteryDifficulty) >=
      config.masteryChance &&
    uncertainty < skill.uncertaintyThreshold &&
    full.length >= config.minFullWeight &&
    new Set(full.map((o) => o.itemId)).size >= config.minItems &&
    new Set(full.map((o) => o.sessionId)).size >= config.minSessions &&
    new Set(full.map((o) => dayOf(o.at))).size >= config.minDays &&
    recent.filter((o) => o.correct).length >= config.recentRight &&
    (!skill.broad ||
      new Set(full.flatMap((o) => (o.activityId ? [o.activityId] : []))).size >=
        config.broadActivities)
  );
}

/**
 * One skill's state from its observations and the time now (plan 4.1, ADR 0031, ADR 0034): the
 * Elo-style ability with uncertainty, the mastery gate and the review ladder. The uncertainty
 * grows with the days between answers, and up to now. Pure, and rebuilt the same every time from
 * the same evidence.
 */
export function skillState(
  skill: Skill,
  observations: readonly Observation[],
  now: number,
  config: LearnerConfig = DEFAULT_LEARNER_CONFIG,
  context: LearnerContext = {},
): LearnerSkillState {
  const dayOf = context.dayOf ?? utcDay;
  const ordered = observations
    .filter((o) => o.skillId === skill.id)
    .map((o, index) => ({ o, index }))
    .sort((a, b) => a.o.at - b.o.at || a.index - b.index)
    .map(({ o }) => o);

  let state: Ability = { ability: config.initialAbility, uncertainty: config.initialUncertainty };
  const full: Observation[] = [];
  let masteredAt: number | undefined;
  let nextReviewAt: number | undefined;
  let rung = 0;
  let reviewFailed = false;
  const reviewAfter = (at: number, index: number) =>
    at + (config.reviewDays[Math.min(index, config.reviewDays.length - 1)] ?? 0) * DAY_MS;

  let previous: number | undefined;
  for (const observation of ordered) {
    if (previous !== undefined) {
      state = abilityAfter(state, (observation.at - previous) / DAY_MS, config);
    }
    previous = observation.at;
    const fullWeight = observation.weight >= 1;
    // The first full-weight answer once a review is due is the review.
    if (masteredAt !== undefined && nextReviewAt !== undefined && fullWeight) {
      if (observation.at >= nextReviewAt || reviewFailed) {
        if (observation.correct) {
          if (!reviewFailed) rung += 1;
          reviewFailed = false;
          nextReviewAt = reviewAfter(observation.at, rung);
        } else if (!reviewFailed) {
          reviewFailed = true;
          state = { ...state, ability: state.ability - config.reviewPenalty };
        }
      }
    }
    state = updateAbility(state, observation, config);
    if (fullWeight) full.push(observation);
    if (
      masteredAt === undefined &&
      gateHolds(skill, state.ability, state.uncertainty, full, config, dayOf)
    ) {
      masteredAt = observation.at;
      rung = 0;
      nextReviewAt = reviewAfter(observation.at, rung);
    }
  }

  const last = ordered[ordered.length - 1];
  const base = {
    skillId: skill.id,
    ...(last ? abilityAfter(state, (now - last.at) / DAY_MS, config) : state),
    ...(last ? { updatedAt: last.at } : {}),
  };
  if (masteredAt !== undefined && nextReviewAt !== undefined) {
    const due = reviewFailed || now >= nextReviewAt;
    return { ...base, status: due ? 'review-due' : 'mastered', masteredAt, nextReviewAt };
  }
  if (ordered.length === 0) return { ...base, status: 'not-started' };
  const chance = successChance(state.ability, skill.masteryDifficulty);
  const early =
    full.length < config.minFullWeight || new Set(full.map((o) => o.itemId)).size < config.minItems;
  const status: SkillStatus =
    early || chance < config.buildingFrom
      ? 'exploring'
      : chance < config.strongFrom
        ? 'building'
        : 'strong';
  return { ...base, status };
}
