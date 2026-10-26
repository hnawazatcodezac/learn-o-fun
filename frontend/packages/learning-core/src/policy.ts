import {
  MAX_ATTEMPTS,
  type EndReason,
  type ItemRole,
  type Mode,
  type SessionReason,
  type SupportLevel,
} from '@learnofun/contracts';
import type { GradeResult } from './graders';
import type { Ability } from './learner-model';
import type { SessionPlan } from './plan';

/** How one finished item went, for plan 4.2's windows and guards. */
export interface FinishedItem {
  index: number;
  /** The level it was made at, in a session made from levels. */
  level?: number;
  role: ItemRole;
  /** Right on the first answer with no help. */
  firstTry: boolean;
  /** A hint or a worked example was used. */
  supported: boolean;
  /** It ended in a right answer. */
  succeeded: boolean;
  skipped: boolean;
  /** How long the first answer took. */
  latencyMs?: number;
}

/** What a policy sees when deciding (plan 4.2). */
export interface PolicyView {
  mode: Mode;
  /** How the session's items are laid out: warm-up, core block and easy items to end on. */
  plan: SessionPlan;
  /** Items finished so far. */
  finished: number;
  /** The item finished last, and whether it ended in a correct answer. */
  last?: { index: number; succeeded: boolean };
  /** Time is up, the session's own or the day's (ADR 0022): end on a success, then stop. */
  wrappingUp: boolean;
  /** The item being answered, after an answer to it. */
  current?: { index: number; attempts: number; lastResult: GradeResult };
  /** Every item finished so far, in order. */
  history: readonly FinishedItem[];
  /** Items in the session so far: a fixed list's all, or those made so far. */
  itemCount: number;
  /** In a session made from levels: each level's typical difficulty, easiest first. */
  levels?: readonly number[];
  /** The child's ability on the session's target, kept up to date as they answer. */
  learner: Ability;
}

/**
 * Which item comes next, or that the session is over. `present` shows an item the session has;
 * `make` has the engine make a new one at a level (ADR 0032). Either can offer a break first.
 * A completion can end the session early, with its reason.
 */
export type NextDecision =
  | {
      kind: 'present';
      index: number;
      role: ItemRole;
      reason: SessionReason;
      offerBreak?: boolean;
    }
  | { kind: 'make'; level: number; role: ItemRole; reason: SessionReason; offerBreak?: boolean }
  | { kind: 'complete'; reason: SessionReason; ended?: EndReason };

/** After an answer: try the same item again with more support, or move on. */
export type ResponseDecision =
  | {
      kind: 'retry';
      support: Exclude<SupportLevel, 'none' | 'worked-example'>;
      reason: SessionReason;
    }
  | {
      kind: 'advance';
      support: Extract<SupportLevel, 'none' | 'worked-example'>;
      reason: SessionReason;
    };

/** The in-session policy (plan 4.2). Every decision carries a reason code; every policy a version. */
export interface SessionPolicy {
  version: string;
  chooseNext(view: PolicyView): NextDecision;
  afterResponse(
    view: PolicyView & { current: NonNullable<PolicyView['current']> },
  ): ResponseDecision;
}

export interface PlaceholderPolicyConfig {
  /** Attempts on one item before the worked "show me" (plan 4.2: three is the ceiling). */
  maxAttempts: number;
}

export const DEFAULT_PLACEHOLDER_CONFIG: PlaceholderPolicyConfig = { maxAttempts: MAX_ATTEMPTS };

/** placeholder-2 adds the session's shape: warm-up, core block, ending on a success (ADR 0022). */
export const PLACEHOLDER_POLICY_VERSION = 'placeholder-2';

const present = (index: number, role: ItemRole, reason: SessionReason): NextDecision => ({
  kind: 'present',
  index,
  role,
  reason,
});

/**
 * Stands in for the real policy until FRONTEND-KICKOFF step 13, behind the same interface. It
 * plays the warm-up, then the core block in order, and ends on a success: when the last item did
 * not end in a correct answer, it offers the plan's easy items until one is right or they run out
 * (plan 4.2, ADR 0022). When time is up, it skips to that ending. After a wrong answer: an
 * encouraging retry, then a hint, then a worked "show me" and the next item. Challenge mode allows
 * one attempt and no support.
 */
export function createPlaceholderPolicy(
  config: PlaceholderPolicyConfig = DEFAULT_PLACEHOLDER_CONFIG,
): SessionPolicy {
  return {
    version: PLACEHOLDER_POLICY_VERSION,
    chooseNext: ({ plan, last, wrappingUp }) => {
      const coreEnd = plan.warmUp + plan.core;
      const total = coreEnd + plan.ending;
      const complete: NextDecision = {
        kind: 'complete',
        reason: wrappingUp ? 'TIME_UP' : 'SESSION_COMPLETE',
      };
      const next = last === undefined ? 0 : last.index + 1;
      if (last !== undefined && last.index >= coreEnd) {
        // An ending item: stop on a success, or when the easy items run out.
        return last.succeeded || next >= total
          ? complete
          : present(next, 'ending', 'END_ON_SUCCESS');
      }
      if (wrappingUp || next >= coreEnd) {
        if (last === undefined || last.succeeded || coreEnd >= total) return complete;
        return present(coreEnd, 'ending', 'END_ON_SUCCESS');
      }
      return next < plan.warmUp
        ? present(next, 'warm-up', 'WARM_UP')
        : present(next, 'target', 'NEXT_IN_ORDER');
    },
    afterResponse: ({ mode, current }) => {
      if (current.lastResult.correct || mode === 'challenge') {
        return { kind: 'advance', support: 'none', reason: 'NEXT_IN_ORDER' };
      }
      if (current.attempts >= config.maxAttempts) {
        return { kind: 'advance', support: 'worked-example', reason: 'SHOW_ME' };
      }
      return current.attempts === 1
        ? { kind: 'retry', support: 'encouragement', reason: 'RETRY' }
        : { kind: 'retry', support: 'hint', reason: 'HINT' };
    },
  };
}
