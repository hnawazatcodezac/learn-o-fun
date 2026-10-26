import { z } from 'zod';
import { checkUnique, ContentId, IsoDate, SemVer, Timestamp, Uuidv7 } from './common';
import { Activity, Mode, Tier } from './activity';
import {
  BREAK_REMINDER_STEPS,
  ChildProfile,
  ChildProfileInput,
  ChildSettings,
  DAILY_LIMIT_STEPS,
  LearningGoal,
  PicturePin,
  SESSION_MINUTE_STEPS,
  SubjectBalance,
  TimeLimits,
} from './child';
import { Entitlements, Features } from './entitlements';
import { Family, FamilyRole, ParentAccount } from './family';
import { Misconception } from './items';
import { SkillState, SkillStatus } from './learner';
import { Recommendation, TODAY_CARDS } from './recommendations';
import { SessionStatus } from './session';
import { SkillGraph, SubjectId } from './skills';
import { ItemTemplates } from './templates';

/**
 * Request and response bodies for the API under `/api` (plan 2.2). The mock API (ADR 0001)
 * and, later, the real one both validate against these.
 */

export const API_ERROR_CODES = [
  'invalid-request',
  'unauthorized',
  'not-found',
  'forbidden',
  'conflict',
  'server-error',
] as const;

/** Every error response: a code, a readable message, and the problems with the request. */
export const ApiError = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string().min(1),
    problems: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  }),
});

/**
 * GET /api/catalog: the published skill graph, activities, item templates and misconceptions
 * (read-mostly, plan 2.2).
 */
export const CatalogResponse = z.object({
  release: z.string().min(1),
  /**
   * The games this content release includes. Only their activities are played or planned; the
   * catalog still lists the others, which past sessions may name (ADR 0035).
   */
  games: z
    .array(ContentId)
    .min(1)
    .superRefine((games, context) => {
      checkUnique(games, context, (game) => `Game ${game}`);
    }),
  skillGraph: SkillGraph,
  activities: z.array(Activity),
  itemTemplates: ItemTemplates,
  misconceptions: z.array(Misconception).superRefine((misconceptions, context) => {
    checkUnique(misconceptions, context, (misconception) => `Misconception ${misconception.id}`);
  }),
});

/**
 * Only what the child-mode profile picker needs: no birth date and no settings. It says whether a
 * profile has a picture PIN, but never the PIN (ADR 0018).
 */
export const ProfileSummary = ChildProfile.pick({
  id: true,
  nickname: true,
  avatarId: true,
}).extend({
  hasPicturePin: z.boolean(),
});

/** GET /api/device/profiles: the children who can play on this device in child mode. */
export const DeviceProfilesResponse = z.object({
  profiles: z.array(ProfileSummary),
});

/**
 * Who is signed in to the parent dashboard, and the families they belong to, with their role in
 * each (plan 8.1). POST /api/parent/session signs in and answers with it; DELETE signs out.
 */
export const ParentSessionResponse = z.object({
  account: ParentAccount,
  families: z
    .array(
      z.object({
        family: Family,
        role: FamilyRole,
        /** The owner's display name, for naming the family: families have no name of their own. */
        ownerName: z.string().min(1),
      }),
    )
    .min(1, { error: 'A parent account belongs to at least one family' }),
});

/** POST /api/parent/session: the mock sign-in, which picks an account (ADR 0025). */
export const ParentSignInRequest = z.object({ accountId: Uuidv7 });

/**
 * GET /api/parent/session: the session, or none when nobody is signed in. Signed out is an
 * answer, not an error, so a browser logs no failed request; the family endpoints answer 401
 * (ADR 0025).
 */
export const ParentSessionState = z.object({ session: ParentSessionResponse.nullable() });

/**
 * GET /api/parent/accounts: the accounts the mock sign-in offers (ADR 0025). The mock API only:
 * a real API never lists its accounts.
 */
export const MockAccountsResponse = z.object({
  accounts: z.array(ParentAccount.pick({ id: true, displayName: true })),
});

/**
 * GET /api/families/:familyId: one of the signed-in parent's families, for the dashboard. Another
 * family's is not found (CLAUDE.md rule 4).
 */
