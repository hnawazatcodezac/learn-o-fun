import { MAX_ATTEMPTS, type ExperienceBand, type Mode } from '@learnofun/contracts';
import type { Ability } from './learner-model';
import { successChance } from './learner-model';
import {
  createPlaceholderPolicy,
  type FinishedItem,
  type NextDecision,
  type PolicyView,
  type SessionPolicy,
} from './policy';

/** A range of predicted success, from and to. */
export type Zone = readonly [from: number, to: number];

/** Plan 4.2's numbers, starting defaults for a learning designer to tune (ADR 0032). */
export interface AdaptiveConfig {
  /** The success zone for each mode and band. */
  practiceZones: Record<ExperienceBand, Zone>;
  challengeZone: Zone;
  /** Warm-ups and the item to end on aim at least this sure. */
  easyChance: number;
  /** Step up after `upRight` of the last `upWindow` right first time. */
  upWindow: number;
  upRight: number;
  /** Step down after `downInARow` errors in a row, or `downWrong` of the last `downWindow`. */
  downInARow: number;
  downWindow: number;
  downWrong: number;
  /** Items between changes of level. */
  minItemsBetweenChanges: number;
  /** A scaffold after this many supported items in a row. */
  scaffoldAfterSupported: number;
  maxScaffoldRun: number;
  maxScaffoldShare: number;
  /** A missed item comes back once, after `reAskAfter` to `reAskBy` others, never two in a row. */
  reAskAfter: number;
  reAskBy: number;
  /** First-try accuracy under this after scaffolding, over at least `lowAccuracyItems`, ends the block. */
  lowAccuracy: number;
  lowAccuracyItems: number;
  /** A wrong answer faster than this is faster than plausible reading. */
  plausibleMs: number;
  /** This many skips in a row, or an answer slower than `idleMs`, means the child has drifted. */
  skipsInARow: number;
  idleMs: number;
  maxAttempts: number;
}

export const DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
  practiceZones: { 'early-years': [0.8, 0.9], 'early-primary': [0.7, 0.85] },
  challengeZone: [0.6, 0.8],
  easyChance: 0.9,
  upWindow: 4,
  upRight: 3,
  downInARow: 2,
  downWindow: 5,
  downWrong: 3,
  minItemsBetweenChanges: 2,
  scaffoldAfterSupported: 2,
  maxScaffoldRun: 3,
  maxScaffoldShare: 0.3,
  reAskAfter: 2,
  reAskBy: 3,
  lowAccuracy: 0.4,
  lowAccuracyItems: 3,
  plausibleMs: 1500,
  skipsInARow: 2,
  idleMs: 60_000,
  maxAttempts: MAX_ATTEMPTS,
};

export const ADAPTIVE_POLICY_VERSION = 'adaptive-1';

/** The success zone for a mode and band (plan 4.2). */
export function zoneFor(mode: Mode, band: ExperienceBand, config: AdaptiveConfig): Zone {
  return mode === 'challenge' ? config.challengeZone : config.practiceZones[band];
}

/** The level whose predicted success sits in the zone, nearest its middle; else the nearest. */
export function levelForZone(learner: Ability, levels: readonly number[], zone: Zone): number {
  const middle = (zone[0] + zone[1]) / 2;
  let best = 0;
  let bestScore = Infinity;
  levels.forEach((difficulty, level) => {
    const chance = successChance(learner.ability, difficulty);
    const outside = chance < zone[0] ? zone[0] - chance : chance > zone[1] ? chance - zone[1] : 0;
    // Inside the zone beats outside it; then nearer the middle.
    const score = outside * 10 + Math.abs(chance - middle);
    if (score < bestScore) {
      best = level;
      bestScore = score;
    }
  });
  return best;
}

/** The hardest level still at least this sure, or the easiest. */
export function easyLevel(learner: Ability, levels: readonly number[], chance: number): number {
  let level = 0;
  levels.forEach((difficulty, index) => {
    if (successChance(learner.ability, difficulty) >= chance) level = index;
  });
  return level;
}

/** Answers on the target skill that the windows count: targets, and missed items asked again. */
const onTarget = (item: FinishedItem) => item.role === 'target' || item.role === 're-ask';

/**
 * The level for the next target item (plan 4.2): the first in the success zone, then moved only on
 * windows of first tries on the target, never single answers, and only once at least 2 of them
 * have passed at the level. The window gives the direction; the child's ability, kept up to date,
 * how far: at least one level, or as far as the zone now is.
 */
