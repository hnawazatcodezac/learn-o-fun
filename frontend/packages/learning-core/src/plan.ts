import type { ExperienceBand, ItemTemplate, LearningEvent } from '@learnofun/contracts';
import { rampLevels } from './templates';

/**
 * How a session's items are laid out (plan 4.2, ADR 0022): a warm-up, the core block, then a pool
 * of easy items, used only when the session needs one to end on a success.
 */
export interface SessionPlan {
  warmUp: number;
  core: number;
  ending: number;
}

/** The items a plan needs. */
export function planSize(plan: SessionPlan): number {
  return plan.warmUp + plan.core + plan.ending;
}

/** The items a child sees when no ending item is needed: the warm-up and the core block. */
export function plannedItems(plan: SessionPlan): number {
  return plan.warmUp + plan.core;
}

/** The core block alone, for items given in full, such as a game's development stories. */
export function corePlan(items: number): SessionPlan {
  return { warmUp: 0, core: items, ending: 0 };
}

/**
 * The shape of a session in each experience band (ADR 0022): two warm-ups, a core block of 4
 * items for ages 3–5 and 6 for ages 6–8, and two easy items in reserve to end on.
 */
export const SESSION_PLANS: Record<ExperienceBand, SessionPlan> = {
  'early-years': { warmUp: 2, core: 4, ending: 2 },
  'early-primary': { warmUp: 2, core: 6, ending: 2 },
};

/**
 * The template level of each item in a plan: the easiest level for the warm-up and the ending,
 * and a ramp through the levels for the core block. A placeholder until the in-session policy
 * chooses items (FRONTEND-KICKOFF step 13).
 */
export function planLevels(template: ItemTemplate, plan: SessionPlan): number[] {
  return [
    ...Array.from({ length: plan.warmUp }, () => 0),
    ...rampLevels(template, plan.core),
    ...Array.from({ length: plan.ending }, () => 0),
  ];
}

const RUNS = new Set<LearningEvent['type']>(['session_started', 'session_resumed']);
const STOPS = new Set<LearningEvent['type']>([
  'session_paused',
  'session_completed',
  'session_ended',
]);

/**
 * Active play in one session's events, in milliseconds: from its start or a resume to a pause,
 * its end or its completion (ADR 0022). Time paused does not count. A session still running counts
 * up to `now`, or to its last event when `now` is left out.
 */
export function activeMs(events: readonly LearningEvent[], now?: number): number {
  let total = 0;
  let since: number | undefined;
  let last: number | undefined;
  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    const at = Date.parse(event.occurredAt);
    last = at;
    if (RUNS.has(event.type)) {
      since ??= at;
    } else if (STOPS.has(event.type) && since !== undefined) {
      total += Math.max(0, at - since);
      since = undefined;
    }
  }
  if (since !== undefined) total += Math.max(0, (now ?? last ?? since) - since);
  return total;
}
