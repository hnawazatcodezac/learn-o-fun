import { z } from 'zod';
import { ContentId, SemVer, Timestamp, Uuidv7 } from './common';
import { Mode } from './activity';
import { ItemResponse } from './items';

/**
 * Learning events: the append-only log that is the single source of truth (plan 5). They are
 * never updated or deleted (CLAUDE.md rule 3).
 */
export const EVENT_SCHEMA_VERSION = 1;

const envelope = {
  /** Created on the device, so retries are harmless (plan 5.4). */
  id: Uuidv7,
  sessionId: Uuidv7,
  /** Position within the session, from 0. Ingest orders events by it. */
  sequence: z.int().min(0),
  /** The device's clock, in UTC. */
  occurredAt: Timestamp,
  schemaVersion: z.literal(EVENT_SCHEMA_VERSION),
};

/**
 * Why an item is in the session (plan 4.2, 5.1). 'ending' is an easy item so the session ends on a
 * success (ADR 0022).
 */
export const ITEM_ROLES = [
  'target',
  'scaffold',
  'bridge',
  'review',
  're-ask',
  'warm-up',
  'ending',
] as const;
export const ItemRole = z.enum(ITEM_ROLES);

/** The support ladder so far on this item: encouragement and a retry, then a hint, then a worked example (plan 4.2). */
export const SUPPORT_LEVELS = ['none', 'encouragement', 'hint', 'worked-example'] as const;
export const SupportLevel = z.enum(SUPPORT_LEVELS);

/** Why play paused: 'break' is the break reminder (plan 8.7, ADR 0022). */
export const PAUSE_REASONS = ['backgrounded', 'navigated-away', 'parent-gate', 'break'] as const;
export const PauseReason = z.enum(PAUSE_REASONS);

/**
 * Why a session ended without completing: the child left, the daily limit was reached (8.7),
 * disengagement or a loop guard switched activity (4.2), or it was interrupted and expired (5.2).
 */
export const END_REASONS = [
  'child-left',
  'time-limit',
  'disengaged',
  'activity-switched',
  'expired',
] as const;
export const EndReason = z.enum(END_REASONS);

/** Three attempts is the ceiling on any item (plan 4.2). */
export const MAX_ATTEMPTS = 3;

export const SessionStarted = z.object({
  ...envelope,
  type: z.literal('session_started'),
  activityId: ContentId,
  gameId: ContentId,
  gameVersion: SemVer,
  contentRelease: z.string().min(1),
  mode: Mode,
  policyVersion: z.string().min(1),
});

export const ItemPresented = z.object({
  ...envelope,
  type: z.literal('item_presented'),
  itemId: ContentId,
  skillIds: z.array(ContentId).min(1),
  difficulty: z.number(),
  role: ItemRole,
});

export const ResponseSubmitted = z.object({
  ...envelope,
  type: z.literal('response_submitted'),
  itemId: ContentId,
  attempt: z.int().min(1).max(MAX_ATTEMPTS, { error: `Three attempts is the ceiling on any item` }),
  response: ItemResponse,
  /** Time to answer. It never affects mastery (plan 5.3). */
  latencyMs: z.int().min(0),
  support: SupportLevel,
});

export const HintShown = z.object({
  ...envelope,
  type: z.literal('hint_shown'),
  itemId: ContentId,
  level: z.int().min(1),
  misconceptionId: ContentId.optional(),
});

export const ExplanationShown = z.object({
  ...envelope,
  type: z.literal('explanation_shown'),
  itemId: ContentId,
  misconceptionId: ContentId.optional(),
});

export const ItemSkipped = z.object({
  ...envelope,
  type: z.literal('item_skipped'),
  itemId: ContentId,
});

export const SessionPaused = z.object({
  ...envelope,
  type: z.literal('session_paused'),
  reason: PauseReason,
});

export const SessionResumed = z.object({
  ...envelope,
  type: z.literal('session_resumed'),
  reason: PauseReason,
});

export const SessionCompleted = z.object({
  ...envelope,
  type: z.literal('session_completed'),
});

export const SessionEnded = z.object({
  ...envelope,
  type: z.literal('session_ended'),
  reason: EndReason,
});

/**
 * Typed game-specific telemetry, limited to the signals the game's manifest declares. Values are
 * numbers or true/false, so a signal can never carry free text (plan 5.1).
 */
export const GameSignal = z.object({
  ...envelope,
  type: z.literal('game_signal'),
  name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, { error: 'Expected a camelCase signal name' }),
  value: z.union([z.number(), z.boolean()], { error: 'A signal value is a number or true/false' }),
});

export const LearningEvent = z.discriminatedUnion('type', [
  SessionStarted,
  ItemPresented,
  ResponseSubmitted,
  HintShown,
  ExplanationShown,
  ItemSkipped,
  SessionPaused,
  SessionResumed,
  SessionCompleted,
  SessionEnded,
  GameSignal,
]);

/** What a device sends: a batch of events, ingested idempotently by event ID (plan 5.1, 5.4). */
export const MAX_BATCH_SIZE = 500;

export const EventBatch = z
  .object({
    events: z.array(LearningEvent).min(1).max(MAX_BATCH_SIZE),
  })
  .superRefine((batch, context) => {
    const seen = new Set<string>();
    const positions = new Set<string>();
    batch.events.forEach((event, index) => {
      if (seen.has(event.id)) {
        context.addIssue({
          code: 'custom',
          message: `Event ${event.id} appears more than once in the batch`,
          path: ['events', index, 'id'],
        });
      }
      seen.add(event.id);
      const position = `${event.sessionId}#${String(event.sequence)}`;
      if (positions.has(position)) {
        context.addIssue({
          code: 'custom',
          message: `Two events share sequence ${String(event.sequence)} in session ${event.sessionId}`,
          path: ['events', index, 'sequence'],
        });
      }
      positions.add(position);
    });
  });

export type ItemRole = z.infer<typeof ItemRole>;
export type SupportLevel = z.infer<typeof SupportLevel>;
export type PauseReason = z.infer<typeof PauseReason>;
export type EndReason = z.infer<typeof EndReason>;
export type LearningEvent = z.infer<typeof LearningEvent>;
export type LearningEventType = LearningEvent['type'];
export type EventBatch = z.infer<typeof EventBatch>;
