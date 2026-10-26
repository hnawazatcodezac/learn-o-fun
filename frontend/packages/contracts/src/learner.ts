import { z } from 'zod';
import { ContentId, Timestamp, Uuidv7 } from './common';

/**
 * Mastery statuses (plan 4.1). They describe skills, never children, and parent-facing text
 * for them uses growth language (CLAUDE.md rule 10).
 */
export const SKILL_STATUSES = [
  'not-started',
  'exploring',
  'building',
  'strong',
  'mastered',
  'review-due',
] as const;
export const SkillStatus = z.enum(SKILL_STATUSES);

/**
 * A child's ability, uncertainty, status and next review date for one skill: exactly one per
 * child and skill (plan 3.3). A projection, always rebuildable from the event log (CLAUDE.md
 * rule 3).
 */
export const SkillState = z
  .object({
    childId: Uuidv7,
    skillId: ContentId,
    /** Ability θ on the item-difficulty scale. */
    ability: z.number(),
    /** Uncertainty σ of the ability estimate. */
    uncertainty: z.number().positive(),
    status: SkillStatus,
    /** When a mastered skill is next reviewed (plan 4.1). */
    nextReviewAt: Timestamp.optional(),
    /** The policy version that produced this state. */
    policyVersion: z.string().min(1),
    updatedAt: Timestamp,
  })
  .superRefine((state, context) => {
    if ((state.status === 'mastered' || state.status === 'review-due') && !state.nextReviewAt) {
      context.addIssue({
        code: 'custom',
        message: `A ${state.status} skill has a review date`,
        path: ['nextReviewAt'],
      });
    }
  });

export type SkillStatus = z.infer<typeof SkillStatus>;
export type SkillState = z.infer<typeof SkillState>;
