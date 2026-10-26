import { createChildApi, type Remembered } from './offline-data';
import { createOutbox, type OutboxEntry } from './outbox';
import { createSavedSessions, expire, isExpired, type SavedSession } from './saved-sessions';
import { indexedDbStore } from './store';

/** The child area's outbox, kept in the device's IndexedDB (ADR 0023). */
export const outbox = createOutbox({ store: indexedDbStore<OutboxEntry>('outbox') });

/** The child area's reads from the API, kept on the device for when it is offline (ADR 0024). */
export const childApi = createChildApi(indexedDbStore<Remembered>('data'));

/** Sessions that can carry on after a refresh or a visit elsewhere (ADR 0023). */
export const savedSessions = createSavedSessions(indexedDbStore<SavedSession>('sessions'));

/**
 * Closes saved sessions not seen for 24 hours (plan 5.4): their pause and end go to the outbox,
 * and they are forgotten. Run as the child area opens.
 */
export async function expireOldSessions(now = Date.now()): Promise<void> {
  for (const saved of await savedSessions.all()) {
    if (!isExpired(saved, now)) continue;
    outbox.queueEvents(expire(saved, now));
    await savedSessions.remove(saved.childId, saved.activityId);
  }
}
