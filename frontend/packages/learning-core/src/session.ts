import {
  EVENT_SCHEMA_VERSION,
  SUPPORT_LEVELS,
  type EndReason,
  type Item,
  type ItemResponse,
  type ItemRole,
  type LearningEvent,
  type Mode,
  type PauseReason,
  type SemVer,
  type SessionReason,
  type SupportLevel,
} from '@learnofun/contracts';
import { answerWeight, guessFloor } from './evidence';
import { grade, type GradeResult } from './graders';
import { uuidv7 } from './ids';
import {
  DEFAULT_LEARNER_CONFIG,
  updateAbility,
  type Ability,
  type LearnerConfig,
} from './learner-model';
import { corePlan, planSize, type SessionPlan } from './plan';
import type { FinishedItem, PolicyView, SessionPolicy } from './policy';
import { nextRandom, type RandomState } from './random';

/**
 * Makes items on demand at the level a policy chooses (ADR 0032), such as a template's seeded
 * generator. Pure: the same level, seed and items so far always give the same item.
 */
export interface ItemMaker {
  /** Each level's typical difficulty, easiest first. */
  levelDifficulty: readonly number[];
  make(level: number, seed: number, used: ReadonlySet<string>): Item;
}

/** What the engine is made with beyond its policy. */
export interface EngineOptions {
  /** Makes items on demand; without it, a session plays the items it is given. */
  maker?: ItemMaker;
  /** The learner model's numbers, for the in-session ability. */
  learner?: LearnerConfig;
}

/** What a session is of. The engine creates the session ID itself, on the device. */
export interface SessionSetup {
  childId: string;
  activityId: string;
  gameId: string;
  gameVersion: SemVer;
  contentRelease: string;
  mode: Mode;
}

export type SessionStatus = 'active' | 'paused' | 'completed' | 'ended';

/**
 * Why a session is finishing early (ADR 0022): its own minutes have passed, or the day's limit has
 * been reached. Either way it finishes the item on screen and ends on a success.
 */
export type WrapUpReason = 'session-length' | 'time-limit';

/** Everything about a running session, as plain data, so it can be saved and resumed. */
export interface SessionState {
  sessionId: string;
  setup: SessionSetup;
  policyVersion: string;
  items: readonly Item[];
  /** How the items are laid out: warm-up, core block and easy items to end on (ADR 0022). */
  plan: SessionPlan;
  random: RandomState;
  /** The sequence number of the next event. */
  sequence: number;
  status: SessionStatus;
  /** Items finished so far. */
  finished: number;
  /** The item finished last, and whether it ended in a correct answer. */
  last?: { index: number; succeeded: boolean } | undefined;
  /** Every item finished so far. Older saved sessions have none. */
  history?: readonly FinishedItem[] | undefined;
  /** In a session made from levels: each level's typical difficulty, and each item's level. */
  levels?: readonly number[] | undefined;
  itemLevels?: readonly number[] | undefined;
  /** The child's ability on the target, kept up to date in the session (ADR 0032). */
  learner?: Ability | undefined;
  /** Set when the session is finishing early. */
  wrapUp?: WrapUpReason | undefined;
  /** The item on screen, if any. */
  current?:
    | {
        index: number;
        role: ItemRole;
        /** Answers given to this item so far. */
        attempts: number;
        /** The support the child has had on this item so far (plan 5.1). It only ever rises. */
        support: SupportLevel;
        /** Hints shown on this item, asked for or given after wrong answers (ADR 0013). */
        hints: number;
        /** Whether the latest answer to it was correct. */
        correct: boolean;
        presentedAt: number;
        /** How the first answer went. */
        first?: { correct: boolean; helped: boolean; latencyMs: number } | undefined;
      }
    | undefined;
}

/** What the game should do next. */
export type EngineStep =
  | {
      kind: 'present';
      item: Item;
      role: ItemRole;
      reason: SessionReason;
      /** The policy offers a break before this item: the shell shows its break screen. */
      offerBreak?: boolean;
    }
  | {
      kind: 'feedback';
      result: GradeResult;
      support: SupportLevel;
      /** After the feedback: another attempt at the same item, or the next item. */
      then: 'retry' | 'advance';
      reason: SessionReason;
    }
  | {
      kind: 'complete';
      reason: SessionReason;
      /** Set when the session stopped before its end: the day's time ran out (ADR 0022). */
      ended?: EndReason;
    };

export interface EngineResult {
  state: SessionState;
  events: LearningEvent[];
  step: EngineStep;
}

export interface EventsResult {
  state: SessionState;
  events: LearningEvent[];
}

