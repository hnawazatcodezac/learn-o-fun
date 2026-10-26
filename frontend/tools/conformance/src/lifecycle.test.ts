import { Item, type LearningEvent } from '@learnofun/contracts';
import { createPlaceholderPolicy, createSessionEngine, seedRandom } from '@learnofun/learning-core';
import { describe, expect, it } from 'vitest';
import { lifecycleProblems, type LifecycleExpectations } from './lifecycle';

const START = Date.UTC(2026, 9, 20, 11);
const engine = createSessionEngine(createPlaceholderPolicy());

const items = ['life-1', 'life-2'].map((id) =>
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

const expected: LifecycleExpectations = {
  gameId: 'fake-game',
  gameVersion: '1.0.0',
  itemIds: ['life-1', 'life-2'],
  completed: true,
};

/** A real session from the engine: right, then wrong and right. */
function session(): LearningEvent[] {
  let now = START;
  const tick = () => (now += 500);
  const right = { type: 'choice' as const, optionIds: ['right'] };
  const wrong = { type: 'choice' as const, optionIds: ['wrong'] };
  const events: LearningEvent[] = [];
  let result = engine.start(
    {
      childId: '0192f4c1-0000-7000-8000-00000000c001',
      activityId: 'dev-fake-game',
      gameId: 'fake-game',
      gameVersion: '1.0.0',
      contentRelease: 'dev',
      mode: 'practice',
    },
    items,
    seedRandom(1),
    tick(),
  );
  events.push(...result.events);
  for (const answer of [right, wrong, right]) {
    result = engine.respond(result.state, answer, tick());
    events.push(...result.events);
    if (result.step.kind === 'feedback' && result.step.then === 'advance') {
      result = engine.advance(result.state, tick());
      events.push(...result.events);
    }
  }
  return events;
}

describe('lifecycleProblems', () => {
  it('passes a well-formed session', () => {
    expect(lifecycleProblems(session(), expected)).toEqual([]);
  });

  it('reports an event that breaks the contract', () => {
    const events: unknown[] = session();
    events[1] = { ...session()[1], occurredAt: '2026-10-20 11:00' };

    expect(lifecycleProblems(events, expected)).toEqual([
      expect.stringMatching(/^Event 1 does not match the contract: occurredAt: /),
    ]);
  });

  it('reports no events at all', () => {
    expect(lifecycleProblems([], expected)).toEqual(['No learning events were recorded']);
  });

  it('reports a session that did not start as the game, or did not complete', () => {
    const events = session().slice(0, -1);

    expect(lifecycleProblems(events, { ...expected, gameVersion: '2.0.0' })).toEqual([
      'The first event is not session_started for fake-game 2.0.0',
      'The session did not complete: the last event is response_submitted',
    ]);
  });

  it('reports gaps in the sequence, times out of order and repeated IDs', () => {
    const events = session();
    const [a, b, c] = [events[2], events[3], events[4]];
    if (!a || !b || !c) throw new Error('The session is too short');
    events[3] = { ...b, sequence: 7 };
    events[4] = { ...c, id: a.id, occurredAt: new Date(START).toISOString() };

    expect(lifecycleProblems(events, expected)).toEqual([
      'Two events share an ID',
      'Event 3 (item_presented) has sequence 7',
      'Event 4 (response_submitted) happened before the one before it',
    ]);
  });

  it('reports events from two sessions, and events after the end', () => {
    const events = session();
    const last = events.at(-1);
    if (!last) throw new Error('The session is empty');
    const stray = {
      ...last,
      id: '0192f4c1-0000-7000-8000-0000000000fe',
      sessionId: '0192f4c1-0000-7000-8000-0000000000ff',
      sequence: events.length,
      occurredAt: new Date(START + 60_000).toISOString(),
    };

    expect(lifecycleProblems([...events, stray], expected)).toEqual([
      'The events belong to 2 sessions',
      `Event ${String(events.length)} (session_completed) comes after the session ended`,
    ]);
  });

  it('reports items outside the story, answers to items not on screen, and unanswered items', () => {
    const events = session();
    const presentedAt = events.findIndex((event) => event.type === 'item_presented');
    const presented = events[presentedAt];
    if (presented?.type !== 'item_presented') throw new Error('No item was presented');
    events[presentedAt] = { ...presented, itemId: 'stray-item' };

    expect(lifecycleProblems(events, expected)).toEqual([
      'Item stray-item was presented but is not in the story',
      'Event 2 (response_submitted) is about an item that is not on screen',
      'Item stray-item was presented but never answered or skipped',
    ]);
  });
});
