import { describe, expect, it } from 'vitest';
import { TodayResponse } from './api';
import { Entitlements } from './entitlements';
import { SkillState } from './learner';
import { Recommendation } from './recommendations';
import { LearningSession } from './session';
import { AT, LATER, problems, uuid } from './testing';

describe('LearningSession', () => {
  const session = {
    id: uuid(50),
    childId: uuid(10),
    activityId: 'hop-line-add-within-20',
    gameId: 'hop-line',
    gameVersion: '0.1.0',
    contentRelease: '2026-10-20.1',
    policyVersion: 'placeholder-1',
    mode: 'practice',
    status: 'in-progress',
    startedAt: AT,
  };

  it('accepts a session in progress and a completed one', () => {
    expect(problems(LearningSession, session)).toEqual([]);
    expect(problems(LearningSession, { ...session, status: 'completed', endedAt: LATER })).toEqual(
      [],
    );
  });

  it('keeps the status and end time consistent', () => {
    expect(problems(LearningSession, { ...session, endedAt: LATER })).toEqual([
      { path: 'endedAt', message: 'A session in progress has not ended' },
    ]);
    expect(problems(LearningSession, { ...session, status: 'interrupted' })).toEqual([
      { path: 'endedAt', message: 'An interrupted session needs endedAt' },
    ]);
    expect(
      problems(LearningSession, { ...session, status: 'completed', startedAt: LATER, endedAt: AT }),
    ).toEqual([{ path: 'endedAt', message: 'A session cannot end before it started' }]);
  });
});

describe('SkillState', () => {
  const state = {
    childId: uuid(10),
    skillId: 'add-within-20',
    ability: 0.2,
    uncertainty: 0.8,
    status: 'building',
    policyVersion: 'placeholder-1',
    updatedAt: AT,
  };

  it('accepts a skill state', () => {
    expect(problems(SkillState, state)).toEqual([]);
  });

  it('schedules a review for a mastered skill', () => {
    expect(problems(SkillState, { ...state, status: 'mastered' })).toEqual([
      { path: 'nextReviewAt', message: 'A mastered skill has a review date' },
    ]);
    expect(problems(SkillState, { ...state, status: 'mastered', nextReviewAt: LATER })).toEqual([]);
  });

  it('rejects an unknown status and a non-positive uncertainty', () => {
    expect(problems(SkillState, { ...state, status: 'failing' })[0]?.path).toBe('status');
    expect(problems(SkillState, { ...state, uncertainty: 0 })[0]?.path).toBe('uncertainty');
  });
});

describe('Recommendation', () => {
  const recommendation = {
    id: uuid(60),
    childId: uuid(10),
    card: 'new',
    skillId: 'multiply-by-2',
    activityId: 'tile-farm-equal-groups',
    reasons: [
      {
        code: 'FRONTIER_READY',
        evidence: {
          relatedSkillId: 'repeated-addition',
          firstTryCorrect: 14,
          firstTryTotal: 16,
          sessionCount: 4,
        },
      },
    ],
    policyVersion: 'placeholder-1',
    createdAt: AT,
  };

  it('accepts a recommendation with its evidence', () => {
    expect(problems(Recommendation, recommendation)).toEqual([]);
  });

  it('carries at least one reason', () => {
    expect(problems(Recommendation, { ...recommendation, reasons: [] })).toContainEqual({
      path: 'reasons',
      message: 'Every recommendation carries at least one reason',
    });
  });

  it('uses FREE_CHOICE for the free-choice card and nowhere else', () => {
    expect(problems(Recommendation, { ...recommendation, card: 'free-choice' })).toEqual([
      { path: 'reasons', message: 'FREE_CHOICE explains the free-choice card, and only that card' },
    ]);
    expect(
      problems(Recommendation, {
        ...recommendation,
        card: 'free-choice',
        reasons: [{ code: 'FREE_CHOICE', evidence: {} }],
      }),
    ).toEqual([]);
  });

  it('keeps in-session reasons out of recommendations', () => {
    expect(
      problems(Recommendation, {
        ...recommendation,
        reasons: [{ code: 'DIFFICULTY_STEP', evidence: {} }],
      })[0]?.path,
    ).toBe('reasons.0.code');
  });

  it('cannot count more correct first tries than first tries', () => {
    expect(
      problems(Recommendation, {
        ...recommendation,
        reasons: [{ code: 'FRONTIER_READY', evidence: { firstTryCorrect: 17, firstTryTotal: 16 } }],
      }),
    ).toEqual([
      {
        path: 'reasons.0.evidence.firstTryCorrect',
        message: 'firstTryCorrect cannot exceed firstTryTotal',
      },
    ]);
  });
});

describe('TodayResponse (plan 4.3, ADR 0035)', () => {
  const card = (n: number, kind: string, activityId: string) => ({
    id: uuid(70 + n),
    childId: uuid(10),
    card: kind,
    skillId: 'add-within-20',
    activityId,
    reasons: [{ code: kind === 'free-choice' ? 'FREE_CHOICE' : 'KEEP_BUILDING', evidence: {} }],
    policyVersion: 'planner-1',
    createdAt: AT,
  });
  const review = card(1, 'review', 'hop-line-add-within-20');
  const fresh = card(2, 'new', 'hop-line-subtract-within-20');
  const free = card(3, 'free-choice', 'ten-frame-cafe-count');

  it('takes up to three cards, one of each kind, in order', () => {
    expect(problems(TodayResponse, { cards: [review, fresh, free] })).toEqual([]);
    expect(problems(TodayResponse, { cards: [review, free] })).toEqual([]);
    expect(problems(TodayResponse, { cards: [] })).toEqual([]);
  });

  it('refuses two cards of a kind, or cards out of order', () => {
    const message = 'Today has at most one card of each kind: review, then new, then free choice';
    expect(problems(TodayResponse, { cards: [fresh, review] })).toEqual([
      { path: 'cards', message },
    ]);
    expect(
      problems(TodayResponse, { cards: [review, { ...review, id: uuid(79), activityId: 'x' }] }),
    ).toEqual([{ path: 'cards', message }]);
  });

  it('refuses one activity on two cards', () => {
    expect(
      problems(TodayResponse, { cards: [review, { ...fresh, activityId: review.activityId }] }),
    ).toEqual([{ path: 'cards', message: 'No activity is on two cards' }]);
  });
});

describe('Entitlements', () => {
  const features = {
    'children.max': 1,
    'activities.tier': 'free',
    'insights.detail': 'basic',
    'digest.weekly': false,
    'goals.custom': false,
  };

  it('accepts the free and premium examples from plan 9', () => {
    expect(problems(Entitlements, { familyId: uuid(1), features, computedAt: AT })).toEqual([]);
    expect(
      problems(Entitlements, {
        familyId: uuid(1),
        features: {
          ...features,
          'children.max': 4,
          'activities.tier': 'premium',
          'insights.detail': 'full',
          'digest.weekly': true,
          'goals.custom': true,
        },
        computedAt: AT,
      }),
    ).toEqual([]);
  });

  it('rejects a missing or invalid feature key', () => {
    expect(
      problems(Entitlements, {
        familyId: uuid(1),
        features: { ...features, 'children.max': 0 },
        computedAt: AT,
      })[0]?.path,
    ).toBe('features.children.max');
  });
});
