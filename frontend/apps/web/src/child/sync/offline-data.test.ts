import { describe, expect, it } from 'vitest';
import { ApiRequestError } from '../../api/client';
import { remembering, type Remembered } from './offline-data';
import { memoryStore } from './store';

interface Answer {
  cards: string[];
}

/** A contract for the test: an object whose cards are a list. */
const Answer = {
  safeParse: (value: unknown): { success: true; data: Answer } | { success: false } =>
    typeof value === 'object' && value !== null && Array.isArray((value as Answer).cards)
      ? { success: true, data: value as Answer }
      : { success: false },
};
const OFFLINE = new ApiRequestError('offline', 'offline');

function setup() {
  const store = memoryStore<Remembered>();
  return { store, remembered: remembering(store, () => 1000) };
}

describe('remembered reads (ADR 0024)', () => {
  it('asks the API, and keeps what it answered', async () => {
    const { store, remembered } = setup();

    expect(await remembered('today', Answer, () => Promise.resolve({ cards: ['a'] }))).toEqual({
      cards: ['a'],
    });
    await Promise.resolve();
    expect(await store.get('today')).toEqual({
      key: 'today',
      value: { cards: ['a'] },
      savedAt: 1000,
    });
  });

  it('gives the last answer when the API cannot be reached', async () => {
    const { remembered } = setup();
    await remembered('today', Answer, () => Promise.resolve({ cards: ['a'] }));
    await Promise.resolve();

    expect(await remembered('today', Answer, () => Promise.reject(OFFLINE))).toEqual({
      cards: ['a'],
    });
  });

  it('fails as before with nothing kept, or when the API answered with an error', async () => {
    const { remembered } = setup();
    await expect(remembered('today', Answer, () => Promise.reject(OFFLINE))).rejects.toBe(OFFLINE);

    await remembered('today', Answer, () => Promise.resolve({ cards: ['a'] }));
    const refused = new ApiRequestError('server', '500');
    await expect(remembered('today', Answer, () => Promise.reject(refused))).rejects.toBe(refused);
  });

  it('never gives a kept answer that no longer meets the contract', async () => {
    const { store, remembered } = setup();
    await store.put([{ key: 'today', value: { cards: 'not a list' }, savedAt: 1 }]);

    await expect(remembered('today', Answer, () => Promise.reject(OFFLINE))).rejects.toBe(OFFLINE);
  });
});