export const FamilyResponse = z.object({
  account: ParentAccount,
  family: Family,
  role: FamilyRole,
  children: z.array(ChildProfile),
  entitlements: Entitlements,
});

/**
 * POST /api/families/:familyId/children adds a child; PUT
 * /api/families/:familyId/children/:childId edits one (ADR 0026). Both take what a parent sets,
 * need an owner or guardian, and answer with the profile as saved.
 */
export const ChildProfileRequest = ChildProfileInput;
export const ChildProfileResponse = z.object({ child: ChildProfile });

/**
 * GET /api/families/:familyId/children/:childId/learning: what the dashboard's "Goals and time"
 * page shows for a child (ADR 0027): their subjects, from the market's band for their age; the
 * balance over them; the time limits; and the goal. No picture PIN: only child mode needs it.
 * The PUT and DELETE calls below answer with it too, as it now stands.
 */
export const ChildLearningResponse = z.object({
  child: ChildProfile,
  subjects: z.array(SubjectId).min(1),
  subjectBalance: SubjectBalance,
  timeLimits: TimeLimits,
  goal: LearningGoal.optional(),
});

/** PUT .../time-limits: one of the steps each, and a session no longer than the day. */
export const TimeLimitsRequest = z
  .object({
    sessionMinutes: z.literal(SESSION_MINUTE_STEPS),
    dailyLimitMinutes: z.literal(DAILY_LIMIT_STEPS),
    breakReminderMinutes: z.literal(BREAK_REMINDER_STEPS),
  })
  .refine((limits) => limits.sessionMinutes <= limits.dailyLimitMinutes, {
    error: 'A session is no longer than the day’s limit',
    path: ['sessionMinutes'],
  });

/** PUT .../subject-balance: a share for each of the child's subjects, and no other. */
export const SubjectBalanceRequest = z.object({ shares: SubjectBalance });

/**
 * PUT .../goal: a focus on one of the child's subjects. A skill in it, and the last day the goal
 * applies, need `goals.custom` (plan 9). It replaces the goal the child had; DELETE clears it.
 */
export const ChildGoalRequest = z.strictObject({
  subjectId: SubjectId,
  skillId: ContentId.optional(),
  endsOn: IsoDate.optional(),
});

/** What a child's first tries so far say about a skill, counted from the events (ADR 0028). */
export const SkillEvidenceSummary = z
  .object({
    firstTries: z.int().min(0),
    firstTriesCorrect: z.int().min(0),
    items: z.int().min(0),
    sessions: z.int().min(0),
    /** Below plan 4.1's minimum of evidence: the dashboard says "early signal". */
    earlySignal: z.boolean(),
  })
  .refine((evidence) => evidence.firstTriesCorrect <= evidence.firstTries, {
    error: 'firstTriesCorrect cannot exceed firstTries',
    path: ['firstTriesCorrect'],
  });

export const SkillProgress = z.object({
  skillId: ContentId,
  status: SkillStatus,
  evidence: SkillEvidenceSummary,
});

export const StrandProgress = z.object({
  strandId: ContentId,
  /** How many of the strand's skills are in each status, on every plan. */
  counts: z.array(z.object({ status: SkillStatus, count: z.int().min(1) })).min(1),
  /** Every skill, with its status and evidence: with `insights.detail` full only (plan 9). */
  skills: z.array(SkillProgress).optional(),
});

/**
 * GET /api/families/:familyId/children/:childId/progress: a child's progress in every skill of
 * their subjects, by strand, and Today's cards with the counts their reasons quote, worked out
 * from the events (ADR 0028). The API shapes it by `insights.detail`: with basic, a summary per
 * strand; with full, every skill too.
 */
