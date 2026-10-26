import { DEFAULT_LEARNER_CONFIG } from '@learnofun/learning-core';
import { expect, it } from 'vitest';
import { formatReport, gates } from './gates';
import { population, POPULATIONS } from './population';
import { DEFAULT_SIMULATION, simulate } from './simulate';

/*
 * `npm run sim`: thousands of synthetic children through the real engine, policy and learner
 * model (plan 4.6, ADR 0031), for each kind of child (ADR 0034). A required gate that fails for
 * any of them fails CI. The success zone is reported until a learning designer sets a target the
 * evidence allows (ADR 0033, ADR 0034). No gate is ever loosened to pass.
 */
for (const [name, config] of Object.entries(POPULATIONS)) {
  it(`passes every required release gate: ${name}`, () => {
    const learners = population(config, DEFAULT_SIMULATION.skill.masteryDifficulty);
    const report = simulate(learners, DEFAULT_SIMULATION, DEFAULT_LEARNER_CONFIG.masteryChance);
    const results = gates(report);
    console.log(`\n${name}\n${formatReport(report, results)}\n`);

    for (const gate of results.filter((g) => g.required)) {
      expect(
        gate.passes,
        `${name}, ${gate.name}: ${String(gate.value)}, needs ${gate.target}`,
      ).toBe(true);
    }
  });
}
