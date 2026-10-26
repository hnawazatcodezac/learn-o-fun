import type { ChildSnapshot } from '@learnofun/contracts';

/** What the game shell keeps to (plan 8.7, ADR 0022), in milliseconds of active play. */
export interface PlayTime {
  /** The parent's session length: then the session finishes its item and ends on a success. */
  sessionMs: number;
  /** Play left today as the session starts: then it ends on a success, for the day. */
  leftTodayMs: number;
  /** How long between break reminders. */
  breakEveryMs: number;
  /** Play since the last break as the session starts. */
  sinceBreakMs: number;
}

/** Where each child's last break was today: how much they had played by then. */
const BREAKS_KEY = 'learnofun.breaks';

type Breaks = Record<string, { date: string; playedMs: number }>;

function readBreaks(): Breaks {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(BREAKS_KEY) ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Breaks) : {};
  } catch {
    return {};
  }
}

/**
 * How much the child had played today at their last break; none today means 0. Kept on the
 * device (ADR 0022); without storage, as in a private window, every session starts afresh.
 */
export function lastBreak(childId: string, date: string): number {
  const entry = readBreaks()[childId];
  return entry?.date === date && Number.isFinite(entry.playedMs) ? entry.playedMs : 0;
}

/** Records a break: the child had played `playedMs` today when they took it. */
export function recordBreak(childId: string, date: string, playedMs: number): void {
  try {
    localStorage.setItem(
      BREAKS_KEY,
      JSON.stringify({ ...readBreaks(), [childId]: { date, playedMs } }),
    );
  } catch {
    // Storage can be unavailable; the next session then counts from its start.
  }
}

/** Whether the child has play left today (ADR 0022). */
export function hasTimeToday({ playToday }: ChildSnapshot): boolean {
  return playToday.playedSeconds < playToday.allowedSeconds;
}

/** The time limits for a session that starts now, from the child's snapshot and settings. */
export function playTimeOf({ child, settings, playToday }: ChildSnapshot): PlayTime {
  const playedMs = playToday.playedSeconds * 1000;
  return {
    sessionMs: settings.sessionMinutes * 60_000,
    leftTodayMs: Math.max(0, playToday.allowedSeconds * 1000 - playedMs),
    breakEveryMs: settings.breakReminderMinutes * 60_000,
    sinceBreakMs: Math.max(0, playedMs - lastBreak(child.id, playToday.date)),
  };
}
