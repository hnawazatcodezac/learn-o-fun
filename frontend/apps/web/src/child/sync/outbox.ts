import {
  MAX_BATCH_SIZE,
  type ChildSettings,
  type LearningEvent,
  type StartSessionRequest,
} from '@learnofun/contracts';
import { api, ApiRequestError } from '../../api/client';
import type { RecordStore } from './store';

/** What waits on the device to reach the API (ADR 0023), each under a key that makes it unique. */
export type OutboxEntry =
  | { key: string; kind: 'session'; session: StartSessionRequest }
  | { key: string; kind: 'event'; event: LearningEvent }
  | {
      key: string;
      kind: 'settings';
      settings: ChildSettings;
      /** Unique to this change, so a newer one is never taken for one already sent. */
      stamp: string;
    };

/** The calls the outbox makes. */
export interface OutboxApi {
  startSession: typeof api.startSession;
  sendEvents: typeof api.sendEvents;
  updateSettings: typeof api.updateSettings;
}

/** The timing of retries (ADR 0023): from 1 second, doubling, to at most a minute. */
export const OUTBOX_RETRY = { firstMs: 1000, maxMs: 60_000, jitter: 0.2 } as const;

export interface OutboxOptions {
  store: RecordStore<OutboxEntry>;
  send?: OutboxApi;
  /** Tests pass their own timer and randomness. */
  setTimer?: (run: () => void, ms: number) => () => void;
  random?: () => number;
  /** Adds a listener for the browser coming back online; returns how to remove it. */
  onOnline?: (listener: () => void) => () => void;
  now?: () => number;
}

export interface Outbox {
  /** Queues a session, from its `session_started` event, for a child. */
  startSession(childId: string, started: Extract<LearningEvent, { type: 'session_started' }>): void;
  queueEvents(events: readonly LearningEvent[]): void;
  /** Queues a settings change; a later one for the same child replaces it. */
  queueSettings(settings: ChildSettings): void;
  /** Called with the ID of a session the API refused, which is dropped with its events. */
  onRefused(listener: (sessionId: string) => void): () => void;
  /** Resolves once the latest attempt to send has finished, sent or not. */
  settled(): Promise<void>;
  /** Entries still waiting, for tests and the development panel. */
  waiting(): Promise<OutboxEntry[]>;
}

const sessionKey = (id: string) => `session:${id}`;
const eventKey = (id: string) => `event:${id}`;
const settingsKey = (childId: string) => `settings:${childId}`;

/** A refusal will not change on a retry; being offline, or a server error, might. */
const isFinal = (error: unknown) =>
  error instanceof ApiRequestError && error.kind !== 'offline' && error.kind !== 'server';

const browserTimer = (run: () => void, ms: number) => {
  const id = setTimeout(run, ms);
  return () => {
    clearTimeout(id);
  };
};

const browserOnline = (listener: () => void) => {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener('online', listener);
  return () => {
    window.removeEventListener('online', listener);
  };
};

/**
 * The outbox (plan 5.4, ADR 0023): everything the child area sends to the API waits here, on the
 * device, until the API has it. Sessions go first, then each session's events in order, in
 * batches, then settings. When sending fails, it tries again later, sooner when the browser
 * comes back online or something new is queued. Retries are harmless: ingest is idempotent on
 * event IDs.
 */
