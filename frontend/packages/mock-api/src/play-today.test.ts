import type { LearningEvent, LearningSession } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { localDate, playToday } from './play-today';

const ROBIN = '0192f4c1-0000-7000-8000-00000000c001';
const ARI = '0192f4c1-0000-7000-8000-00000000c002';
const ZONE = 'Asia/Dubai';
// 21 October 2026, 10:00 in Dubai (06:00 UTC).
const NOW = Date.UTC(2026, 9, 21, 6, 0);

function session(id: string, childId: string): LearningSession {
  return {
    id,
    childId,
    activityId: 'hop-line-add-within-20',
    gameId: 'hop-line',
    gameVersion: '0.1.0',
    contentRelease: 'mock-2026-10-20',
    mode: 'practice',
    policyVersion: 'placeholder-2',
    startedAt: new Date(NOW).toISOString(),
    status: 'in-progress',
  };
}

/** A session's events: a type and a time in minutes after `startMs` each. */
function events(sessionId: string, startMs: number, ...steps: [LearningEvent['type'], number][]) {
  return steps.map(
    ([type, minutes], sequence) =>
      ({
        id: `${sessionId.slice(0, -4)}${String(sequence).padStart(4, '0')}`,
        sessionId,
        sequence,
        occurredAt: new Date(startMs + minutes * 60_000).toISOString(),
        schemaVersion: 1,
        type,
        ...(type === 'session_paused' || type === 'session_resumed' ? { reason: 'break' } : {}),
      }) as LearningEvent,
  );
}

const S1 = '0192f4c1-0000-7000-8000-0000000a0000';
const S2 = '0192f4c1-0000-7000-8000-0000000b0000';
const S3 = '0192f4c1-0000-7000-8000-0000000c0000';

describe('localDate', () => {
  it('gives the calendar day in a time zone, not in UTC', () => {
    // 22:30 UTC on 20 October is already 21 October in Dubai (UTC+4).
    expect(localDate(Date.UTC(2026, 9, 20, 22, 30), ZONE)).toBe('2026-10-21');
    expect(localDate(Date.UTC(2026, 9, 20, 22, 30), 'UTC')).toBe('2026-10-20');
  });
});

describe('playToday (ADR 0022)', () => {
  const base = {
    childId: ROBIN,
    timeZone: ZONE,
    dailyLimitMinutes: 30,
    grants: [],
    now: NOW,
  };

  it('adds up today’s active play, pauses left out, from every session the child started today', () => {
    const today = playToday({
      ...base,
      sessions: [session(S1, ROBIN), session(S2, ROBIN)],
      events: [
        ...events(S1, NOW - 60 * 60_000, ['session_started', 0], ['session_completed', 8]),
        ...events(
          S2,
          NOW - 30 * 60_000,
          ['session_started', 0],
          ['session_paused', 3],
          ['session_resumed', 13],
          ['session_ended', 15],
        ),
      ],
    });

    expect(today).toEqual({ date: '2026-10-21', playedSeconds: 13 * 60, allowedSeconds: 30 * 60 });
  });

  it('leaves out other children, and sessions started on another day', () => {
    const yesterday = NOW - 24 * 60 * 60_000;
    const today = playToday({
      ...base,
      sessions: [session(S1, ARI), session(S2, ROBIN)],
      events: [
        ...events(S1, NOW - 10 * 60_000, ['session_started', 0], ['session_completed', 5]),
        ...events(S2, yesterday, ['session_started', 0], ['session_completed', 20]),
      ],
    });

    expect(today.playedSeconds).toBe(0);
  });

  it('allows the daily limit plus what a grown-up added for today only', () => {
    const today = playToday({
      ...base,
      sessions: [session(S3, ROBIN)],
      events: [],
      grants: [
        { childId: ROBIN, date: '2026-10-21', minutes: 10 },
        { childId: ROBIN, date: '2026-10-20', minutes: 30 },
        { childId: ARI, date: '2026-10-21', minutes: 15 },
      ],
    });

    expect(today.allowedSeconds).toBe(40 * 60);
  });
});
