import type {
  EndReason,
  Item,
  ItemResponse,
  LearningEvent,
  PauseReason,
} from '@learnofun/contracts';
import {
  canRequestHint,
  createPlaceholderPolicy,
  createRandom,
  createSessionEngine,
  deriveSeed,
  seedRandom,
  type Ability,
  type EngineStep,
  type ItemMaker,
  type EventsResult,
  type SessionPlan,
  type SessionPolicy,
  type SessionSetup,
  type SessionState,
  type WrapUpReason,
} from '@learnofun/learning-core';
import type {
  AssetLoader,
  AudioManager,
  Clock,
  GameContext,
  GameModule,
  FormatNumber,
  GameSettings,
  Localize,
  Translate,
} from './contract';

/** Receives learning events in order, for example the app's offline event queue (step 9). */
export type EventSink = (events: readonly LearningEvent[]) => void;

export interface RunSessionOptions {
  game: GameModule;
  root: HTMLElement;
  /** The game ID and version come from the game's manifest. */
  setup: Omit<SessionSetup, 'gameId' | 'gameVersion'>;
  items: readonly Item[];
  /**
   * How the items are laid out: warm-up, core block and easy items to end on (ADR 0022). Without
   * one, the items are the core block alone.
   */
  plan?: SessionPlan;
  /** Seeds the session's event IDs and, through a separate stream, the game's `ctx.rng`. */
  seed: number;
  clock: Clock;
  emit: EventSink;
  t: Translate;
  localize: Localize;
  formatNumber: FormatNumber;
  audio: AudioManager;
  assets: AssetLoader;
  settings: GameSettings;
  /** The in-session policy. Without one, the placeholder, which plays `items` in order. */
  policy?: SessionPolicy;
  /**
   * Makes the session's items on demand, at the level the policy asks (ADR 0032). Without one,
   * `items` is the session's fixed list, as a game's stories are.
   */
  maker?: ItemMaker;
  /** The child's ability on the session's target, from the learner model: where the policy starts. */
  learner?: Ability;
  /**
   * The policy offers a break before the next item, when the child seems to have drifted (plan
   * 4.2): the app shows its break screen, and the session carries on once this resolves.
   */
  onOfferBreak?: () => Promise<void>;
  /**
   * Carries on this saved session instead of starting one (ADR 0023): the item that was on
   * screen is shown again. Its own items and plan are used; `items` and `plan` are ignored.
   */
  restore?: SessionState;
  /** Called with the session's state, plain data, whenever it changes, so the app can save it. */
  onState?: (state: SessionState) => void;
  /**
   * Called when what the controller allows may have changed, such as `canHint()`, which events
   * alone do not show: a game becomes ready for an answer once it has finished presenting.
   */
  onChange?: () => void;
}

export type SessionOutcome = { status: 'completed' } | { status: 'ended'; reason: EndReason };

export interface SessionController {
  sessionId: string;
  /** Resolves when the session completes or is ended. */
  finished: Promise<SessionOutcome>;
  pause(reason: PauseReason): void;
  resume(reason: PauseReason): void;
  /** Skips the item on screen. */
  skip(): void;
  /** Whether the child can ask for a hint now: the game is taking an answer (ADR 0013). */
  canHint(): boolean;
  /** Shows a hint the child asked for, if `canHint()`; returns whether it did. */
  hint(): boolean;
  /**
   * Time is up (ADR 0022): the session finishes the item on screen, ends on a success and stops.
   * With 'time-limit', it ends with that reason.
   */
  wrapUp(reason: WrapUpReason): void;
  end(reason: EndReason): void;
}

/**
 * Runs one session of a game: mounts it, presents each item the engine chooses, waits for the
 * child's answer, has the engine grade it, shows the feedback, and passes every learning event to
 * `emit`. The engine in `learning-core` decides everything; this only connects it to the game.
 */
