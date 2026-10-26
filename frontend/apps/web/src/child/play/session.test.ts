import {
  GameManifest,
  Item,
  type ItemResponse,
  type LearningEvent,
  type LearningEventType,
} from '@learnofun/contracts';
import type { GameContext, GameModule } from '@learnofun/game-sdk';
import {
  createPlaceholderPolicy,
  type SessionPolicy,
  type SessionState,
} from '@learnofun/learning-core';
import { describe, expect, it } from 'vitest';
import {
  createShellStore,
  feedbackFor,
  progressOf,
  startShellSession,
  type ShellSessionOptions,
  type ShellSnapshot,
} from './session';

const manifest = GameManifest.parse({
  id: 'fake-choice',
  version: '1.0.0',
  itemTypes: ['choice'],
  experienceBands: ['early-primary'],
  inputModes: ['tap', 'keyboard', 'switch'],
  accessibility: { screenReader: 'full', colourIndependent: true },
  flow: 'engine',
  assets: [],
  strings: [],
});

const items = ['shell-1', 'shell-2'].map((id) =>
  Item.parse({
    id,
    type: 'choice',
    skillIds: ['add-within-10'],
    difficulty: 0,
    prompt: { en: '1 + 1' },
    options: [
      { id: 'right', label: { en: '2' } },
      { id: 'wrong', label: { en: '3' } },
    ],
    correctOptionIds: ['right'],
    multiple: false,
  }),
);

const choose = (optionId: string): ItemResponse => ({ type: 'choice', optionIds: [optionId] });

/** Lets presenting finish and queued answers arrive. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

/** A game that answers from a script and records what the shell asks of it. */
function fakeGame(answers: string[], { failPresent = false } = {}) {
  const calls: string[] = [];
  let context: GameContext | undefined;
  const next = () => {
    const optionId = answers.shift();
    if (optionId !== undefined) queueMicrotask(() => context?.respond(choose(optionId)));
  };
  const module: GameModule = {
    manifest,
    mount(ctx) {
      context = ctx;
      return {
        present: () => {
          if (failPresent) return Promise.reject(new Error('cannot draw'));
          next();
          return Promise.resolve();
        },
        feedback: (_result, support) => {
          if (support === 'encouragement' || support === 'hint') next();
          return Promise.resolve();
        },
        hint: (level) => {
          calls.push(`hint ${String(level)}`);
          return Promise.resolve();
        },
        pause: () => calls.push('pause'),
        resume: () => calls.push('resume'),
        destroy: () => calls.push('destroy'),
      };
    },
  };
  return { module, calls, context: () => context };
}

function options(game: GameModule): ShellSessionOptions & { events: LearningEvent[] } {
  let now = Date.UTC(2026, 9, 20, 10);
  const events: LearningEvent[] = [];
  return {
    events,
    game,
    root: {} as HTMLElement,
    items,
    mode: 'practice',
    setup: {
      childId: '0192f4c1-0000-7000-8000-00000000c001',
      activityId: 'dev-fake',
      contentRelease: 'dev',
    },
    seed: 3,
    emit: (batch) => events.push(...batch),
    t: (key) => key,
    localize: (text) => text.en ?? '',
    formatNumber: (value) => String(value),
    settings: { reducedMotion: false, sound: true, textScale: 1 },
    store: createShellStore(),
    clock: { now: () => (now += 100) },
    wait: () => Promise.resolve(),
  };
}

const types = (events: LearningEvent[]): LearningEventType[] => events.map((event) => event.type);

describe('feedbackFor', () => {
  it('cheers a right answer, encourages a retry, and leaves a last wrong answer to the game', () => {
    expect(feedbackFor({ correct: true, score: 1 }, 'none')).toBe('correct');
    expect(feedbackFor({ correct: false, score: 0 }, 'encouragement')).toBe('tryAgain');
    expect(feedbackFor({ correct: false, score: 0 }, 'hint')).toBe('tryAgain');
    expect(feedbackFor({ correct: false, score: 0 }, 'worked-example')).toBeUndefined();
    expect(feedbackFor({ correct: false, score: 0 }, 'none')).toBeUndefined();
  });
});

