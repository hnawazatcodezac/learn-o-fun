import {
  LearningEvent,
  type Item,
  type LearningEventType,
  type Mode,
  type SupportLevel,
} from '@learnofun/contracts';
import {
  runSession,
  type Clock,
  type FormatNumber,
  type GameContext,
  type GameModule,
  type GameSettings,
  type Localize,
  type SessionController,
  type Translate,
} from '@learnofun/game-sdk';

/** A made-up child, so the sandbox never touches a real profile. */
export const SANDBOX_CHILD_ID = '0192f4c1-0000-7000-8000-00000000005a';
export const SANDBOX_CONTENT_RELEASE = 'sandbox';

export type RunStatus = 'playing' | 'paused' | 'completed' | 'ended' | 'failed';

export interface LoggedEvent {
  event: LearningEvent;
  /** Why the event does not match the contract in packages/contracts, if it does not. */
  invalid?: string;
}

/** Something the game did that it must not: the sandbox lists these beside the game. */
export type Problem =
  | { kind: 'invalid-event'; sequence: number; type: string; message: string }
  | { kind: 'undeclared-string'; key: string }
  | { kind: 'undeclared-signal'; name: string }
  | { kind: 'signal-kind'; name: string; expected: 'number' | 'boolean' }
  | { kind: 'game-error'; message: string };

export interface RunSnapshot {
  status: RunStatus;
  events: readonly LoggedEvent[];
  problems: readonly Problem[];
  /** The latest answer and the support the engine gave for it. */
  lastAnswer: { correct: boolean; support: SupportLevel } | undefined;
  /** Whether the child could ask for a hint now (ADR 0013). */
  canHint: boolean;
}

const INITIAL: RunSnapshot = {
  status: 'playing',
  events: [],
  problems: [],
  lastAnswer: undefined,
  canHint: false,
};

/** Holds the current run's state for React's `useSyncExternalStore`. */
export interface RunStore {
  getSnapshot: () => RunSnapshot;
  subscribe: (listener: () => void) => () => void;
  reset: () => void;
  update: (change: (snapshot: RunSnapshot) => RunSnapshot) => void;
}

export function createRunStore(): RunStore {
  let snapshot = INITIAL;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of listeners) listener();
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset: () => {
      snapshot = INITIAL;
      notify();
    },
    update: (change) => {
      snapshot = change(snapshot);
      notify();
    },
  };
}

