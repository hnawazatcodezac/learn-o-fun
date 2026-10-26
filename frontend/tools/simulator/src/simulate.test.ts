import { DEFAULT_LEARNER_CONFIG, planSize } from '@learnofun/learning-core';
import { describe, expect, it } from 'vitest';
import { formatReport, gates } from './gates';
import {
  DEFAULT_POPULATION,
  population,
  POPULATIONS,
  trueChance,
  type SyntheticLearner,
} from './population';
import { DEFAULT_SIMULATION, simulate, simulateLearner, type SimulationReport } from './simulate';

const B = DEFAULT_SIMULATION.skill.masteryDifficulty;

const learner = (overrides: Partial<SyntheticLearner> = {}): SyntheticLearner => ({
  id: 1,
  seed: 7,
  ability: B,
  learningRate: 0,
  slip: 0,
  guess: 0,
  forgetting: 0,
  skipChance: 0,
  ...overrides,
});

describe('the synthetic population (plan 4.6)', () => {
  it('is the same every time for the same config, within its ranges', () => {
    const config = { ...DEFAULT_POPULATION, size: 50 };
    const first = population(config, B);

    expect(population(config, B)).toEqual(first);
    for (const child of first) {
      expect(child.ability - B).toBeGreaterThanOrEqual(config.ability[0]);
      expect(child.ability - B).toBeLessThanOrEqual(config.ability[1]);
      expect(child.slip).toBeLessThanOrEqual(config.slip[1]);
      expect(child.skipChance).toBeLessThanOrEqual(config.skipChance[1]);
    }
  });

  it('comes as fast, slow and non-learning children: the same children, learning at different rates', () => {
    const groups = Object.entries(POPULATIONS).map(([name, config]) => ({
      name,
      children: population({ ...config, size: 50 }, B),
    }));
    expect(groups.map((group) => group.name)).toEqual([
      'fast learners',
      'slow learners',
      'not learning',
    ]);
    const [fast, slow, still] = groups.map((group) => group.children);
    expect(slow?.map((child) => child.ability)).toEqual(fast?.map((child) => child.ability));
    expect(Math.max(...(slow ?? []).map((child) => child.learningRate))).toBeLessThanOrEqual(0.02);
    expect(still?.every((child) => child.learningRate === 0)).toBe(true);
  });

  it('answers right by knowing, with slips and lucky guesses at the edges', () => {
    const child = learner({ slip: 0.1, guess: 0.2 });
    expect(trueChance(child, -20, 0)).toBeCloseTo(0.2, 6);
    expect(trueChance(child, 20, 0)).toBeCloseTo(0.9, 6);
    expect(trueChance(learner(), 0, 0)).toBe(0.5);
  });
});

describe('simulateLearner', () => {
  it('plays out the same every time for the same child', () => {
    const child = learner({ ability: B + 1, learningRate: 0.02, slip: 0.05, skipChance: 0.05 });
    expect(simulateLearner(child, DEFAULT_SIMULATION)).toEqual(
      simulateLearner(child, DEFAULT_SIMULATION),
    );
  });

  it('masters the skill for a child well ahead of it, truly able at that moment', () => {
    const result = simulateLearner(learner({ ability: B + 4 }), DEFAULT_SIMULATION);
    expect(result.itemsToMastery).toBeDefined();
    expect(result.trueChanceAtMastery).toBeGreaterThanOrEqual(DEFAULT_LEARNER_CONFIG.masteryChance);
  });

  it('never masters it for a child far from it who does not learn', () => {
    const result = simulateLearner(learner({ ability: B - 3 }), DEFAULT_SIMULATION);
    expect(result.itemsToMastery).toBeUndefined();
    expect(result.sessions).toBe(DEFAULT_SIMULATION.sessions);
    expect(result.presented).toBeLessThanOrEqual(
      DEFAULT_SIMULATION.sessions * planSize(DEFAULT_SIMULATION.plan),
    );
  });

  it('plays the adaptive policy, its targets aimed at the success zone', () => {
    const result = simulateLearner(learner({ ability: B + 1 }), DEFAULT_SIMULATION);
    expect(result.targets).toBeGreaterThan(0);
    expect(result.targetsInZone).toBeLessThanOrEqual(result.targets);
    expect(result.inZone).toBeLessThanOrEqual(result.presented);
  });

  it('counts a streak of 3 first-try errors once, however long it runs', () => {
    const result = simulateLearner(learner({ ability: B - 30 }), {
      ...DEFAULT_SIMULATION,
      sessions: 1,
    });
    expect(result.errorStreaks).toBe(1);
  });
});

