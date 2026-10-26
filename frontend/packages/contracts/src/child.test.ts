import { describe, expect, it } from 'vitest';
import {
  ageInMonth,
  balanceFor,
  BREAK_REMINDER_STEPS,
  ChildProfile,
  ChildProfileInput,
  ChildSettings,
  DAILY_LIMIT_STEPS,
  DEFAULT_PLAY_SETTINGS,
  DEFAULT_TIME_LIMITS,
  equalBalance,
  LearningGoal,
  PROFILE_AGES,
  SESSION_MINUTE_STEPS,
  SubjectBalance,
  TimeLimits,
} from './child';
import { SUBJECTS } from './skills';
import { AT, problems, uuid } from './testing';

const child = {
  id: uuid(10),
  familyId: uuid(1),
  nickname: 'Robin',
  birthYear: 2019,
  birthMonth: 4,
  learningLanguage: 'en',
  grade: 'year-2',
  curriculumId: 'england-national-curriculum',
  uiLocale: 'en-GB',
  avatarId: 'orange-circle',
  timeZone: 'Europe/London',
  createdAt: AT,
};

describe('ChildProfile', () => {
  it('accepts a profile', () => {
    expect(problems(ChildProfile, child)).toEqual([]);
  });

  it('accepts a profile without the optional grade and curriculum', () => {
    const minimal = Object.fromEntries(
      Object.entries(child).filter(([key]) => key !== 'grade' && key !== 'curriculumId'),
    );
    expect(problems(ChildProfile, minimal)).toEqual([]);
  });

  it.each(['dateOfBirth', 'photo', 'location', 'school', 'surname'])(
    'rejects %s, which CLAUDE.md rule 7 forbids collecting',
    (field) => {
      expect(problems(ChildProfile, { ...child, [field]: 'anything' })[0]?.message).toMatch(
        new RegExp(`Unrecognized key: "${field}"`),
      );
    },
  );

  it('rejects an impossible birth month and an empty nickname', () => {
    expect(problems(ChildProfile, { ...child, birthMonth: 13 })[0]?.path).toBe('birthMonth');
    expect(problems(ChildProfile, { ...child, nickname: '   ' })[0]?.path).toBe('nickname');
  });
});

describe('ChildProfileInput', () => {
  const input = {
    nickname: 'Robin',
    birthYear: 2019,
    birthMonth: 4,
    learningLanguage: 'en',
    grade: 'year-2',
    avatarId: 'orange-circle',
  };

  it('accepts what a parent sets, with or without a grade', () => {
    expect(problems(ChildProfileInput, input)).toEqual([]);
    expect(problems(ChildProfileInput, { ...input, grade: undefined })).toEqual([]);
  });

  it.each(['id', 'familyId', 'timeZone', 'dateOfBirth', 'photo'])(
    'rejects %s, which a parent does not set',
    (field) => {
      expect(problems(ChildProfileInput, { ...input, [field]: 'anything' })[0]?.message).toMatch(
        new RegExp(`Unrecognized key: "${field}"`),
      );
    },
  );
});

describe('ageInMonth', () => {
  it('counts the birthday as reached from the first of its month', () => {
    const birth = { birthYear: 2019, birthMonth: 4 };
    expect(ageInMonth(birth, { year: 2026, month: 3 })).toBe(6);
    expect(ageInMonth(birth, { year: 2026, month: 4 })).toBe(7);
    expect(ageInMonth(birth, { year: 2026, month: 12 })).toBe(7);
  });

  it('is 0 in the birth month and goes up by exactly one every twelve months', () => {
    for (let birthYear = 2015; birthYear <= 2024; birthYear += 1) {
      for (let birthMonth = 1; birthMonth <= 12; birthMonth += 1) {
        const birth = { birthYear, birthMonth };
        expect(ageInMonth(birth, { year: birthYear, month: birthMonth })).toBe(0);
        for (let months = 0; months < 12 * 10; months += 1) {
          const index = birthYear * 12 + (birthMonth - 1) + months;
          const on = { year: Math.floor(index / 12), month: (index % 12) + 1 };
          expect(ageInMonth(birth, on)).toBe(Math.floor(months / 12));
        }
      }
    }
  });

  it('allows ages 3 to 8 in this release (ADR 0026)', () => {
    expect(PROFILE_AGES).toEqual({ min: 3, max: 8 });
  });
});