function nextTargetLevel(
  view: PolicyView,
  levels: readonly number[],
  zone: Zone,
  config: AdaptiveConfig,
): { level: number; changed: boolean } {
  const { history } = view;
  const targets = history.filter((item) => item.role === 'target');
  const last = targets[targets.length - 1];
  if (last?.level === undefined)
    return { level: levelForZone(view.learner, levels, zone), changed: false };
  const level = last.level;
  // The first target at this level, and the answers on the target since.
  let from = targets.length - 1;
  while (from > 0 && targets[from - 1]?.level === level) from -= 1;
  const since = history.slice(history.indexOf(targets[from] ?? last)).filter(onTarget).length;
  if (since < config.minItemsBetweenChanges) return { level, changed: false };

  const answered = history.filter((item) => onTarget(item) && !item.skipped);
  const recent = (n: number) => answered.slice(-n);
  const aimed = levelForZone(view.learner, levels, zone);
  const moveTo = (to: number) => ({ level: to, changed: to !== level });
  const up = recent(config.upWindow);
  if (up.length >= config.upWindow && up.filter((i) => i.firstTry).length >= config.upRight) {
    return moveTo(Math.min(levels.length - 1, Math.max(level + 1, aimed)));
  }
  const inARow = recent(config.downInARow);
  const down = recent(config.downWindow);
  if (
    (inARow.length >= config.downInARow && inARow.every((i) => !i.firstTry)) ||
    down.filter((i) => !i.firstTry).length >= config.downWrong
  ) {
    return moveTo(Math.max(0, Math.min(level - 1, aimed)));
  }
  return { level, changed: false };
}

/**
 * A missed target item due to be asked again (plan 4.2): once, after 2 or 3 other items, and not
 * straight after another re-ask. One missed too long ago is let go.
 */
function reAskDue(history: readonly FinishedItem[], config: AdaptiveConfig): number | undefined {
  if (history[history.length - 1]?.role === 're-ask') return undefined;
  const asked = new Set(history.filter((i) => i.role === 're-ask').map((i) => i.index));
  const position = history.findIndex((item, at) => {
    const others = history.length - 1 - at;
    return (
      item.role === 'target' &&
      !item.firstTry &&
      !item.skipped &&
      !asked.has(item.index) &&
      others >= config.reAskAfter &&
      others <= config.reAskBy
    );
  });
  return position === -1 ? undefined : history[position]?.index;
}

/** Whether a scaffold may go in now: not too many in a row, nor of the session (plan 4.2). */
function scaffoldAllowed(history: readonly FinishedItem[], config: AdaptiveConfig): boolean {
  let run = 0;
  for (let i = history.length - 1; i >= 0 && history[i]?.role === 'scaffold'; i -= 1) run += 1;
  const scaffolds = history.filter((i) => i.role === 'scaffold').length;
  return (
    run < config.maxScaffoldRun && (scaffolds + 1) / (history.length + 1) <= config.maxScaffoldShare
  );
}

/** First-try accuracy has stayed low even after scaffolding (plan 4.2): end the block. */
function stuck(history: readonly FinishedItem[], config: AdaptiveConfig): boolean {
  const firstScaffold = history.findIndex((i) => i.role === 'scaffold');
  if (firstScaffold === -1) return false;
  const since = history.slice(firstScaffold + 1).filter((i) => !i.skipped);
  if (since.length < config.lowAccuracyItems) return false;
  return since.filter((i) => i.firstTry).length / since.length < config.lowAccuracy;
}

/**
 * The child seems to have drifted (plan 4.2): a wrong answer faster than plausible reading, skips
 * in a row, or a long idle. A break is offered the first time only, never as a penalty.
 */
function drifted(history: readonly FinishedItem[], config: AdaptiveConfig): boolean {
  const triggered = (at: number) => {
    const item = history[at];
    if (!item) return false;
    const skips = history.slice(Math.max(0, at - config.skipsInARow + 1), at + 1);
    return (
      (!item.skipped && !item.firstTry && (item.latencyMs ?? Infinity) < config.plausibleMs) ||
      (skips.length >= config.skipsInARow && skips.every((i) => i.skipped)) ||
      (item.latencyMs ?? 0) > config.idleMs
    );
  };
  const first = history.findIndex((_, at) => triggered(at));
  return first !== -1 && first === history.length - 1;
}

