import type {
  Activity,
  CatalogResponse,
  ExperienceBand,
  ItemTemplate,
  Mode,
  SkillState,
  Tier,
} from '@learnofun/contracts';
import type { Ability } from '@learnofun/learning-core';

/** Why a child cannot play an activity here. Children see none of these (ADR 0018). */
export type Unplayable =
  | 'unknown-activity'
  | 'not-in-release'
  | 'game-not-built'
  | 'not-for-band'
  | 'not-in-plan'
  | 'no-template';

export type Playability =
  | { playable: true; activity: Activity; template: ItemTemplate; contentRelease: string }
  | { playable: false; reason: Unplayable };

export interface PlayOptions {
  band: ExperienceBand;
  /** The games this app has, from the game registry. */
  gameIds: readonly string[];
  /** The activity tier the family's plan includes, from the child's snapshot. */
  activityTier: Tier;
}

/**
 * Whether a child can play an activity here, and what it needs: its game, in this content release
 * (ADR 0035) and in this app, its template, the child's band and the family's plan (plan 4.3). Today and the library show only playable
 * activities, so a child never sees locked content (ADR 0018).
 */
export function playability(
  catalog: CatalogResponse,
  activityId: string,
  { band, gameIds, activityTier }: PlayOptions,
): Playability {
  const activity = catalog.activities.find((candidate) => candidate.id === activityId);
  if (!activity) return { playable: false, reason: 'unknown-activity' };
  if (!catalog.games.includes(activity.gameId))
    return { playable: false, reason: 'not-in-release' };
  if (!gameIds.includes(activity.gameId)) return { playable: false, reason: 'game-not-built' };
  if (!activity.experienceBands.includes(band)) return { playable: false, reason: 'not-for-band' };
  if (activity.tier === 'premium' && activityTier !== 'premium') {
    return { playable: false, reason: 'not-in-plan' };
  }
  const { itemSource } = activity;
  const template =
    itemSource.kind === 'template'
      ? catalog.itemTemplates.find((candidate) => candidate.id === itemSource.templateId)
      : undefined;
  if (!template) return { playable: false, reason: 'no-template' };
  return { playable: true, activity, template, contentRelease: catalog.release };
}

/** The activities a child can play here, in catalog order. */
export function playableActivities(catalog: CatalogResponse, options: PlayOptions): Activity[] {
  return catalog.activities.filter(
    (activity) => playability(catalog, activity.id, options).playable,
  );
}

/**
 * The skill a session aims at, and the child's ability on it, where the policy starts (ADR 0032,
 * ADR 0036): the skill Today's card named, if the activity practises it; else the first of the
 * activity's skills the child has begun; else its first. A skill not begun has no ability yet,
 * and the policy starts from the learner model's own.
 */
export function sessionTarget(
  activity: Activity,
  states: readonly SkillState[],
  requested: string | null,
): { skillId: string; learner?: Ability } {
  const stateOf = (skillId: string) => states.find((state) => state.skillId === skillId);
  const skillId =
    activity.targetSkillIds.find((id) => id === requested) ??
    activity.targetSkillIds.find((id) => stateOf(id) !== undefined) ??
    activity.targetSkillIds[0] ??
    '';
  const state = stateOf(skillId);
  return state
    ? { skillId, learner: { ability: state.ability, uncertainty: state.uncertainty } }
    : { skillId };
}

/** The mode asked for, if the activity offers it; otherwise the activity's first mode. */
export function pickMode(activity: Activity, requested: string | null): Mode {
  return activity.modes.find((mode) => mode === requested) ?? activity.modes[0] ?? 'practice';
}
