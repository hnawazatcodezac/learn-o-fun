import {
  MAX_BATCH_SIZE,
  type ChildSettings,
  type EventBatch,
  type LearningEvent,
  type LearningSession,
  type StartSessionRequest,
} from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/client';
import { createOutbox, OUTBOX_RETRY, type OutboxApi, type OutboxEntry } from './outbox';
import { memoryStore } from './store';

const CHILD = '0192f4c1-0000-7000-8000-00000000c001';
const SESSION = '0192f4c1-0000-7000-8000-0000000005e1';
const OTHER = '0192f4c1-0000-7000-8000-0000000005e2';

/** Learning events of a session, numbered from `from`; sequence 0 is `session_started`. */
function events(count: number, from = 0, sessionId = SESSION): LearningEvent[] {
  return Array.from({ length: count }, (_, index) => {
    const sequence = from + index;
    const envelope = {
      id: `${sessionId.slice(0, 24)}${String(sequence).padStart(12, '0')}`,
      sessionId,
      sequence,
      occurredAt: '2026-10-21T09:00:00.000Z',
      schemaVersion: 1 as const,
    };
    return sequence === 0
      ? {
          ...envelope,
          type: 'session_started' as const,
          activityId: 'hop-line-add-within-20',
          gameId: 'hop-line',
          gameVersion: '0.1.0',
          contentRelease: 'mock-2026-10-20',
          mode: 'practice' as const,
          policyVersion: 'placeholder-2',
        }
      : { ...envelope, type: 'game_signal' as const, name: 'hops', value: sequence };
  });
}

const started = (all: LearningEvent[]) => {
  const first = all[0];
  if (first?.type !== 'session_started') throw new Error('No session_started');
  return first;
};

/** A fake API that records what it is sent, and fails while `failing` is set. */
function fakeApi() {
  const calls: string[] = [];
  const sessions: StartSessionRequest[] = [];
  const batches: EventBatch[] = [];
  const settings: ChildSettings[] = [];
  const state = { failing: undefined as ApiRequestError | undefined, refuse: new Set<string>() };
  const send: OutboxApi = {
    startSession: (start) => {
      calls.push('session');
      if (state.failing) return Promise.reject(state.failing);
      if (state.refuse.has(start.id)) {
        return Promise.reject(new ApiRequestError('refused', 'refused'));
      }
      sessions.push(start);
      return Promise.resolve({ ...start, status: 'in-progress' } as LearningSession);
    },
    sendEvents: (batch) => {
      calls.push(`events ${String(batch.events.length)}`);
      if (state.failing) return Promise.reject(state.failing);
      batches.push(batch);
      return Promise.resolve({ accepted: batch.events.length, duplicates: 0 });
    },
    updateSettings: (next) => {
      calls.push('settings');
      if (state.failing) return Promise.reject(state.failing);
      settings.push(next);
      return Promise.resolve(next);
    },
  };
  return { send, calls, sessions, batches, settings, state };
}

/** Timers the test runs by hand, and the delays they were set for. */
function manualTimers() {
  const pending: { run: () => void; ms: number }[] = [];
  return {
    delays: () => pending.map((timer) => timer.ms),
    setTimer: (run: () => void, ms: number) => {
      const timer = { run, ms };
      pending.push(timer);
      return () => {
        pending.splice(pending.indexOf(timer), 1);
      };
    },
    runNext: () => {
      const timer = pending.shift();
      timer?.run();
    },
  };
}

function setup() {
  const api = fakeApi();
  const timers = manualTimers();
  const online: (() => void)[] = [];
  const store = memoryStore<OutboxEntry>();
  const outbox = createOutbox({
    store,
    send: api.send,
    setTimer: timers.setTimer,
    random: () => 0.5,
    onOnline: (listener) => {
      online.push(listener);
      return () => undefined;
    },
    now: () => 1000,
  });
  const goOnline = () => {
    for (const listener of online) listener();
  };
  return { api, timers, outbox, store, goOnline };
}

const OFFLINE = new ApiRequestError('offline', 'offline');

