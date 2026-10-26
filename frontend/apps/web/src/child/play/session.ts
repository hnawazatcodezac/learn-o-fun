import type {
  Item,
  LearningEvent,
  LearningEventType,
  Mode,
  PauseReason,
  SupportLevel,
} from '@learnofun/contracts';
import {
  runSession,
  type Clock,
  type EventSink,
  type GameInstance,
  type GameModule,
  type GameSettings,
  type GradeResult,
  type FormatNumber,
  type Localize,
  type SessionController,
  type Translate,
} from '@learnofun/game-sdk';
import {
  activeMs,
  type Ability,
  type ItemMaker,
  type SessionPlan,
  type SessionPolicy,
  type SessionState,
} from '@learnofun/learning-core';
import type { FeedbackKind } from '@learnofun/ui-kit';
import type { PlayTime } from './play-time';

/**
 * How long the shared feedback after an answer stays on screen, unless the child taps first
 * (docs/design-system/components/Feedback).
 */
export const FEEDBACK_MS = 1500;

/**
 * 'time-up': the day's time ran out, and the session ended on a success (ADR 0022). The shell
 * celebrates it like a completed session.
 */
export type ShellStatus = 'playing' | 'paused' | 'completed' | 'time-up' | 'ended' | 'failed';

/** What the shell shows around the game. */
export interface ShellSnapshot {
  status: ShellStatus;
  /** Items shown so far, for the progress trail. */
  presented: number;
  /** Whether the hint button works now (ADR 0013). */
  canHint: boolean;
  /** The shared feedback on screen after an answer, if any. */
  feedback: FeedbackKind | undefined;
  /** The break reminder is up: "Time for a stretch" (ADR 0022). */
  breakTime: boolean;
  /** The break was the policy's offer, not the reminder's time (ADR 0036), so it says so. */
  breakOffered: boolean;
}

const INITIAL: ShellSnapshot = {
  status: 'playing',
  presented: 0,
  canHint: false,
  feedback: undefined,
  breakTime: false,
  breakOffered: false,
};

/** Calls `check` every `ms` until the returned function is called. */
export type Ticker = (ms: number, check: () => void) => () => void;

const everyInterval: Ticker = (ms, check) => {
  const id = setInterval(check, ms);
  return () => {
    clearInterval(id);
  };
};

/** How often the shell looks at the time limits. */
const TIME_CHECK_MS = 1000;

/** Holds the snapshot for React's `useSyncExternalStore`. */
export interface ShellStore {
  getSnapshot: () => ShellSnapshot;
  subscribe: (listener: () => void) => () => void;
  update: (change: Partial<ShellSnapshot>) => void;
}

export function createShellStore(): ShellStore {
  let snapshot = INITIAL;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update: (change) => {
      const next = { ...snapshot, ...change };
      if (
        Object.entries(change).every(
          ([key, value]) => snapshot[key as keyof ShellSnapshot] === value,
        )
      ) {
        return;
      }
      snapshot = next;
      for (const listener of listeners) listener();
    },
  };
}

const STATUS_AFTER: Partial<Record<LearningEventType, ShellStatus>> = {
  session_paused: 'paused',
  session_resumed: 'playing',
  session_completed: 'completed',
  session_ended: 'ended',
};

/** Whether the session has finished well: completed, or stopped on a success when time ran out. */
export function finishedWell(snapshot: ShellSnapshot): boolean {
  return snapshot.status === 'completed' || snapshot.status === 'time-up';
}

/**
 * The progress trail's numbers: items finished out of the items planned (the warm-up and the core
 * block, ADR 0022). An easy item added to end on a success adds a step; a session that finished
 * early counts the items it had.
 */
export function progressOf(
  snapshot: ShellSnapshot,
  planned: number,
): { done: number; total: number } {
  if (finishedWell(snapshot)) return { done: snapshot.presented, total: snapshot.presented };
  const total = Math.max(planned, snapshot.presented);
  return { done: Math.min(Math.max(0, snapshot.presented - 1), total), total };
}

/**
 * The shared feedback for an answer (plan 4.2): "That's it!" when right, and "Have another go!"
 * when the child tries again. After a last wrong answer the game's own worked example speaks for
 * itself, so the shell shows nothing.
 */
export function feedbackFor(result: GradeResult, support: SupportLevel): FeedbackKind | undefined {
  if (result.correct) return 'correct';
  return support === 'encouragement' || support === 'hint' ? 'tryAgain' : undefined;
}

