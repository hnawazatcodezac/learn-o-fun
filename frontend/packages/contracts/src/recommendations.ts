import { z } from 'zod';
import { ContentId, Timestamp, Uuidv7 } from './common';

/**
 * Why the planner recommends something (plan 4.3, 4.4). The first four are the plan's; the
 * last three name planner candidates the plan describes: a skill still building, a gap found at
 * placement, and Today's free-choice card.
 */
export const RECOMMENDATION_REASONS = [
  'FRONTIER_READY',
  'REVIEW_DUE',
  'PREREQ_SUPPORT',
  'PARENT_GOAL',
  'KEEP_BUILDING',
  'PLACEMENT_GAP',
  'FREE_CHOICE',
] as const;
export const RecommendationReason = z.enum(RECOMMENDATION_REASONS);

/**
 * Why the in-session policy did what it did (plan 4.2, 4.4). DIFFICULTY_STEP is shown in session
 * detail. The placeholder policy uses the rest: the next item in order, a retry with
 * encouragement, a retry with a hint, a worked "show me", the end of the session, a warm-up item,
 * an easy item to end on a success, and the end because time is up (ADR 0022). RESUMED is not a
 * policy choice: the item that was on screen, shown again when a saved session carries on
 * (ADR 0023). The rest are plan 4.2's policy (ADR 0032): an item chosen for the success zone, a
 * scaffold from a prerequisite and the bridge back, a missed item asked again, a session ended on
 * an easy success by the loop guard, and a break offered when the child seems to have drifted.
 */
export const SESSION_REASONS = [
  'DIFFICULTY_STEP',
  'NEXT_IN_ORDER',
  'RETRY',
  'HINT',
  'SHOW_ME',
  'SESSION_COMPLETE',
  'WARM_UP',
  'END_ON_SUCCESS',
  'TIME_UP',
  'RESUMED',
  'SUCCESS_ZONE',
  'SCAFFOLD',
  'BRIDGE',
  'RE_ASK',
  'LOOP_GUARD',
  'BREAK_OFFERED',
] as const;
export const SessionReason = z.enum(SESSION_REASONS);

/** The three cards on Today: one review, one new or frontier skill, one free choice (plan 4.3). */
export const TODAY_CARDS = ['review', 'new', 'free-choice'] as const;
export const TodayCard = z.enum(TODAY_CARDS);

/** The evidence a parent-facing explanation is filled with (plan 4.4). */
export const ReasonEvidence = z
  .object({
    /** The skill a frontier skill builds on, or the prerequisite being practised. */
    relatedSkillId: ContentId.optional(),
    firstTryCorrect: z.int().min(0).optional(),
    firstTryTotal: z.int().min(0).optional(),
    sessionCount: z.int().min(0).optional(),
    masteredAt: Timestamp.optional(),
    goalId: Uuidv7.optional(),
  })
  .refine(
    (evidence) =>
      evidence.firstTryCorrect === undefined ||
      evidence.firstTryTotal === undefined ||
      evidence.firstTryCorrect <= evidence.firstTryTotal,
    { error: 'firstTryCorrect cannot exceed firstTryTotal', path: ['firstTryCorrect'] },
  );

/** One card on Today, with the reasons and evidence behind it. */
export const Recommendation = z
  .object({
    id: Uuidv7,
    childId: Uuidv7,
    card: TodayCard,
    skillId: ContentId,
    activityId: ContentId,
    reasons: z
      .array(z.object({ code: RecommendationReason, evidence: ReasonEvidence }))
      .min(1, { error: 'Every recommendation carries at least one reason' }),
    policyVersion: z.string().min(1),
    createdAt: Timestamp,
  })
  .superRefine((recommendation, context) => {
    const isFreeChoice = recommendation.reasons.some((reason) => reason.code === 'FREE_CHOICE');
    if ((recommendation.card === 'free-choice') !== isFreeChoice) {
      context.addIssue({
        code: 'custom',
        message: 'FREE_CHOICE explains the free-choice card, and only that card',
        path: ['reasons'],
      });
    }
  });

export type RecommendationReason = z.infer<typeof RecommendationReason>;
export type SessionReason = z.infer<typeof SessionReason>;
export type TodayCard = z.infer<typeof TodayCard>;
export type ReasonEvidence = z.infer<typeof ReasonEvidence>;
export type Recommendation = z.infer<typeof Recommendation>;
