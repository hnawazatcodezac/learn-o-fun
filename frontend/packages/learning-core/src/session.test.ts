import { Item, ItemResponse, LearningEvent, type LearningEventType } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { updateAbility } from './learner-model';
import { corePlan, plannedItems, type SessionPlan } from './plan';
import {
  createPlaceholderPolicy,
  type NextDecision,
  type PolicyView,
  type SessionPolicy,
} from './policy';
import { seedRandom } from './random';
import {
  canRequestHint,
  createSessionEngine,
  type EngineResult,
  type ItemMaker,
  type SessionSetup,
  type WrapUpReason,
} from './session';

const START = Date.UTC(2026, 9, 20, 9, 15);
const engine = createSessionEngine(createPlaceholderPolicy());

const setup: SessionSetup = {
  childId: '0192f4c1-0000-7000-8000-00000000c001',
  activityId: 'hop-line-add-within-20',
  gameId: 'hop-line',
  gameVersion: '0.1.0',
  contentRelease: 'mock-2026-10-20',
  mode: 'practice',
};

const hop = (id: string, target: number) =>
  Item.parse({
    id,
    type: 'placement',
    skillIds: ['add-within-20'],
    difficulty: 0.2,
    surface: { kind: 'line', min: 0, max: 20, target, tolerance: 0 },
  });

const items = [hop('hop-to-14', 14), hop('hop-to-9', 9)];
const at = (position: number) =>
  ItemResponse.parse({ type: 'placement', at: { kind: 'line', position } });

/** Plays a session: each answer is given a second after the last step. */
function play(answers: number[], seed = 1, mode: SessionSetup['mode'] = 'practice') {
  let now = START;
  let result: EngineResult = engine.start({ ...setup, mode }, items, seedRandom(seed), now);
  const events: LearningEvent[] = [...result.events];
  const steps = [result.step];
  for (const position of answers) {
    now += 1000;
    result = engine.respond(result.state, at(position), now);
    events.push(...result.events);
    steps.push(result.step);
    if (result.step.kind === 'feedback' && result.step.then === 'advance') {
      result = engine.advance(result.state, now);
      events.push(...result.events);
      steps.push(result.step);
    }
  }
  return { result, events, steps };
}

const types = (events: LearningEvent[]): LearningEventType[] => events.map((event) => event.type);

