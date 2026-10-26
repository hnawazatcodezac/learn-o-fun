import { z } from 'zod';
import { checkUnique, ContentId, LocalizedText, Market } from './common';
import { ExperienceBand } from './bands';

/**
 * Practice offers hints, retries and explanations. Challenge removes hints, allows one attempt
 * and gives every answer full evidence weight (plan 4.2).
 */
export const MODES = ['practice', 'challenge'] as const;
export const Mode = z.enum(MODES);

/** The plan tier an activity needs: the `activities.tier` entitlement (plan 9). */
export const TIERS = ['free', 'premium'] as const;
export const Tier = z.enum(TIERS);

export const ItemSource = z.discriminatedUnion('kind', [
  /** Items generated from a parametric template, endless and fresh (plan 6.5). */
  z.object({ kind: z.literal('template'), templateId: ContentId }),
  /** Items authored by hand. */
  z.object({ kind: z.literal('bank'), itemIds: z.array(ContentId).min(1) }),
]);

/**
 * A configured use of a game: what children play and the planner recommends (plan 3.3). New
 * activities need no new code.
 */
export const Activity = z
  .object({
    id: ContentId,
    gameId: ContentId,
    title: LocalizedText,
    targetSkillIds: z.array(ContentId).min(1),
    itemSource: ItemSource,
    modes: z.array(Mode).min(1),
    experienceBands: z.array(ExperienceBand).min(1),
    /** The artwork theme. */
    theme: ContentId.optional(),
    /** About how long one session of it takes, in whole minutes, for the Today card (ADR 0021). */
    minutes: z.number().int().min(1).max(30),
    tier: Tier,
    /** Markets where the activity is offered. Absent means every market. */
    markets: z.array(Market).min(1).optional(),
  })
  .superRefine((activity, context) => {
    checkUnique(activity.targetSkillIds, context, (id) => `Skill ${id}`, ['targetSkillIds']);
    checkUnique(activity.modes, context, (mode) => `Mode ${mode}`, ['modes']);
    checkUnique(activity.experienceBands, context, (band) => `Band ${band}`, ['experienceBands']);
  });

export type Mode = z.infer<typeof Mode>;
export type Tier = z.infer<typeof Tier>;
export type ItemSource = z.infer<typeof ItemSource>;
export type Activity = z.infer<typeof Activity>;