export interface ShellSessionOptions {
  game: GameModule;
  root: HTMLElement;
  items: readonly Item[];
  mode: Mode;
  setup: { childId: string; activityId: string; contentRelease: string };
  seed: number;
  emit: EventSink;
  t: Translate;
  localize: Localize;
  formatNumber: FormatNumber;
  settings: GameSettings;
  store: ShellStore;
  /** How the items are laid out (ADR 0022). Without one, they are the core block alone. */
  plan?: SessionPlan;
  /** The in-session policy, the maker of items on demand, and where it starts (ADR 0036). */
  policy?: SessionPolicy;
  maker?: ItemMaker;
  learner?: Ability;
  /** The time limits to keep to (ADR 0022). Without them, as on development routes, none apply. */
  time?: PlayTime;
  /** The child took a break, when the session had had `sessionMs` of active play. */
  onBreak?: (sessionMs: number) => void;
  /** The session completed or ended, after `sessionMs` of active play on this visit. */
  onEnd?: (sessionMs: number) => void;
  /**
   * Carries on a saved session (ADR 0023): its state, and its events so far, for the trail and
   * the time played. Its own items and plan are used.
   */
  restore?: { state: SessionState; events: readonly LearningEvent[]; resumeFor?: PauseReason };
  /** Called with the session's state whenever it changes, so it can be saved. */
  onState?: (state: SessionState) => void;
  /** A restored session's item is on screen again (ADR 0023). */
  onRestored?: () => void;
  clock?: Clock;
  /** Waits while the shared feedback is on screen; tests pass their own. */
  wait?: (ms: number) => Promise<void>;
  /** Checks the time limits now and then; tests pass their own. */
  every?: Ticker;
}

