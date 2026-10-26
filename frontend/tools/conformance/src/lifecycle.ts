import { LearningEvent } from '@learnofun/contracts';

export interface LifecycleExpectations {
  gameId: string;
  gameVersion: string;
  /** The items the session may present: the story's. */
  itemIds: readonly string[];
  /** Whether the session should have completed. */
  completed: boolean;
}

const ENDINGS = new Set(['session_completed', 'session_ended']);
/** Events about the item on screen. */
const ABOUT_ITEM = new Set([
  'response_submitted',
  'hint_shown',
  'explanation_shown',
  'item_skipped',
]);

/**
 * Checks one session's learning events as the API will ingest them (plan 5.1): each matches the
 * contract, and together they form one well-ordered session. Returns what is wrong; empty means
 * the session passes.
 */
export function lifecycleProblems(
  events: readonly unknown[],
  expected: LifecycleExpectations,
): string[] {
  const problems: string[] = [];
  const valid: LearningEvent[] = [];
  events.forEach((event, index) => {
    const check = LearningEvent.safeParse(event);
    if (check.success) {
      valid.push(check.data);
    } else {
      const issues = check.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
      problems.push(`Event ${String(index)} does not match the contract: ${issues.join('; ')}`);
    }
  });
  if (problems.length > 0) return problems;
  const first = valid[0];
  if (!first) return ['No learning events were recorded'];

  const sessions = new Set(valid.map((event) => event.sessionId));
  if (sessions.size !== 1) problems.push(`The events belong to ${String(sessions.size)} sessions`);
  if (new Set(valid.map((event) => event.id)).size !== valid.length) {
    problems.push('Two events share an ID');
  }
  if (
    first.type !== 'session_started' ||
    first.gameId !== expected.gameId ||
    first.gameVersion !== expected.gameVersion
  ) {
    problems.push(
      `The first event is not session_started for ${expected.gameId} ${expected.gameVersion}`,
    );
  }

  let onScreen: string | undefined;
  let ended = false;
  valid.forEach((event, index) => {
    if (event.sequence !== index) {
      problems.push(
        `Event ${String(index)} (${event.type}) has sequence ${String(event.sequence)}`,
      );
    }
    const previous = valid[index - 1];
    if (previous && Date.parse(event.occurredAt) < Date.parse(previous.occurredAt)) {
      problems.push(`Event ${String(index)} (${event.type}) happened before the one before it`);
    }
    if (ended) {
      problems.push(`Event ${String(index)} (${event.type}) comes after the session ended`);
    }
    if (ENDINGS.has(event.type)) ended = true;
    if (event.type === 'item_presented') {
      if (!expected.itemIds.includes(event.itemId)) {
        problems.push(`Item ${event.itemId} was presented but is not in the story`);
      }
      onScreen = event.itemId;
    }
    if (ABOUT_ITEM.has(event.type) && 'itemId' in event && event.itemId !== onScreen) {
      problems.push(
        `Event ${String(index)} (${event.type}) is about an item that is not on screen`,
      );
    }
  });

  const last = valid.at(-1);
  if (expected.completed && last?.type !== 'session_completed') {
    problems.push(`The session did not complete: the last event is ${String(last?.type)}`);
  }
  if (expected.completed) {
    const presented = valid.filter((event) => event.type === 'item_presented');
    const answeredOrSkipped = new Set(
      valid
        .filter((event) => event.type === 'response_submitted' || event.type === 'item_skipped')
        .map((event) => ('itemId' in event ? event.itemId : '')),
    );
    for (const event of presented) {
      if (!answeredOrSkipped.has(event.itemId)) {
        problems.push(`Item ${event.itemId} was presented but never answered or skipped`);
      }
    }
  }
  return problems;
}