export function runSession(options: RunSessionOptions): SessionController {
  const { game, clock, emit } = options;
  const changed = () => options.onChange?.();
  const engine = createSessionEngine(
    options.policy ?? createPlaceholderPolicy(),
    options.maker ? { maker: options.maker } : {},
  );
  const first = options.restore
    ? engine.continueFrom(options.restore, clock.now())
    : engine.start(
        { ...options.setup, gameId: game.manifest.id, gameVersion: game.manifest.version },
        options.items,
        seedRandom(options.seed),
        clock.now(),
        options.plan,
        options.learner,
      );
  let state = first.state;
  const apply = (result: EventsResult) => {
    state = result.state;
    options.onState?.(state);
    if (result.events.length > 0) emit(result.events);
    changed();
  };
  apply(first);

  /** Resolves with the child's answer, or null when the item is skipped or the session ends. */
  let waiting:
    | { resolve: (response: ItemResponse | null) => void; reject: (error: unknown) => void }
    | undefined;
  /** The game has finished presenting or giving feedback, and is taking the child's answer. */
  let taking = false;
  let endedWith: EndReason | undefined;
  const nextAnswer = () =>
    new Promise<ItemResponse | null>((resolve, reject) => {
      waiting = { resolve, reject };
    });
  const release = (response: ItemResponse | null) => {
    const pending = waiting;
    waiting = undefined;
    taking = false;
    pending?.resolve(response);
  };
  /** Once the game is ready, it is taking the answer, unless the child has already answered. */
  const ready = () => {
    taking = waiting !== undefined;
    changed();
  };
  /** A game failure outside the play loop, such as a failed hint, ends the loop with the error. */
  const failLoop = (error: unknown) => {
    const pending = waiting;
    waiting = undefined;
    taking = false;
    pending?.reject(error);
  };

  const ctx: GameContext = {
    respond: (response) => {
      if (state.status === 'active') release(response);
    },
    t: options.t,
    localize: options.localize,
    audio: options.audio,
    assets: options.assets,
    rng: createRandom(deriveSeed(options.seed, 'game')),
    clock,
    settings: options.settings,
    mode: options.setup.mode,
    formatNumber: options.formatNumber,
    signal: (name, value) => {
      if (state.status === 'active') apply(engine.signal(state, name, value, clock.now()));
    },
    observe: () => {
      throw new Error('observe() is for self-driven games (plan 6.3), which arrive later');
    },
  };
  const instance = game.mount(ctx, options.root);

  /** Waits for an answer and lets the engine respond to it, or to a skip. */
  async function answered(answer: Promise<ItemResponse | null>): Promise<EngineStep | undefined> {
    const response = await answer;
    if (endedWith !== undefined) return undefined;
    const result =
      response === null
        ? engine.skip(state, clock.now())
        : engine.respond(state, response, clock.now());
    apply(result);
    return result.step;
  }

  async function play(): Promise<SessionOutcome> {
    let step: EngineStep | undefined = first.step;
    try {
      while (step && step.kind !== 'complete') {
        if (step.kind === 'present') {
          // An offered break comes first, never as a penalty (plan 4.2).
          if (step.offerBreak) await options.onOfferBreak?.();
          if (endedWith !== undefined) break;
          const answer = nextAnswer();
          await instance.present({ item: step.item, role: step.role });
          ready();
          step = await answered(answer);
        } else if (step.then === 'retry') {
          const answer = nextAnswer();
          await instance.feedback(step.result, step.support);
          ready();
          step = await answered(answer);
        } else {
          await instance.feedback(step.result, step.support);
          if (endedWith !== undefined) break;
          const result = engine.advance(state, clock.now());
          apply(result);
          step = result.step;
        }
      }
    } finally {
      taking = false;
      instance.destroy();
      changed();
    }
    // The day's time ran out, so the engine ended the session on a success (ADR 0022).
    if (endedWith === undefined && step?.kind === 'complete' && step.ended) {
      return { status: 'ended', reason: step.ended };
    }
    return endedWith === undefined
      ? { status: 'completed' }
      : { status: 'ended', reason: endedWith };
  }

  return {
    sessionId: state.sessionId,
    finished: play(),
    pause: (reason) => {
      if (state.status !== 'active') return;
      apply(engine.pause(state, reason, clock.now()));
      instance.pause();
    },
    resume: (reason) => {
      if (state.status !== 'paused') return;
      apply(engine.resume(state, reason, clock.now()));
      instance.resume();
    },
    skip: () => {
      if (state.status === 'active') release(null);
    },
    canHint: () => taking && canRequestHint(state),
    hint: () => {
      if (!taking || !canRequestHint(state)) return false;
      const result = engine.requestHint(state, clock.now());
      apply(result);
      try {
        instance.hint(result.level).catch(failLoop);
      } catch (error) {
        failLoop(error);
      }
      return true;
    },
    wrapUp: (reason) => {
      state = engine.wrapUp(state, reason);
      options.onState?.(state);
    },
    end: (reason) => {
      if (state.status === 'completed' || state.status === 'ended') return;
      apply(engine.end(state, reason, clock.now()));
      endedWith = reason;
      release(null);
    },
  };
}
