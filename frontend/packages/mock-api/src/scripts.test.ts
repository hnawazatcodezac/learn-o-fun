import { ChildSnapshot, LearningEvent, LearningSession } from '@learnofun/contracts';
import { skillEvidence } from '@learnofun/learning-core';
import { getResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { NORMAL_CONTROLS } from './controls';
import { seedData } from './data';
import { MockDatabase } from './database';
import { createHandlers } from './handlers';
import { playScripts } from './scripts';
import { memoryStorage } from './storage';

const play = () =>
  playScripts(
    seedData.sessionScripts,
    seedData.catalog.activities,
    seedData.catalog.skillGraph.skills,
    seedData.catalog.release,
  );

describe('the past-session scripts (ADR 0028)', () => {
  it('play into valid sessions and events, completed, in order', () => {
    const { sessions, events } = play();

    expect(sessions).toHaveLength(seedData.sessionScripts.length);
    for (const session of sessions) {
      expect(LearningSession.safeParse(session).success).toBe(true);
      expect(session.status).toBe('completed');
      const own = events.filter((event) => event.sessionId === session.id);
      expect(own.map((event) => event.sequence)).toEqual(own.map((_, index) => index));
      expect(own[0]?.type).toBe('session_started');
      expect(own[own.length - 1]?.type).toBe('session_completed');
    }
    expect(events.every((event) => LearningEvent.safeParse(event).success)).toBe(true);
  });

  it('play the same every time, IDs and all', () => {
    expect(play()).toEqual(play());
  });

  it('give each item the outcome its script says, as the evidence counts it', () => {
    const [script] = seedData.sessionScripts;
    if (!script) throw new Error('No scripts');
    const { events, items } = playScripts(
      [script],
      seedData.catalog.activities,
      seedData.catalog.skillGraph.skills,
      'test',
    );
    const evidence = skillEvidence(events, (id) => items.get(id));

    for (const group of script.items) {
      const firstTries = group.outcomes.filter((o) => o !== 'skipped').length;
      const right = group.outcomes.filter((o) => o === 'first-try').length;
      expect(evidence.get(group.skillId)).toMatchObject({
        firstTries,
        firstTriesCorrect: right,
      });
    }
  });

  it('give each child, on 22 October 2026, the statuses the mock data means (ADR 0031)', async () => {
    const db = new MockDatabase(seedData, memoryStorage());
    const handlers = createHandlers({
      db,
      controls: () => NORMAL_CONTROLS,
      now: () => Date.parse('2026-10-22T10:00:00.000Z'),
    });
    const statuses: Record<string, Record<string, string>> = {};
    for (const child of seedData.children) {
      const response = await getResponse(
        handlers,
        new Request(`http://mock.test/api/children/${child.id}/snapshot`),
      );
      const { skillStates } = ChildSnapshot.parse(await response?.json());
      statuses[child.nickname] = Object.fromEntries(skillStates.map((s) => [s.skillId, s.status]));
    }

    expect(statuses).toEqual({
      Robin: {
        'count-to-20': 'mastered',
        'number-bonds-to-10': 'review-due',
        'add-within-10': 'mastered',
        'subtract-within-10': 'strong',
        'add-within-20': 'strong',
        'subtract-within-20': 'building',
        'equal-groups': 'exploring',
      },
      Ari: {
        'count-to-20': 'building',
        'number-bonds-to-10': 'exploring',
        'add-within-10': 'exploring',
      },
      Nia: {
        'add-within-10': 'review-due',
        'equal-groups': 'strong',
        'repeated-addition': 'strong',
      },
    });
  });

  it('keep Robin’s mastered skills mastered for weeks yet, by their reviews (plan 4.1)', async () => {
    const db = new MockDatabase(seedData, memoryStorage());
    const handlers = createHandlers({
      db,
      controls: () => NORMAL_CONTROLS,
      now: () => Date.parse('2026-11-04T10:00:00.000Z'),
    });
    const robin = seedData.children[0];
    if (!robin) throw new Error('No Robin');
    const response = await getResponse(
      handlers,
      new Request(`http://mock.test/api/children/${robin.id}/snapshot`),
    );
    const { skillStates } = ChildSnapshot.parse(await response?.json());
    const mastered = skillStates.filter((s) => s.status === 'mastered').map((s) => s.skillId);
    expect(mastered.sort()).toEqual(['add-within-10', 'count-to-20']);
  });

  it('end before any day the tests play on, so they never count as today', () => {
    const latest = seedData.sessionScripts
      .map((s) => s.startedAt)
      .sort()
      .at(-1);
    expect(latest && latest < '2026-10-20').toBe(true);
  });
});