export const ChildProgressResponse = z
  .object({
    child: ChildProfile,
    detail: Features.shape['insights.detail'],
    subjects: z
      .array(z.object({ subjectId: SubjectId, strands: z.array(StrandProgress).min(1) }))
      .min(1),
    today: z.array(Recommendation),
  })
  .superRefine((progress, context) => {
    progress.subjects.forEach((subject, subjectIndex) => {
      subject.strands.forEach((strand, strandIndex) => {
        if ((strand.skills !== undefined) !== (progress.detail === 'full')) {
          context.addIssue({
            code: 'custom',
            message:
              progress.detail === 'full'
                ? 'Full detail lists every skill'
                : 'Basic detail summarises a strand without its skills',
            path: ['subjects', subjectIndex, 'strands', strandIndex, 'skills'],
          });
        }
      });
    });
  });

/** How one question of a session went (ADR 0029). */
export const ITEM_OUTCOMES = [
  'first-try',
  'later-try',
  'with-hint',
  'shown-how',
  'not-yet',
  'skipped',
  'unanswered',
] as const;
export const ItemOutcome = z.enum(ITEM_OUTCOMES);

/**
 * One past session with plan 5.2's measures, from its events (ADR 0029). The headline is on
 * every plan: status, time on task and first-try accuracy. `detail` is with `insights.detail`
 * full only.
 */
export const SessionHistoryEntry = z.object({
  id: Uuidv7,
  activityId: ContentId,
  mode: Mode,
  startedAt: Timestamp,
  status: SessionStatus,
  /** Active play only: pauses and idle gaps over 30 seconds left out. */
  timeOnTaskSeconds: z.int().min(0),
  /** Items with at least one answer. */
  attempted: z.int().min(0),
  /** Right on the first answer with no help, out of `attempted`. */
  firstTryCorrect: z.int().min(0),
  detail: z
    .object({
      presented: z.int().min(0),
      skipped: z.int().min(0),
      unanswered: z.int().min(0),
      eventuallyCorrect: z.int().min(0),
      supported: z.int().min(0),
      learningCredit: z.int().min(0),
      items: z.array(
        z.object({ itemId: ContentId, skillIds: z.array(ContentId), outcome: ItemOutcome }),
      ),
    })
    .optional(),
});

/**
 * GET /api/families/:familyId/children/:childId/sessions: the child's sessions, newest first,
 * shaped by `insights.detail` (plan 9, ADR 0029). Game scores never appear (CLAUDE.md rule 9).
 */
export const ChildSessionsResponse = z
  .object({
    child: ChildProfile,
    detail: Features.shape['insights.detail'],
    sessions: z.array(SessionHistoryEntry),
  })
  .superRefine((history, context) => {
    history.sessions.forEach((session, index) => {
      if ((session.detail !== undefined) !== (history.detail === 'full')) {
        context.addIssue({
          code: 'custom',
          message:
            history.detail === 'full'
              ? 'Full detail carries every measure'
              : 'Basic detail carries the headline measures only',
          path: ['sessions', index, 'detail'],
        });
      }
      if (session.firstTryCorrect > session.attempted) {
        context.addIssue({
          code: 'custom',
          message: 'firstTryCorrect cannot exceed attempted',
          path: ['sessions', index, 'firstTryCorrect'],
        });
      }
    });
  });

/**
 * A child's play today, for the daily limit (plan 8.7, ADR 0022): a projection of the session
 * events, with today in the family's time zone.
 */
export const PlayToday = z.object({
  /** The day it is for, in the family's time zone. */
  date: IsoDate,
  /** Active play today, pauses left out. */
  playedSeconds: z.int().min(0),
  /** The daily limit, plus any more time a grown-up allowed today. */
  allowedSeconds: z.int().min(0),
});

/**
 * GET /api/children/:childId/snapshot: what a child-scoped device may read about one child,
 * so adaptation keeps working offline (plan 5.4, 8.1).
 */
export const ChildSnapshot = z.object({
  child: ChildProfile,
  settings: ChildSettings,
  playToday: PlayToday,
  skillStates: z.array(SkillState),
  /**
   * The activity tier the family's plan includes, so the device can hide what the child cannot
   * play without seeing billing (plan 4.3, 8.1; ADR 0018).
   */
  activityTier: Tier,
});

/**
 * POST /api/children/:childId/extra-time: a grown-up, past the parental gate, allows more play
 * today (ADR 0022). It answers with the day's play as it now stands.
 */
export const ExtraTimeRequest = z.object({ minutes: z.int().min(5).max(60) });

