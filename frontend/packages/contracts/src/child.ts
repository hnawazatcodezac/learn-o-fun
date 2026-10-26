import { z } from 'zod';
import { checkUnique, ContentId, IsoDate, Locale, Timestamp, TimeZone, Uuidv7 } from './common';
import { SubjectId } from './skills';

/** The longest a nickname can be. */
export const NICKNAME_MAX_LENGTH = 24;

/**
 * A child's profile (ADR 0010). The only personal data is the nickname, birth year and month and
 * learning language (CLAUDE.md rule 7), plus an optional school grade. The other fields are
 * settings that identify nobody. Never a full date of birth, photo, voice, location or contacts:
 * unknown fields are rejected, not silently dropped.
 */
export const ChildProfile = z.strictObject({
  id: Uuidv7,
  familyId: Uuidv7,
  /** Need not be a real name. */
  nickname: z.string().trim().min(1).max(NICKNAME_MAX_LENGTH),
  birthYear: z.int().min(2000).max(2100),
  birthMonth: z.int().min(1).max(12),
  /** The language content is delivered in, which can differ from the app's language (plan 3.1). */
  learningLanguage: Locale,
  /** School year within the curriculum's grade scheme. */
  grade: ContentId.optional(),
  curriculumId: ContentId.optional(),
  uiLocale: Locale,
  avatarId: ContentId,
  /** The child's learning day is counted in this zone (plan 3.4). */
  timeZone: TimeZone,
  createdAt: Timestamp,
});

/**
 * What a parent sets on a child's profile (ADR 0026); the rest comes from the family, the market
 * and the system. Grade left out means "Not set". Unknown fields are rejected, as on the profile.
 */
export const ChildProfileInput = ChildProfile.pick({
  nickname: true,
  birthYear: true,
  birthMonth: true,
  learningLanguage: true,
  grade: true,
  avatarId: true,
});

/** The ages a profile can be made for in this release: those with activities and bands (ADR 0026). */
export const PROFILE_AGES = { min: 3, max: 8 } as const;

/**
 * A child's age in whole years in a given month, counting the birthday as reached from the first
 * of its month: only the birth month and year are known (ADR 0026).
 */
export function ageInMonth(
  birth: { birthYear: number; birthMonth: number },
  on: { year: number; month: number },
): number {
  return on.year - birth.birthYear - (on.month < birth.birthMonth ? 1 : 0);
}

/** Text-size setting: everything is sized in rem, so the whole layout scales with it. */
export const TEXT_SCALES = [1, 1.25, 1.5] as const;
export const TextScale = z.literal(TEXT_SCALES, {
  error: `Expected a text size of ${TEXT_SCALES.join(', ')}`,
});

/** How play looks and sounds (plan 8.6): what the settings panel edits. */
export const PlaySettings = z.object({
  sound: z.boolean(),
  music: z.boolean(),
  /** Spoken instructions. */
  voice: z.boolean(),
  /** Timers on fluency challenges. They only ever appear from age 7 (plan 4.2). */
  timers: z.boolean(),
  reducedMotion: z.boolean(),
  highContrast: z.boolean(),
  dyslexiaFont: z.boolean(),
  textScale: TextScale,
});

/** Healthy-use limits (plan 8.7). Daily limits are on by default; parents adjust them. */
export const TimeLimits = z.object({
  dailyLimitMinutes: z.int().min(5).max(240),
  sessionMinutes: z.int().min(5).max(60),
  breakReminderMinutes: z.int().min(5).max(120),
});

/**
 * The nine pictures a picture PIN is made from (plan 8.1, ADR 0018). Each is a distinct shape, so
 * none depends on colour.
 */
export const PIN_PICTURES = [
  'sun',
  'moon',
  'star',
  'heart',
  'cloud',
  'flower',
  'fish',
  'leaf',
  'drop',
] as const;
export const PinPicture = z.enum(PIN_PICTURES);
export const PICTURE_PIN_LENGTH = 3;

/** A picture PIN: three pictures in order, set by a grown-up. A picture may repeat. */
export const PicturePin = z.array(PinPicture).length(PICTURE_PIN_LENGTH, {
  error: `A picture PIN has ${String(PICTURE_PIN_LENGTH)} pictures`,
});

/** The choices a parent has for each time limit, in minutes (ADR 0027). */
export const SESSION_MINUTE_STEPS = [5, 10, 15, 20, 30] as const;
export const DAILY_LIMIT_STEPS = [15, 30, 45, 60, 75, 90, 105, 120] as const;
export const BREAK_REMINDER_STEPS = [10, 15, 20, 30] as const;

