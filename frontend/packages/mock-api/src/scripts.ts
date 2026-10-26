import type {
  Activity,
  Item,
  LearningEvent,
  LearningSession,
  NumericItem,
  Skill,
} from '@learnofun/contracts';
import {
  corePlan,
  createPlaceholderPolicy,
  createSessionEngine,
  seedRandom,
  type EngineResult,
} from '@learnofun/learning-core';
import type { ScriptOutcome, SessionScript } from './data';

/** Scripted sessions were never played in a game, so they name no game version of one. */
export const SCRIPTED_GAME_VERSION = '0.0.0';

/** How long a child takes over each step of a scripted item: to answer, and to read feedback. */
const STEP_MS = 15_000;

/** The answers a scripted item gets, in order, and whether it is skipped (ADR 0028). */
const ANSWERS: Record<ScriptOutcome, { answers: readonly boolean[]; skipped?: boolean }> = {
  'first-try': { answers: [true] },
  'second-try': { answers: [false, true] },
  // A second wrong answer brings a hint (plan 4.2); the third answer is right.
  hint: { answers: [false, false, true] },
  // A third wrong answer brings the worked example.
  'show-me': { answers: [false, false, false] },
  skipped: { answers: [], skipped: true },
};

export interface ScriptedHistory {
  sessions: LearningSession[];
  events: LearningEvent[];
  /** The generated items, by ID, so their answers can be graded again. */
  items: Map<string, Item>;
}

/**
 * A number item for a scripted answer, at its difficulty: the answer is its position, so every
 * item differs.
 */
function scriptItem(
  sessionNumber: number,
  position: number,
  skillId: string,
  difficulty: number,
): NumericItem {
  return {
    id: `script-${String(sessionNumber)}-item-${String(position)}`,
    type: 'numeric',
    skillIds: [skillId],
    difficulty,
    answer: { kind: 'decimal', value: position },
    tolerance: 0,
    acceptEquivalentFractions: false,
  };
}

const answer = (item: NumericItem, right: boolean) => ({
  type: 'numeric' as const,
  value: {
    kind: 'decimal' as const,
    value: item.answer.kind === 'decimal' ? item.answer.value + (right ? 0 : 1) : 0,
  },
});

/**
 * Plays the past-session scripts through the real session engine, with the placeholder policy
 * and generated number items, into sessions and learning events (ADR 0025, ADR 0028). The same
 * scripts always give the same sessions, events and IDs: each is seeded by its place in the list.
 */
export function playScripts(
  scripts: readonly SessionScript[],
  activities: readonly Activity[],
  skills: readonly Skill[],
  contentRelease: string,
): ScriptedHistory {
  const policy = createPlaceholderPolicy();
  const engine = createSessionEngine(policy);
  const history: ScriptedHistory = { sessions: [], events: [], items: new Map() };

  scripts.forEach((script, index) => {
    const sessionNumber = index + 1;
    const activity = activities.find((candidate) => candidate.id === script.activityId);
    if (!activity)
      throw new Error(`Script ${String(sessionNumber)}: no activity ${script.activityId}`);
    const planned = script.items.flatMap((group) =>
      group.outcomes.map((outcome) => ({
        skillId: group.skillId,
        outcome,
        difficulty:
          (skills.find((skill) => skill.id === group.skillId)?.masteryDifficulty ?? 0) +
          (group.aboveMastery ?? 0),
      })),
    );
    const items = planned.map((entry, position) =>
      scriptItem(sessionNumber, position + 1, entry.skillId, entry.difficulty),
    );
    for (const item of items) history.items.set(item.id, item);

    let now = Date.parse(script.startedAt);
    const tick = () => (now += STEP_MS);
    let result: EngineResult = engine.start(
      {
        childId: script.childId,
        activityId: activity.id,
        gameId: activity.gameId,
        gameVersion: SCRIPTED_GAME_VERSION,
        contentRelease,
        mode: script.mode,
      },
      items,
      seedRandom(sessionNumber),
      now,
      corePlan(items.length),
    );
    const events = [...result.events];

    while (result.step.kind === 'present') {
      const { item } = result.step;
      const position = items.findIndex((candidate) => candidate.id === item.id);
      const entry = planned[position];
      const scripted = items[position];
      if (!entry || !scripted)
        throw new Error(`Script ${String(sessionNumber)}: no item ${item.id}`);
      const { answers, skipped } = ANSWERS[entry.outcome];

      if (skipped) {
        result = engine.skip(result.state, tick());
        events.push(...result.events);
        continue;
      }
      for (const right of answers) {
        result = engine.respond(result.state, answer(scripted, right), tick());
        events.push(...result.events);
        if (result.step.kind === 'feedback' && result.step.then === 'advance') break;
      }
      result = engine.advance(result.state, tick());
      events.push(...result.events);
    }

    const last = events[events.length - 1];
    history.sessions.push({
      id: result.state.sessionId,
      childId: script.childId,
      activityId: activity.id,
      gameId: activity.gameId,
      gameVersion: SCRIPTED_GAME_VERSION,
      contentRelease,
      policyVersion: engine.policyVersion,
      mode: script.mode,
      status: 'completed',
      startedAt: script.startedAt,
      ...(last ? { endedAt: last.occurredAt } : {}),
    });
    history.events.push(...events);
  });

  return history;
}
