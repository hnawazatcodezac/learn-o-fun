import { createRandom, deriveSeed } from '@learnofun/learning-core';

/**
 * A synthetic child with a known true ability on one skill (plan 4.6), so the simulator can say
 * whether the learner model's verdicts are right.
 */
export interface SyntheticLearner {
  id: number;
  seed: number;
  /** True ability θ* before any practice, on the item-difficulty scale. */
  ability: number;
  /** How much true ability grows with each item practised. */
  learningRate: number;
  /** The chance of a wrong answer the child knows, and of a lucky guess on one they don't. */
  slip: number;
  guess: number;
  /** True ability lost for each day away. */
  forgetting: number;
  /** The chance of skipping an item. */
  skipChance: number;
}

/** A range a parameter is drawn from, evenly. */
export type Range = readonly [min: number, max: number];

/** How the synthetic children are drawn: a spread from struggling to well ahead. */
export interface PopulationConfig {
  size: number;
  seed: number;
  /** True starting ability, relative to the skill's mastery difficulty. */
  ability: Range;
  learningRate: Range;
  slip: Range;
  guess: Range;
  forgetting: Range;
  skipChance: Range;
}

export const DEFAULT_POPULATION: PopulationConfig = {
  size: 2000,
  seed: 20261022,
  ability: [-2.5, 3],
  learningRate: [0, 0.06],
  slip: [0.02, 0.1],
  guess: [0, 0.15],
  forgetting: [0, 0.03],
  skipChance: [0, 0.05],
};

/**
 * The kinds of children every required gate must pass for (ADR 0034): the same children learning
 * fast, slowly, or not at all, so a model tuned for one cannot hide its errors in the others.
 */
export const POPULATIONS: Readonly<Record<string, PopulationConfig>> = {
  'fast learners': DEFAULT_POPULATION,
  'slow learners': { ...DEFAULT_POPULATION, learningRate: [0, 0.02] },
  'not learning': { ...DEFAULT_POPULATION, learningRate: [0, 0] },
};

/** The synthetic children, the same for the same config every time. */
export function population(
  config: PopulationConfig,
  masteryDifficulty: number,
): SyntheticLearner[] {
  const random = createRandom(config.seed);
  const draw = ([min, max]: Range) => min + random.next() * (max - min);
  return Array.from({ length: config.size }, (_, id) => ({
    id,
    seed: deriveSeed(config.seed, `learner-${String(id)}`),
    ability: masteryDifficulty + draw(config.ability),
    learningRate: draw(config.learningRate),
    slip: draw(config.slip),
    guess: draw(config.guess),
    forgetting: draw(config.forgetting),
    skipChance: draw(config.skipChance),
  }));
}

/** The chance a synthetic child answers an item of difficulty b right (plan 4.6). */
export function trueChance(learner: SyntheticLearner, ability: number, difficulty: number): number {
  const knows = 1 / (1 + Math.exp(-(ability - difficulty)));
  return learner.guess + (1 - learner.guess - learner.slip) * knows;
}
