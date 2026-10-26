import { GameManifest, Item, type ItemResponse } from '@learnofun/contracts';
import type { GameContext, GameModule } from '@learnofun/game-sdk';
import { describe, expect, it } from 'vitest';
import { createRunStore, startRun, type StartRunOptions } from './run';

const manifest = GameManifest.parse({
  id: 'fake-game',
  version: '1.0.0',
  itemTypes: ['choice'],
  experienceBands: ['early-primary'],
  inputModes: ['tap', 'keyboard', 'switch'],
  accessibility: { screenReader: 'full', colourIndependent: true },
  flow: 'engine',
  assets: [],
  strings: ['games.fakeGame.title'],
  signals: [{ name: 'jumps', kind: 'number' }],
});

const items = ['fake-1', 'fake-2'].map((id) =>
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

const answer = (optionId: string): ItemResponse => ({ type: 'choice', optionIds: [optionId] });

/** A game that gives the scripted answers in turn, after running `onPresent`, and then waits. */
function scriptedGame(
  answers: string[],
  onPresent: (ctx: GameContext) => void = () => undefined,
): GameModule {
  return {
    manifest,
    mount(ctx) {
      const next = () => {
        const optionId = answers.shift();
        if (optionId !== undefined) ctx.respond(answer(optionId));
      };
      return {
        present: () => {
          onPresent(ctx);
          next();
          return Promise.resolve();
        },
        feedback: (_result, support) => {
          if (support === 'encouragement' || support === 'hint') next();
          return Promise.resolve();
        },
        hint: () => Promise.resolve(),
        pause: () => undefined,
        resume: () => undefined,
        destroy: () => undefined,
      };
    },
  };
}

function options(game: GameModule, only = items): StartRunOptions {
  let now = Date.UTC(2026, 9, 20, 9);
  return {
    game,
    root: {} as HTMLElement,
    items: only,
    mode: 'practice',
    seed: 1,
    t: (key) => key,
    localize: (text) => text.en ?? '',
    formatNumber: (value) => String(value),
    settings: { reducedMotion: false, sound: true, textScale: 1 },
    clock: { now: () => (now += 250) },
  };
}

describe('startRun', () => {
  it('records every event of a session, each checked against the contract', async () => {
    const store = createRunStore();
    const run = startRun(store, options(scriptedGame(['right', 'right'])));

    await run.controller?.finished;

    const snapshot = store.getSnapshot();
    expect(snapshot.events.map(({ event }) => event.type)).toEqual([
      'session_started',
      'item_presented',
      'response_submitted',
      'item_presented',
      'response_submitted',
      'session_completed',
    ]);
    expect(snapshot.events.every(({ invalid }) => invalid === undefined)).toBe(true);
    expect(snapshot.problems).toEqual([]);
    expect(snapshot.status).toBe('completed');
    expect(snapshot.lastAnswer).toEqual({ correct: true, support: 'none' });
  });

  it('starts the session as the sandbox child, for the game in the manifest', () => {
    const store = createRunStore();
    startRun(store, options(scriptedGame([])));

    expect(store.getSnapshot().events[0]?.event).toMatchObject({
      type: 'session_started',
      activityId: 'sandbox-fake-game',
      gameId: 'fake-game',
      gameVersion: '1.0.0',
      contentRelease: 'sandbox',
      mode: 'practice',
    });
  });

  it('shows the support the engine gives a wrong answer', async () => {
    const store = createRunStore();
    const run = startRun(
      store,
      options(scriptedGame(['wrong', 'wrong', 'wrong']), items.slice(0, 1)),
    );

    await run.controller?.finished;

    expect(store.getSnapshot().lastAnswer).toEqual({ correct: false, support: 'worked-example' });
  });

  it('reports message keys and signals the manifest does not declare, once each', async () => {
    const store = createRunStore();
    const game = scriptedGame(['right', 'right'], (ctx) => {
      ctx.t('games.fakeGame.title');
      ctx.t('games.fakeGame.secret');
      ctx.signal('jumps', true);
      ctx.signal('mystery', 1);
    });
    const run = startRun(store, options(game));

    await run.controller?.finished;

    expect(store.getSnapshot().problems).toEqual([
      { kind: 'undeclared-string', key: 'games.fakeGame.secret' },
      { kind: 'signal-kind', name: 'jumps', expected: 'number' },
      { kind: 'undeclared-signal', name: 'mystery' },
    ]);
  });

  it('marks an event that does not match the contract', async () => {
    const store = createRunStore();
    const game = scriptedGame(['right'], (ctx) => {
      ctx.signal('Not camel case', 1);
    });
    const run = startRun(store, options(game, items.slice(0, 1)));

    await run.controller?.finished;

    const { events, problems } = store.getSnapshot();
    const signal = events.find(({ event }) => event.type === 'game_signal');
    expect(signal?.invalid).toMatch(/^name: Expected a camelCase signal name/);
    expect(problems).toContainEqual(
      expect.objectContaining({ kind: 'invalid-event', type: 'game_signal', sequence: 2 }),
    );
  });

  it('reports a game that fails to mount', () => {
    const store = createRunStore();
    const game: GameModule = {
      manifest,
      mount: () => {
        throw new Error('no canvas');
      },
    };
    const run = startRun(store, options(game));

    expect(run.controller).toBeUndefined();
    expect(store.getSnapshot()).toMatchObject({
      status: 'failed',
      problems: [{ kind: 'game-error', message: 'no canvas' }],
    });
  });

  it('reports a game that throws while playing', async () => {
    const store = createRunStore();
    const game = scriptedGame([], () => {
      throw new Error('cannot draw that item');
    });
    const run = startRun(store, options(game));

    await expect(run.controller?.finished).rejects.toThrow('cannot draw that item');

    expect(store.getSnapshot()).toMatchObject({
      status: 'failed',
      problems: [{ kind: 'game-error', message: 'cannot draw that item' }],
    });
  });

  it('follows pausing, resuming and ending', async () => {
    const store = createRunStore();
    const run = startRun(store, options(scriptedGame([])));
    const status = () => store.getSnapshot().status;

    run.controller?.pause('backgrounded');
    expect(status()).toBe('paused');
    run.controller?.resume('backgrounded');
    expect(status()).toBe('playing');
    run.controller?.end('child-left');

    expect(await run.controller?.finished).toEqual({ status: 'ended', reason: 'child-left' });
    expect(status()).toBe('ended');
    expect(store.getSnapshot().events.at(-1)?.event).toMatchObject({
      type: 'session_ended',
      reason: 'child-left',
    });
  });

  it('knows when a hint can be asked for, and records one', async () => {
    const store = createRunStore();
    const run = startRun(store, options(scriptedGame([])));
    expect(store.getSnapshot().canHint).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getSnapshot().canHint).toBe(true);

    run.controller?.hint();
    expect(store.getSnapshot().canHint).toBe(false);
    expect(store.getSnapshot().events.at(-1)?.event).toMatchObject({
      type: 'hint_shown',
      level: 1,
    });
    run.stop();
  });

  it('ignores a stopped run, and a new run starts with an empty log', () => {
    const store = createRunStore();
    const first = startRun(store, options(scriptedGame([])));
    const logged = store.getSnapshot().events.length;

    first.stop();
    expect(store.getSnapshot().events).toHaveLength(logged);

    const second = startRun(store, options(scriptedGame([])));
    const { events } = store.getSnapshot();
    expect(events.map(({ event }) => event.type)).toEqual(['session_started', 'item_presented']);
    expect(events[0]?.event.sessionId).toBe(second.controller?.sessionId);
  });
});