describe('session engine', () => {
  it('runs a session to completion with the exact event sequence', () => {
    // First item right first time; second item wrong three times, then shown.
    const { events, result } = play([14, 1, 2, 3]);

    expect(types(events)).toEqual([
      'session_started',
      'item_presented',
      'response_submitted',
      'item_presented',
      'response_submitted',
      'response_submitted',
      'hint_shown',
      'response_submitted',
      'explanation_shown',
      'session_completed',
    ]);
    expect(events.map((event) => event.sequence)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(result.step).toEqual({ kind: 'complete', reason: 'SESSION_COMPLETE' });
    expect(result.state.status).toBe('completed');
  });

  it('produces events that satisfy the contracts, all in one session', () => {
    const { events } = play([14, 1, 2, 3]);

    for (const event of events) expect(LearningEvent.safeParse(event).success).toBe(true);
    expect(new Set(events.map((event) => event.sessionId)).size).toBe(1);
  });

  it('records attempts, support so far and answer times', () => {
    const { events } = play([14, 1, 2, 3]);
    const responses = events.filter((event) => event.type === 'response_submitted');

    expect(responses.map((r) => [r.itemId, r.attempt, r.support, r.latencyMs])).toEqual([
      ['hop-to-14', 1, 'none', 1000],
      ['hop-to-9', 1, 'none', 1000],
      ['hop-to-9', 2, 'encouragement', 2000],
      ['hop-to-9', 3, 'hint', 3000],
    ]);
  });

  it('tells the game what to do, with a reason code for every decision', () => {
    const { steps } = play([14, 1, 2, 3]);

    expect(steps.map((step) => [step.kind, step.reason])).toEqual([
      ['present', 'NEXT_IN_ORDER'],
      ['feedback', 'NEXT_IN_ORDER'],
      ['present', 'NEXT_IN_ORDER'],
      ['feedback', 'RETRY'],
      ['feedback', 'HINT'],
      ['feedback', 'SHOW_ME'],
      ['complete', 'SESSION_COMPLETE'],
    ]);
  });

  it('gives one attempt per item in challenge mode', () => {
    const { events } = play([1, 1], 1, 'challenge');

    expect(types(events).filter((type) => type === 'response_submitted')).toHaveLength(2);
    expect(types(events)).not.toContain('hint_shown');
  });

  it('replays exactly from the same seed, event IDs included', () => {
    expect(play([14, 1, 2, 3], 7).events).toEqual(play([14, 1, 2, 3], 7).events);
  });

  it('gives different IDs for a different seed', () => {
    const ids = (seed: number) => play([14], seed).events.map((event) => event.id);
    expect(ids(7)).not.toEqual(ids(8));
  });

  it('skips an item and moves on', () => {
    const started = engine.start(setup, items, seedRandom(1), START);
    const skipped = engine.skip(started.state, START + 500);

    expect(types(skipped.events)).toEqual(['item_skipped', 'item_presented']);
    expect(skipped.step).toMatchObject({ kind: 'present', item: { id: 'hop-to-9' } });
  });

  it('pauses and resumes, refusing answers while paused', () => {
    const started = engine.start(setup, items, seedRandom(1), START);
    const paused = engine.pause(started.state, 'backgrounded', START + 100);

    expect(types(paused.events)).toEqual(['session_paused']);
    expect(() => engine.respond(paused.state, at(14), START + 200)).toThrow(
      'Cannot answer: the session is paused',
    );

    const resumed = engine.resume(paused.state, 'backgrounded', START + 300);
    expect(types(resumed.events)).toEqual(['session_resumed']);
    expect(engine.respond(resumed.state, at(14), START + 400).step.kind).toBe('feedback');
  });

  it('ends early, and then refuses anything else', () => {
    const started = engine.start(setup, items, seedRandom(1), START);
    const ended = engine.end(started.state, 'time-limit', START + 100);

    expect(ended.events).toMatchObject([{ type: 'session_ended', reason: 'time-limit' }]);
    expect(() => engine.advance(ended.state, START + 200)).toThrow(
      'Cannot move on: the session is ended',
    );
    expect(() => engine.end(ended.state, 'child-left', START + 200)).toThrow();
  });

  it('records game signals as numbers or true/false', () => {
    const started = engine.start(setup, items, seedRandom(1), START);

    expect(engine.signal(started.state, 'jumpCount', 3, START + 10).events).toMatchObject([
      { type: 'game_signal', name: 'jumpCount', value: 3 },
    ]);
  });

  describe('a hint the child asks for (ADR 0013)', () => {
    it('records the hint, and the next answer carries it as support so far', () => {
      const started = engine.start(setup, items, seedRandom(1), START);
      const hinted = engine.requestHint(started.state, START + 500);

      expect(hinted.level).toBe(1);
      expect(hinted.events).toMatchObject([
        { type: 'hint_shown', itemId: 'hop-to-14', level: 1, sequence: 2 },
      ]);
      expect(engine.respond(hinted.state, at(14), START + 1000).events).toMatchObject([
        { type: 'response_submitted', attempt: 1, support: 'hint' },
      ]);
    });

    it('allows one hint per item, and none once the ladder has given one', () => {
      const started = engine.start(setup, items, seedRandom(1), START);
      expect(canRequestHint(started.state)).toBe(true);

      const hinted = engine.requestHint(started.state, START + 500);
      expect(canRequestHint(hinted.state)).toBe(false);
      expect(() => engine.requestHint(hinted.state, START + 600)).toThrow(
        'Cannot give a hint: hints are for Practice, once per item',
      );

      // On the second item: wrong twice, so the ladder gives a hint and the button turns off.
      let state = engine.advance(
        engine.respond(hinted.state, at(14), START + 700).state,
        START + 700,
      ).state;
      expect(canRequestHint(state)).toBe(true);
      state = engine.respond(state, at(1), START + 800).state;
      expect(canRequestHint(state)).toBe(true);
      state = engine.respond(state, at(2), START + 900).state;
      expect(canRequestHint(state)).toBe(false);
    });

    it('never lowers support so far, and counts hint levels on the item', () => {
      const started = engine.start(setup, items, seedRandom(1), START);
      let result: EngineResult | ReturnType<typeof engine.requestHint> = engine.requestHint(
        started.state,
        START + 100,
      );
      const events = [...result.events];
      for (const position of [1, 2, 3]) {
        result = engine.respond(result.state, at(position), START + position * 1000);
        events.push(...result.events);
      }

      const responses = events.filter((event) => event.type === 'response_submitted');
      expect(responses.map((response) => response.support)).toEqual(['hint', 'hint', 'hint']);
      expect(events.filter((event) => event.type === 'hint_shown')).toMatchObject([
        { level: 1 },
        { level: 2 },
      ]);
      for (const event of events) expect(LearningEvent.safeParse(event).success).toBe(true);
    });

    it('gives no hints in challenge mode, while paused, or after the session', () => {
      const challenge = engine.start({ ...setup, mode: 'challenge' }, items, seedRandom(1), START);
      expect(canRequestHint(challenge.state)).toBe(false);

      const started = engine.start(setup, items, seedRandom(1), START);
      const paused = engine.pause(started.state, 'backgrounded', START + 100);
      expect(canRequestHint(paused.state)).toBe(false);
      expect(() => engine.requestHint(paused.state, START + 200)).toThrow();

      const ended = engine.end(started.state, 'child-left', START + 100);
      expect(canRequestHint(ended.state)).toBe(false);
    });
  });

  it('completes at once with no items', () => {
    const started = engine.start(setup, [], seedRandom(1), START);

    expect(types(started.events)).toEqual(['session_started', 'session_completed']);
    expect(started.step.kind).toBe('complete');
  });

  describe('carrying on a saved session (ADR 0023)', () => {
    it('shows the item that was on screen again, keeping its attempts, and times the answer from now', () => {
      const started = engine.start(setup, items, seedRandom(1), START);
      // One wrong answer to the first item, then the page goes away.
      const retried = engine.respond(started.state, at(1), START + 1000);
      const saved = JSON.parse(JSON.stringify(retried.state)) as typeof retried.state;

      const carried = engine.continueFrom(saved, START + 60_000);
      expect(carried.events).toEqual([]);
      expect(carried.step).toEqual({
        kind: 'present',
        item: items[0],
        role: 'target',
        reason: 'RESUMED',
      });

      const answered = engine.respond(carried.state, at(14), START + 61_000);
      expect(answered.events[0]).toMatchObject({
        type: 'response_submitted',
        attempt: 2,
        support: 'encouragement',
        latencyMs: 1000,
      });
      expect(answered.events[0]?.sequence).toBe(retried.state.sequence);
    });

    it('refuses a session that is over', () => {
      const { result } = play([14, 9]);
      expect(() => engine.continueFrom(result.state, START)).toThrow('Cannot carry on');
    });
  });

  describe('session shape and wrap-up (plan 4.2, ADR 0022)', () => {
    // A warm-up, a core block of two, and two easy items in reserve.
    const shaped = [5, 6, 7, 8, 9].map((target) => hop(`hop-to-${String(target)}`, target));
    const plan = { warmUp: 1, core: 2, ending: 2 };

    /**
     * Answers every item on screen with `answer(target)` until the session stops, a second
     * apart, wrapping up with `wrapUp` from the `wrapAfter`th item on.
     */
    function run(
      answer: (target: number, attempt: number) => number,
      { wrapUp, wrapAfter = 0 }: { wrapUp?: WrapUpReason; wrapAfter?: number } = {},
    ) {
      let now = START;
      let result: EngineResult = engine.start(setup, shaped, seedRandom(1), now, plan);
      const events: LearningEvent[] = [...result.events];
      let presented = 1;
      let attempt = 0;
      while (result.step.kind !== 'complete') {
        now += 1000;
        if (wrapUp && presented >= wrapAfter)
          result = { ...result, state: engine.wrapUp(result.state, wrapUp) };
        if (result.step.kind === 'feedback' && result.step.then === 'advance') {
          result = engine.advance(result.state, now);
          if (result.step.kind === 'present') {
            presented += 1;
            attempt = 0;
          }
        } else {
          const index = result.state.current?.index ?? 0;
          attempt += 1;
          result = engine.respond(result.state, at(answer(5 + index, attempt)), now);
        }
        events.push(...result.events);
      }
      const roles = events.flatMap((event) =>
        event.type === 'item_presented' ? [`${event.itemId}:${event.role}`] : [],
      );
      return { result, events, roles };
    }

    it('warms up, plays the core block, and stops on its success', () => {
      const { roles, result } = run((target) => target);

      expect(roles).toEqual(['hop-to-5:warm-up', 'hop-to-6:target', 'hop-to-7:target']);
      expect(result.step).toEqual({ kind: 'complete', reason: 'SESSION_COMPLETE' });
    });

    it('adds an easy item when the core block ends without a correct answer', () => {
      // The last core item, hop to 7, is missed three times; the easy one after it is right.
      const { roles, events } = run((target) => (target === 7 ? 0 : target));

      expect(roles).toEqual([
        'hop-to-5:warm-up',
        'hop-to-6:target',
        'hop-to-7:target',
        'hop-to-8:ending',
      ]);
      expect(types(events).at(-1)).toBe('session_completed');
    });

    it('when time is up, finishes the item on screen and ends on its success', () => {
      const { roles, result, events } = run((target) => target, {
        wrapUp: 'session-length',
        wrapAfter: 2,
      });

      expect(roles).toEqual(['hop-to-5:warm-up', 'hop-to-6:target']);
      expect(result.step).toEqual({ kind: 'complete', reason: 'TIME_UP' });
      expect(types(events).at(-1)).toBe('session_completed');
    });

    it('ends with the time-limit reason when the day’s time runs out', () => {
      const { result, events } = run((target) => target, { wrapUp: 'time-limit', wrapAfter: 2 });

      expect(result.step).toEqual({ kind: 'complete', reason: 'TIME_UP', ended: 'time-limit' });
      expect(events.at(-1)).toMatchObject({ type: 'session_ended', reason: 'time-limit' });
      expect(result.state.status).toBe('ended');
    });

    it('lets the day’s limit outrank the session’s own length', () => {
      const started = engine.start(setup, shaped, seedRandom(1), START, plan).state;
      const both = engine.wrapUp(engine.wrapUp(started, 'session-length'), 'time-limit');

      expect(both.wrapUp).toBe('time-limit');
      expect(engine.wrapUp(both, 'session-length').wrapUp).toBe('time-limit');
    });

    it('refuses a plan that does not lay out the session’s items', () => {
      expect(() =>
        engine.start(setup, shaped, seedRandom(1), START, { warmUp: 1, core: 2, ending: 1 }),
      ).toThrow('The plan lays out 4 items, but the session has 5');
    });
  });

  describe('items made on demand (ADR 0032)', () => {
    const plan: SessionPlan = { warmUp: 0, core: 2, ending: 0 };

    /** A policy that has the engine make each item, then completes when the plan is done. */
    const making = (
      decide: (view: PolicyView) => NextDecision = ({ finished }) =>
        finished < plannedItems(plan)
          ? { kind: 'make', level: finished, role: 'target', reason: 'SUCCESS_ZONE' }
          : { kind: 'complete', reason: 'SESSION_COMPLETE' },
    ): SessionPolicy => ({
      version: 'test-making',
      chooseNext: decide,
      afterResponse: (view) => createPlaceholderPolicy().afterResponse(view),
    });

    /** Hop Line items at three levels, landing on 5 plus the level; it notes each call. */
    function recordingMaker() {
      const calls: { level: number; seed: number; used: string[] }[] = [];
      const maker: ItemMaker = {
        levelDifficulty: [-1, 0, 1],
        make: (level, seed, used) => {
          calls.push({ level, seed, used: [...used] });
          return hop(`made-${String(level)}-${String(used.size)}`, 5 + level);
        },
      };
      return { maker, calls };
    }

    it('makes each item at the level the policy asks, seeded from the session, never one it has', () => {
      const { maker, calls } = recordingMaker();
      const engine = createSessionEngine(making(), { maker });
      const started = engine.start(setup, [], seedRandom(3), START, plan);
      expect(started.state.levels).toEqual([-1, 0, 1]);
      expect(started.step).toMatchObject({
        kind: 'present',
        item: { id: 'made-0-0' },
        reason: 'SUCCESS_ZONE',
      });
      expect(started.events.at(-1)).toMatchObject({
        type: 'item_presented',
        itemId: 'made-0-0',
        difficulty: 0.2,
      });

      const answered = engine.respond(started.state, at(5), START + 1000);
      const second = engine.advance(answered.state, START + 2000);
      expect(second.step).toMatchObject({ kind: 'present', item: { id: 'made-1-1' } });
      expect(second.state.items.map((item) => item.id)).toEqual(['made-0-0', 'made-1-1']);
      expect(second.state.itemLevels).toEqual([0, 1]);
      expect(calls.map(({ level, used }) => ({ level, used }))).toEqual([
        { level: 0, used: [] },
        { level: 1, used: ['made-0-0'] },
      ]);

      // The same session seed gives the maker the same seeds; another seed, others.
      const again = recordingMaker();
      createSessionEngine(making(), { maker: again.maker }).start(
        setup,
        [],
        seedRandom(3),
        START,
        plan,
      );
      expect(again.calls[0]?.seed).toBe(calls[0]?.seed);
      const other = recordingMaker();
      createSessionEngine(making(), { maker: other.maker }).start(
        setup,
        [],
        seedRandom(4),
        START,
        plan,
      );
      expect(other.calls[0]?.seed).not.toBe(calls[0]?.seed);
    });

    it('keeps each finished item in the history, and the ability up to date from first answers', () => {
      const engine = createSessionEngine(making(), { maker: recordingMaker().maker });
      const started = engine.start(setup, [], seedRandom(3), START, plan, {
        ability: 0.5,
        uncertainty: 0.8,
      });
      const right = engine.respond(started.state, at(5), START + 1000);
      const firstTry = { weight: 1, difficulty: 0.2, guessFloor: 0 };
      const afterRight = updateAbility(
        { ability: 0.5, uncertainty: 0.8 },
        { ...firstTry, correct: true },
      );
      expect(right.state.learner).toEqual(afterRight);

      const second = engine.advance(right.state, START + 2000);
      expect(second.state.history).toEqual([
        {
          index: 0,
          level: 0,
          role: 'target',
          firstTry: true,
          supported: false,
          succeeded: true,
          skipped: false,
          latencyMs: 1000,
        },
      ]);
      // A wrong first answer moves it; the retry does not.
      const wrong = engine.respond(second.state, at(1), START + 3000);
      const afterWrong = updateAbility(afterRight, { ...firstTry, correct: false });
      expect(wrong.state.learner).toEqual(afterWrong);
      expect(engine.respond(wrong.state, at(2), START + 4000).state.learner).toEqual(afterWrong);
    });

    it('leaves the target’s ability alone for a scaffold, which is about its prerequisite', () => {
      const engine = createSessionEngine(
        making(() => ({ kind: 'make', level: 0, role: 'scaffold', reason: 'SCAFFOLD' })),
        { maker: recordingMaker().maker },
      );
      const started = engine.start(setup, [], seedRandom(3), START, plan);
      expect(engine.respond(started.state, at(5), START + 1000).state.learner).toEqual(
        started.state.learner,
      );
    });

    it('passes on an offered break, and ends early when the policy says so', () => {
      const engine = createSessionEngine(
        making(({ finished }) =>
          finished === 0
            ? { kind: 'make', level: 0, role: 'target', reason: 'SUCCESS_ZONE', offerBreak: true }
            : { kind: 'complete', reason: 'LOOP_GUARD', ended: 'activity-switched' },
        ),
        { maker: recordingMaker().maker },
      );
      const started = engine.start(setup, [], seedRandom(3), START, plan);
      expect(started.step).toMatchObject({ kind: 'present', offerBreak: true });

      const answered = engine.respond(started.state, at(5), START + 1000);
      const ended = engine.advance(answered.state, START + 2000);
      expect(ended.step).toEqual({
        kind: 'complete',
        reason: 'LOOP_GUARD',
        ended: 'activity-switched',
      });
      expect(ended.state.status).toBe('ended');
      expect(ended.events.at(-1)).toMatchObject({
        type: 'session_ended',
        reason: 'activity-switched',
      });
    });

    it('carries on a saved session with the items made so far, exactly as without the break', () => {
      const engine = createSessionEngine(making(), { maker: recordingMaker().maker });
      const started = engine.start(setup, [], seedRandom(3), START, plan);
      const retried = engine.respond(started.state, at(1), START + 1000);
      const saved = JSON.parse(JSON.stringify(retried.state)) as typeof retried.state;

      const carried = engine.continueFrom(saved, START + 1000);
      expect(carried.step).toMatchObject({ kind: 'present', item: { id: 'made-0-0' } });
      const finish = (state: typeof saved) =>
        engine.advance(engine.respond(state, at(5), START + 2000).state, START + 3000);
      expect(finish(carried.state)).toEqual(finish(retried.state));
    });

    it('refuses a policy that asks for an item when the session has no maker', () => {
      expect(() =>
        createSessionEngine(making()).start(setup, [], seedRandom(3), START, corePlan(0)),
      ).toThrow('the session has no maker');
    });
  });
});