type Payload = LearningEvent extends infer E
  ? E extends LearningEvent
    ? Omit<E, 'id' | 'sessionId' | 'sequence' | 'occurredAt' | 'schemaVersion'>
    : never
  : never;

/** Wraps a payload in the event envelope, with an ID from the clock and the seed. */
function record(state: SessionState, now: number, payload: Payload): [LearningEvent, SessionState] {
  const [id, random] = uuidv7(now, state.random);
  const event = {
    id,
    sessionId: state.sessionId,
    sequence: state.sequence,
    occurredAt: new Date(now).toISOString(),
    schemaVersion: EVENT_SCHEMA_VERSION,
    ...payload,
  } as LearningEvent;
  return [event, { ...state, random, sequence: state.sequence + 1 }];
}

/** Records several payloads in order. */
function recordAll(state: SessionState, now: number, payloads: Payload[]): EventsResult {
  const events: LearningEvent[] = [];
  let next = state;
  for (const payload of payloads) {
    const [event, after] = record(next, now, payload);
    events.push(event);
    next = after;
  }
  return { state: next, events };
}

function initialAbility(config: LearnerConfig): Ability {
  return { ability: config.initialAbility, uncertainty: config.initialUncertainty };
}

function view(state: SessionState, config: LearnerConfig): PolicyView {
  return {
    mode: state.setup.mode,
    plan: state.plan,
    finished: state.finished,
    ...(state.last ? { last: state.last } : {}),
    wrappingUp: state.wrapUp !== undefined,
    history: state.history ?? [],
    itemCount: state.items.length,
    ...(state.levels ? { levels: state.levels } : {}),
    learner: state.learner ?? initialAbility(config),
  };
}

/** The finished item for the history, from the item that was on screen. */
function finished(
  state: SessionState,
  current: NonNullable<SessionState['current']>,
  skipped: boolean,
): FinishedItem {
  const level = state.itemLevels?.[current.index];
  return {
    index: current.index,
    ...(level === undefined || level < 0 ? {} : { level }),
    role: current.role,
    firstTry: !skipped && current.first?.correct === true && !current.first.helped,
    supported: current.support === 'hint' || current.support === 'worked-example',
    succeeded: !skipped && current.correct,
    skipped,
    ...(current.first ? { latencyMs: current.first.latencyMs } : {}),
  };
}

/** The support ladder in order (plan 4.2), so support so far can only rise. */
function higherSupport(a: SupportLevel, b: SupportLevel): SupportLevel {
  return SUPPORT_LEVELS.indexOf(b) > SUPPORT_LEVELS.indexOf(a) ? b : a;
}

/**
 * Whether the child may ask for a hint now (ADR 0013): in Practice, on an item that has had no
 * hint yet. The game shell also waits until the game is taking an answer.
 */
export function canRequestHint(state: SessionState): boolean {
  return (
    state.status === 'active' &&
    state.setup.mode === 'practice' &&
    state.current !== undefined &&
    SUPPORT_LEVELS.indexOf(state.current.support) < SUPPORT_LEVELS.indexOf('hint')
  );
}

function requireActive(state: SessionState, action: string) {
  if (state.status !== 'active')
    throw new Error(`Cannot ${action}: the session is ${state.status}`);
}

/**
 * The session engine (plan 6.1): a pure state machine. Every function takes the state and the
 * time, and returns the new state, the learning events to record, and what the game should do.
 * The same setup, seed, times and answers always give the same session, event IDs included.
 */