describe('outbox (ADR 0023)', () => {
  it('creates the session first, then sends its events in order', async () => {
    const { api, outbox } = setup();
    const all = events(3);

    outbox.startSession(CHILD, started(all));
    outbox.queueEvents(all);
    await outbox.settled();

    expect(api.calls).toEqual(['session', 'events 3']);
    expect(api.sessions[0]).toMatchObject({
      id: SESSION,
      childId: CHILD,
      activityId: 'hop-line-add-within-20',
    });
    expect(api.batches[0]?.events.map((event) => event.sequence)).toEqual([0, 1, 2]);
    expect(await outbox.waiting()).toEqual([]);
  });

  it('sends in batches of at most MAX_BATCH_SIZE', async () => {
    const { api, outbox } = setup();
    const all = events(MAX_BATCH_SIZE + 5);

    outbox.startSession(CHILD, started(all));
    outbox.queueEvents(all);
    await outbox.settled();

    expect(api.batches.map((batch) => batch.events.length)).toEqual([MAX_BATCH_SIZE, 5]);
  });

  it('keeps everything while offline, and tries again later, waiting longer each time', async () => {
    const { api, outbox, timers } = setup();
    api.state.failing = OFFLINE;
    const all = events(2);

    outbox.startSession(CHILD, started(all));
    outbox.queueEvents(all);
    await outbox.settled();
    expect(await outbox.waiting()).toHaveLength(3);
    expect(timers.delays()).toEqual([OUTBOX_RETRY.firstMs]);

    timers.runNext();
    await outbox.settled();
    expect(timers.delays()).toEqual([OUTBOX_RETRY.firstMs * 2]);

    api.state.failing = undefined;
    timers.runNext();
    await outbox.settled();
    expect(await outbox.waiting()).toEqual([]);
    expect(api.batches.flatMap((batch) => batch.events)).toHaveLength(2);
    expect(timers.delays()).toEqual([]);
  });

  it('never waits more than a minute between tries', async () => {
    const { api, outbox, timers } = setup();
    api.state.failing = OFFLINE;
    outbox.queueEvents(events(1, 5));
    for (let tries = 0; tries < 12; tries += 1) {
      await outbox.settled();
      timers.runNext();
    }
    await outbox.settled();

    expect(timers.delays()).toEqual([OUTBOX_RETRY.maxMs]);
  });

  it('tries again at once when the browser comes back online', async () => {
    const { api, outbox, goOnline } = setup();
    api.state.failing = OFFLINE;
    outbox.queueEvents(events(2, 1));
    await outbox.settled();

    api.state.failing = undefined;
    goOnline();
    await outbox.settled();

    expect(await outbox.waiting()).toEqual([]);
  });

  it('sends each event once, however often it is queued', async () => {
    const { api, outbox, timers } = setup();
    const all = events(3);
    outbox.startSession(CHILD, started(all));
    api.state.failing = OFFLINE;
    outbox.queueEvents(all);
    outbox.queueEvents(all.slice(1));
    await outbox.settled();

    api.state.failing = undefined;
    outbox.queueEvents(all);
    timers.runNext();
    await outbox.settled();

    expect(api.batches.flatMap((batch) => batch.events.map((event) => event.id))).toEqual(
      all.map((event) => event.id),
    );
  });

  it('drops a session the API refuses, with its events, and says so', async () => {
    const { api, outbox } = setup();
    const refused: string[] = [];
    outbox.onRefused((sessionId) => refused.push(sessionId));
    api.state.refuse.add(SESSION);
    const mine = events(2);
    const other = events(2, 0, OTHER);

    outbox.startSession(CHILD, started(mine));
    outbox.queueEvents(mine);
    outbox.startSession(CHILD, started(other));
    outbox.queueEvents(other);
    await outbox.settled();

    expect(refused).toEqual([SESSION]);
    expect(await outbox.waiting()).toEqual([]);
    expect(api.batches.flatMap((batch) => batch.events.map((event) => event.sessionId))).toEqual([
      OTHER,
      OTHER,
    ]);
  });

  it('holds a session’s events until the session itself is created', async () => {
    const { api, outbox } = setup();
    api.state.failing = new ApiRequestError('server', '500');
    const all = events(2);
    outbox.startSession(CHILD, started(all));
    outbox.queueEvents(all);
    await outbox.settled();

    expect(api.calls).toEqual(['session']);
  });

  it('sends the latest settings change for a child, once', async () => {
    const { api, outbox, timers } = setup();
    const settings = { childId: CHILD, sound: true } as unknown as ChildSettings;
    api.state.failing = OFFLINE;
    outbox.queueSettings({ ...settings, sound: false });
    outbox.queueSettings(settings);
    await outbox.settled();
    expect(await outbox.waiting()).toHaveLength(1);

    api.state.failing = undefined;
    outbox.queueSettings(settings);
    // Already waiting to try again: the change goes with the retry.
    timers.runNext();
    await outbox.settled();

    expect(api.settings).toEqual([settings]);
    expect(await outbox.waiting()).toEqual([]);
  });
});