const STATUS_AFTER: Partial<Record<LearningEventType, RunStatus>> = {
  session_started: 'playing',
  session_paused: 'paused',
  session_resumed: 'playing',
  session_completed: 'completed',
  session_ended: 'ended',
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Checks each event against the contract, as the API will on ingest. */
function logEvents(snapshot: RunSnapshot, events: readonly LearningEvent[]): RunSnapshot {
  const logged: LoggedEvent[] = [];
  const problems: Problem[] = [];
  let status = snapshot.status;
  for (const event of events) {
    const check = LearningEvent.safeParse(event);
    if (check.success) {
      logged.push({ event });
    } else {
      const message = check.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      logged.push({ event, invalid: message });
      problems.push({ kind: 'invalid-event', sequence: event.sequence, type: event.type, message });
    }
    status = STATUS_AFTER[event.type] ?? status;
  }
  return {
    ...snapshot,
    status,
    events: [...snapshot.events, ...logged],
    problems: [...snapshot.problems, ...problems],
  };
}

interface Observers {
  report(problem: Problem): void;
  answered(correct: boolean, support: SupportLevel): void;
}

/**
 * Wraps a game to watch what it does: message keys and signals its manifest does not declare,
 * and the feedback the engine has it show.
 */
function observeGame(game: GameModule, observers: Observers): GameModule {
  const { manifest } = game;
  const strings = new Set(manifest.strings);
  const signals = new Map(manifest.signals.map((signal) => [signal.name, signal.kind]));
  const reported = new Set<string>();
  const reportOnce = (id: string, problem: Problem) => {
    if (reported.has(id)) return;
    reported.add(id);
    observers.report(problem);
  };

  return {
    manifest,
    mount(ctx, root) {
      const observed: GameContext = {
        ...ctx,
        t: (key, values) => {
          if (!strings.has(key)) reportOnce(`string ${key}`, { kind: 'undeclared-string', key });
          return ctx.t(key, values);
        },
        signal: (name, value) => {
          const kind = signals.get(name);
          if (kind === undefined) {
            reportOnce(`signal ${name}`, { kind: 'undeclared-signal', name });
          } else if (typeof value !== kind) {
            reportOnce(`kind ${name}`, { kind: 'signal-kind', name, expected: kind });
          }
          ctx.signal(name, value);
        },
      };
      const instance = game.mount(observed, root);
      return {
        present: (item) => instance.present(item),
        feedback: (result, support) => {
          observers.answered(result.correct, support);
          return instance.feedback(result, support);
        },
        hint: (level) => instance.hint(level),
        pause: () => {
          instance.pause();
        },
        resume: () => {
          instance.resume();
        },
        destroy: () => {
          instance.destroy();
        },
      };
    },
  };
}

export interface StartRunOptions {
  game: GameModule;
  root: HTMLElement;
  items: readonly Item[];
  mode: Mode;
  seed: number;
  t: Translate;
  localize: Localize;
  formatNumber: FormatNumber;
  settings: GameSettings;
  /** Defaults to the device clock; tests pass their own. */
  clock?: Clock;
}

export interface Run {
  /** Undefined when the game failed to start. */
  controller: SessionController | undefined;
  /** Ends the session and ignores anything it does afterwards. */
  stop(): void;
}

/**
 * Plays a game with the real session runner (game-sdk) and engine (learning-core), recording
 * every learning event, and anything wrong, in the store. Starting a run resets the store.
 */
export function startRun(store: RunStore, options: StartRunOptions): Run {
  let live = true;
  const update = (change: (snapshot: RunSnapshot) => RunSnapshot) => {
    if (live) store.update(change);
  };
  const fail = (error: unknown) => {
    update((snapshot) => ({
      ...snapshot,
      status: 'failed',
      problems: [...snapshot.problems, { kind: 'game-error', message: messageOf(error) }],
    }));
  };
  const game = observeGame(options.game, {
    report: (problem) => {
      update((snapshot) => ({ ...snapshot, problems: [...snapshot.problems, problem] }));
    },
    answered: (correct, support) => {
      update((snapshot) => ({ ...snapshot, lastAnswer: { correct, support } }));
    },
  });

  store.reset();
  let controller: SessionController | undefined;
  try {
    controller = runSession({
      game,
      root: options.root,
      setup: {
        childId: SANDBOX_CHILD_ID,
        activityId: `sandbox-${game.manifest.id}`,
        contentRelease: SANDBOX_CONTENT_RELEASE,
        mode: options.mode,
      },
      items: options.items,
      seed: options.seed,
      clock: options.clock ?? { now: () => Date.now() },
      emit: (events) => {
        update((snapshot) => logEvents(snapshot, events));
      },
      t: options.t,
      localize: options.localize,
      formatNumber: options.formatNumber,
      // Games have no audio or image assets yet; these arrive with the first game that does.
      audio: { play: () => Promise.resolve(), stop: () => undefined },
      assets: {
        url: (assetId) => {
          throw new Error(`The sandbox cannot load assets yet (asked for ${assetId})`);
        },
      },
      settings: options.settings,
      onChange: () => {
        const canHint = controller?.canHint() ?? false;
        if (canHint !== store.getSnapshot().canHint) {
          update((snapshot) => ({ ...snapshot, canHint }));
        }
      },
    });
  } catch (error) {
    fail(error);
  }
  controller?.finished.catch(fail);

  return {
    controller,
    stop() {
      live = false;
      controller?.end('child-left');
    },
  };
}
