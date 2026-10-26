import {
  ageInMonth,
  ChildProfileInput,
  NICKNAME_MAX_LENGTH,
  PROFILE_AGES,
  type ChildProfile,
  type FamilyRole,
  type MarketConfig,
} from '@learnofun/contracts';
import { AVATARS, isAvatarId, type AvatarId } from '@learnofun/ui-kit';

/** What the profile form holds while a parent fills it in (ADR 0026). */
export interface ProfileValues {
  nickname: string;
  birthMonth: number | undefined;
  birthYear: number | undefined;
  learningLanguage: string;
  /** A grade's ID, or '' for "Not set". */
  grade: string;
  avatarId: AvatarId;
}

/** Why a field cannot be saved yet, with what its message needs. */
export type ProfileError =
  | { key: 'nicknameMissing' }
  | { key: 'nicknameTooLong'; max: number }
  | { key: 'birthMissing' }
  | { key: 'ageOutOfRange'; min: number; max: number };

export interface ProfileErrors {
  nickname?: ProfileError;
  birth?: ProfileError;
}

/** A month: the year and the month, 1 to 12. */
export interface YearMonth {
  year: number;
  month: number;
}

type Birth = Pick<ChildProfile, 'birthYear' | 'birthMonth'>;

/** Who may add children and edit profiles (plan 8.1); the API decides, this only hides controls. */
export function canManageChildren(role: FamilyRole): boolean {
  return role === 'owner' || role === 'guardian';
}

/** The month it is now in a time zone, as the API counts ages: in the family's zone. */
export function monthIn(timeZone: string, now: Date): YearMonth {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const part = (type: 'year' | 'month') =>
    Number(parts.find((candidate) => candidate.type === type)?.value);
  return { year: part('year'), month: part('month') };
}

/** Today's date in a time zone, such as `2026-10-22`: a goal ends today or later (ADR 0027). */
export function dateIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * The Monday that starts a moment's week, in a time zone, such as `2026-10-19`: the history groups
 * sessions by week (ADR 0029).
 */
export function weekOf(timestamp: string, timeZone: string): string {
  const day = new Date(`${dateIn(timeZone, new Date(timestamp))}T00:00:00Z`);
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - sinceMonday);
  return day.toISOString().slice(0, 10);
}

/** A new child's starting values: the market's first learning language and the first picture. */
export function newProfileValues(market: MarketConfig): ProfileValues {
  return {
    nickname: '',
    birthMonth: undefined,
    birthYear: undefined,
    learningLanguage: market.learningLanguages[0] ?? 'en',
    grade: '',
    avatarId: AVATARS[0],
  };
}

/** A saved profile's values, to edit. */
export function profileValues(child: ChildProfile): ProfileValues {
  return {
    nickname: child.nickname,
    birthMonth: child.birthMonth,
    birthYear: child.birthYear,
    learningLanguage: child.learningLanguage,
    grade: child.grade ?? '',
    avatarId: isAvatarId(child.avatarId) ? child.avatarId : AVATARS[0],
  };
}

/**
 * The birth years to offer, newest first: every year that can give an age of 3 to 8 this month,
 * and the child's own when it is outside them, so editing never loses it.
 */
export function birthYears(today: YearMonth, saved?: number): number[] {
  const years: number[] = [];
  for (
    let year = today.year - PROFILE_AGES.min;
    year >= today.year - PROFILE_AGES.max - 1;
    year--
  ) {
    years.push(year);
  }
  if (saved !== undefined && !years.includes(saved)) years.push(saved);
  return years.sort((a, b) => b - a);
}

/**
 * Checks the form as the API will (ADR 0026), so a parent sees what to change before sending.
 * The ages apply to a new child, or to a birth month and year that changed.
 */
export function checkProfile(
  values: ProfileValues,
  today: YearMonth,
  saved?: Birth,
): { input: ChildProfileInput } | { errors: ProfileErrors } {
  const errors: ProfileErrors = {};
  const nickname = values.nickname.trim();
  if (nickname === '') errors.nickname = { key: 'nicknameMissing' };
  else if (nickname.length > NICKNAME_MAX_LENGTH) {
    errors.nickname = { key: 'nicknameTooLong', max: NICKNAME_MAX_LENGTH };
  }

  const { birthYear, birthMonth } = values;
  if (birthYear === undefined || birthMonth === undefined) {
    errors.birth = { key: 'birthMissing' };
  } else {
    const changed = saved?.birthYear !== birthYear || saved.birthMonth !== birthMonth;
    const age = ageInMonth({ birthYear, birthMonth }, today);
    if (changed && (age < PROFILE_AGES.min || age > PROFILE_AGES.max)) {
      errors.birth = { key: 'ageOutOfRange', ...PROFILE_AGES };
    }
  }

  if (errors.nickname || errors.birth) return { errors };
  return {
    input: ChildProfileInput.parse({
      nickname,
      birthYear,
      birthMonth,
      learningLanguage: values.learningLanguage,
      avatarId: values.avatarId,
      ...(values.grade === '' ? {} : { grade: values.grade }),
    }),
  };
}
