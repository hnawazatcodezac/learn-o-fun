import { describe, expect, it } from 'vitest';
import { EventBatch, LearningEvent, MAX_BATCH_SIZE } from './events';
import { AT, problems, uuid } from './testing';

let next = 100;
function envelope(sequence: number) {
  next += 1;
  return { id: uuid(next), sessionId: uuid(50), sequence, occurredAt: AT, schemaVersion: 1 };
}

const events = {
  session_started: {
    type: 'session_started',
    activityId: 'hop-line-add-within-20',
    gameId: 'hop-line',
    gameVersion: '0.1.0',
    contentRelease: '2026-10-20.1',
    mode: 'practice',
    policyVersion: 'placeholder-1',
  },
  item_presented: {
    type: 'item_presented',
    itemId: 'hop-to-14',
    skillIds: ['add-within-20'],
    difficulty: 0.4,
    role: 'target',
  },
  response_submitted: {
    type: 'response_submitted',
    itemId: 'hop-to-14',
    attempt: 1,
    response: { type: 'placement', at: { kind: 'line', position: 14 } },
    latencyMs: 4200,
    support: 'none',
  },
  hint_shown: { type: 'hint_shown', itemId: 'hop-to-14', level: 1 },
  explanation_shown: {
    type: 'explanation_shown',
    itemId: 'seven-times-three',
    misconceptionId: 'adds-instead-of-multiplying',
  },
  item_skipped: { type: 'item_skipped', itemId: 'hop-to-14' },
  session_paused: { type: 'session_paused', reason: 'backgrounded' },
  session_resumed: { type: 'session_resumed', reason: 'backgrounded' },
  session_completed: { type: 'session_completed' },
  session_ended: { type: 'session_ended', reason: 'time-limit' },
  game_signal: { type: 'game_signal', name: 'jumpCount', value: 3 },
};

describe('LearningEvent', () => {
  it.each(Object.entries(events))('accepts %s', (_type, payload) => {
    expect(problems(LearningEvent, { ...envelope(0), ...payload })).toEqual([]);
  });

  it('needs a UUIDv7 made on the device and a UTC device time', () => {
    const event = { ...envelope(0), ...events.item_skipped };
    expect(
      problems(LearningEvent, { ...event, id: '0192f4c1-7a2b-4c3d-8e4f-5a6b7c8d9e0f' }),
    ).toEqual([{ path: 'id', message: 'Expected a UUIDv7 string' }]);
    expect(problems(LearningEvent, { ...event, occurredAt: '2026-10-20T13:15:00+04:00' })).toEqual([
      { path: 'occurredAt', message: 'Expected an ISO 8601 timestamp in UTC, ending in Z' },
    ]);
  });

  it('caps attempts at three', () => {
    expect(
      problems(LearningEvent, { ...envelope(1), ...events.response_submitted, attempt: 4 }),
    ).toEqual([{ path: 'attempt', message: 'Three attempts is the ceiling on any item' }]);
  });

  it('checks the answer against its item type', () => {
    expect(
      problems(LearningEvent, {
        ...envelope(1),
        ...events.response_submitted,
        response: { type: 'placement', optionIds: ['a'] },
      })[0]?.path,
    ).toBe('response.at');
  });

  it('never lets a game signal carry free text', () => {
    expect(
      problems(LearningEvent, { ...envelope(2), ...events.game_signal, value: 'my name is Robin' }),
    ).toEqual([{ path: 'value', message: 'A signal value is a number or true/false' }]);
  });

  it('rejects an unknown event type and an unknown schema version', () => {
    expect(problems(LearningEvent, { ...envelope(3), type: 'score_updated' })[0]?.path).toBe(
      'type',
    );
    expect(
      problems(LearningEvent, { ...envelope(3), ...events.item_skipped, schemaVersion: 2 })[0]
        ?.path,
    ).toBe('schemaVersion');
  });
});

describe('EventBatch', () => {
  it('accepts a batch of events', () => {
    expect(
      problems(EventBatch, {
        events: [
          { ...envelope(0), ...events.session_started },
          { ...envelope(1), ...events.item_presented },
        ],
      }),
    ).toEqual([]);
  });

  it('rejects the same event twice in a batch', () => {
    const event = { ...envelope(0), ...events.item_skipped };
    expect(problems(EventBatch, { events: [event, event] })).toContainEqual({
      path: 'events.1.id',
      message: `Event ${event.id} appears more than once in the batch`,
    });
  });

  it('rejects two events in one session with the same sequence number', () => {
    expect(
      problems(EventBatch, {
        events: [
          { ...envelope(4), ...events.item_skipped },
          { ...envelope(4), ...events.hint_shown },
        ],
      }),
    ).toEqual([
      {
        path: 'events.1.sequence',
        message: `Two events share sequence 4 in session ${uuid(50)}`,
      },
    ]);
  });

  it('accepts at most one batch-size of events, and at least one', () => {
    expect(problems(EventBatch, { events: [] })[0]?.path).toBe('events');
    const tooMany = Array.from({ length: MAX_BATCH_SIZE + 1 }, (_, index) => ({
      ...envelope(index),
      ...events.item_skipped,
    }));
    expect(problems(EventBatch, { events: tooMany })[0]?.path).toBe('events');
  });
});