describe('progressOf', () => {
  const at = (change: Partial<ShellSnapshot>): ShellSnapshot => ({
    status: 'playing',
    presented: 0,
    canHint: false,
    feedback: undefined,
    breakTime: false,
    breakOffered: false,
    ...change,
  });

  it('counts the items before the one on screen, and all of them once complete', () => {
    expect(progressOf(at({ presented: 0 }), 3)).toEqual({ done: 0, total: 3 });
    expect(progressOf(at({ presented: 1 }), 3)).toEqual({ done: 0, total: 3 });
    expect(progressOf(at({ presented: 3 }), 3)).toEqual({ done: 2, total: 3 });
    expect(progressOf(at({ presented: 3, status: 'completed' }), 3)).toEqual({ done: 3, total: 3 });
  });

  it('adds a step for an easy item to end on, and counts what was had when time ran out', () => {
    // Eight planned: a ninth item, to end on a success, makes it nine (ADR 0022).
    expect(progressOf(at({ presented: 9 }), 8)).toEqual({ done: 8, total: 9 });
    expect(progressOf(at({ presented: 5, status: 'time-up' }), 8)).toEqual({ done: 5, total: 5 });
    expect(progressOf(at({ presented: 5, status: 'completed' }), 8)).toEqual({ done: 5, total: 5 });
  });
});

