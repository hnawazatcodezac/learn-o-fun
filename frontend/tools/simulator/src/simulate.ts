import type { ExperienceBand, LearningEvent, NumericItem, Skill } from '@learnofun/contracts';
import {
  createAdaptivePolicy,
  createRandom,
  createSessionEngine,
  DEFAULT_ADAPTIVE_CONFIG,
  DEFAULT_LEARNER_CONFIG,
  observations,
  seedRandom,
  SESSION_PLANS,
  skillState,
  zoneFor,
  type AdaptiveConfig,
  type EngineResult,
  type ItemMaker,
  type LearnerConfig,
  type SessionPlan,
} from '@learnofun/learning-core';
import { trueChance, type SyntheticLearner } from './population';

const DAY_MS = 24 * 60 * 60 * 1000;
const START = Date.UTC(2026, 8, 1, 15, 0);

/** How each synthetic child plays (plan 4.6, ADR 0031). */
export interface SimulationConfig {
  /** The skill practised: its mastery difficulty and uncertainty threshold count. */
  skill: Skill;
  sessions: number;
  daysBetween: number;
  /** The experience band, for the session's shape and the success zone (plan 4.2). */
  band: ExperienceBand;
  plan: SessionPlan;
  /**
   * The skill's levels, easiest first, as difficulties relative to the mastery difficulty. They
   * span every synthetic child's ability, so the gates measure the policy, not the content's
   * range: a skill far too easy for a child is the planner's to move on from (plan 4.3).
   */
  levels: readonly number[];
  /** Items made at a level spread this widely around its typical difficulty. */
  levelSpread: number;
  /** How long a child takes over each step: an answer, or reading feedback. */
  stepMs: number;
  /** More than this many scaffold items in a row, or this share of a session, is a loop (plan 4.2). */
  maxScaffoldRun: number;
  maxScaffoldShare: number;
  /** The policy and learner model under test, so a change can be compared before any child sees it. */
  policy: AdaptiveConfig;
  learner: LearnerConfig;
}

export const DEFAULT_SIMULATION: SimulationConfig = {
  skill: {
    id: 'simulated-skill',
    subjectId: 'mathematics',
    strand: 'addition-and-subtraction',
    title: { en: 'A simulated skill' },
    masteryDifficulty: 0,
    uncertaintyThreshold: 0.35,
    broad: false,
    fluency: false,
  },
  sessions: 12,
  daysBetween: 2,
  band: 'early-primary',
  plan: SESSION_PLANS['early-primary'],
  levels: Array.from({ length: 41 }, (_, level) => -5 + level * 0.35),
  levelSpread: 0.2,
  stepMs: 15_000,
  maxScaffoldRun: 3,
  maxScaffoldShare: 0.3,
  policy: DEFAULT_ADAPTIVE_CONFIG,
  learner: DEFAULT_LEARNER_CONFIG,
};

/** What happened to one synthetic child. */
export interface LearnerResult {
  learnerId: number;
  /** The item count when the model first said Mastered, if it did. */
  itemsToMastery?: number;
  /** The child's true chance at the mastery difficulty at that moment, without slips or guesses. */
  trueChanceAtMastery?: number;
  presented: number;
  /** Items whose true chance of success, when shown, was inside the success zone. */
  inZone: number;
  /** The same for the items the policy aims at the zone: the core block's targets (plan 4.2). */
  targets: number;
  targetsInZone: number;
  sessions: number;
  scaffoldLoopSessions: number;
  /** Runs of 3 or more first-try errors in a row, over all sessions. */
  errorStreaks: number;
}

const logistic = (z: number) => 1 / (1 + Math.exp(-z));

/** A number item for the simulation; its answer is its position, so every item differs. */
function simulatedItem(
  id: string,
  skillId: string,
  difficulty: number,
  answer: number,
): NumericItem {
  return {
    id,
    type: 'numeric',
    skillIds: [skillId],
    difficulty,
    answer: { kind: 'decimal', value: answer },
    tolerance: 0,
    acceptEquivalentFractions: false,
  };
}