export function createOutbox({
  store,
  send = api,
  setTimer = browserTimer,
  random = Math.random,
  onOnline = browserOnline,
  now = () => Date.now(),
}: OutboxOptions): Outbox {
  const refusedListeners = new Set<(sessionId: string) => void>();
  /** Writes to the store, in the order they were queued. */
  let writing: Promise<void> = Promise.resolve();
  /** The sending loop while it runs, and whether to go round it again. */
  let sending: Promise<void> | undefined;
  let again = false;
  /** Sessions the API refused this visit: events of theirs that arrive later are dropped too. */
  const refusedSessions = new Set<string>();
  let failures = 0;
  let cancelRetry: (() => void) | undefined;
  let changes = 0;

  const refuse = async (sessionId: string, entries: OutboxEntry[]) => {
    refusedSessions.add(sessionId);
    const dropped = entries.filter(
      (entry) =>
        (entry.kind === 'session' && entry.session.id === sessionId) ||
        (entry.kind === 'event' && entry.event.sessionId === sessionId),
    );
    await store.remove(dropped.map((entry) => entry.key));
    for (const listener of refusedListeners) listener(sessionId);
  };

  /** Sends what is waiting; throws when the API cannot be reached. */
  async function sendAll(): Promise<void> {
    let entries = await store.all();
    const sessions = entries
      .flatMap((entry) => (entry.kind === 'session' ? [entry] : []))
      .sort((a, b) => a.session.startedAt.localeCompare(b.session.startedAt));
    for (const entry of sessions) {
      try {
        await send.startSession(entry.session);
        await store.remove([entry.key]);
      } catch (error) {
        if (!isFinal(error)) throw error;
        await refuse(entry.session.id, entries);
      }
    }

    entries = await store.all();
    const late = entries.filter(
      (entry) => entry.kind === 'event' && refusedSessions.has(entry.event.sessionId),
    );
    if (late.length > 0) await store.remove(late.map((entry) => entry.key));
    entries = entries.filter((entry) => !late.includes(entry));
    const waitingSessions = new Set(
      entries.flatMap((entry) => (entry.kind === 'session' ? [entry.session.id] : [])),
    );
    // A session's events wait until the session itself has been created.
    const events = entries
      .flatMap((entry) =>
        entry.kind === 'event' && !waitingSessions.has(entry.event.sessionId) ? [entry.event] : [],
      )
      .sort((a, b) =>
        a.sessionId === b.sessionId
          ? a.sequence - b.sequence
          : a.sessionId.localeCompare(b.sessionId),
      );
    for (let start = 0; start < events.length; start += MAX_BATCH_SIZE) {
      const batch = events.slice(start, start + MAX_BATCH_SIZE);
      try {
        await send.sendEvents({ events: batch });
      } catch (error) {
        if (!isFinal(error)) throw error;
        for (const sessionId of new Set(batch.map((event) => event.sessionId))) {
          await refuse(sessionId, await store.all());
        }
        continue;
      }
      await store.remove(batch.map((event) => eventKey(event.id)));
    }

    const settings = (await store.all()).flatMap((entry) =>
      entry.kind === 'settings' ? [entry] : [],
    );
    for (const entry of settings) {
      try {
        await send.updateSettings(entry.settings);
      } catch (error) {
        if (!isFinal(error)) throw error;
      }
      // Only if no newer change arrived while this one was on its way.
      const current = await store.get(entry.key);
      if (current?.kind === 'settings' && current.stamp === entry.stamp) {
        await store.remove([entry.key]);
      }
    }
  }

  function scheduleRetry() {
    cancelRetry?.();
    const base = Math.min(OUTBOX_RETRY.maxMs, OUTBOX_RETRY.firstMs * 2 ** (failures - 1));
    const spread = 1 - OUTBOX_RETRY.jitter + 2 * OUTBOX_RETRY.jitter * random();
    cancelRetry = setTimer(
      () => {
        cancelRetry = undefined;
        sendWaiting();
      },
      Math.round(base * spread),
    );
  }

  /**
   * Sends what is waiting, going round again while more was queued meanwhile. When sending fails,
   * it stops until the retry, which waits longer after each failure in a row.
   */
  function sendWaiting(): void {
    again = true;
    if (sending) return;
    sending = (async () => {
      while (again) {
        again = false;
        await writing;
        try {
          await sendAll();
          failures = 0;
          cancelRetry?.();
          cancelRetry = undefined;
        } catch {
          failures += 1;
          scheduleRetry();
          again = false;
        }
      }
    })().finally(() => {
      sending = undefined;
    });
  }

  onOnline(() => {
    failures = 0;
    cancelRetry?.();
    cancelRetry = undefined;
    sendWaiting();
  });

  /** Keeps the entries; sends at once unless already waiting to try again. */
  const queue = (entries: OutboxEntry[]) => {
    writing = writing.then(() => store.put(entries)).catch(() => undefined);
    if (!cancelRetry) sendWaiting();
  };

  return {
    startSession: (childId, started) => {
      queue([
        {
          key: sessionKey(started.sessionId),
          kind: 'session',
          session: {
            id: started.sessionId,
            childId,
            activityId: started.activityId,
            gameId: started.gameId,
            gameVersion: started.gameVersion,
            contentRelease: started.contentRelease,
            policyVersion: started.policyVersion,
            mode: started.mode,
            startedAt: started.occurredAt,
          },
        },
      ]);
    },
    queueEvents: (events) => {
      if (events.length === 0) return;
      queue(events.map((event) => ({ key: eventKey(event.id), kind: 'event', event })));
    },
    queueSettings: (settings) => {
      queue([
        {
          key: settingsKey(settings.childId),
          kind: 'settings',
          settings,
          stamp: `${String(now())}-${String((changes += 1))}`,
        },
      ]);
    },
    onRefused: (listener) => {
      refusedListeners.add(listener);
      return () => {
        refusedListeners.delete(listener);
      };
    },
    settled: async () => {
      await writing;
      while (sending) await sending;
    },
    waiting: () => store.all(),
  };
}