describe('startShellSession', () => {
  it('plays a session through, sending every event and showing feedback after answers', async () => {
    const run = options(fakeGame(['wrong', 'right', 'right']).module);
    const shown: (string | undefined)[] = [];
    run.store.subscribe(() => shown.push(run.store.getSnapshot().feedback));

    const session = startShellSession(run);
    await session.controller?.finished;

    expect(types(run.events)).toEqual([
      'session_started',
      'item_presented',
      'response_submitted',
      'response_submitted',
      'item_presented',
      'response_submitted',
      'session_completed',
    ]);
    expect(run.events[0]).toMatchObject({ activityId: 'dev-fake', gameId: 'fake-choice' });
    expect(shown.filter((kind) => kind !== undefined)).toEqual(['tryAgain', 'correct', 'correct']);
    expect(run.store.getSnapshot()).toMatchObject({ status: 'completed', presented: 2 });
    expect(run.store.getSnapshot().feedback).toBeUndefined();
  });

  it('takes the feedback down as soon as the child taps', async () => {
    const run = options(fakeGame(['right', 'right']).module);
    // The feedback's own time never runs out here, so only a tap takes it down.
    run.wait = () => new Promise<void>(() => undefined);
    const session = startShellSession(run);

    await settle();
    expect(run.store.getSnapshot()).toMatchObject({ feedback: 'correct', presented: 1 });
    session.dismissFeedback();
    await settle();
    expect(run.store.getSnapshot()).toMatchObject({ feedback: 'correct', presented: 2 });
    session.dismissFeedback();

    expect(await session.controller?.finished).toMatchObject({ status: 'completed' });
    expect(run.store.getSnapshot().feedback).toBeUndefined();
  });

  it('carries on a saved session, paused, and resumes it for the reason it paused (ADR 0023)', async () => {
    // A first visit: the first item answered, then the child goes to the background.
    const first = options(fakeGame(['right']).module);
    let saved: SessionState | undefined;
    const visit = startShellSession({ ...first, onState: (state) => (saved = state) });
    await settle();
    visit.pause('backgrounded');
    expect(saved?.status).toBe('paused');

    // After a refresh: the session comes back paused on its second item.
    const second = options(fakeGame(['right']).module);
    const session = startShellSession({
      ...second,
      restore: {
        state: structuredClone(saved) as SessionState,
        events: first.events,
        resumeFor: 'backgrounded',
      },
    });
    expect(second.store.getSnapshot()).toMatchObject({ status: 'paused', presented: 2 });

    session.resumeRestored();
    expect(second.events[0]).toMatchObject({ type: 'session_resumed', reason: 'backgrounded' });
    expect(await session.controller?.finished).toEqual({ status: 'completed' });
    expect(second.store.getSnapshot().status).toBe('completed');
  });

  describe('time limits (ADR 0022)', () => {
    const roomy = {
      sessionMs: 3_600_000,
      leftTodayMs: 3_600_000,
      breakEveryMs: 3_600_000,
      sinceBreakMs: 0,
    };
    const presentedCount = (events: LearningEvent[]) =>
      events.filter((event) => event.type === 'item_presented').length;

    it('finishes the item on screen and ends on a success when the session’s minutes pass', async () => {
      const run = {
        ...options(fakeGame(['right', 'right']).module),
        time: { ...roomy, sessionMs: 1 },
      };
      const session = startShellSession(run);

      expect(await session.controller?.finished).toEqual({ status: 'completed' });
      expect(presentedCount(run.events)).toBe(1);
      expect(run.store.getSnapshot().status).toBe('completed');
    });

    it('stops with the time-limit reason when the day’s play runs out, and celebrates', async () => {
      const run = {
        ...options(fakeGame(['right', 'right']).module),
        time: { ...roomy, leftTodayMs: 1 },
      };
      const session = startShellSession(run);

      expect(await session.controller?.finished).toEqual({ status: 'ended', reason: 'time-limit' });
      expect(presentedCount(run.events)).toBe(1);
      expect(run.events.at(-1)).toMatchObject({ type: 'session_ended', reason: 'time-limit' });
      expect(run.store.getSnapshot().status).toBe('time-up');
    });

    it('checks the limits now and then, and stops checking when the session ends', async () => {
      let check: (() => void) | undefined;
      let stopped = false;
      const run = {
        ...options(fakeGame([]).module),
        time: roomy,
        every: (_ms: number, tick: () => void) => {
          check = tick;
          return () => {
            stopped = true;
          };
        },
      };
      const session = startShellSession(run);
      await settle();

      expect(check).toBeDefined();
      session.exit();
      await session.controller?.finished;
      expect(stopped).toBe(true);
    });

    it('reminds the child to take a break before the next item, and carries on when asked', async () => {
      const breaks: number[] = [];
      const run = {
        ...options(fakeGame(['right', 'right']).module),
        time: { ...roomy, breakEveryMs: 1 },
        onBreak: (sessionMs: number) => breaks.push(sessionMs),
      };
      // Past the break time from the start, so the reminder comes before the first item.
      const session = startShellSession(run);
      await settle();

      expect(run.store.getSnapshot()).toMatchObject({
        breakTime: true,
        breakOffered: false,
        status: 'paused',
      });
      expect(run.events.at(-1)).toMatchObject({ type: 'session_paused', reason: 'break' });
      session.keepPlaying();

      expect(await session.controller?.finished).toEqual({ status: 'completed' });
      expect(run.store.getSnapshot().breakTime).toBe(false);
      expect(breaks.length).toBeGreaterThan(0);
      expect(
        run.events.some((event) => event.type === 'session_resumed' && event.reason === 'break'),
      ).toBe(true);
    });

    it('shows the break reminder when the policy offers a break, and carries on when asked (ADR 0036)', async () => {
      const placeholder = createPlaceholderPolicy();
      const offering: SessionPolicy = {
        version: 'test-offering',
        chooseNext: (view) => {
          const decision = placeholder.chooseNext(view);
          return decision.kind === 'present' && view.finished === 0
            ? { ...decision, offerBreak: true }
            : decision;
        },
        afterResponse: (view) => placeholder.afterResponse(view),
      };
      const run = { ...options(fakeGame(['right', 'right']).module), policy: offering };
      const session = startShellSession(run);
      await settle();

      // The policy's offer, which says nothing of time played (ADR 0036).
      expect(run.store.getSnapshot()).toMatchObject({
        breakTime: true,
        breakOffered: true,
        status: 'paused',
      });
      expect(run.events.at(-1)).toMatchObject({ type: 'session_paused', reason: 'break' });
      session.keepPlaying();

      expect(await session.controller?.finished).toEqual({ status: 'completed' });
      expect(run.store.getSnapshot()).toMatchObject({ breakTime: false, breakOffered: false });
    });

    it('ends the session when the child stops for now, which counts as the break', async () => {
      const breaks: number[] = [];
      const run = {
        ...options(fakeGame(['right', 'right']).module),
        time: { ...roomy, breakEveryMs: 1 },
        onBreak: (sessionMs: number) => breaks.push(sessionMs),
      };
      const session = startShellSession(run);
      await settle();

      session.exit();

      expect(await session.controller?.finished).toEqual({ status: 'ended', reason: 'child-left' });
      expect(breaks).toHaveLength(1);
      expect(run.store.getSnapshot().breakTime).toBe(false);
    });
  });

  it('keeps the game paused while the pause menu holds it, even after the session resumes', async () => {
    const game = fakeGame([]);
    const session = startShellSession(options(game.module));
    await settle();

    session.hold();
    session.pause('parent-gate');
    session.resume('parent-gate');
    expect(game.calls).toEqual(['pause']);

    session.release();
    expect(game.calls).toEqual(['pause', 'resume']);
    session.exit();
  });

  it('follows the session status for pausing and resuming', async () => {
    const run = options(fakeGame([]).module);
    const session = startShellSession(run);
    await settle();

    session.pause('backgrounded');
    expect(run.store.getSnapshot().status).toBe('paused');
    session.resume('backgrounded');
    expect(run.store.getSnapshot().status).toBe('playing');
    expect(run.events.slice(-2)).toMatchObject([
      { type: 'session_paused', reason: 'backgrounded' },
      { type: 'session_resumed', reason: 'backgrounded' },
    ]);
    session.exit();
  });

  it('ends the session early when the child leaves, and only once', async () => {
    const run = options(fakeGame([]).module);
    const session = startShellSession(run);
    await settle();

    session.exit();
    session.exit();

    expect(await session.controller?.finished).toEqual({ status: 'ended', reason: 'child-left' });
    expect(types(run.events).filter((type) => type === 'session_ended')).toHaveLength(1);
    expect(run.store.getSnapshot().status).toBe('ended');
  });

  it('pauses as navigated away when the shell goes away, unless it comes straight back', async () => {
    const run = options(fakeGame([]).module);
    const session = startShellSession(run);
    await settle();

    session.leaveSoon();
    session.stay();
    await settle();
    expect(types(run.events)).not.toContain('session_paused');

    session.leaveSoon();
    await settle();
    expect(run.events.at(-1)).toMatchObject({ type: 'session_paused', reason: 'navigated-away' });
  });

  it('offers a hint while the game takes an answer, and gives it once', async () => {
    const game = fakeGame([]);
    const run = options(game.module);
    const session = startShellSession(run);
    expect(run.store.getSnapshot().canHint).toBe(false);
    await settle();
    expect(run.store.getSnapshot().canHint).toBe(true);

    session.hint();

    expect(game.calls).toEqual(['hint 1']);
    expect(run.events.at(-1)).toMatchObject({ type: 'hint_shown', level: 1 });
    expect(run.store.getSnapshot().canHint).toBe(false);
    session.exit();
  });

  it('shows the game the new settings when the child changes them', async () => {
    const game = fakeGame([]);
    const session = startShellSession(options(game.module));
    await settle();

    session.updateSettings({ reducedMotion: true, sound: false, textScale: 1.5 });

    expect(game.context()?.settings).toEqual({ reducedMotion: true, sound: false, textScale: 1.5 });
    session.exit();
  });

  it('marks the session failed when the game throws', async () => {
    const run = options(fakeGame([], { failPresent: true }).module);
    const session = startShellSession(run);

    await expect(session.controller?.finished).rejects.toThrow('cannot draw');
    expect(run.store.getSnapshot()).toMatchObject({ status: 'failed', canHint: false });
  });

  it('marks the session failed when the game cannot even mount', () => {
    const run = options({
      manifest,
      mount: () => {
        throw new Error('no root');
      },
    });

    const session = startShellSession(run);

    expect(session.controller).toBeUndefined();
    expect(run.store.getSnapshot().status).toBe('failed');
  });
});