/**
 * Makes the skill's items at a level, as a template does: each one new, its answer its own, its
 * difficulty spread a little around the level's.
 */
function simulatedMaker(config: SimulationConfig, prefix: string): ItemMaker {
  const { skill, levels, levelSpread } = config;
  const levelDifficulty = levels.map((offset) => skill.masteryDifficulty + offset);
  return {
    levelDifficulty,
    make: (level, seed, used) => {
      let n = 0;
      while (used.has(`${prefix}-${String(seed)}-${String(n)}`)) n += 1;
      const spread = ((seed % 1000) / 999 - 0.5) * levelSpread;
      return simulatedItem(
        `${prefix}-${String(seed)}-${String(n)}`,
        skill.id,
        (levelDifficulty[level] ?? skill.masteryDifficulty) + spread,
        (seed % 97) + 1,
      );
    },
  };
}

/**
 * Plays one synthetic child through every session with the real engine and policy, items made
 * as the policy asks (ADR 0032), and reads the events with the learner model after each, as the
 * server would (ADR 0031). Each session starts from the model's ability so far. The same child
 * and config always play out the same.
 */
export function simulateLearner(
  learner: SyntheticLearner,
  config: SimulationConfig,
): LearnerResult {
  const { skill } = config;
  const policy = createAdaptivePolicy({ band: config.band, config: config.policy });
  const zone = zoneFor('practice', config.band, config.policy);
  const random = createRandom(learner.seed);
  const items = new Map<string, NumericItem>();
  const events: LearningEvent[] = [];
  /** The child's true ability over time, to judge the model's verdict when it comes. */
  const abilityAt: { at: number; ability: number }[] = [];
  let ability = learner.ability;
  const result: LearnerResult = {
    learnerId: learner.id,
    presented: 0,
    inZone: 0,
    targets: 0,
    targetsInZone: 0,
    sessions: 0,
    scaffoldLoopSessions: 0,
    errorStreaks: 0,
  };

  // Scaffolds stand in for a prerequisite: they count toward it, never toward the target.
  const context = { itemOf: (id: string) => items.get(id), targetSkillsOf: () => [skill.id] };
  const modelNow = (now: number) =>
    skillState(skill, observations(events, context), now, config.learner);

  for (let session = 0; session < config.sessions; session += 1) {
    if (session > 0) ability -= learner.forgetting * config.daysBetween;
    let now = START + session * config.daysBetween * DAY_MS;
    const tick = () => (now += config.stepMs);
    const engine = createSessionEngine(policy, {
      maker: simulatedMaker(config, `sim-${String(learner.id)}-${String(session)}`),
      learner: config.learner,
    });
    const known = modelNow(now);

    let step: EngineResult = engine.start(
      {
        childId: '0192f4c1-0000-7000-8000-00000000c999',
        activityId: 'simulated-activity',
        gameId: 'simulated-game',
        gameVersion: '0.0.0',
        contentRelease: 'simulation',
        mode: 'practice',
      },
      [],
      seedRandom(learner.seed + session),
      now,
      config.plan,
      { ability: known.ability, uncertainty: known.uncertainty },
    );
    events.push(...step.events);
    let run = 0;
    let errorRun = 0;
    let scaffolds = 0;
    let longestScaffoldRun = 0;
    let shown = 0;

    while (step.step.kind === 'present') {
      const { item, role } = step.step;
      if (item.type !== 'numeric' || item.answer.kind !== 'decimal') break;
      items.set(item.id, item);
      const answer = item.answer.value;
      shown += 1;
      result.presented += 1;
      const chance = trueChance(learner, ability, item.difficulty);
      const inZone = chance >= zone[0] && chance <= zone[1];
      if (inZone) result.inZone += 1;
      if (role === 'target') {
        result.targets += 1;
        if (inZone) result.targetsInZone += 1;
      }
      run = role === 'scaffold' ? run + 1 : 0;
      if (role === 'scaffold') scaffolds += 1;
      longestScaffoldRun = Math.max(longestScaffoldRun, run);

      if (random.next() < learner.skipChance) {
        errorRun = 0;
        step = engine.skip(step.state, tick());
        events.push(...step.events);
        continue;
      }
      let first = true;
      for (;;) {
        const right = random.next() < chance;
        if (first) {
          errorRun = right ? 0 : errorRun + 1;
          if (errorRun === 3) result.errorStreaks += 1;
          first = false;
        }
        step = engine.respond(
          step.state,
          { type: 'numeric', value: { kind: 'decimal', value: answer + (right ? 0 : 1) } },
          tick(),
        );
        events.push(...step.events);
        if (step.step.kind !== 'feedback' || step.step.then === 'advance') break;
      }
      // Practising the item teaches a little, whatever the outcome.
      ability += learner.learningRate;
      abilityAt.push({ at: now, ability });
      step = engine.advance(step.state, tick());
      events.push(...step.events);
    }

    result.sessions += 1;
    if (
      longestScaffoldRun > config.maxScaffoldRun ||
      (shown > 0 && scaffolds / shown > config.maxScaffoldShare)
    ) {
      result.scaffoldLoopSessions += 1;
    }

    if (result.itemsToMastery === undefined) {
      const state = modelNow(now);
      if (state.masteredAt !== undefined) {
        const masteredAt = state.masteredAt;
        const then = abilityAt.filter((entry) => entry.at <= masteredAt).at(-1)?.ability ?? ability;
        result.itemsToMastery = result.presented;
        result.trueChanceAtMastery = logistic(then - skill.masteryDifficulty);
      }
    }
  }
  return result;
}

