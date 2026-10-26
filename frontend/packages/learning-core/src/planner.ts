import type {
  Activity,
  EndReason,
  ExperienceBand,
  LearningGoal,
  ReasonEvidence,
  RecommendationReason,
  Skill,
  SkillGraph,
  SubjectShare,
  TodayCard,
} from '@learnofun/contracts';
import { successChance, type LearnerSkillState } from './learner-model';

/** The planner's version: stored with every card it plans (plan 4.4). */
export const PLANNER_VERSION = 'planner-1';

/** How one band weighs a candidate skill (plan 4.3); every number a starting default. */
export interface PlannerWeights {
  /** A review that is due, and more for each day overdue, up to `overdueDays`. */
  review: number;
  overdue: number;
  overdueDays: number;
  /** A skill the child is building, and more the closer it is to mastery. */
  building: number;
  /** A skill whose prerequisites are ready, and more the stronger they are. */
  frontier: number;
  readiness: number;
  /** A prerequisite of a skill that has stayed hard: a persistent gap or a loop guard. */
  gap: number;
  /** A skill in a parent's goal. */
  goal: number;
  /** The subject's share of the parent's balance, from 0 to 1, times this. */
  balance: number;
  /** Less for a subject already on Today, for variety. */
  sameSubject: number;
  /** Less for a skill already practised today. */
  practisedToday: number;
  /** More for a game the child finishes often, by its share of their recent sessions. */
  favourite: number;
}

export interface PlannerConfig {
  weights: Record<ExperienceBand, PlannerWeights>;
  /** At most this many new skills a day (plan 4.3: one for ages 3 to 5); no limit if absent. */
  newSkillsPerDay: Partial<Record<ExperienceBand, number>>;
  /** Favourites and recent mechanics come from this many days of sessions. */
  recentDays: number;
  /** Still Building after this many sessions on this many days, despite support, is a gap. */
  gapSessions: number;
  gapDays: number;
  /** A session the loop guard ended flags its skill for this many days (ADR 0032). */
  flagDays: number;
}

const WEIGHTS: PlannerWeights = {
  review: 3,
  overdue: 0.1,
  overdueDays: 14,
  building: 2,
  frontier: 2,
  readiness: 1,
  gap: 3,
  goal: 2,
  balance: 1,
  sameSubject: 0.5,
  practisedToday: 1,
  favourite: 0.5,
};

export const DEFAULT_PLANNER_CONFIG: PlannerConfig = {
  weights: { 'early-years': WEIGHTS, 'early-primary': WEIGHTS },
  newSkillsPerDay: { 'early-years': 1 },
  recentDays: 14,
  gapSessions: 3,
  gapDays: 2,
  flagDays: 7,
};

/** A session the planner learns from: what was played, when, and on which skills. */
export interface PlannerSession {
  activityId: string;
  startedAt: number;
  /** Completed, or ended early: a favourite is a game the child finishes. */
  finished: boolean;
  ended?: EndReason;
  /** The skills it gave first tries on. */
  skillIds: readonly string[];
}

/** Everything the planner reads (plan 4.3). Pure: the caller gathers it. */
export interface PlannerInput {
  band: ExperienceBand;
  now: number;
  /** The calendar day of a moment, in the child's time zone. */
  dayOf: (at: number) => string;
  /** The child's subjects, the parent's balance across them, and their skills. */
  subjects: readonly string[];
  balance: readonly SubjectShare[];
  skills: readonly Skill[];
  prerequisites: SkillGraph['prerequisites'];
  /** The learner model's states, by skill; a skill with none is not started. */
  states: ReadonlyMap<string, LearnerSkillState>;
  sessions: readonly PlannerSession[];
  /** The activities this child can play: their game in the release, their band, their plan. */
  activities: readonly Activity[];
  /** The goals that apply today. */
  goals: readonly LearningGoal[];
}

