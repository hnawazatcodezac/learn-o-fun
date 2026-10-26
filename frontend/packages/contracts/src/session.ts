import { z } from 'zod';
import { ContentId, SemVer, Timestamp, Uuidv7 } from './common';
import { Mode } from './activity';

/** Session status (plan 5.2). An interrupted session can resume on the same device for 24 hours. */
export const SESSION_STATUSES = [
  'in-progress',
  'completed',
  'ended-early',
  'interrupted',
  'expired',
] as const;
export const SessionStatus = z.enum(SESSION_STATUSES);

/**
 * One child playing one activity. It records the game version, content release and policy
 * version it ran on, so old sessions stay interpretable (plan 3.3, 3.4).
 */
export const LearningSession = z
  .object({
    /** Created on the device. */
    id: Uuidv7,
    childId: Uuidv7,
    activityId: ContentId,
    gameId: ContentId,
    gameVersion: SemVer,
    contentRelease: z.string().min(1),
    policyVersion: z.string().min(1),
    mode: Mode,
    status: SessionStatus,
    startedAt: Timestamp,
    endedAt: Timestamp.optional(),
  })
  .superRefine((session, context) => {
    if (session.status === 'in-progress' && session.endedAt !== undefined) {
      context.addIssue({
        code: 'custom',
        message: 'A session in progress has not ended',
        path: ['endedAt'],
      });
    }
    if (session.status !== 'in-progress' && session.endedAt === undefined) {
      const article = /^[aeiou]/.test(session.status) ? 'An' : 'A';
      context.addIssue({
        code: 'custom',
        message: `${article} ${session.status} session needs endedAt`,
        path: ['endedAt'],
      });
    }
    if (
      session.endedAt !== undefined &&
      Date.parse(session.endedAt) < Date.parse(session.startedAt)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'A session cannot end before it started',
        path: ['endedAt'],
      });
    }
  });

export type SessionStatus = z.infer<typeof SessionStatus>;
export type LearningSession = z.infer<typeof LearningSession>;