/** What the simulator measures over every synthetic child (plan 4.6). */
export interface SimulationReport {
  learners: number;
  mastered: number;
  /** Of the skills marked Mastered, the share whose true chance was under the mastery chance. */
  falseMastery: number;
  successZone: number;
  /** The same over the core block's targets alone, the items the policy aims at the zone. */
  targetsInZone: number;
  scaffoldLoops: number;
  errorStreaksPerSession: number;
  /** The median items to mastery, to compare versions. */
  itemsToMastery: number | undefined;
}

export function simulate(
  learners: readonly SyntheticLearner[],
  config: SimulationConfig,
  masteryChance: number,
): SimulationReport {
  const results = learners.map((learner) => simulateLearner(learner, config));
  const mastered = results.filter((r) => r.trueChanceAtMastery !== undefined);
  const falselyMastered = mastered.filter((r) => (r.trueChanceAtMastery ?? 1) < masteryChance);
  const presented = results.reduce((sum, r) => sum + r.presented, 0);
  const targets = results.reduce((sum, r) => sum + r.targets, 0);
  const sessions = results.reduce((sum, r) => sum + r.sessions, 0);
  const toMastery = mastered.map((r) => r.itemsToMastery ?? 0).sort((a, b) => a - b);
  return {
    learners: results.length,
    mastered: mastered.length,
    falseMastery: mastered.length === 0 ? 1 : falselyMastered.length / mastered.length,
    successZone: presented === 0 ? 0 : results.reduce((s, r) => s + r.inZone, 0) / presented,
    targetsInZone: targets === 0 ? 0 : results.reduce((s, r) => s + r.targetsInZone, 0) / targets,
    scaffoldLoops:
      sessions === 0 ? 0 : results.reduce((s, r) => s + r.scaffoldLoopSessions, 0) / sessions,
    errorStreaksPerSession:
      sessions === 0 ? 0 : results.reduce((s, r) => s + r.errorStreaks, 0) / sessions,
    itemsToMastery: toMastery[Math.floor(toMastery.length / 2)],
  };
}
