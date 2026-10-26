import type { LearningEvent, LearningSession, PlayToday } from '@learnofun/contracts';
import { activeMs } from '@learnofun/learning-core';

/** The calendar day a moment falls on in a time zone, as YYYY-MM-DD. */
export function localDate(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export interface PlayTodayInput {
  childId: string;
  /** The child's time zone, which decides when today starts. */
  timeZone: string;
  dailyLimitMinutes: number;
  sessions: readonly LearningSession[];
  events: readonly LearningEvent[];
  grants: readonly { childId: string; date: string; minutes: number }[];
  now: number;
}

/**
 * A child's play today (ADR 0022), as a projection of the event log that can always be rebuilt
 * (CLAUDE.md rule 3): the active time of each of the child's sessions that started today, in the
 * child's time zone. Allowed time is the daily limit plus what a grown-up added for today.
 */
export function playToday(input: PlayTodayInput): PlayToday {
  const { childId, timeZone, now } = input;
  const date = localDate(now, timeZone);
  const sessions = new Set(
    input.sessions.filter((session) => session.childId === childId).map((session) => session.id),
  );
  const bySession = new Map<string, LearningEvent[]>();
  for (const event of input.events) {
    if (sessions.has(event.sessionId)) {
      bySession.set(event.sessionId, [...(bySession.get(event.sessionId) ?? []), event]);
    }
  }
  let playedMs = 0;
  for (const events of bySession.values()) {
    const started = events.find((event) => event.type === 'session_started');
    if (started && localDate(Date.parse(started.occurredAt), timeZone) === date) {
      playedMs += activeMs(events);
    }
  }
  const extraMinutes = input.grants
    .filter((grant) => grant.childId === childId && grant.date === date)
    .reduce((total, grant) => total + grant.minutes, 0);
  return {
    date,
    playedSeconds: Math.floor(playedMs / 1000),
    allowedSeconds: (input.dailyLimitMinutes + extraMinutes) * 60,
  };
}
