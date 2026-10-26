import {
  GameManifest,
  Item,
  ItemResponse,
  LearningEvent,
  type LearningEventType,
} from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import type { GameContext, GameModule } from './contract';
import {
  createPlaceholderPolicy,
  type ItemMaker,
  type SessionPolicy,
  type SessionState,
} from '@learnofun/learning-core';
import { runSession, type RunSessionOptions, type SessionController } from './runner';

const START = Date.UTC(2026, 9, 20, 9, 15);

const manifest = GameManifest.parse({
  id: 'fake-hop',
  version: '0.0.1',
  itemTypes: ['placement'],
  experienceBands: ['early-primary'],
  inputModes: ['tap', 'keyboard', 'switch'],
  accessibility: { screenReader: 'full', colourIndependent: true },
  flow: 'engine',
  assets: [],
  strings: ['games.fakeHop.title'],
  signals: [{ name: 'jumps', kind: 'number' }],
});

const hop = (id: string, target: number) =>
  Item.parse({
    id,
    type: 'placement',
    skillIds: ['add-within-20'],
    difficulty: 0,
    surface: { kind: 'line', min: 0, max: 20, target, tolerance: 0 },
  });

const items = [hop('hop-to-14', 14), hop('hop-to-9', 9)];
const at = (position: number) =>
  ItemResponse.parse({ type: 'placement', at: { kind: 'line', position } });

/**
 * A fake game that plays from a script of positions: it answers each item and each retry with
 * the next position, records what the platform asked it to do, and draws from `ctx.rng`.
 */
function scriptedGame(positions: number[], { failHint = false } = {}) {
  const script = [...positions];
  const calls: string[] = [];
  const draws: number[] = [];
  let context: GameContext | undefined;
  const answer = () => {
    const position = script.shift();
    if (position !== undefined) queueMicrotask(() => context?.respond(at(position)));
  };
  const module: GameModule = {
    manifest,
    mount: (ctx) => {
      context = ctx;
      calls.push('mount');
      return {
        present: ({ item, role }) => {
          calls.push(`present ${item.id} as ${role}`);
          draws.push(ctx.rng.int(1, 100));
          ctx.signal('jumps', 1);
          answer();
          return Promise.resolve();
        },
        feedback: (result, support) => {
          calls.push(`feedback ${result.correct ? 'right' : 'wrong'}, ${support}`);
          if (support === 'encouragement' || support === 'hint') answer();
          return Promise.resolve();
        },
        hint: (level) => {
          calls.push(`hint ${String(level)}`);
          return failHint ? Promise.reject(new Error('no hint art')) : Promise.resolve();
        },
        pause: () => calls.push('pause'),
        resume: () => calls.push('resume'),
        destroy: () => calls.push('destroy'),
      };
    },
  };
  return { module, calls, draws, context: () => context };
}

function options(game: GameModule, seed = 1): RunSessionOptions & { events: LearningEvent[] } {
  let now = START;
  const events: LearningEvent[] = [];
  return {
    events,
    game,
    root: {} as HTMLElement,
    setup: {
      childId: '0192f4c1-0000-7000-8000-00000000c001',
      activityId: 'hop-line-add-within-20',
      contentRelease: 'mock-2026-10-20',
      mode: 'practice',
    },
    items,
    seed,
    clock: { now: () => (now += 250) },
    emit: (batch) => events.push(...batch),
    t: (key) => key,
    localize: (text) => text.en ?? '',
    formatNumber: (value) => `#${String(value)}`,
    audio: { play: () => Promise.resolve(), stop: () => undefined },
    assets: { url: (id) => `/assets/${id}` },
    settings: { reducedMotion: false, sound: true, textScale: 1 },
  };
}

const types = (events: LearningEvent[]): LearningEventType[] => events.map((event) => event.type);

