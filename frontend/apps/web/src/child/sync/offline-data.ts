import {
  CatalogResponse,
  ChildSnapshot,
  DeviceProfilesResponse,
  TodayResponse,
} from '@learnofun/contracts';
import { api, ApiRequestError } from '../../api/client';
import type { RecordStore } from './store';

/** The last answer the API gave to one request, kept on the device (ADR 0024). */
export interface Remembered {
  key: string;
  value: unknown;
  savedAt: number;
}

interface Schema<T> {
  safeParse(value: unknown): { success: true; data: T } | { success: false };
}

/**
 * Asks the API, and keeps each answer. When the API cannot be reached, it gives the last answer
 * this device had instead, if it still meets the contract; anything else fails as before. So the
 * installed app opens and plays offline (plan 5.4: the device holds a learner snapshot).
 */
export function remembering(store: RecordStore<Remembered>, now: () => number = () => Date.now()) {
  return async function remembered<T>(
    key: string,
    schema: Schema<T>,
    ask: () => Promise<T>,
  ): Promise<T> {
    try {
      const value = await ask();
      void store.put([{ key, value, savedAt: now() }]).catch(() => undefined);
      return value;
    } catch (error) {
      if (!(error instanceof ApiRequestError && error.kind === 'offline')) throw error;
      const kept = await store.get(key).catch(() => undefined);
      const parsed = kept ? schema.safeParse(kept.value) : undefined;
      if (parsed?.success) return parsed.data;
      throw error;
    }
  };
}

/** The child area's reads, each kept for when the device is offline. */
export function createChildApi(store: RecordStore<Remembered>) {
  const remembered = remembering(store);
  return {
    catalog: () => remembered('catalog', CatalogResponse, api.catalog),
    profiles: () => remembered('profiles', DeviceProfilesResponse, api.profiles),
    snapshot: (childId: string) =>
      remembered(`snapshot:${childId}`, ChildSnapshot, () => api.snapshot(childId)),
    today: (childId: string) =>
      remembered(`today:${childId}`, TodayResponse, () => api.today(childId)),
  };
}
