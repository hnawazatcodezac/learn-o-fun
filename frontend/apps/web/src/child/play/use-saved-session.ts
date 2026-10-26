import type { LearningEvent } from '@learnofun/contracts';
import type { SessionState } from '@learnofun/learning-core';
import { useCallback, useEffect, useRef } from 'react';
import { outbox, savedSessions } from '../sync';
import { savedSessionKey, type SavedSession } from '../sync/saved-sessions';

/** How often a running session is saved, so a refresh loses at most this much (ADR 0023). */
const HEARTBEAT_MS = 5000;

export interface SavedSessionOptions extends Pick<
  SavedSession,
  'childId' | 'activityId' | 'mode' | 'seed' | 'plan'
> {
  /** The saved session being carried on, if any. */
  resume: SavedSession | undefined;
  /** The API refused the session, for example for an activity that does not exist. */
  onRefused: () => void;
}

/**
 * Keeps one session on the device (ADR 0023): its start and events go to the outbox, and the
 * session itself is saved after every change and now and then while it runs, so it can carry on
 * after a refresh. It is forgotten once it completes or ends.
 */
export function useSavedSession({
  childId,
  activityId,
  mode,
  seed,
  plan,
  resume,
  onRefused,
}: SavedSessionOptions) {
  const state = useRef<SessionState | undefined>(resume?.state);
  const events = useRef<LearningEvent[]>(resume ? [...resume.events] : []);
  const done = useRef(false);
  const refused = useRef(onRefused);
  useEffect(() => {
    refused.current = onRefused;
  }, [onRefused]);

  const save = useCallback(() => {
    const current = state.current;
    if (!current || done.current) return;
    if (current.status === 'completed' || current.status === 'ended') return;
    void savedSessions
      .save({
        key: savedSessionKey(childId, activityId),
        childId,
        activityId,
        mode,
        seed,
        plan,
        state: current,
        events: events.current,
        lastSeenAt: Date.now(),
      })
      .catch(() => undefined);
  }, [childId, activityId, mode, seed, plan]);

  /** The session is over: it is forgotten, and never saved again. */
  const finish = useCallback(() => {
    done.current = true;
    void savedSessions.remove(childId, activityId).catch(() => undefined);
  }, [childId, activityId]);

  const onState = useCallback(
    (next: SessionState) => {
      state.current = next;
      if (next.status === 'completed' || next.status === 'ended') finish();
      // After the events of this change arrive, so they are saved with it.
      else queueMicrotask(save);
    },
    [save, finish],
  );

  const emit = useCallback(
    (batch: readonly LearningEvent[]) => {
      const started = batch.find((event) => event.type === 'session_started');
      if (started?.type === 'session_started') outbox.startSession(childId, started);
      events.current = [...events.current, ...batch];
      outbox.queueEvents(batch);
    },
    [childId],
  );

  useEffect(() => {
    // Carrying on: anything of it that never reached the API goes again; the API ignores repeats.
    if (resume) {
      const started = resume.events.find((event) => event.type === 'session_started');
      if (started?.type === 'session_started') outbox.startSession(childId, started);
      outbox.queueEvents(resume.events);
    }
    return outbox.onRefused((sessionId) => {
      if (sessionId !== state.current?.sessionId) return;
      finish();
      refused.current();
    });
  }, [childId, resume, finish]);

  useEffect(() => {
    // While the session runs, it is saved now and then, with when it was last seen.
    const heartbeat = setInterval(save, HEARTBEAT_MS);
    return () => {
      clearInterval(heartbeat);
    };
  }, [save]);

  return { emit, onState, finish };
}
