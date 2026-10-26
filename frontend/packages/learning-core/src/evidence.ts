import type { Item, ItemRole, LearningEvent } from '@learnofun/contracts';
import { grade } from './graders';

/** Plan 5.3's evidence weights (ADR 0030). */
export interface EvidenceWeights {
  /** A first answer with no help, on an item not seen in the last `recentDays`. */
  firstTry: number;
  /** A first answer after a hint or a worked example, right. */
  hintedRight: number;
  /** A first answer after a hint or a worked example, wrong. */
  hintedWrong: number;
  /** A second or later answer to the same item: it earns learning credit instead. */
  laterAttempt: number;
  /** A planned re-ask later in the session. */
  reAsk: number;
  /** An item already presented, in an earlier session, within `recentDays`. */
  seenRecently: number;
  recentDays: number;
  /** A scaffold item, toward the session's target skills; toward its own, its usual weight. */
  scaffoldTowardTarget: number;
}

/** The evidence a skill needs before it can be judged, and how answers weigh (plan 4.1, 5.3). */
export interface EvidenceConfig {
  /** Full-weight observations needed; below them, the dashboard says "early signal". */
  minFullWeight: number;
  /** Different items those observations are on. */
  minItems: number;
  weights: EvidenceWeights;
}

/** Plan 4.1's minimum, 8 full-weight observations on 6 different items, and plan 5.3's weights. */
export const DEFAULT_EVIDENCE_CONFIG: EvidenceConfig = {
  minFullWeight: 8,
  minItems: 6,
  weights: {
    firstTry: 1,
    hintedRight: 0.5,
    hintedWrong: 1,
    laterAttempt: 0,
    reAsk: 0.3,
    seenRecently: 0.3,
    recentDays: 14,
    scaffoldTowardTarget: 0,
  },
};

/** What is known about one answer, for its weight (plan 5.3). */
export interface WeighedAnswer {
  attempt: number;
  /** A hint or a worked example came before it. */
  helped: boolean;
  correct: boolean;
  role: ItemRole;
  /** The item was presented in an earlier session within the recent days. */
  seenRecently: boolean;
  /** The skill is one of the session's targets, and the item a scaffold toward it. */
  towardTarget: boolean;
}

/**
 * The weight an answer gives as evidence for a skill (plan 5.3, ADR 0030). When several rules
 * apply, the smallest wins, so no combination can add evidence. Response time never counts.
 */
export function answerWeight(
  answer: WeighedAnswer,
  weights: EvidenceWeights = DEFAULT_EVIDENCE_CONFIG.weights,
): number {
  const applying = [
    answer.helped ? (answer.correct ? weights.hintedRight : weights.hintedWrong) : weights.firstTry,
  ];
  if (answer.attempt > 1) applying.push(weights.laterAttempt);
  if (answer.role === 're-ask') applying.push(weights.reAsk);
  if (answer.seenRecently) applying.push(weights.seenRecently);
  if (answer.role === 'scaffold' && answer.towardTarget)
    applying.push(weights.scaffoldTowardTarget);
  return Math.min(...applying);
}

/** One answer as evidence for one skill. */
export interface Observation {
  skillId: string;
  itemId: string;
  sessionId: string;
  /** The session's activity, if the context says, for broad skills (plan 4.1). */
  activityId?: string;
  /** When the answer was given, in milliseconds. */
  at: number;
  correct: boolean;
  /** A first answer with no help: what parents see counted as first tries. */
  firstTry: boolean;
  weight: number;
  /** The item's difficulty b, and its guessing floor c (plan 4.1). */
  difficulty: number;
  guessFloor: number;
}

/**
 * The chance of being right by guessing: one over the options for single choice and audio
 * choice, nothing for items answered by making something (ADR 0031).
 */
export function guessFloor(item: Item): number {
  if (item.type === 'audio-choice') return 1 / item.options.length;
  if (item.type === 'choice' && !item.multiple) return 1 / item.options.length;
  return 0;
}