export interface ShellSession {
  /** Undefined when the game failed to start. */
  controller: SessionController | undefined;
  /** Pauses the game on screen without pausing the session, while the pause menu is open. */
  hold(): void;
  release(): void;
  /** Changes the settings the game reads, when the child changes them mid-session. */
  updateSettings(settings: GameSettings): void;
  pause(reason: PauseReason): void;
  resume(reason: PauseReason): void;
  hint(): void;
  /** The child tapped while the shared feedback was up: it comes down now. */
  dismissFeedback(): void;
  /** The child chose Keep playing at the break reminder (ADR 0022). */
  keepPlaying(): void;
  /** A restored session that came back paused carries on, for the reason it paused (ADR 0023). */
  resumeRestored(): void;
  /** The child chose "back to my games": the session ends early (plan 5.2, ADR 0012). */
  exit(): void;
  /**
   * The shell is going away without the child choosing to leave, such as the browser's back
   * button: the session pauses as navigated away, to be resumed later (plan 5.4). The pause waits
   * a moment, so React's development-only remount can call `stay()` and keep the session going.
   */
  leaveSoon(): void;
  stay(): void;
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/**
 * Runs one session in the game shell: the real session runner, with the shell's feedback after
 * each answer, its pause menu, and the snapshot it shows around the game.
 */
export function startShellSession(options: ShellSessionOptions): ShellSession {
  const { store } = options;
  const wait = options.wait ?? delay;
  const clock = options.clock ?? { now: () => Date.now() };
  const settings: GameSettings = { ...options.settings };
  let controller: SessionController | undefined;

  // The game is paused while the session is paused or the pause menu holds it, and resumed only
  // when neither does.
  let instance: GameInstance | undefined;
  let sessionPaused = false;
  let held = false;
  let gamePaused = false;
  const syncPause = () => {
    const shouldPause = sessionPaused || held;
    if (shouldPause === gamePaused) return;
    gamePaused = shouldPause;
    if (shouldPause) instance?.pause();
    else instance?.resume();
  };

  // Ends the wait for the feedback on screen, when the child taps.
  let dismiss: (() => void) | undefined;
  const showFeedback = async (result: GradeResult, support: SupportLevel) => {
    const feedback = feedbackFor(result, support);
    if (feedback === undefined) return;
    store.update({ feedback });
    await new Promise<void>((resolve) => {
      dismiss = resolve;
      void wait(FEEDBACK_MS).then(resolve);
    });
    dismiss = undefined;
    store.update({ feedback: undefined });
  };

  // A restored session says so once its item is on screen again.
  let restoring = options.restore !== undefined;

  // Time limits (ADR 0022): the session's own events give its active play, pauses left out.
  const sessionEvents: LearningEvent[] = [...(options.restore?.events ?? [])];
  const played = () => activeMs(sessionEvents, clock.now());
  // Play before this visit, from a restored session's events, already counted.
  const playedBefore = activeMs(sessionEvents);
  let breakDue = false;
  /** The session's active play at its last break. */
  let breakAt = 0;
  let wrapping = false;
  const checkTime = () => {
    const { time } = options;
    if (!time || !controller) return;
    const active = played();
    if (active >= time.leftTodayMs) {
      controller.wrapUp('time-limit');
      wrapping = true;
    }
    if (active >= time.sessionMs) {
      controller.wrapUp('session-length');
      wrapping = true;
    }
    if (time.sinceBreakMs + active - breakAt >= time.breakEveryMs) breakDue = true;
  };

  // The break reminder comes before the next item: the session pauses until the child chooses.
  let endBreak: ((resume: boolean) => void) | undefined;
  const takeBreak = (offered = false) =>
    new Promise<void>((resolve) => {
      controller?.pause('break');
      store.update({ breakTime: true, breakOffered: offered });
      endBreak = (resume) => {
        endBreak = undefined;
        breakDue = false;
        breakAt = played();
        options.onBreak?.(breakAt);
        store.update({ breakTime: false, breakOffered: false });
        if (resume) controller?.resume('break');
        resolve();
      };
    });

  const game: GameModule = {
    manifest: options.game.manifest,
    mount(ctx, root) {
      const mounted = options.game.mount(ctx, root);
      instance = mounted;
      return {
        present: async (item) => {
          // Before the next item, so never during one or after the last, and not once the
          // session is finishing.
          checkTime();
          if (breakDue && !wrapping) await takeBreak();
          await mounted.present(item);
          if (restoring) {
            restoring = false;
            options.onRestored?.();
          }
        },
        feedback: async (result, support) => {
          await Promise.all([mounted.feedback(result, support), showFeedback(result, support)]);
          // Before the engine chooses what comes next, so time that is up stops the session.
          checkTime();
        },
        hint: (level) => mounted.hint(level),
        pause: () => {
          sessionPaused = true;
          syncPause();
        },
        resume: () => {
          sessionPaused = false;
          syncPause();
        },
        destroy: () => {
          mounted.destroy();
        },
      };
    },
  };

  if (options.restore) {
    const { events } = options.restore;
    let status: ShellStatus = 'playing';
    for (const event of events) status = STATUS_AFTER[event.type] ?? status;
    store.update({
      status,
      presented: events.filter((event) => event.type === 'item_presented').length,
    });
  }

  const record = (events: readonly LearningEvent[]) => {
    let { status, presented } = store.getSnapshot();
    for (const event of events) {
      if (status !== 'failed') status = STATUS_AFTER[event.type] ?? status;
      if (event.type === 'session_ended' && event.reason === 'time-limit' && status !== 'failed') {
        status = 'time-up';
      }
      if (event.type === 'item_presented') presented += 1;
    }
    store.update({ status, presented });
    sessionEvents.push(...events);
    options.emit(events);
  };
  const fail = () => {
    store.update({ status: 'failed', canHint: false, feedback: undefined });
  };

  try {
    controller = runSession({
      game,
      root: options.root,
      setup: { ...options.setup, mode: options.mode },
      items: options.items,
      ...(options.plan ? { plan: options.plan } : {}),
      ...(options.policy ? { policy: options.policy } : {}),
      ...(options.maker ? { maker: options.maker } : {}),
      ...(options.learner ? { learner: options.learner } : {}),
      // The policy's offered break is the break reminder's own screen (ADR 0036). It waits a
      // moment first: an offer before the first item comes before the controller is here.
      onOfferBreak: async () => {
        await Promise.resolve();
        if (!wrapping) await takeBreak(true);
      },
      ...(options.restore ? { restore: options.restore.state } : {}),
      ...(options.onState ? { onState: options.onState } : {}),
      seed: options.seed,
      clock,
      emit: record,
      t: options.t,
      localize: options.localize,
      formatNumber: options.formatNumber,
      // No game has audio yet; the audio manager arrives with the first sounds (plan 6.1).
      audio: { play: () => Promise.resolve(), stop: () => undefined },
      assets: {
        url: (assetId) => {
          throw new Error(`No game assets are served yet (asked for ${assetId})`);
        },
      },
      settings,
      onChange: () => {
        store.update({ canHint: controller?.canHint() ?? false });
      },
    });
  } catch {
    fail();
  }
  controller?.finished.catch(fail);
  const stopTicking = options.time
    ? (options.every ?? everyInterval)(TIME_CHECK_MS, checkTime)
    : () => undefined;
  void controller?.finished
    .finally(() => {
      stopTicking();
      options.onEnd?.(Math.max(0, played() - playedBefore));
    })
    .catch(() => undefined);

  let leaving: ReturnType<typeof setTimeout> | undefined;
  const isOpen = () => {
    const { status } = store.getSnapshot();
    return status === 'playing' || status === 'paused';
  };

  return {
    controller,
    hold: () => {
      held = true;
      syncPause();
    },
    release: () => {
      held = false;
      syncPause();
    },
    updateSettings: (next) => {
      Object.assign(settings, next);
    },
    pause: (reason) => {
      controller?.pause(reason);
    },
    resume: (reason) => {
      controller?.resume(reason);
    },
    hint: () => {
      controller?.hint();
    },
    dismissFeedback: () => {
      dismiss?.();
    },
    keepPlaying: () => {
      endBreak?.(true);
    },
    resumeRestored: () => {
      const reason = options.restore?.resumeFor;
      if (reason && store.getSnapshot().status === 'paused') controller?.resume(reason);
    },
    exit: () => {
      if (isOpen()) controller?.end('child-left');
      // Stop for now, from the break reminder, counts as the break.
      endBreak?.(false);
    },
    leaveSoon: () => {
      leaving = setTimeout(() => {
        if (store.getSnapshot().status === 'playing') controller?.pause('navigated-away');
        stopTicking();
      }, 0);
    },
    stay: () => {
      clearTimeout(leaving);
    },
  };
}