/** A policy that has two items made, at levels 0 and 1, and can offer a break before the first. */
function making({ offerBreak = false } = {}): SessionPolicy {
  const placeholder = createPlaceholderPolicy();
  return {
    version: 'test-making',
    chooseNext: ({ finished }) =>
      finished < 2
        ? {
            kind: 'make',
            level: finished,
            role: 'target',
            reason: 'SUCCESS_ZONE',
            ...(offerBreak && finished === 0 ? { offerBreak: true } : {}),
          }
        : { kind: 'complete', reason: 'SESSION_COMPLETE' },
    afterResponse: (view) => placeholder.afterResponse(view),
  };
}

/** Hop items at two levels: level 0 lands on 10, level 1 on 11. */
const maker: ItemMaker = {
  levelDifficulty: [-1, 0],
  make: (level) => hop(`made-${String(level)}`, 10 + level),
};

describe('runSession with items made on demand (ADR 0032, ADR 0036)', () => {
  it('makes each item at the level the policy asks, starting from the child’s ability', async () => {
    const game = scriptedGame([10, 11]);
    const states: SessionState[] = [];
    const run = {
      ...options(game.module),
      items: [],
      policy: making(),
      maker,
      learner: { ability: 1.2, uncertainty: 0.4 },
      onState: (state: SessionState) => states.push(state),
    };

    expect(await runSession(run).finished).toEqual({ status: 'completed' });
    expect(game.calls).toContain('present made-0 as target');
    expect(game.calls).toContain('present made-1 as target');
    expect(states[0]?.learner).toEqual({ ability: 1.2, uncertainty: 0.4 });
    expect(states.at(-1)?.items.map((item) => item.id)).toEqual(['made-0', 'made-1']);
    expect(run.events[0]).toMatchObject({ type: 'session_started', policyVersion: 'test-making' });
  });

  it('waits for an offered break before the next item, then carries on', async () => {
    const game = scriptedGame([10, 11]);
    const run = {
      ...options(game.module),
      items: [],
      policy: making({ offerBreak: true }),
      maker,
      onOfferBreak: () => {
        game.calls.push('break offered');
        return Promise.resolve();
      },
    };

    expect(await runSession(run).finished).toEqual({ status: 'completed' });
    expect(game.calls.slice(0, 3)).toEqual(['mount', 'break offered', 'present made-0 as target']);
    expect(game.calls.filter((call) => call === 'break offered')).toHaveLength(1);
  });
});

