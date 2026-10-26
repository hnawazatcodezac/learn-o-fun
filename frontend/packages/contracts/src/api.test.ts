import { describe, expect, it } from 'vitest';
import {
  ChildGoalRequest,
  ChildProgressResponse,
  ChildSessionsResponse,
  SubjectBalanceRequest,
  TimeLimitsRequest,
} from './api';
import { AT, problems, uuid } from './testing';

describe('TimeLimitsRequest (ADR 0027)', () => {
  const limits = { sessionMinutes: 10, dailyLimitMinutes: 30, breakReminderMinutes: 20 };

  it('takes one of the steps for each limit', () => {
    expect(problems(TimeLimitsRequest, limits)).toEqual([]);
    expect(problems(TimeLimitsRequest, { ...limits, sessionMinutes: 12 })[0]?.path).toBe(
      'sessionMinutes',
    );
    expect(problems(TimeLimitsRequest, { ...limits, dailyLimitMinutes: 240 })[0]?.path).toBe(
      'dailyLimitMinutes',
    );
    expect(problems(TimeLimitsRequest, { ...limits, breakReminderMinutes: 5 })[0]?.path).toBe(
      'breakReminderMinutes',
    );
  });

  it('never lets a session be longer than the day', () => {
    expect(
      problems(TimeLimitsRequest, { ...limits, sessionMinutes: 30, dailyLimitMinutes: 15 })[0],
    ).toEqual({ path: 'sessionMinutes', message: 'A session is no longer than the day’s limit' });
    expect(
      problems(TimeLimitsRequest, { ...limits, sessionMinutes: 15, dailyLimitMinutes: 15 }),
    ).toEqual([]);
  });
});

describe('SubjectBalanceRequest (ADR 0025)', () => {
  it('takes shares in steps of 10% adding up to 100', () => {
    expect(
      problems(SubjectBalanceRequest, {
        shares: [
          { subjectId: 'mathematics', percent: 70 },
          { subjectId: 'literacy', percent: 30 },
        ],
      }),
    ).toEqual([]);
  });

  it('lets 0% pause a subject, so long as the shares add up to 100', () => {
    expect(
      problems(SubjectBalanceRequest, {
        shares: [
          { subjectId: 'mathematics', percent: 100 },
          { subjectId: 'literacy', percent: 0 },
        ],
      }),
    ).toEqual([]);
  });

  it('rejects other steps, other totals and a subject twice', () => {
    expect(
      problems(SubjectBalanceRequest, {
        shares: [
          { subjectId: 'mathematics', percent: 65 },
          { subjectId: 'literacy', percent: 35 },
        ],
      })[0]?.message,
    ).toBe('Shares move in steps of 10%');
    expect(
      problems(SubjectBalanceRequest, {
        shares: [
          { subjectId: 'mathematics', percent: 60 },
          { subjectId: 'literacy', percent: 30 },
        ],
      })[0]?.message,
    ).toBe('The shares add up to 90%, not 100%');
    expect(
      problems(SubjectBalanceRequest, {
        shares: [
          { subjectId: 'mathematics', percent: 50 },
          { subjectId: 'mathematics', percent: 50 },
        ],
      })[0]?.message,
    ).toBe('Subject mathematics appears more than once');
  });
});

describe('ChildGoalRequest (ADR 0027)', () => {
  it('takes a subject, with an optional skill and end date', () => {
    expect(problems(ChildGoalRequest, { subjectId: 'mathematics' })).toEqual([]);
    expect(
      problems(ChildGoalRequest, {
        subjectId: 'mathematics',
        skillId: 'number-bonds-to-10',
        endsOn: '2026-11-30',
      }),
    ).toEqual([]);
  });

  it('rejects anything else, such as a child or a goal ID', () => {
    expect(
      problems(ChildGoalRequest, { subjectId: 'mathematics', childId: 'x' })[0]?.message,
    ).toMatch(/Unrecognized key: "childId"/);
    expect(problems(ChildGoalRequest, { subjectId: 'cooking' })[0]?.path).toBe('subjectId');
  });
});