describe('subject balance (ADR 0025, ADR 0027)', () => {
  it('shares equally in 10% steps, any remainder to the first subjects', () => {
    expect(equalBalance(['mathematics'])).toEqual([{ subjectId: 'mathematics', percent: 100 }]);
    expect(equalBalance(['mathematics', 'literacy'])).toEqual([
      { subjectId: 'mathematics', percent: 50 },
      { subjectId: 'literacy', percent: 50 },
    ]);
    expect(equalBalance(['mathematics', 'literacy', 'logic']).map((s) => s.percent)).toEqual([
      40, 30, 30,
    ]);
  });

  it('always makes a valid balance', () => {
    for (let count = 1; count <= SUBJECTS.length; count += 1) {
      expect(problems(SubjectBalance, equalBalance(SUBJECTS.slice(0, count)))).toEqual([]);
    }
  });

  it('keeps a saved balance for the same subjects, in the subjects’ order', () => {
    const saved = [
      { subjectId: 'literacy', percent: 30 },
      { subjectId: 'mathematics', percent: 70 },
    ] as const;
    expect(balanceFor(['mathematics', 'literacy'], saved)).toEqual([
      { subjectId: 'mathematics', percent: 70 },
      { subjectId: 'literacy', percent: 30 },
    ]);
  });

  it('starts again with equal shares when the subjects change', () => {
    const saved = [
      { subjectId: 'mathematics', percent: 70 },
      { subjectId: 'literacy', percent: 30 },
    ] as const;
    expect(balanceFor(['mathematics'], saved)).toEqual([
      { subjectId: 'mathematics', percent: 100 },
    ]);
    expect(balanceFor(['mathematics', 'literacy'], undefined)).toEqual(
      equalBalance(['mathematics', 'literacy']),
    );
  });
});

describe('ChildSettings', () => {
  it('has default time limits within the limits a parent can set, and among the steps', () => {
    expect(problems(TimeLimits, DEFAULT_TIME_LIMITS)).toEqual([]);
    expect(SESSION_MINUTE_STEPS).toContain(DEFAULT_TIME_LIMITS.sessionMinutes);
    expect(DAILY_LIMIT_STEPS).toContain(DEFAULT_TIME_LIMITS.dailyLimitMinutes);
    expect(BREAK_REMINDER_STEPS).toContain(DEFAULT_TIME_LIMITS.breakReminderMinutes);
  });

  const settings = {
    childId: uuid(10),
    ...DEFAULT_PLAY_SETTINGS,
    dailyLimitMinutes: 30,
    sessionMinutes: 10,
    breakReminderMinutes: 20,
  };

  it('accepts the default play settings with time limits', () => {
    expect(problems(ChildSettings, settings)).toEqual([]);
  });

  it('accepts only the three text sizes', () => {
    expect(problems(ChildSettings, { ...settings, textScale: 1.5 })).toEqual([]);
    expect(problems(ChildSettings, { ...settings, textScale: 2 })).toEqual([
      { path: 'textScale', message: 'Expected a text size of 1, 1.25, 1.5' },
    ]);
  });

  it('keeps the daily limit within reason', () => {
    expect(problems(ChildSettings, { ...settings, dailyLimitMinutes: 0 })[0]?.path).toBe(
      'dailyLimitMinutes',
    );
  });
});

describe('LearningGoal', () => {
  const goal = { id: uuid(20), childId: uuid(10), subjectId: 'literacy', createdAt: AT };

  it('accepts an open-ended subject goal and a dated skill goal', () => {
    expect(problems(LearningGoal, goal)).toEqual([]);
    expect(
      problems(LearningGoal, { ...goal, skillId: 'blend-cvc-words', endsOn: '2026-11-20' }),
    ).toEqual([]);
  });

  it('cannot end before it was set', () => {
    expect(problems(LearningGoal, { ...goal, endsOn: '2026-10-01' })).toEqual([
      { path: 'endsOn', message: 'A goal cannot end before it was set' },
    ]);
  });

  it('rejects an unknown subject', () => {
    expect(problems(LearningGoal, { ...goal, subjectId: 'history' })[0]?.path).toBe('subjectId');
  });
});
