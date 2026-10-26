import type { CatalogResponse } from '@learnofun/contracts';
import { seedData } from '@learnofun/mock-api';
import { describe, expect, it } from 'vitest';
import type { SkillState } from '@learnofun/contracts';
import {
  pickMode,
  playability,
  playableActivities,
  sessionTarget,
  type PlayOptions,
} from './activity';

const { catalog } = seedData;
const here: PlayOptions = {
  band: 'early-primary',
  gameIds: ['demo-choice', 'hop-line'],
  activityTier: 'free',
};
const reason = (
  activityId: string,
  options: PlayOptions = here,
  data: CatalogResponse = catalog,
) => {
  const result = playability(data, activityId, options);
  return result.playable ? 'playable' : result.reason;
};

describe('playability', () => {
  it('finds Hop Line’s activity, its template and the content release', () => {
    expect(playability(catalog, 'hop-line-add-within-20', here)).toMatchObject({
      playable: true,
      activity: { id: 'hop-line-add-within-20', gameId: 'hop-line' },
      template: { id: 'hop-line-addition' },
      contentRelease: catalog.release,
    });
  });

  it('says why an activity cannot be played', () => {
    expect(reason('no-such-activity')).toBe('unknown-activity');
    // A game the content release leaves out cannot be played (ADR 0035)…
    const farmOut: CatalogResponse = {
      ...catalog,
      games: catalog.games.filter((id) => id !== 'tile-farm'),
    };
    const withFarm = { ...here, gameIds: [...here.gameIds, 'tile-farm'] };
    expect(reason('tile-farm-equal-groups', withFarm, farmOut)).toBe('not-in-release');
    expect(reason('tile-farm-equal-groups', withFarm)).toBe('playable');
    // …and a released game an app does not have, it still cannot play.
    expect(catalog.games).toContain('ten-frame-cafe');
    expect(reason('ten-frame-cafe-count')).toBe('game-not-built');
    expect(
      reason('ten-frame-cafe-count', { ...here, gameIds: [...here.gameIds, 'ten-frame-cafe'] }),
    ).toBe('playable');
    expect(reason('hop-line-add-within-20', { ...here, band: 'early-years' })).toBe('not-for-band');
    // Its template arrives with the subtraction activity.
    expect(reason('hop-line-subtract-within-20')).toBe('no-template');
  });

  it('keeps premium activities out unless the family’s plan includes them', () => {
    const premium: CatalogResponse = {
      ...catalog,
      activities: catalog.activities.map((activity) =>
        activity.id === 'hop-line-add-within-20' ? { ...activity, tier: 'premium' } : activity,
      ),
    };

    expect(reason('hop-line-add-within-20', here, premium)).toBe('not-in-plan');
    expect(reason('hop-line-add-within-20', { ...here, activityTier: 'premium' }, premium)).toBe(
      'playable',
    );
    // Tile Farm's arrays are premium in the mock catalog.
    const withFarm = { ...here, gameIds: [...here.gameIds, 'tile-farm'] };
    expect(reason('tile-farm-arrays', withFarm)).toBe('not-in-plan');
    expect(reason('tile-farm-arrays', { ...withFarm, activityTier: 'premium' })).toBe('playable');
  });
});

describe('sessionTarget (ADR 0036)', () => {
  const hopLine = catalog.activities.find((a) => a.id === 'hop-line-add-within-20');
  if (!hopLine) throw new Error('The mock catalog has no Hop Line addition');
  const state = (skillId: string, ability: number): SkillState => ({
    childId: '0192f4c1-0000-7000-8000-00000000c001',
    skillId,
    ability,
    uncertainty: 0.4,
    status: 'building',
    policyVersion: 'elo-2',
    updatedAt: '2026-10-22T10:00:00.000Z',
  });
  const states = [state('add-within-10', 1.5), state('add-within-20', 0.4)];

  it('aims at the skill Today’s card named, from the child’s ability on it', () => {
    expect(sessionTarget(hopLine, states, 'add-within-10')).toEqual({
      skillId: 'add-within-10',
      learner: { ability: 1.5, uncertainty: 0.4 },
    });
  });

  it('without a card, aims at the first of the activity’s skills the child has begun', () => {
    expect(hopLine.targetSkillIds[0]).toBe('add-within-20');
    expect(sessionTarget(hopLine, [state('add-within-10', 1.5)], null)).toMatchObject({
      skillId: 'add-within-10',
    });
    // A skill the activity does not practise is not a target.
    expect(sessionTarget(hopLine, states, 'count-to-20')).toMatchObject({
      skillId: 'add-within-20',
      learner: { ability: 0.4 },
    });
  });

  it('starts from the learner model’s own values for a skill not begun', () => {
    expect(sessionTarget(hopLine, [], null)).toEqual({ skillId: 'add-within-20' });
  });
});

describe('playableActivities', () => {
  it('lists only what the child can play here: today, only Hop Line’s addition', () => {
    expect(playableActivities(catalog, here).map((activity) => activity.id)).toEqual([
      'hop-line-add-within-20',
    ]);
  });
});

describe('pickMode', () => {
  const activity = catalog.activities.find(
    (candidate) => candidate.id === 'hop-line-add-within-20',
  );
  if (!activity) throw new Error('The mock catalog has no Hop Line activity');

  it('plays the mode asked for, if the activity offers it, or else its first mode', () => {
    expect(pickMode(activity, 'challenge')).toBe('challenge');
    expect(pickMode(activity, null)).toBe('practice');
    expect(pickMode(activity, 'hard')).toBe('practice');
    expect(pickMode({ ...activity, modes: ['practice'] }, 'challenge')).toBe('practice');
  });
});
