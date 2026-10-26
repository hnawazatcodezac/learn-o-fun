import type { ChildSnapshot } from '@learnofun/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasTimeToday, lastBreak, playTimeOf, recordBreak } from './play-time';

const ROBIN = '0192f4c1-0000-7000-8000-00000000c001';

/** A snapshot with only what the time limits read. */
const snapshot = (playedSeconds: number, allowedSeconds = 30 * 60) =>
  ({
    child: { id: ROBIN },
    settings: { dailyLimitMinutes: 30, sessionMinutes: 10, breakReminderMinutes: 20 },
    playToday: { date: '2026-10-21', playedSeconds, allowedSeconds },
  }) as unknown as ChildSnapshot;

function memoryLocalStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => {
      values.clear();
    },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => {
      values.delete(key);
    },
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryLocalStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('play time (ADR 0022)', () => {
  it('turns the settings and today’s play into the session’s limits', () => {
    expect(playTimeOf(snapshot(12 * 60))).toEqual({
      sessionMs: 10 * 60_000,
      leftTodayMs: 18 * 60_000,
      breakEveryMs: 20 * 60_000,
      sinceBreakMs: 12 * 60_000,
    });
  });

  it('counts from the last break today, kept on the device', () => {
    recordBreak(ROBIN, '2026-10-21', 5 * 60_000);

    expect(lastBreak(ROBIN, '2026-10-21')).toBe(5 * 60_000);
    expect(playTimeOf(snapshot(12 * 60)).sinceBreakMs).toBe(7 * 60_000);
  });

  it('forgets a break from another day', () => {
    recordBreak(ROBIN, '2026-10-20', 25 * 60_000);

    expect(lastBreak(ROBIN, '2026-10-21')).toBe(0);
  });

  it('says whether any play is left today, never less than none', () => {
    expect(hasTimeToday(snapshot(29 * 60))).toBe(true);
    expect(hasTimeToday(snapshot(30 * 60))).toBe(false);
    expect(playTimeOf(snapshot(35 * 60)).leftTodayMs).toBe(0);
  });

  it('works without storage, as in a private window', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(() => {
      recordBreak(ROBIN, '2026-10-21', 60_000);
    }).not.toThrow();
    expect(lastBreak(ROBIN, '2026-10-21')).toBe(0);
  });
});