/** What the evidence functions need to know beyond the events. */
export interface EvidenceContext {
  /** Finds an item by its ID, as the server rebuilds it, to grade the answer again. */
  itemOf: (itemId: string) => Item | undefined;
  /** A session's target skills, for scaffold items. Without it, no skill is a target. */
  targetSkillsOf?: (sessionId: string) => readonly string[];
  /** A session's activity, for broad skills, which need evidence from 2 activities. */
  activityOf?: (sessionId: string) => string | undefined;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Every answer in a log of events as weighted evidence for each skill of its item (plan 5.3,
 * ADR 0030). Answers are graded again with the shared grader; one to an item `itemOf` cannot
 * find is left out, and skips give no evidence at all. Pure.
 */
export function observations(
  events: readonly LearningEvent[],
  context: EvidenceContext,
  config: EvidenceConfig = DEFAULT_EVIDENCE_CONFIG,
): Observation[] {
  const window = config.weights.recentDays * DAY_MS;
  // Where and when each item was presented, in any order of the log.
  const presentations = new Map<string, { sessionId: string; at: number }[]>();
  for (const event of events) {
    if (event.type !== 'item_presented') continue;
    const list = presentations.get(event.itemId) ?? [];
    list.push({ sessionId: event.sessionId, at: Date.parse(event.occurredAt) });
    presentations.set(event.itemId, list);
  }

  const found: Observation[] = [];
  const current = new Map<
    string,
    { itemId: string; role: ItemRole; at: number; hinted: boolean }
  >();
  for (const event of events) {
    switch (event.type) {
      case 'item_presented':
        current.set(event.sessionId, {
          itemId: event.itemId,
          role: event.role,
          at: Date.parse(event.occurredAt),
          hinted: false,
        });
        break;
      case 'hint_shown':
      case 'explanation_shown': {
        const shown = current.get(event.sessionId);
        if (shown?.itemId === event.itemId) shown.hinted = true;
        break;
      }
      case 'response_submitted': {
        const item = context.itemOf(event.itemId);
        if (!item) break;
        const shown = current.get(event.sessionId);
        const presentedAt =
          shown?.itemId === event.itemId ? shown.at : Date.parse(event.occurredAt);
        const seenRecently = (presentations.get(event.itemId) ?? []).some(
          (earlier) =>
            earlier.sessionId !== event.sessionId &&
            earlier.at < presentedAt &&
            presentedAt - earlier.at <= window,
        );
        const helped =
          event.support === 'hint' ||
          event.support === 'worked-example' ||
          (shown?.itemId === event.itemId && shown.hinted);
        const { correct } = grade(item, event.response);
        const targets = context.targetSkillsOf?.(event.sessionId) ?? [];
        for (const skillId of item.skillIds) {
          const activityId = context.activityOf?.(event.sessionId);
          found.push({
            skillId,
            itemId: item.id,
            sessionId: event.sessionId,
            ...(activityId === undefined ? {} : { activityId }),
            at: Date.parse(event.occurredAt),
            difficulty: item.difficulty,
            guessFloor: guessFloor(item),
            correct,
            firstTry: event.attempt === 1 && event.support === 'none',
            weight: answerWeight(
              {
                attempt: event.attempt,
                helped,
                correct,
                role: shown?.itemId === event.itemId ? shown.role : 'target',
                seenRecently,
                towardTarget: targets.includes(skillId),
              },
              config.weights,
            ),
          });
        }
        break;
      }
      default:
        break;
    }
  }
  return found;
}

/** What a child's answers so far say about one skill (ADR 0028, ADR 0030). */
export interface SkillEvidence {
  skillId: string;
  /** First answers given without any help: what parents see counted. */
  firstTries: number;
  /** How many of them were right, graded again with the shared grader. */
  firstTriesCorrect: number;
  /** Different items those first tries were on. */
  items: number;
  /** Sessions with at least one of them. */
  sessions: number;
  /** Observations at full weight, and the different items they are on (plan 4.1). */
  fullWeight: number;
  fullWeightItems: number;
  /** All the evidence, weighted (plan 5.3). */
  weight: number;
  /** Below the minimum of full-weight evidence: too little to judge yet. */
  earlySignal: boolean;
}

/** Evidence for a skill with no answers yet. */
export function noEvidence(skillId: string): SkillEvidence {
  return {
    skillId,
    firstTries: 0,
    firstTriesCorrect: 0,
    items: 0,
    sessions: 0,
    fullWeight: 0,
    fullWeightItems: 0,
    weight: 0,
    earlySignal: true,
  };
}

/**
 * Each skill's evidence in a log of events (ADR 0025, ADR 0028, ADR 0030): the first tries
 * parents see, and plan 5.3's weighted observations, with "early signal" below 8 at full weight
 * on 6 different items. Pure: the same events always give the same evidence.
 */
export function skillEvidence(
  events: readonly LearningEvent[],
  itemOf: (itemId: string) => Item | undefined,
  config: EvidenceConfig = DEFAULT_EVIDENCE_CONFIG,
  context: Omit<EvidenceContext, 'itemOf'> = {},
): Map<string, SkillEvidence> {
  const tallies = new Map<
    string,
    {
      first: Observation[];
      full: Observation[];
      weight: number;
    }
  >();
  for (const observation of observations(events, { ...context, itemOf }, config)) {
    const tally = tallies.get(observation.skillId) ?? { first: [], full: [], weight: 0 };
    if (observation.firstTry) tally.first.push(observation);
    if (observation.weight >= config.weights.firstTry) tally.full.push(observation);
    tally.weight += observation.weight;
    tallies.set(observation.skillId, tally);
  }
  return new Map(
    [...tallies].map(([skillId, tally]) => {
      const fullWeightItems = new Set(tally.full.map((o) => o.itemId)).size;
      return [
        skillId,
        {
          skillId,
          firstTries: tally.first.length,
          firstTriesCorrect: tally.first.filter((o) => o.correct).length,
          items: new Set(tally.first.map((o) => o.itemId)).size,
          sessions: new Set(tally.first.map((o) => o.sessionId)).size,
          fullWeight: tally.full.length,
          fullWeightItems,
          weight: tally.weight,
          earlySignal:
            tally.full.length < config.minFullWeight || fullWeightItems < config.minItems,
        },
      ];
    }),
  );
}
