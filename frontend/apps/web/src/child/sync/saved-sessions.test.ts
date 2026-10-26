import { Item, type LearningEvent } from '@learnofun/contracts';
import {
  activeMs,
  corePlan,
  createPlaceholderPolicy,
  createSessionEngine,
  seedRandom,
} from '@learnofun/learning-core';
import { describe, expect, it } from 'vitest';
import {
  RESUME_WITHIN_MS,
  createSavedSessions,
  expire,
  isExpired,
  pauseReasonOf,
  readyToResume,
  savedSessionKey,
  type SavedSession,
} from './saved-sessions';
import { memoryStore } from './store';

const CHILD = '0192f4c1-0000-7000-8000-00000000c001';
const START = Date.UTC(2026, 9, 21, 9, 0);
const engine = createSessionEngine(createPlaceholderPolicy());

const items = [5, 9].map((target) =>
  Item.parse({
    id: `hop-to-${String(target)}`,
    type: 'placement',
    skillIds: ['add-within-20'],
    difficulty: 0,
    surface: { kind: 'line', min: 0, max: 20, target, tolerance: 0 },
  }),
);

/** A session two minutes in, its first item on screen, still running when the page went. */
function running(): SavedSession {
  const started = engine.start(
    {
      childId: CHILD,
      activityId: 'hop-line-add-within-20',
      gameId: 'hop-line',
      gameVersion: '0.1.0',
      contentRelease: 'mock',
      mode: 'practice',
    },
    items,
    seedRandom(1),
    START,
  );
  return {
    key: savedSessionKey(CHILD, 'hop-line-add-within-20'),
    childId: CHILD,
    activityId: 'hop-line-add-within-20',
    mode: 'practice',
    seed: 1,
    plan: corePlan(2),
    state: started.state,
    events: started.events,
    lastSeenAt: START + 2 * 60_000,
  };
}

const types = (events: LearningEvent[]) => events.map((event) => event.type);

describe('saved sessions (ADR 0023)', () => {
  it('pauses a session that was running, dated to when it was last seen', () => {
    const { saved, events } = readyToResume(running());

    expect(types(events)).toEqual(['session_paused']);
    expect(events[0]).toMatchObject({
      reason: 'navigated-away',
      occurredAt: new Date(START + 2 * 60_000).toISOString(),
    });
    expect(saved.state.status).toBe('paused');
    // The time away never counts as play.
    expect(activeMs(saved.events, START + 60 * 60_000)).toBe(2 * 60_000);
    expect(pauseReasonOf(saved.events)).toBe('navigated-away');
  });

  it('leaves a session that was already paused as it was, to resume for the same reason', () => {
    const session = running();
    const paused = engine.pause(session.state, 'backgrounded', START + 60_000);
    const saved = {
      ...session,
      state: paused.state,
      events: [...session.events, ...paused.events],
    };

    expect(readyToResume(saved)).toEqual({ saved, events: [] });
    expect(pauseReasonOf(saved.events)).toBe('backgrounded');
  });

  it('can carry on for 24 hours after it was last seen, and then expires', () => {
    const session = running();

    expect(isExpired(session, session.lastSeenAt + RESUME_WITHIN_MS - 1)).toBe(false);
    expect(isExpired(session, session.lastSeenAt + RESUME_WITHIN_MS)).toBe(true);
  });

  it('closes an expired session: paused when last seen, then ended as expired', () => {
    const now = START + 2 * RESUME_WITHIN_MS;
    const events = expire(running(), now);

    expect(types(events)).toEqual(['session_paused', 'session_ended']);
    expect(events[1]).toMatchObject({ reason: 'expired', occurredAt: new Date(now).toISOString() });
  });

  it('keeps one session per child and activity', async () => {
    const sessions = createSavedSessions(memoryStore());
    const session = running();
    await sessions.save(session);
    await sessions.save({ ...session, lastSeenAt: session.lastSeenAt + 1 });

    expect(await sessions.all()).toHaveLength(1);
    expect((await sessions.load(CHILD, 'hop-line-add-within-20'))?.lastSeenAt).toBe(
      session.lastSeenAt + 1,
    );
    await sessions.remove(CHILD, 'hop-line-add-within-20');
    expect(await sessions.load(CHILD, 'hop-line-add-within-20')).toBeUndefined();
  });
});