describe('runSession', () => {
  it('runs a full session with a fake game, in the exact event sequence', async () => {
    // Right first time, then wrong three times on the second item.
    const game = scriptedGame([14, 1, 2, 3]);
    const run = options(game.module);

    expect(await runSession(run).finished).toEqual({ status: 'completed' });

    expect(types(run.events)).toEqual([
      'session_started',
      'item_presented',
      'game_signal',
      'response_submitted',
      'item_presented',
      'game_signal',
      'response_submitted',
      'response_submitted',
      'hint_shown',
      'response_submitted',
      'explanation_shown',
      'session_completed',
    ]);
    expect(run.events.map((event) => event.sequence)).toEqual(run.events.map((_, index) => index));
    for (const event of run.events) expect(LearningEvent.safeParse(event).success).toBe(true);
  });

  it('drives the game through the support ladder and cleans up', async () => {
    const game = scriptedGame([14, 1, 2, 3]);
    await runSession(options(game.module)).finished;

    expect(game.calls).toEqual([
      'mount',
      'present hop-to-14 as target',
      'feedback right, none',
      'present hop-to-9 as target',
      'feedback wrong, encouragement',
      'feedback wrong, hint',
      'feedback wrong, worked-example',
      'destroy',
    ]);
  });

  it('records the game ID and version from the manifest', async () => {
    const run = options(scriptedGame([14, 9]).module);
    await runSession(run).finished;

    expect(run.events[0]).toMatchObject({
      type: 'session_started',
      gameId: 'fake-hop',
      gameVersion: '0.0.1',
      policyVersion: 'placeholder-2',
    });
  });

  it('reproduces the same session from the same seed: events, IDs and game randomness', async () => {
    const once = scriptedGame([14, 1, 2, 3]);
    const twice = scriptedGame([14, 1, 2, 3]);
    const first = options(once.module, 42);
    const second = options(twice.module, 42);

    await runSession(first).finished;
    await runSession(second).finished;

    expect(second.events).toEqual(first.events);
    expect(twice.draws).toEqual(once.draws);
  });

  it('gives different event IDs and game randomness for a different seed', async () => {
    const a = scriptedGame([14, 9]);
    const b = scriptedGame([14, 9]);
    const first = options(a.module, 1);
    const second = options(b.module, 2);

    await runSession(first).finished;
    await runSession(second).finished;

    expect(second.events.map((e) => e.id)).not.toEqual(first.events.map((e) => e.id));
    expect(b.draws).not.toEqual(a.draws);
  });

  it('pauses and resumes the game, ignoring answers while paused', async () => {
    const game = scriptedGame([]);
    const run = options(game.module);
    const session = runSession(run);
    await Promise.resolve();

    session.pause('backgrounded');
    game.context()?.respond(at(14));
    session.resume('backgrounded');
    game.context()?.respond(at(14));
    game.context()?.respond(at(9));
    await Promise.resolve();

    expect(game.calls).toContain('pause');
    expect(game.calls).toContain('resume');
    expect(types(run.events)).toContain('session_paused');
    expect(types(run.events)).toContain('session_resumed');
    expect(types(run.events).filter((type) => type === 'response_submitted')).toHaveLength(1);
    session.end('child-left');
  });

  it('skips the item on screen', async () => {
    const game = scriptedGame([]);
    const run = options(game.module);
    const session = runSession(run);
    await Promise.resolve();

    session.skip();
    await Promise.resolve();
    await Promise.resolve();

    const skippedAt = types(run.events).indexOf('item_skipped');
    expect(types(run.events).slice(skippedAt, skippedAt + 2)).toEqual([
      'item_skipped',
      'item_presented',
    ]);
    expect(run.events[skippedAt + 1]).toMatchObject({ itemId: 'hop-to-9' });
    session.end('child-left');
  });

  it('carries on a saved session, from the item that was on screen (ADR 0023)', async () => {
    // The first run answers the first item, then the page goes away on the second.
    const first = options(scriptedGame([14]).module);
    let saved: SessionState | undefined;
    runSession({ ...first, onState: (state) => (saved = state) });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved?.current?.index).toBe(1);
    if (!saved) throw new Error('The first run saved no state');

    const game = scriptedGame([9]);
    const second = options(game.module);
    const session = runSession({ ...second, restore: structuredClone(saved) });

    expect(await session.finished).toEqual({ status: 'completed' });
    expect(game.calls.filter((call) => call.startsWith('present'))).toEqual([
      'present hop-to-9 as target',
    ]);
    expect(session.sessionId).toBe(first.events[0]?.sessionId);
    // Carrying on records nothing itself; the events go on in sequence from where they were.
    expect(types(second.events)).toEqual([
      'game_signal',
      'response_submitted',
      'session_completed',
    ]);
    expect(second.events[0]?.sequence).toBe((first.events.at(-1)?.sequence ?? 0) + 1);
  });

  it('lays the items out by the session plan (ADR 0022)', async () => {
    const game = scriptedGame([14, 9]);
    await runSession({ ...options(game.module), plan: { warmUp: 1, core: 1, ending: 0 } }).finished;

    expect(game.calls.filter((call) => call.startsWith('present'))).toEqual([
      'present hop-to-14 as warm-up',
      'present hop-to-9 as target',
    ]);
  });

  it('when the day’s time runs out, finishes the item and ends with the time-limit reason', async () => {
    const game = scriptedGame([14, 9]);
    const run = options(game.module);
    const session = runSession(run);

    // The first item is on screen; its answer has not arrived yet.
    session.wrapUp('time-limit');

    expect(await session.finished).toEqual({ status: 'ended', reason: 'time-limit' });
    expect(types(run.events).filter((type) => type === 'item_presented')).toHaveLength(1);
    expect(run.events.at(-1)).toMatchObject({ type: 'session_ended', reason: 'time-limit' });
    expect(game.calls.at(-1)).toBe('destroy');
  });

  it('ends early, records why, and destroys the game', async () => {
    const game = scriptedGame([]);
    const run = options(game.module);
    const session = runSession(run);
    await Promise.resolve();

    session.end('time-limit');

    expect(await session.finished).toEqual({ status: 'ended', reason: 'time-limit' });
    expect(run.events.at(-1)).toMatchObject({ type: 'session_ended', reason: 'time-limit' });
    expect(game.calls.at(-1)).toBe('destroy');
  });

  describe('a hint the child asks for (ADR 0013)', () => {
    /** Lets the game finish presenting, and any queued answer arrive. */
    const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

    it('is shown once per item, while the game takes an answer, and the answer carries it', async () => {
      const game = scriptedGame([]);
      const run = options(game.module);
      const session = runSession(run);
      expect(session.canHint()).toBe(false);

      await settle();
      expect(session.canHint()).toBe(true);
      expect(session.hint()).toBe(true);

      expect(game.calls.at(-1)).toBe('hint 1');
      expect(run.events.at(-1)).toMatchObject({
        type: 'hint_shown',
        itemId: 'hop-to-14',
        level: 1,
      });
      expect(session.canHint()).toBe(false);
      expect(session.hint()).toBe(false);

      game.context()?.respond(at(14));
      await settle();
      expect(run.events.find((event) => event.type === 'response_submitted')).toMatchObject({
        attempt: 1,
        support: 'hint',
      });
      // The next item allows a hint again.
      expect(session.canHint()).toBe(true);
      session.end('child-left');
    });

    it('tells onChange once the game is ready for an answer', async () => {
      const seen: boolean[] = [];
      let session: SessionController | undefined = undefined;
      session = runSession({
        ...options(scriptedGame([]).module),
        onChange: () => seen.push(session?.canHint() ?? false),
      });

      await settle();

      expect(seen.at(-1)).toBe(true);
      session.end('child-left');
      expect(seen.at(-1)).toBe(false);
    });

    it('is not offered in challenge mode or while paused', async () => {
      const challenge = options(scriptedGame([]).module);
      const session = runSession({
        ...challenge,
        setup: { ...challenge.setup, mode: 'challenge' },
      });
      await settle();

      expect(session.canHint()).toBe(false);
      expect(session.hint()).toBe(false);
      expect(types(challenge.events)).not.toContain('hint_shown');
      session.end('child-left');

      const practice = runSession(options(scriptedGame([]).module));
      await settle();
      practice.pause('backgrounded');
      expect(practice.canHint()).toBe(false);
      practice.end('child-left');
    });

    it('ends the session with the error when the game cannot show the hint', async () => {
      const game = scriptedGame([], { failHint: true });
      const session = runSession(options(game.module));
      await settle();

      session.hint();

      await expect(session.finished).rejects.toThrow('no hint art');
      expect(game.calls.at(-1)).toBe('destroy');
      expect(session.canHint()).toBe(false);
    });
  });

  it('tells the game the session’s mode, and formats numbers for it', () => {
    const game = scriptedGame([]);
    const challenge = options(game.module);
    const session = runSession({ ...challenge, setup: { ...challenge.setup, mode: 'challenge' } });

    expect(game.context()?.mode).toBe('challenge');
    expect(game.context()?.formatNumber(12)).toBe('#12');
    session.end('child-left');
  });

  it('keeps observe() for self-driven games', () => {
    const game = scriptedGame([]);
    const session = runSession(options(game.module));

    expect(() =>
      game.context()?.observe({ skillId: 'add-within-20', outcome: 'success', support: 'none' }),
    ).toThrow(/self-driven games/);
    session.end('child-left');
  });
});
