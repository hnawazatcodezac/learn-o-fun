import { describe, expect, it } from 'vitest';
import { mergePlayToday } from './child-mode';

const day = (date: string, playedSeconds: number, allowedSeconds = 1800) => ({
  date,
  playedSeconds,
  allowedSeconds,
});

describe('mergePlayToday (ADR 0022)', () => {
  it('never takes away play this device already counted today', () => {
    // The API had not yet heard of the session's last events.
    expect(mergePlayToday(day('2026-10-21', 600), day('2026-10-21', 420))).toEqual(
      day('2026-10-21', 600),
    );
    expect(mergePlayToday(day('2026-10-21', 600), day('2026-10-21', 900))).toEqual(
      day('2026-10-21', 900),
    );
  });

  it('takes the newer allowance, as when a grown-up allows more time', () => {
    expect(mergePlayToday(day('2026-10-21', 1800), day('2026-10-21', 1700, 2400))).toEqual(
      day('2026-10-21', 1800, 2400),
    );
  });

  it('starts afresh on a new day', () => {
    expect(mergePlayToday(day('2026-10-20', 1800), day('2026-10-21', 0))).toEqual(
      day('2026-10-21', 0),
    );
    expect(mergePlayToday(undefined, day('2026-10-21', 60))).toEqual(day('2026-10-21', 60));
  });
});
