import type { LearningEvent, NumericItem } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MEASURES_CONFIG, sessionMeasures } from './measures';
import { corePlan } from './plan';
import { createPlaceholderPolicy } from './policy';
import { seedRandom } from './random';
import { createSessionEngine, type EngineResult } from './session';

const engine = createSessionEngine(createPlaceholderPolicy());
const START = Date.UTC(2026, 9, 20, 15, 0);
const STEP = 10_000;

const item = (n: number): NumericItem => ({
  id: `m-${String(n)}`,
  type: 'numeric',
  skillIds: ['add-within-10'],
  difficulty: 0,
  answer: { kind: 'decimal', value: n },
  tolerance: 0,
  acceptEquivalentFractions: false,
});

/** How the child takes an item: answers right or wrong in turn, a hint first, or a skip. */
type Turn = readonly boolean[] | 'hint-then-right' | 'skip';

interface Played {
  events: LearningEvent[];
  items: NumericItem[];
}

/** Plays a session through the real engine; `stopAfter` leaves it unfinished after that item. */
function play(turns: readonly Turn[], { stopAfter }: { stopAfter?: number } = {}): Played {
  const items = turns.map((_, index) => item(index + 1));
  let now = START;
  const tick = () => (now += STEP);
  let result: EngineResult = engine.start(
    {
      childId: '0192f4c1-0000-7000-8000-00000000c001',
      activityId: 'hop-line-add-within-20',
      gameId: 'hop-line',
      gameVersion: '0.1.0',
      contentRelease: 'test',
      mode: 'practice',
    },
    items,
    seedRandom(1),
    now,
    corePlan(items.length),
  );
  const events = [...result.events];
  for (const [index, turn] of turns.entries()) {
    const current = items[index];
    if (!current || result.step.kind !== 'present') break;
    const answer = (right: boolean) => ({
      type: 'numeric' as const,
      value: {
        kind: 'decimal' as const,
        value: current.answer.kind === 'decimal' ? current.answer.value + (right ? 0 : 1) : 0,
      },
    });
    if (turn === 'skip') {
      result = engine.skip(result.state, tick());
      events.push(...result.events);
      continue;
    }
    if (turn === 'hint-then-right') {
      const hinted = engine.requestHint(result.state, tick());
      result = { ...result, state: hinted.state };
      events.push(...hinted.events);
    }
    for (const right of turn === 'hint-then-right' ? [true] : turn) {
      result = engine.respond(result.state, answer(right), tick());
      events.push(...result.events);
      if (result.step.kind === 'feedback' && result.step.then === 'advance') break;
    }
    if (stopAfter === index) return { events, items };
    result = engine.advance(result.state, tick());
    events.push(...result.events);
  }
  return { events, items };
}

const measure = ({ events, items }: Played, now = START + 3_600_000) =>
  sessionMeasures(events, (id) => items.find((candidate) => candidate.id === id), now);

describe('sessionMeasures (plan 5.2, ADR 0029)', () => {
  it('measures each item and the session as plan 5.2 defines them', () => {
    const measures = measure(
      play([[true], [false, true], [false, false, true], [false, false, false], 'skip']),
    );

    expect(measures.items.map((i) => i.outcome)).toEqual([
      'first-try',
      'later-try',
      'with-hint',
      'shown-how',
      'skipped',
    ]);
    expect(measures).toMatchObject({
      status: 'completed',
      presented: 5,
      attempted: 4,
      skipped: 1,
      unanswered: 0,
      firstTryCorrect: 1,
      eventuallyCorrect: 3,
      // The second wrong answer brings a hint, the third the worked example.
      supported: 2,
      learningCredit: 2,
    });
  });

  it('counts a hint asked for before answering as support, not a first try', () => {
    const measures = measure(play(['hint-then-right']));

    expect(measures.items[0]?.outcome).toBe('with-hint');
    expect(measures).toMatchObject({ firstTryCorrect: 0, eventuallyCorrect: 1, supported: 1 });
  });

  it('grades answers again: the device has no say', () => {
    const played = play([[true]]);
    const other = played.items.map((i) => ({
      ...i,
      answer: { kind: 'decimal' as const, value: 99 },
    }));

    expect(
      sessionMeasures(played.events, (id) => other.find((i) => i.id === id), START),
    ).toMatchObject({ firstTryCorrect: 0, eventuallyCorrect: 0 });
  });

  it('counts active time only, leaving out an idle gap', () => {
    const played = play([[true], [true]]);
    const base = measure(played).timeOnTaskMs;
    expect(base).toBeGreaterThan(0);

    // A minute's gap before the second answer is idle: that whole gap is left out.
    const late = played.events.filter((e) => e.type === 'response_submitted')[1];
    const shifted = played.events.map((event) =>
      late && event.sequence >= late.sequence
        ? { ...event, occurredAt: new Date(Date.parse(event.occurredAt) + 60_000).toISOString() }
        : event,
    );
    expect(measure({ ...played, events: shifted }).timeOnTaskMs).toBe(base - STEP);
  });

  it('leaves out paused time', () => {
    const played = play([[true]]);
    const answer = played.events.findIndex((e) => e.type === 'response_submitted');
    const before = played.events[answer - 1];
    if (!before) throw new Error('No event before the answer');
    const at = Date.parse(before.occurredAt);
    const pause = (type: 'session_paused' | 'session_resumed', offset: number) =>
      ({
        ...before,
        type,
        reason: 'backgrounded',
        occurredAt: new Date(at + offset).toISOString(),
      }) as LearningEvent;
    const events = [
      ...played.events.slice(0, answer),
      pause('session_paused', 2_000),
      pause('session_resumed', 7_000),
      ...played.events.slice(answer),
    ];

    expect(measure({ ...played, events }).timeOnTaskMs).toBe(measure(played).timeOnTaskMs - 5_000);
  });

  it('tells an unfinished session that can carry on from one that has expired', () => {
    const played = play([[true], [true]], { stopAfter: 0 });
    const last = Date.parse(played.events[played.events.length - 1]?.occurredAt ?? '');

    expect(measure(played, last + 1000)).toMatchObject({
      status: 'interrupted',
      presented: 1,
      attempted: 1,
    });
    expect(measure(played, last + DEFAULT_MEASURES_CONFIG.resumableMs + 1).status).toBe('expired');
  });

  it('counts an item shown but never answered as unanswered', () => {
    const played = play([[true], [true]], { stopAfter: 0 });
    const shown = played.events.find((e) => e.type === 'item_presented');
    if (!shown) throw new Error('No item shown');
    const events = [...played.events, { ...shown, itemId: 'm-2' }];

    expect(measure({ ...played, events })).toMatchObject({
      presented: 2,
      attempted: 1,
      unanswered: 1,
    });
    expect(measure({ ...played, events }).items[1]?.outcome).toBe('unanswered');
  });
});
