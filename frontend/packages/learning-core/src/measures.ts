import type { Item, LearningEvent } from '@learnofun/contracts';
import { grade } from './graders';

/** The thresholds behind plan 5.2's session measures. */
export interface MeasuresConfig {
  /** A gap between events longer than this is idle, and left out of time on task. */
  idleMs: number;
  /** How long an unfinished session can carry on before it expires (ADR 0023). */
  resumableMs: number;
}

export const DEFAULT_MEASURES_CONFIG: MeasuresConfig = {
  idleMs: 30_000,
  resumableMs: 24 * 60 * 60 * 1000,
};

/** How one question went (ADR 0029). */
export type ItemOutcome =
  'first-try' | 'later-try' | 'with-hint' | 'shown-how' | 'not-yet' | 'skipped' | 'unanswered';

/** Plan 5.2's session status, from the session's own end events and the time now. */
export type MeasuredStatus = 'completed' | 'ended-early' | 'interrupted' | 'expired';

export interface ItemResult {
  itemId: string;
  skillIds: string[];
  outcome: ItemOutcome;
}

/** Plan 5.2's canonical measures of one session (ADR 0029). */
export interface SessionMeasures {
  status: MeasuredStatus;
  /** Items shown. */
  presented: number;
  /** Items with at least one answer. */
  attempted: number;
  skipped: number;
  /** Shown, but neither answered nor skipped before the session ended: plan 5.2's "abandoned". */
  unanswered: number;
  /** Right on the first answer with no help: the headline accuracy, out of `attempted`. */
  firstTryCorrect: number;
  /** Right in the end, out of `attempted`. */
  eventuallyCorrect: number;
  /** A hint or a worked example was used, out of `attempted`. */
  supported: number;
  /** Wrong at first and right later: perseverance, never mastery. */
  learningCredit: number;
  /** Active play: pauses and idle gaps left out. */
  timeOnTaskMs: number;
  /** Each item, in the order shown. */
  items: ItemResult[];
}

interface Tally {
  skillIds: string[];
  answers: { attempt: number; correct: boolean; helped: boolean }[];
  hinted: boolean;
  shown: boolean;
  skipped: boolean;
}

function outcomeOf(tally: Tally): ItemOutcome {
  const [first] = tally.answers;
  if (tally.skipped) return 'skipped';
  if (!first) return 'unanswered';
  if (tally.shown) return 'shown-how';
  if (first.attempt === 1 && !first.helped && first.correct) return 'first-try';
  if (!tally.answers.some((answer) => answer.correct)) return 'not-yet';
  return tally.hinted || tally.answers.some((answer) => answer.helped) ? 'with-hint' : 'later-try';
}

/**
 * Plan 5.2's measures of one session from its events, in sequence order (ADR 0025, ADR 0029).
 * Answers are graded again with the shared grader, the items found with `itemOf`; an answer to
 * an item it cannot find counts as attempted but never right. Pure: the time now is passed in.
 */
export function sessionMeasures(
  events: readonly LearningEvent[],
  itemOf: (itemId: string) => Item | undefined,
  now: number,
  config: MeasuresConfig = DEFAULT_MEASURES_CONFIG,
): SessionMeasures {
  const tallies = new Map<string, Tally>();
  const order: string[] = [];
  let status: MeasuredStatus | undefined;
  let timeOnTaskMs = 0;
  let paused = false;
  let previous: number | undefined;

  for (const event of events) {
    const at = Date.parse(event.occurredAt);
    // Time on task: gaps between events while playing, unless the child had gone idle.
    if (previous !== undefined && !paused && at - previous <= config.idleMs) {
      timeOnTaskMs += at - previous;
    }
    previous = at;

    const tally = 'itemId' in event ? tallies.get(event.itemId) : undefined;
    switch (event.type) {
      case 'item_presented':
        if (!tallies.has(event.itemId)) {
          tallies.set(event.itemId, {
            skillIds: [...event.skillIds],
            answers: [],
            hinted: false,
            shown: false,
            skipped: false,
          });
          order.push(event.itemId);
        }
        break;
      case 'response_submitted': {
        const item = itemOf(event.itemId);
        tally?.answers.push({
          attempt: event.attempt,
          correct: item ? grade(item, event.response).correct : false,
          helped: event.support === 'hint' || event.support === 'worked-example',
        });
        break;
      }
      case 'hint_shown':
        if (tally) tally.hinted = true;
        break;
      case 'explanation_shown':
        if (tally) tally.shown = true;
        break;
      case 'item_skipped':
        if (tally) tally.skipped = true;
        break;
      case 'session_paused':
        paused = true;
        break;
      case 'session_resumed':
        paused = false;
        break;
      case 'session_completed':
        status = 'completed';
        break;
      case 'session_ended':
        status = event.reason === 'expired' ? 'expired' : 'ended-early';
        break;
      default:
        break;
    }
  }

  const items = order.flatMap((itemId) => {
    const tally = tallies.get(itemId);
    return tally ? [{ itemId, skillIds: tally.skillIds, outcome: outcomeOf(tally), tally }] : [];
  });
  const attempted = items.filter(({ tally }) => tally.answers.length > 0);
  const count = (outcome: ItemOutcome) => items.filter((item) => item.outcome === outcome).length;

  return {
    status:
      status ??
      (previous !== undefined && now - previous > config.resumableMs ? 'expired' : 'interrupted'),
    presented: items.length,
    attempted: attempted.length,
    skipped: count('skipped'),
    unanswered: count('unanswered'),
    firstTryCorrect: count('first-try'),
    eventuallyCorrect: attempted.filter(({ tally }) => tally.answers.some((a) => a.correct)).length,
    supported: attempted.filter(
      ({ tally }) => tally.hinted || tally.shown || tally.answers.some((a) => a.helped),
    ).length,
    learningCredit: attempted.filter(
      ({ tally }) => tally.answers[0]?.correct === false && tally.answers.some((a) => a.correct),
    ).length,
    timeOnTaskMs,
    items: items.map(({ itemId, skillIds, outcome }) => ({ itemId, skillIds, outcome })),
  };
}