describe('the release gates (plan 4.6, ADR 0031, ADR 0033)', () => {
  const report = (overrides: Partial<SimulationReport> = {}): SimulationReport => ({
    learners: 100,
    mastered: 40,
    falseMastery: 0.01,
    successZone: 0.75,
    targetsInZone: 0.75,
    scaffoldLoops: 0,
    errorStreaksPerSession: 0.2,
    itemsToMastery: 60,
    ...overrides,
  });

  it('requires every gate but the success zone, which is reported until step 13b', () => {
    const results = gates(report());
    expect(results.filter((g) => g.required).map((g) => g.name)).toEqual([
      'False mastery',
      'Sessions with a scaffold loop',
      'Streaks of 3 first-try errors per session',
    ]);
    expect(results.every((g) => g.passes)).toBe(true);
    expect(gates(report({ falseMastery: 0.05 }))[0]?.passes).toBe(false);
  });

  it('fails false mastery when nobody masters anything: no evidence is no pass', () => {
    expect(gates(report({ mastered: 0, falseMastery: 0 }))[0]?.passes).toBe(false);
  });

  it('judges each policy gate at its plan 4.6 target, the zone on the core block’s targets', () => {
    const [, zone, loops, streaks] = gates(
      report({ targetsInZone: 0.69, scaffoldLoops: 0.02, errorStreaksPerSession: 1 }),
    );
    expect([zone?.passes, loops?.passes, streaks?.passes]).toEqual([false, false, false]);
    // Warm-ups and endings are easy on purpose: they never count for or against it.
    expect(gates(report({ successZone: 0.2, targetsInZone: 0.7 }))[1]?.passes).toBe(true);
  });

  it('prints every gate with its verdict, a failing reported one marked as failing', () => {
    const measured = report({ successZone: 0.2, targetsInZone: 0.31, scaffoldLoops: 0.05 });
    const text = formatReport(measured, gates(measured));
    expect(text).toContain('Every item in the success zone, warm-ups and endings included: 20.0%');
    expect(text).toContain('required  False mastery: 1.0% (under 5%) — pass');
    expect(text).toContain(
      'reported  Core-block targets in the success zone: 31.0% (at least 70%) — FAIL, not yet required',
    );
    expect(text).toContain('required  Sessions with a scaffold loop: 5.0% (under 2%) — FAIL');
  });

  // 300 children take a few seconds, more when every package's tests run at once.
  it('catches a careless mastery gate: false mastery climbs past 5%', { timeout: 30_000 }, () => {
    const learners = population({ ...DEFAULT_POPULATION, size: 300 }, B);
    const careless = {
      ...DEFAULT_SIMULATION,
      learner: {
        ...DEFAULT_LEARNER_CONFIG,
        masteryChance: 0.6,
        minFullWeight: 3,
        minItems: 3,
        minSessions: 1,
        minDays: 1,
        recentRight: 3,
      },
    };
    const measured = simulate(learners, careless, DEFAULT_LEARNER_CONFIG.masteryChance);
    expect(measured.falseMastery).toBeGreaterThan(0.05);
    expect(gates(measured)[0]?.passes).toBe(false);
  });

  it('measures a small population end to end', () => {
    const learners = population({ ...DEFAULT_POPULATION, size: 40 }, B);
    const measured = simulate(learners, DEFAULT_SIMULATION, DEFAULT_LEARNER_CONFIG.masteryChance);
    expect(measured.learners).toBe(40);
    expect(measured.successZone).toBeGreaterThanOrEqual(0);
    expect(measured.successZone).toBeLessThanOrEqual(1);
    expect(measured.targetsInZone).toBeGreaterThanOrEqual(0);
    expect(measured.targetsInZone).toBeLessThanOrEqual(1);
  });
});