/**
 * Plan 4.2's in-session policy (ADR 0032). In a session made from levels it warms up easy, aims
 * the core block at the success zone and steps difficulty on windows, scaffolds after supported
 * items and bridges back, asks a missed item again once, guards against loops, offers a break
 * when the child drifts, and ends on a success. A fixed list it plays in order, as before. Its
 * support ladder after a wrong answer is the same: a retry, a hint, then "show me".
 */
export function createAdaptivePolicy({
  band,
  config = DEFAULT_ADAPTIVE_CONFIG,
}: {
  band: ExperienceBand;
  config?: AdaptiveConfig;
}): SessionPolicy {
  const fixed = createPlaceholderPolicy({ maxAttempts: config.maxAttempts });
  return {
    version: ADAPTIVE_POLICY_VERSION,
    afterResponse: (view) => fixed.afterResponse(view),
    chooseNext: (view): NextDecision => {
      const { levels } = view;
      if (!levels) return fixed.chooseNext(view);
      const { plan, history, wrappingUp, learner } = view;
      const zone = zoneFor(view.mode, band, config);
      const easy = easyLevel(learner, levels, config.easyChance);
      const last = history[history.length - 1];
      const offerBreak = drifted(history, config) ? { offerBreak: true } : {};
      const complete = (reason: 'TIME_UP' | 'SESSION_COMPLETE'): NextDecision => ({
        kind: 'complete',
        reason,
      });
      const ending = (reason: 'END_ON_SUCCESS' | 'LOOP_GUARD'): NextDecision => ({
        kind: 'make',
        level: easy,
        role: 'ending',
        reason,
      });
      const endings = history.filter((i) => i.role === 'ending').length;

      // Ending on a success: after the core block, when time is up, or when the loop guard stops it.
      if (last?.role === 'ending') {
        if (last.succeeded || endings >= plan.ending) {
          return stuck(history, config)
            ? { kind: 'complete', reason: 'LOOP_GUARD', ended: 'activity-switched' }
            : complete(wrappingUp ? 'TIME_UP' : 'SESSION_COMPLETE');
        }
        return ending(stuck(history, config) ? 'LOOP_GUARD' : 'END_ON_SUCCESS');
      }
      const coreDone = history.length >= plan.warmUp + plan.core;
      if (stuck(history, config)) {
        return last?.succeeded || plan.ending === 0
          ? { kind: 'complete', reason: 'LOOP_GUARD', ended: 'activity-switched' }
          : ending('LOOP_GUARD');
      }
      if (wrappingUp || coreDone) {
        if (last === undefined || last.succeeded || plan.ending === 0) {
          return complete(wrappingUp ? 'TIME_UP' : 'SESSION_COMPLETE');
        }
        return ending('END_ON_SUCCESS');
      }

      // The warm-up: easy items.
      if (history.length < plan.warmUp) {
        return { kind: 'make', level: easy, role: 'warm-up', reason: 'WARM_UP', ...offerBreak };
      }

      // A scaffold after supported items, then a bridge back (plan 4.2).
      if (last?.role === 'scaffold') {
        const target = nextTargetLevel(view, levels, zone, config).level;
        return {
          kind: 'make',
          level: Math.max(0, target - 1),
          role: 'bridge',
          reason: 'BRIDGE',
          ...offerBreak,
        };
      }
      const recent = history.slice(-config.scaffoldAfterSupported);
      if (
        recent.length >= config.scaffoldAfterSupported &&
        recent.every((i) => i.supported && onTarget(i)) &&
        scaffoldAllowed(history, config)
      ) {
        return { kind: 'make', level: 0, role: 'scaffold', reason: 'SCAFFOLD', ...offerBreak };
      }

      // A missed item, once, a few items later.
      const reAsk = reAskDue(history, config);
      if (reAsk !== undefined) {
        return { kind: 'present', index: reAsk, role: 're-ask', reason: 'RE_ASK', ...offerBreak };
      }

      const { level, changed } = nextTargetLevel(view, levels, zone, config);
      return {
        kind: 'make',
        level,
        role: 'target',
        reason: changed ? 'DIFFICULTY_STEP' : 'SUCCESS_ZONE',
        ...offerBreak,
      };
    },
  };
}