export function createSessionEngine(policy: SessionPolicy, options: EngineOptions = {}) {
  const learnerConfig = options.learner ?? DEFAULT_LEARNER_CONFIG;
  const { maker } = options;

  /** Makes a new item at a level, seeded from the session, never one it already has. */
  function make(state: SessionState, level: number): [SessionState, number] {
    if (!maker) throw new Error('The policy asked for a new item, but the session has no maker');
    const [value, random] = nextRandom(state.random);
    const seed = Math.floor(value * 2 ** 31);
    const item = maker.make(level, seed, new Set(state.items.map((i) => i.id)));
    return [
      {
        ...state,
        random,
        items: [...state.items, item],
        itemLevels: [...(state.itemLevels ?? state.items.map(() => -1)), level],
      },
      state.items.length,
    ];
  }

  /** Asks the policy for the next item and presents it, or completes the session. */
  function next(state: SessionState, now: number, before: LearningEvent[] = []): EngineResult {
    const decision = policy.chooseNext(view(state, learnerConfig));
    if (decision.kind === 'complete') {
      // The day's time ran out (ADR 0022), or the policy ended the session early (ADR 0032):
      // either way it ends on a success, before its end.
      const ended =
        decision.ended ?? (state.wrapUp === 'time-limit' ? ('time-limit' as const) : undefined);
      const done = ended
        ? recordAll({ ...state, status: 'ended' }, now, [{ type: 'session_ended', reason: ended }])
        : recordAll({ ...state, status: 'completed' }, now, [{ type: 'session_completed' }]);
      return {
        ...done,
        events: [...before, ...done.events],
        step: { kind: 'complete', reason: decision.reason, ...(ended ? { ended } : {}) },
      };
    }
    const [withItem, index] =
      decision.kind === 'make' ? make(state, decision.level) : [state, decision.index];
    const item = withItem.items[index];
    if (!item) throw new Error(`The policy chose item ${String(index)}, which does not exist`);
    const presented = recordAll(
      {
        ...withItem,
        current: {
          index,
          role: decision.role,
          attempts: 0,
          support: 'none',
          hints: 0,
          correct: false,
          presentedAt: now,
        },
      },
      now,
      [
        {
          type: 'item_presented',
          itemId: item.id,
          skillIds: item.skillIds,
          difficulty: item.difficulty,
          role: decision.role,
        },
      ],
    );
    return {
      ...presented,
      events: [...before, ...presented.events],
      step: {
        kind: 'present',
        item,
        role: decision.role,
        reason: decision.reason,
        ...(decision.offerBreak ? { offerBreak: true } : {}),
      },
    };
  }

  function currentItem(state: SessionState) {
    const item = state.current ? state.items[state.current.index] : undefined;
    if (!state.current || !item) throw new Error('No item is waiting for an answer');
    return { current: state.current, item };
  }

  return {
    policyVersion: policy.version,

    /**
     * Starts a session. Without a plan, the items are the core block alone. With a maker, the
     * session starts with no items and makes them as the policy asks (ADR 0032). The child's
     * ability on the target, from the learner model, sets where the policy starts.
     */
    start(
      setup: SessionSetup,
      items: readonly Item[],
      random: RandomState,
      now: number,
      plan: SessionPlan = corePlan(items.length),
      learner?: Ability,
    ): EngineResult {
      if (!maker && planSize(plan) !== items.length) {
        throw new Error(
          `The plan lays out ${String(planSize(plan))} items, but the session has ${String(items.length)}`,
        );
      }
      const [sessionId, afterId] = uuidv7(now, random);
      const initial: SessionState = {
        sessionId,
        setup,
        policyVersion: policy.version,
        items,
        plan,
        random: afterId,
        sequence: 0,
        status: 'active',
        finished: 0,
        history: [],
        learner: learner ?? initialAbility(learnerConfig),
        ...(maker ? { levels: maker.levelDifficulty, itemLevels: items.map(() => -1) } : {}),
      };
      const started = recordAll(initial, now, [
        {
          type: 'session_started',
          activityId: setup.activityId,
          gameId: setup.gameId,
          gameVersion: setup.gameVersion,
          contentRelease: setup.contentRelease,
          mode: setup.mode,
          policyVersion: policy.version,
        },
      ]);
      return next(started.state, now, started.events);
    },

    /**
     * Carries on a saved session (ADR 0023): the item that was on screen is shown again, with the
     * attempts and support it had so far, and its answer time counts from now. Records nothing:
     * a paused session still needs `resume`.
     */
    continueFrom(state: SessionState, now: number): EngineResult {
      if (state.status === 'completed' || state.status === 'ended') {
        throw new Error(`Cannot carry on: the session is ${state.status}`);
      }
      const { current, item } = currentItem(state);
      return {
        state: { ...state, current: { ...current, presentedAt: now } },
        events: [],
        step: { kind: 'present', item, role: current.role, reason: 'RESUMED' },
      };
    },

    /** Grades an answer and decides between another attempt and the next item. */
    respond(state: SessionState, response: ItemResponse, now: number): EngineResult {
      requireActive(state, 'answer');
      const { current, item } = currentItem(state);
      const result = grade(item, response);
      const attempts = current.attempts + 1;
      const decision = policy.afterResponse({
        ...view(state, learnerConfig),
        current: { index: current.index, attempts, lastResult: result },
      });
      // The first answer moves the in-session ability, weighted as evidence is (plan 5.3); a
      // scaffold's answer is about its prerequisite, so it does not move the target's.
      const helped = current.support === 'hint' || current.support === 'worked-example';
      const latencyMs = Math.max(0, now - current.presentedAt);
      const first = current.first ?? { correct: result.correct, helped, latencyMs };
      const learner =
        attempts === 1
          ? updateAbility(
              state.learner ?? initialAbility(learnerConfig),
              {
                weight: answerWeight({
                  attempt: 1,
                  helped,
                  correct: result.correct,
                  role: current.role,
                  seenRecently: false,
                  towardTarget: current.role === 'scaffold',
                }),
                correct: result.correct,
                difficulty: item.difficulty,
                guessFloor: guessFloor(item),
              },
              learnerConfig,
            )
          : state.learner;
      const payloads: Payload[] = [
        {
          type: 'response_submitted',
          itemId: item.id,
          attempt: attempts,
          response,
          latencyMs,
          support: current.support,
        },
      ];
      const hints = decision.support === 'hint' ? current.hints + 1 : current.hints;
      if (decision.support === 'hint')
        payloads.push({ type: 'hint_shown', itemId: item.id, level: hints });
      if (decision.support === 'worked-example') {
        payloads.push({
          type: 'explanation_shown',
          itemId: item.id,
          ...(result.misconceptionId ? { misconceptionId: result.misconceptionId } : {}),
        });
      }
      const support = higherSupport(current.support, decision.support);
      const answered = recordAll(
        {
          ...state,
          learner,
          current: { ...current, attempts, support, hints, correct: result.correct, first },
        },
        now,
        payloads,
      );
      return {
        ...answered,
        step: {
          kind: 'feedback',
          result,
          support: decision.support,
          then: decision.kind,
          reason: decision.reason,
        },
      };
    },

    /** Moves on after feedback that said to advance. */
    advance(state: SessionState, now: number): EngineResult {
      requireActive(state, 'move on');
      const { current } = currentItem(state);
      return next(
        {
          ...state,
          finished: state.finished + 1,
          last: { index: current.index, succeeded: current.correct },
          history: [...(state.history ?? []), finished(state, current, false)],
          current: undefined,
        },
        now,
      );
    },

    /** The child skips the current item (plan 5.3: no ability update; it feeds disengagement). */
    skip(state: SessionState, now: number): EngineResult {
      requireActive(state, 'skip');
      const { current, item } = currentItem(state);
      const skipped = recordAll(state, now, [{ type: 'item_skipped', itemId: item.id }]);
      return next(
        {
          ...skipped.state,
          finished: state.finished + 1,
          last: { index: current.index, succeeded: false },
          history: [...(state.history ?? []), finished(state, current, true)],
          current: undefined,
        },
        now,
        skipped.events,
      );
    },

    /**
     * The child asks for a hint on the item on screen (ADR 0013). The item's support so far
     * becomes a hint, so the next answer carries it (plan 5.3). Returns the hint's level.
     */
    requestHint(state: SessionState, now: number): EventsResult & { level: number } {
      if (!canRequestHint(state)) {
        throw new Error('Cannot give a hint: hints are for Practice, once per item');
      }
      const { current, item } = currentItem(state);
      const level = current.hints + 1;
      const hinted = recordAll(
        { ...state, current: { ...current, support: 'hint', hints: level } },
        now,
        [{ type: 'hint_shown', itemId: item.id, level }],
      );
      return { ...hinted, level };
    },

    pause(state: SessionState, reason: PauseReason, now: number): EventsResult {
      requireActive(state, 'pause');
      return recordAll({ ...state, status: 'paused' }, now, [{ type: 'session_paused', reason }]);
    },

    resume(state: SessionState, reason: PauseReason, now: number): EventsResult {
      if (state.status !== 'paused')
        throw new Error(`Cannot resume: the session is ${state.status}`);
      return recordAll({ ...state, status: 'active' }, now, [{ type: 'session_resumed', reason }]);
    },

    /**
     * Time is up (ADR 0022): the session finishes the item on screen and ends on a success. The
     * day's limit outranks the session's own length, since it decides what comes next. Records
     * nothing until the session ends.
     */
    wrapUp(state: SessionState, reason: WrapUpReason): SessionState {
      if (state.status === 'completed' || state.status === 'ended') return state;
      if (state.wrapUp === 'time-limit' || state.wrapUp === reason) return state;
      return { ...state, wrapUp: reason };
    },

    /** Ends the session before it completes. */
    end(state: SessionState, reason: EndReason, now: number): EventsResult {
      if (state.status === 'completed' || state.status === 'ended') {
        throw new Error(`Cannot end: the session is ${state.status}`);
      }
      return recordAll({ ...state, status: 'ended', current: undefined }, now, [
        { type: 'session_ended', reason },
      ]);
    },

    /** Records typed game telemetry: a number or true/false, never text (plan 5.1). */
    signal(state: SessionState, name: string, value: number | boolean, now: number): EventsResult {
      requireActive(state, 'record a signal');
      return recordAll(state, now, [{ type: 'game_signal', name, value }]);
    },
  };
}

export type SessionEngine = ReturnType<typeof createSessionEngine>;