/** Subject shares move in steps of this many percent (ADR 0025). */
export const BALANCE_STEP = 10;

/** One subject's share of a child's practice, in steps of 10%. 0% pauses it (plan 4.5). */
export const SubjectShare = z.object({
  subjectId: SubjectId,
  percent: z
    .int()
    .min(0)
    .max(100)
    .multipleOf(BALANCE_STEP, { error: `Shares move in steps of ${String(BALANCE_STEP)}%` }),
});

/**
 * How a child's practice is shared between their subjects (ADR 0025, ADR 0027): each subject
 * once, adding up to 100, so at least one subject is always above 0.
 */
export const SubjectBalance = z
  .array(SubjectShare)
  .min(1)
  .superRefine((shares, context) => {
    checkUnique(shares, context, (share) => `Subject ${share.subjectId}`);
    const total = shares.reduce((sum, share) => sum + share.percent, 0);
    if (total !== 100) {
      context.addIssue({
        code: 'custom',
        message: `The shares add up to ${String(total)}%, not 100%`,
      });
    }
  });

/** Equal shares for the subjects, in 10% steps, any remainder going to the first subjects. */
export function equalBalance(subjects: readonly SubjectId[]): SubjectShare[] {
  const steps = 100 / BALANCE_STEP;
  const each = Math.floor(steps / subjects.length);
  const extra = steps - each * subjects.length;
  return subjects.map((subjectId, index) => ({
    subjectId,
    percent: (each + (index < extra ? 1 : 0)) * BALANCE_STEP,
  }));
}

/**
 * A child's balance over their subjects: the saved one if it is for exactly these subjects,
 * otherwise equal shares, as when a child moves to a band with other subjects.
 */
export function balanceFor(
  subjects: readonly SubjectId[],
  saved: readonly SubjectShare[] | undefined,
): SubjectShare[] {
  const fits =
    saved !== undefined &&
    saved.length === subjects.length &&
    subjects.every((subject) => saved.some((share) => share.subjectId === subject));
  return fits
    ? subjects.map(
        (subject) =>
          saved.find((share) => share.subjectId === subject) ?? { subjectId: subject, percent: 0 },
      )
    : equalBalance(subjects);
}

export const ChildSettings = z.object({
  childId: Uuidv7,
  ...PlaySettings.shape,
  ...TimeLimits.shape,
  /** Asked for before the profile opens on a shared device. Absent when there is none. */
  picturePin: PicturePin.optional(),
  /** How practice is shared between the child's subjects; equal shares until a parent sets it. */
  subjectBalance: SubjectBalance.optional(),
});

export const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  sound: true,
  music: true,
  voice: true,
  timers: true,
  reducedMotion: false,
  highContrast: false,
  dyslexiaFont: false,
  textScale: 1,
};

/** Every new child's time limits until a parent changes them (ADR 0026). */
export const DEFAULT_TIME_LIMITS: TimeLimits = {
  dailyLimitMinutes: 30,
  sessionMinutes: 10,
  breakReminderMinutes: 20,
};

/** A goal a parent sets, such as "focus on reading this month" (plan 4.3, 4.4). */
export const LearningGoal = z
  .object({
    id: Uuidv7,
    childId: Uuidv7,
    subjectId: SubjectId,
    /** A particular skill within the subject, if the goal is that narrow. */
    skillId: ContentId.optional(),
    createdAt: Timestamp,
    /** The last day the goal applies, in the child's time zone. Open-ended if absent. */
    endsOn: IsoDate.optional(),
  })
  .superRefine((goal, context) => {
    if (goal.endsOn !== undefined && goal.endsOn < goal.createdAt.slice(0, 10)) {
      context.addIssue({
        code: 'custom',
        message: 'A goal cannot end before it was set',
        path: ['endsOn'],
      });
    }
  });

export type ChildProfile = z.infer<typeof ChildProfile>;
export type ChildProfileInput = z.infer<typeof ChildProfileInput>;
export type TextScale = z.infer<typeof TextScale>;
export type PlaySettings = z.infer<typeof PlaySettings>;
export type TimeLimits = z.infer<typeof TimeLimits>;
export type ChildSettings = z.infer<typeof ChildSettings>;
export type SubjectShare = z.infer<typeof SubjectShare>;
export type SubjectBalance = z.infer<typeof SubjectBalance>;
export type PinPicture = z.infer<typeof PinPicture>;
export type PicturePin = z.infer<typeof PicturePin>;
export type LearningGoal = z.infer<typeof LearningGoal>;