/** POST /api/device/profiles/:childId/unlock: checks a picture PIN entered in the picker. */
export const UnlockProfileRequest = z.object({ pin: PicturePin });

/** Whether the PIN matched. A profile without a PIN always opens. */
export const UnlockProfileResponse = z.object({ unlocked: z.boolean() });

/**
 * GET /api/children/:childId/today: Today's cards (plan 4.3): a review, a new skill and a free
 * choice, in that order, each its own activity. Fewer when there are not enough activities the
 * child can play (ADR 0035).
 */
export const TodayResponse = z.object({
  cards: z
    .array(Recommendation)
    .max(TODAY_CARDS.length, { error: 'Today has at most three cards' })
    .refine(
      (cards) =>
        cards.every(
          (card, index) =>
            index === 0 ||
            TODAY_CARDS.indexOf(cards[index - 1]?.card ?? card.card) <
              TODAY_CARDS.indexOf(card.card),
        ),
      { error: 'Today has at most one card of each kind: review, then new, then free choice' },
    )
    .refine((cards) => new Set(cards.map((card) => card.activityId)).size === cards.length, {
      error: 'No activity is on two cards',
    }),
});

/**
 * POST /api/sessions: start a session. The device creates the ID, so a retry returns the same
 * session instead of starting a second one.
 */
export const StartSessionRequest = z.object({
  id: Uuidv7,
  childId: Uuidv7,
  activityId: ContentId,
  gameId: ContentId,
  gameVersion: SemVer,
  contentRelease: z.string().min(1),
  policyVersion: z.string().min(1),
  mode: Mode,
  startedAt: Timestamp,
});

/** POST /api/events: how many events were new and how many were already stored. */
export const IngestResponse = z.object({
  accepted: z.int().min(0),
  duplicates: z.int().min(0),
});

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
export type ApiError = z.infer<typeof ApiError>;
export type CatalogResponse = z.infer<typeof CatalogResponse>;
export type ProfileSummary = z.infer<typeof ProfileSummary>;
export type DeviceProfilesResponse = z.infer<typeof DeviceProfilesResponse>;
export type FamilyResponse = z.infer<typeof FamilyResponse>;
export type ParentSessionResponse = z.infer<typeof ParentSessionResponse>;
export type ParentSessionState = z.infer<typeof ParentSessionState>;
export type ParentSignInRequest = z.infer<typeof ParentSignInRequest>;
export type MockAccountsResponse = z.infer<typeof MockAccountsResponse>;
export type ChildProfileRequest = z.infer<typeof ChildProfileRequest>;
export type ChildProfileResponse = z.infer<typeof ChildProfileResponse>;
export type ChildLearningResponse = z.infer<typeof ChildLearningResponse>;
export type TimeLimitsRequest = z.infer<typeof TimeLimitsRequest>;
export type SubjectBalanceRequest = z.infer<typeof SubjectBalanceRequest>;
export type ChildGoalRequest = z.infer<typeof ChildGoalRequest>;
export type SkillEvidenceSummary = z.infer<typeof SkillEvidenceSummary>;
export type SkillProgress = z.infer<typeof SkillProgress>;
export type StrandProgress = z.infer<typeof StrandProgress>;
export type ChildProgressResponse = z.infer<typeof ChildProgressResponse>;
export type ItemOutcome = z.infer<typeof ItemOutcome>;
export type SessionHistoryEntry = z.infer<typeof SessionHistoryEntry>;
export type ChildSessionsResponse = z.infer<typeof ChildSessionsResponse>;
export type PlayToday = z.infer<typeof PlayToday>;
export type ChildSnapshot = z.infer<typeof ChildSnapshot>;
export type ExtraTimeRequest = z.infer<typeof ExtraTimeRequest>;
export type TodayResponse = z.infer<typeof TodayResponse>;
export type StartSessionRequest = z.infer<typeof StartSessionRequest>;
export type IngestResponse = z.infer<typeof IngestResponse>;
export type UnlockProfileRequest = z.infer<typeof UnlockProfileRequest>;
export type UnlockProfileResponse = z.infer<typeof UnlockProfileResponse>;
