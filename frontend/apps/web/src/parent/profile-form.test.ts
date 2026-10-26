import type { ChildProfile, MarketConfig } from '@learnofun/contracts';
import { describe, expect, it } from 'vitest';
import {
  birthYears,
  canManageChildren,
  checkProfile,
  dateIn,
  monthIn,
  weekOf,
  newProfileValues,
  profileValues,
  type ProfileValues,
} from './profile-form';

const OCTOBER_2026 = { year: 2026, month: 10 };

const market: MarketConfig = {
  market: 'GB',
  learningLanguages: ['en'],
  defaultCurriculumId: 'england-national-curriculum',
  gradeScheme: { id: 'england-school-years', grades: [{ id: 'year-1', name: { en: 'Year 1' } }] },
  ageBands: [{ band: 'early-primary', minAge: 6, maxAge: 8, subjects: ['mathematics'] }],
};

const values = (overrides: Partial<ProfileValues> = {}): ProfileValues => ({
  ...newProfileValues(market),
  nickname: 'Kit',
  birthYear: 2021,
  birthMonth: 6,
  ...overrides,
});

const robin: ChildProfile = {
  id: '0192f4c1-0000-7000-8000-00000000c001',
  familyId: '0192f4c1-0000-7000-8000-00000000f001',
  nickname: 'Robin',
  birthYear: 2018,
  birthMonth: 5,
  learningLanguage: 'en',
  grade: 'year-3',
  curriculumId: 'england-national-curriculum',
  uiLocale: 'en-GB',
  avatarId: 'purple-star',
  timeZone: 'Europe/London',
  createdAt: '2026-09-01T08:00:00.000Z',
};

describe('checkProfile (ADR 0026)', () => {
  it('gives what a parent sets, trimmed, with "Not set" left out', () => {
    expect(checkProfile(values({ nickname: '  Kit ' }), OCTOBER_2026)).toEqual({
      input: {
        nickname: 'Kit',
        birthYear: 2021,
        birthMonth: 6,
        learningLanguage: 'en',
        avatarId: 'orange-circle',
      },
    });
    expect(checkProfile(values({ grade: 'year-1' }), OCTOBER_2026)).toMatchObject({
      input: { grade: 'year-1' },
    });
  });

  it('asks for a nickname of at most 24 characters', () => {
    expect(checkProfile(values({ nickname: '   ' }), OCTOBER_2026)).toEqual({
      errors: { nickname: { key: 'nicknameMissing' } },
    });
    expect(checkProfile(values({ nickname: 'K'.repeat(25) }), OCTOBER_2026)).toEqual({
      errors: { nickname: { key: 'nicknameTooLong', max: 24 } },
    });
    expect(checkProfile(values({ nickname: 'K'.repeat(24) }), OCTOBER_2026)).toHaveProperty(
      'input',
    );
  });

  it('asks for both the month and the year', () => {
    expect(checkProfile(values({ birthMonth: undefined }), OCTOBER_2026)).toEqual({
      errors: { birth: { key: 'birthMissing' } },
    });
    expect(checkProfile(values({ nickname: '', birthYear: undefined }), OCTOBER_2026)).toEqual({
      errors: { nickname: { key: 'nicknameMissing' }, birth: { key: 'birthMissing' } },
    });
  });

  it.each([
    [2023, 10, true],
    [2023, 11, false],
    [2017, 11, true],
    [2017, 10, false],
  ])('takes ages 3 to 8 only: born %i-%i is %s', (birthYear, birthMonth, fits) => {
    const result = checkProfile(values({ birthYear, birthMonth }), OCTOBER_2026);

    expect('input' in result).toBe(fits);
    if (!fits)
      expect(result).toEqual({ errors: { birth: { key: 'ageOutOfRange', min: 3, max: 8 } } });
  });

  it('lets a child who has grown past 8 keep their birth, but not take a new one out of range', () => {
    const grown = { ...robin, birthYear: 2016 };

    expect(checkProfile(profileValues(grown), OCTOBER_2026, grown)).toHaveProperty('input');
    expect(
      checkProfile({ ...profileValues(grown), birthMonth: 4 }, OCTOBER_2026, grown),
    ).toHaveProperty('errors.birth.key', 'ageOutOfRange');
  });
});

describe('the form’s values', () => {
  it('starts a new child on the market’s first language, the first picture and no grade', () => {
    expect(newProfileValues(market)).toEqual({
      nickname: '',
      birthMonth: undefined,
      birthYear: undefined,
      learningLanguage: 'en',
      grade: '',
      avatarId: 'orange-circle',
    });
  });

  it('edits a saved profile as it is', () => {
    expect(profileValues(robin)).toEqual({
      nickname: 'Robin',
      birthMonth: 5,
      birthYear: 2018,
      learningLanguage: 'en',
      grade: 'year-3',
      avatarId: 'purple-star',
    });
    expect(profileValues({ ...robin, grade: undefined, avatarId: 'unknown' })).toMatchObject({
      grade: '',
      avatarId: 'orange-circle',
    });
  });

  it('offers every birth year that can be 3 to 8 this month, newest first, and keeps a saved one', () => {
    expect(birthYears(OCTOBER_2026)).toEqual([2023, 2022, 2021, 2020, 2019, 2018, 2017]);
    expect(birthYears(OCTOBER_2026, 2016).at(-1)).toBe(2016);
    expect(birthYears(OCTOBER_2026, 2020)).toHaveLength(7);
  });
});

describe('monthIn', () => {
  it('reads the month in the family’s time zone, not the device’s', () => {
    // 23:30 on 31 October in London is already November in Dubai.
    const late = new Date('2026-10-31T23:30:00.000Z');

    expect(monthIn('Europe/London', late)).toEqual({ year: 2026, month: 10 });
    expect(monthIn('Asia/Dubai', late)).toEqual({ year: 2026, month: 11 });
  });
});

describe('dateIn', () => {
  it('gives today’s date in the family’s time zone', () => {
    const late = new Date('2026-10-31T23:30:00.000Z');

    expect(dateIn('Europe/London', late)).toBe('2026-10-31');
    expect(dateIn('Asia/Dubai', late)).toBe('2026-11-01');
  });
});

describe('weekOf (ADR 0029)', () => {
  it('starts weeks on Monday, in the family’s time zone', () => {
    expect(weekOf('2026-10-19T09:00:00.000Z', 'Europe/London')).toBe('2026-10-19');
    expect(weekOf('2026-10-25T20:00:00.000Z', 'Europe/London')).toBe('2026-10-19');
    // Late on Sunday in London is already Monday in Dubai.
    expect(weekOf('2026-10-25T22:30:00.000Z', 'Asia/Dubai')).toBe('2026-10-26');
    expect(weekOf('2026-11-01T10:00:00.000Z', 'Europe/London')).toBe('2026-10-26');
  });
});

describe('canManageChildren', () => {
  it('lets owners and guardians manage children, not caregivers (plan 8.1)', () => {
    expect(canManageChildren('owner')).toBe(true);
    expect(canManageChildren('guardian')).toBe(true);
    expect(canManageChildren('caregiver')).toBe(false);
  });
});
