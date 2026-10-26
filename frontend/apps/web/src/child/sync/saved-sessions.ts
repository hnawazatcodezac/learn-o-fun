import type { LearningEvent, Mode, PauseReason } from '@learnofun/contracts';
import {
  createPlaceholderPolicy,
  createSessionEngine,
  type SessionPlan,
  type SessionState,
} from '@learnofun/learning-core';
import type { RecordStore } from './store';

/** A session that can carry on (ADR 0023): saved after every event, and while it runs. */
export interface SavedSession {
  /** One per child and activity. */
  key: string;
  childId: string;
  activityId: string;
  mode: Mode;
  seed: number;
  plan: SessionPlan;
  /** The engine's state, plain data. Its items are the session's items. */
  state: SessionState;
  /** Every event so far, for the trail and the time played. */
  events: LearningEvent[];
  /** When the session was last running on screen. */
  lastSeenAt: number;
}

/** A paused session can resume on the same device within 24 hours (plan 5.4). */
export const RESUME_WITHIN_MS = 24 * 60 * 60 * 1000;

export const savedSessionKey = (childId: string, activityId: string) => `${childId}:${activityId}`;

// Pausing and ending need no policy decision; the placeholder stands in for the interface.
const engine = createSessionEngine(createPlaceholderPolicy());

/** Why the session last paused, from its events: it resumes for the same reason. */
export function pauseReasonOf(events: readonly LearningEvent[]): PauseReason | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.type === 'session_paused') return event.reason;
  }
  return undefined;
}

/**
 * A saved session, made ready to carry on: one that was running when the page went away pauses
 * as navigated away, dated to when it was last seen, so the time away never counts as play.
 */
export function readyToResume(saved: SavedSession): {
  saved: SavedSession;
  events: LearningEvent[];
} {
  if (saved.state.status !== 'active') return { saved, events: [] };
  const paused = engine.pause(saved.state, 'navigated-away', saved.lastSeenAt);
  return {
    saved: { ...saved, state: paused.state, events: [...saved.events, ...paused.events] },
    events: paused.events,
  };
}

/**
 * The events that close a saved session not seen for 24 hours (plan 5.4, ADR 0023): paused when
 * it was last seen, if it was still running, then ended as expired.
 */
export function expire(saved: SavedSession, now: number): LearningEvent[] {
  const { saved: paused, events } = readyToResume(saved);
  const ended = engine.end(paused.state, 'expired', Math.max(now, saved.lastSeenAt));
  return [...events, ...ended.events];
}

/** Whether a saved session is too old to carry on. */
export const isExpired = (saved: SavedSession, now: number) =>
  now - saved.lastSeenAt >= RESUME_WITHIN_MS;

export interface SavedSessions {
  load(childId: string, activityId: string): Promise<SavedSession | undefined>;
  save(saved: SavedSession): Promise<void>;
  remove(childId: string, activityId: string): Promise<void>;
  all(): Promise<SavedSession[]>;
}

export function createSavedSessions(store: RecordStore<SavedSession>): SavedSessions {
  return {
    load: (childId, activityId) => store.get(savedSessionKey(childId, activityId)),
    save: (saved) => store.put([saved]),
    remove: (childId, activityId) => store.remove([savedSessionKey(childId, activityId)]),
    all: () => store.all(),
  };
}