/** One planned card: its skill and activity, and why (plan 4.4). */
export interface PlannedCard {
  card: TodayCard;
  skillId: string;
  activityId: string;
  reasons: { code: RecommendationReason; evidence: ReasonEvidence }[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

type Kind = 'REVIEW_DUE' | 'KEEP_BUILDING' | 'FRONTIER_READY' | 'PREREQ_SUPPORT';

interface Candidate {
  skill: Skill;
  kind: Kind;
  score: number;
  relatedSkillId?: string;
  goalId?: string;
}

/** A subject's share of the parent's balance, from 0 to 1 (ADR 0027). */
const shareOf = (input: PlannerInput, subjectId: string) =>
  (input.balance.find((share) => share.subjectId === subjectId)?.percent ?? 0) / 100;
const statusOf = (input: PlannerInput, skillId: string) =>
  input.states.get(skillId)?.status ?? 'not-started';
const isMastered = (status: string) => status === 'mastered' || status === 'review-due';
const isStrong = (status: string) => status === 'strong' || isMastered(status);

/** Predicted success at a skill's mastery difficulty: how far along it is. */
function chanceAt(input: PlannerInput, skill: Skill): number {
  const state = input.states.get(skill.id);
  return state ? successChance(state.ability, skill.masteryDifficulty) : 0;
}

/**
 * The skills that have stayed hard (plan 4.3, ADR 0032): Building after enough sessions on
 * enough days, or flagged by the loop guard lately.
 */
function struggling(input: PlannerInput, config: PlannerConfig): Set<string> {
  const hard = new Set<string>();
  for (const skill of input.skills) {
    const status = statusOf(input, skill.id);
    const sessions = input.sessions.filter((s) => s.skillIds.includes(skill.id));
    const days = new Set(sessions.map((s) => input.dayOf(s.startedAt)));
    const flagged = sessions.some(
      (s) => s.ended === 'activity-switched' && input.now - s.startedAt <= config.flagDays * DAY_MS,
    );
    const stuck =
      (status === 'building' || status === 'exploring') &&
      sessions.length >= config.gapSessions &&
      days.size >= config.gapDays;
    if (flagged || stuck) hard.add(skill.id);
  }
  return hard;
}

/** Every skill worth a card, scored (plan 4.3: gather, then score). */
function candidates(input: PlannerInput, config: PlannerConfig): Candidate[] {
  const w = config.weights[input.band];
  const prerequisitesOf = (skillId: string) =>
    input.prerequisites
      .filter((edge) => edge.skillId === skillId)
      .map((edge) => edge.prerequisiteId);
  const skillById = new Map(input.skills.map((skill) => [skill.id, skill]));
  const hard = struggling(input, config);
  const today = input.dayOf(input.now);
  const practisedToday = new Set(
    input.sessions.filter((s) => input.dayOf(s.startedAt) === today).flatMap((s) => s.skillIds),
  );
  const found: Candidate[] = [];
  const add = (candidate: Candidate) => found.push(candidate);

  for (const skill of input.skills) {
    const status = statusOf(input, skill.id);
    const state = input.states.get(skill.id);
    if (status === 'review-due') {
      const overdue =
        state?.nextReviewAt === undefined ? 0 : (input.now - state.nextReviewAt) / DAY_MS;
      add({
        skill,
        kind: 'REVIEW_DUE',
        score: w.review + w.overdue * Math.min(w.overdueDays, Math.max(0, overdue)),
      });
    } else if (status === 'exploring' || status === 'building' || status === 'strong') {
      add({
        skill,
        kind: 'KEEP_BUILDING',
        score: w.building + w.readiness * chanceAt(input, skill),
      });
    } else if (status === 'not-started') {
      const prerequisites = prerequisitesOf(skill.id);
      if (prerequisites.every((id) => isStrong(statusOf(input, id)))) {
        // The prerequisite it builds on most: the one the child is surest of.
        const related = [...prerequisites].sort(
          (a, b) =>
            chanceAt(input, skillById.get(b) ?? skill) - chanceAt(input, skillById.get(a) ?? skill),
        )[0];
        const readiness =
          prerequisites.length === 0
            ? 0
            : Math.min(...prerequisites.map((id) => chanceAt(input, skillById.get(id) ?? skill)));
        add({
          skill,
          kind: 'FRONTIER_READY',
          score: w.frontier + w.readiness * readiness,
          ...(related ? { relatedSkillId: related } : {}),
        });
      }
    }
  }
  // A skill that stayed hard: practise a prerequisite that is not yet strong (plan 4.3).
  for (const skillId of hard) {
    for (const prerequisiteId of prerequisitesOf(skillId)) {
      const prerequisite = skillById.get(prerequisiteId);
      if (prerequisite && !isStrong(statusOf(input, prerequisiteId))) {
        add({ skill: prerequisite, kind: 'PREREQ_SUPPORT', score: w.gap, relatedSkillId: skillId });
      }
    }
  }

  return found.flatMap((candidate) => {
    const share = shareOf(input, candidate.skill.subjectId);
    // A subject the parent has set to nothing is not planned.
    if (share <= 0) return [];
    const goal = input.goals.find(
      (g) =>
        g.subjectId === candidate.skill.subjectId &&
        (g.skillId === undefined || g.skillId === candidate.skill.id),
    );
    return [
      {
        ...candidate,
        score:
          candidate.score +
          w.balance * share +
          (goal ? w.goal : 0) -
          (practisedToday.has(candidate.skill.id) ? w.practisedToday : 0),
        ...(goal ? { goalId: goal.id } : {}),
      },
    ];
  });
}

/**
 * Today's cards (plan 4.3, ADR 0032): a review, a new or frontier skill and a free choice, each
 * an activity the child can play and none on two cards. A review card with no review due takes
 * the best skill still building; a card with no playable activity goes to the next-best skill;
 * when the activities run out, Today has fewer cards. "Your choice" is the activity the child
 * finished most in the last days and not already on Today, or any other the child can play.
 * Every card carries its reasons and the evidence behind them. Pure and the same for the same
 * input.
 */
export function planToday(
  input: PlannerInput,
  config: PlannerConfig = DEFAULT_PLANNER_CONFIG,
): PlannedCard[] {
  const w = config.weights[input.band];
  const recent = input.sessions.filter(
    (s) => s.finished && input.now - s.startedAt <= config.recentDays * DAY_MS,
  );
  const gameOf = new Map(input.activities.map((a) => [a.id, a.gameId]));
  const plays = (activityId: string) => recent.filter((s) => s.activityId === activityId).length;
  const gamePlays = (gameId: string) =>
    recent.filter((s) => gameOf.get(s.activityId) === gameId).length;

  // At most so many new skills a day for the youngest (plan 4.3).
  const today = input.dayOf(input.now);
  const startedToday = new Set(
    input.skills
      .filter((skill) => {
        const days = input.sessions
          .filter((s) => s.skillIds.includes(skill.id))
          .map((s) => input.dayOf(s.startedAt))
          .sort();
        return days[0] === today;
      })
      .map((skill) => skill.id),
  );
  const limit = config.newSkillsPerDay[input.band];
  const allowNew = limit === undefined || startedToday.size < limit;

  const all = candidates(input, config).filter(
    (candidate) => allowNew || candidate.kind !== 'FRONTIER_READY',
  );
  const used = new Set<string>();
  const subjectsOnToday = new Set<string>();
  const cards: PlannedCard[] = [];

  /** The activity for a skill: playable, not on Today, a game not used lately for the skill. */
  const activityFor = (skillId: string): Activity | undefined => {
    const recentGames = new Set(
      recent.filter((s) => s.skillIds.includes(skillId)).map((s) => gameOf.get(s.activityId)),
    );
    return input.activities
      .filter((a) => a.targetSkillIds.includes(skillId) && !used.has(a.id))
      .sort(
        (a, b) =>
          Number(recentGames.has(a.gameId)) - Number(recentGames.has(b.gameId)) ||
          input.activities.indexOf(a) - input.activities.indexOf(b),
      )[0];
  };
  const scored = (candidate: Candidate, activity: Activity) =>
    candidate.score -
    (subjectsOnToday.has(candidate.skill.subjectId) ? w.sameSubject : 0) +
    w.favourite * (recent.length === 0 ? 0 : gamePlays(activity.gameId) / recent.length);

  /** The best candidate of these kinds that still has an activity, as a card. */
  const pick = (card: TodayCard, kinds: readonly Kind[]): boolean => {
    const ranked = all
      .filter((c) => kinds.includes(c.kind) && !cards.some((done) => done.skillId === c.skill.id))
      .flatMap((c) => {
        const activity = activityFor(c.skill.id);
        return activity ? [{ c, activity, score: scored(c, activity) }] : [];
      })
      .sort(
        (a, b) =>
          b.score - a.score || input.skills.indexOf(a.c.skill) - input.skills.indexOf(b.c.skill),
      );
    const best = ranked[0];
    if (!best) return false;
    const { c, activity } = best;
    used.add(activity.id);
    subjectsOnToday.add(c.skill.subjectId);
    cards.push({
      card,
      skillId: c.skill.id,
      activityId: activity.id,
      reasons: [
        {
          code: c.kind,
          evidence: c.relatedSkillId === undefined ? {} : { relatedSkillId: c.relatedSkillId },
        },
        ...(c.goalId === undefined
          ? []
          : [{ code: 'PARENT_GOAL' as const, evidence: { goalId: c.goalId } }]),
      ],
    });
    return true;
  };

  // The review card: a review due, else a skill still building or a prerequisite to support,
  // else the next-best skill.
  if (!pick('review', ['REVIEW_DUE']) && !pick('review', ['KEEP_BUILDING', 'PREREQ_SUPPORT'])) {
    pick('review', ['FRONTIER_READY']);
  }
  // The new card: a frontier skill, else the next-best skill.
  if (!pick('new', ['FRONTIER_READY'])) {
    pick('new', ['KEEP_BUILDING', 'PREREQ_SUPPORT', 'REVIEW_DUE']);
  }
  // "Your choice": a favourite not already on Today, else any other the child can play, for a
  // skill in a subject the parent has not set to nothing.
  const inBalance = (skillId: string) => {
    const skill = input.skills.find((s) => s.id === skillId);
    return skill !== undefined && shareOf(input, skill.subjectId) > 0;
  };
  const free = input.activities
    .filter((a) => !used.has(a.id) && a.targetSkillIds.some(inBalance))
    .sort(
      (a, b) =>
        plays(b.id) - plays(a.id) || input.activities.indexOf(a) - input.activities.indexOf(b),
    )[0];
  const freeSkill = free?.targetSkillIds.find(inBalance);
  if (free && freeSkill) {
    cards.push({
      card: 'free-choice',
      skillId: freeSkill,
      activityId: free.id,
      reasons: [{ code: 'FREE_CHOICE', evidence: {} }],
    });
  }
  return cards;
}