describe('ChildProgressResponse (ADR 0028)', () => {
  const child = {
    id: uuid(10),
    familyId: uuid(1),
    nickname: 'Robin',
    birthYear: 2018,
    birthMonth: 5,
    learningLanguage: 'en',
    uiLocale: 'en-GB',
    avatarId: 'purple-star',
    timeZone: 'Europe/London',
    createdAt: AT,
  };
  const evidence = {
    firstTries: 9,
    firstTriesCorrect: 8,
    items: 9,
    sessions: 2,
    earlySignal: false,
  };
  const strand = (skills?: unknown[]) => ({
    strandId: 'counting',
    counts: [{ status: 'mastered', count: 1 }],
    ...(skills ? { skills } : {}),
  });
  const progress = (detail: string, strands: unknown[]) => ({
    child,
    detail,
    subjects: [{ subjectId: 'mathematics', strands }],
    today: [],
  });

  it('summarises strands on basic, and lists their skills on full (plan 9)', () => {
    const skills = [{ skillId: 'count-to-20', status: 'mastered', evidence }];
    expect(problems(ChildProgressResponse, progress('basic', [strand()]))).toEqual([]);
    expect(problems(ChildProgressResponse, progress('full', [strand(skills)]))).toEqual([]);
  });

  it('never carries the skills on basic, and always on full', () => {
    const skills = [{ skillId: 'count-to-20', status: 'mastered', evidence }];
    expect(problems(ChildProgressResponse, progress('basic', [strand(skills)]))[0]?.message).toBe(
      'Basic detail summarises a strand without its skills',
    );
    expect(problems(ChildProgressResponse, progress('full', [strand()]))[0]?.message).toBe(
      'Full detail lists every skill',
    );
  });

  it('never counts more right first tries than first tries', () => {
    const skills = [
      {
        skillId: 'count-to-20',
        status: 'mastered',
        evidence: { ...evidence, firstTriesCorrect: 10 },
      },
    ];
    expect(problems(ChildProgressResponse, progress('full', [strand(skills)]))[0]?.message).toBe(
      'firstTriesCorrect cannot exceed firstTries',
    );
  });
});

describe('ChildSessionsResponse (ADR 0029)', () => {
  const child = {
    id: uuid(10),
    familyId: uuid(1),
    nickname: 'Robin',
    birthYear: 2018,
    birthMonth: 5,
    learningLanguage: 'en',
    uiLocale: 'en-GB',
    avatarId: 'purple-star',
    timeZone: 'Europe/London',
    createdAt: AT,
  };
  const headline = {
    id: uuid(20),
    activityId: 'hop-line-add-within-20',
    mode: 'practice',
    startedAt: AT,
    status: 'completed',
    timeOnTaskSeconds: 240,
    attempted: 8,
    firstTryCorrect: 6,
  };
  const detail = {
    presented: 8,
    skipped: 0,
    unanswered: 0,
    eventuallyCorrect: 8,
    supported: 1,
    learningCredit: 2,
    items: [
      { itemId: 'hop-line-addition-5-plus-3', skillIds: ['add-within-10'], outcome: 'first-try' },
    ],
  };
  const history = (plan: string, sessions: unknown[]) => ({ child, detail: plan, sessions });

  it('carries the headline on basic, and every measure on full (plan 9)', () => {
    expect(problems(ChildSessionsResponse, history('basic', [headline]))).toEqual([]);
    expect(problems(ChildSessionsResponse, history('full', [{ ...headline, detail }]))).toEqual([]);
    expect(
      problems(ChildSessionsResponse, history('basic', [{ ...headline, detail }]))[0]?.message,
    ).toBe('Basic detail carries the headline measures only');
    expect(problems(ChildSessionsResponse, history('full', [headline]))[0]?.message).toBe(
      'Full detail carries every measure',
    );
  });

  it('never counts more right first tries than items attempted', () => {
    expect(
      problems(ChildSessionsResponse, history('basic', [{ ...headline, firstTryCorrect: 9 }]))[0]
        ?.message,
    ).toBe('firstTryCorrect cannot exceed attempted');
  });
});
