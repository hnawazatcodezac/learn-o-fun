import {
  RECOMMENDATION_REASONS,
  TODAY_CARDS,
  type Activity,
  type LearningGoal,
  type Skill,
  type SkillStatus,
  type SubjectShare,
} from '@learnofun/contracts';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { LearnerSkillState } from './learner-model';
import { planToday, PLANNER_VERSION, type PlannerInput, type PlannerSession } from './planner';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 22, 10);

const skill = (id: string, subjectId: string, masteryDifficulty = -1): Skill => ({
  id,
  subjectId: subjectId as Skill['subjectId'],
  strand: 'strand',
  title: { en: id },
  masteryDifficulty,
  uncertaintyThreshold: 0.35,
  broad: false,
  fluency: false,
});

/** Counting, then bonds, then adding and taking away, and making ten; and letter sounds. */
const SKILLS = [
  skill('count', 'mathematics'),
  skill('bonds', 'mathematics'),
  skill('add', 'mathematics', 0),
  skill('sub', 'mathematics', 0),
  skill('make-ten', 'mathematics', 0.5),
  skill('sounds', 'literacy', 0),
];
const PREREQUISITES = [
  { skillId: 'bonds', prerequisiteId: 'count' },
  { skillId: 'add', prerequisiteId: 'bonds' },
  { skillId: 'sub', prerequisiteId: 'bonds' },
  { skillId: 'make-ten', prerequisiteId: 'bonds' },
  { skillId: 'make-ten', prerequisiteId: 'add' },
];

const activity = (id: string, gameId: string, targetSkillIds: string[]): Activity => ({
  id,
  gameId,
  title: { en: id },
  targetSkillIds,
  itemSource: { kind: 'template', templateId: `${id}-template` },
  modes: ['practice'],
  experienceBands: ['early-years', 'early-primary'],
  minutes: 5,
  tier: 'free',
});
const ACTIVITIES = [
  activity('act-count', 'cafe', ['count']),
  activity('act-bonds', 'cafe', ['bonds']),
  activity('act-add', 'hop', ['add']),
  activity('act-sub', 'hop', ['sub']),
  activity('act-make-ten', 'cafe', ['make-ten']),
  activity('act-sounds', 'letters', ['sounds']),
];

const state = (
  skillId: string,
  status: SkillStatus,
  ability = 0,
  extra: Partial<LearnerSkillState> = {},
): [string, LearnerSkillState] => [
  skillId,
  { skillId, status, ability, uncertainty: 0.4, ...extra },
];

const session = (
  activityId: string,
  daysAgo: number,
  skillIds: string[],
  extra: Partial<PlannerSession> = {},
): PlannerSession => ({
  activityId,
  startedAt: NOW - daysAgo * DAY,
  finished: true,
  skillIds,
  ...extra,
});

const EVEN: SubjectShare[] = [
  { subjectId: 'mathematics', percent: 50 },
  { subjectId: 'literacy', percent: 50 },
];

const input = (change: Partial<PlannerInput> = {}): PlannerInput => ({
  band: 'early-primary',
  now: NOW,
  dayOf: (at) => new Date(at).toISOString().slice(0, 10),
  subjects: ['mathematics', 'literacy'],
  balance: EVEN,
  skills: SKILLS,
  prerequisites: PREREQUISITES,
  states: new Map(),
  sessions: [],
  activities: ACTIVITIES,
  goals: [],
  ...change,
});

/** A child who mastered counting, has bonds due for review, and plays the café most. */
const REVIEWING = input({
  states: new Map([
    state('count', 'mastered', 3),
    state('bonds', 'review-due', 2, { nextReviewAt: NOW - 2 * DAY }),
  ]),
  sessions: [session('act-count', 1, ['count']), session('act-count', 2, ['count'])],
});

const goal = (subjectId: string, skillId?: string): LearningGoal => ({
  id: '0192f4c1-0000-7000-8000-00000000d009',
  childId: '0192f4c1-0000-7000-8000-00000000c009',
  subjectId: subjectId as LearningGoal['subjectId'],
  ...(skillId ? { skillId } : {}),
  createdAt: '2026-10-01T18:00:00.000Z',
});

describe('planToday (plan 4.3, ADR 0032, ADR 0035)', () => {
  it('has a version', () => {
    expect(PLANNER_VERSION).toBe('planner-1');
  });

  it('plans a review due, a frontier skill and a favourite, each its own activity', () => {
    expect(planToday(REVIEWING)).toEqual([
      {
        card: 'review',
        skillId: 'bonds',
        activityId: 'act-bonds',
        reasons: [{ code: 'REVIEW_DUE', evidence: {} }],
      },
      {
        card: 'new',
        skillId: 'add',
        activityId: 'act-add',
        reasons: [{ code: 'FRONTIER_READY', evidence: { relatedSkillId: 'bonds' } }],
      },
      {
        card: 'free-choice',
        skillId: 'count',
        activityId: 'act-count',
        reasons: [{ code: 'FREE_CHOICE', evidence: {} }],
      },
    ]);
  });

  it('is the same every time for the same input', () => {
    expect(planToday(REVIEWING)).toEqual(planToday(REVIEWING));
  });

  it('puts a skill still building on the review card when no review is due', () => {
    const building = input({
      states: new Map([state('count', 'mastered', 3), state('bonds', 'building', 0)]),
    });
    const [review, fresh, free] = planToday(building);
    expect(review).toMatchObject({
      card: 'review',
      skillId: 'bonds',
      reasons: [{ code: 'KEEP_BUILDING', evidence: {} }],
    });
    // A first skill with no prerequisite is starting, building on nothing.
    expect(fresh).toMatchObject({
      card: 'new',
      skillId: 'sounds',
      reasons: [{ code: 'FRONTIER_READY', evidence: {} }],
    });
    // With no sessions yet, "Your choice" is the first other activity the child can play.
    expect(free).toMatchObject({ card: 'free-choice', activityId: 'act-count' });
  });

  it('gives a card whose skill has no activity here to the next-best skill', () => {
    const noBonds = { ...REVIEWING, activities: ACTIVITIES.filter((a) => a.id !== 'act-bonds') };
    const cards = planToday(noBonds);
    expect(cards.map((card) => card.skillId)).not.toContain('bonds');
    expect(cards[0]).toMatchObject({ card: 'review', skillId: 'add' });
  });

  it('never puts an activity on two cards, and shows fewer cards when they run out', () => {
    const one = { ...REVIEWING, activities: ACTIVITIES.filter((a) => a.id === 'act-bonds') };
    expect(planToday(one)).toEqual([
      {
        card: 'review',
        skillId: 'bonds',
        activityId: 'act-bonds',
        reasons: [{ code: 'REVIEW_DUE', evidence: {} }],
      },
    ]);
  });

  it('gives an activity for two skills to one card only', () => {
    const hop = activity('act-hop', 'hop', ['add', 'sub']);
    const cards = planToday({ ...REVIEWING, activities: [hop] });
    expect(cards).toEqual([
      {
        card: 'review',
        skillId: 'add',
        activityId: 'act-hop',
        reasons: [{ code: 'FRONTIER_READY', evidence: { relatedSkillId: 'bonds' } }],
      },
    ]);
  });

  it('adds a parent’s goal as a reason, and ranks its skills higher', () => {
    const literacy = planToday({ ...REVIEWING, goals: [goal('literacy')] });
    expect(literacy[1]).toEqual({
      card: 'new',
      skillId: 'sounds',
      activityId: 'act-sounds',
      reasons: [
        { code: 'FRONTIER_READY', evidence: {} },
        { code: 'PARENT_GOAL', evidence: { goalId: '0192f4c1-0000-7000-8000-00000000d009' } },
      ],
    });
    // A goal for one skill counts for that skill only.
    const sub = planToday({ ...REVIEWING, goals: [goal('mathematics', 'sub')] });
    expect(sub[1]).toMatchObject({ skillId: 'sub', reasons: [{}, { code: 'PARENT_GOAL' }] });
  });

  it('plans nothing in a subject the parent has set to nothing, “Your choice” included', () => {
    const mathsOnly: SubjectShare[] = [
      { subjectId: 'mathematics', percent: 100 },
      { subjectId: 'literacy', percent: 0 },
    ];
    const cards = planToday({
      ...REVIEWING,
      balance: mathsOnly,
      goals: [goal('literacy')],
      sessions: [1, 2, 3].map((daysAgo) => session('act-sounds', daysAgo, ['sounds'])),
    });
    expect(cards.map((card) => card.activityId)).not.toContain('act-sounds');
    expect(cards).toHaveLength(3);
  });

  it('practises a prerequisite of a skill that stays hard (plan 4.3)', () => {
    const states = new Map([
      state('count', 'mastered', 3),
      state('bonds', 'exploring', -0.5),
      state('add', 'building', -1),
    ]);
    // Building after 3 sessions on 2 days, despite support: a persistent gap.
    const stuck = [3, 3, 1].map((daysAgo) => session('act-add', daysAgo, ['add']));
    const supported = {
      card: 'review',
      skillId: 'bonds',
      activityId: 'act-bonds',
      reasons: [{ code: 'PREREQ_SUPPORT', evidence: { relatedSkillId: 'add' } }],
    };
    expect(planToday(input({ states, sessions: stuck }))[0]).toEqual(supported);
    // Or one session the loop guard ended, lately (ADR 0032).
    const guarded = [session('act-add', 1, ['add'], { ended: 'activity-switched' })];
    expect(planToday(input({ states, sessions: guarded }))[0]).toEqual(supported);
    // Not without either.
    expect(planToday(input({ states, sessions: guarded.slice(0, 0) }))[0]?.reasons[0]?.code).toBe(
      'KEEP_BUILDING',
    );
  });

  it('starts at most one new skill a day for ages 3 to 5', () => {
    const states = new Map([state('count', 'mastered', 3), state('bonds', 'exploring', 0)]);
    // Bonds was first practised today: today's new skill.
    const sessions = [session('act-bonds', 0, ['bonds'])];
    const codes = (band: PlannerInput['band']) =>
      planToday(input({ band, states, sessions })).flatMap((card) =>
        card.reasons.map((r) => r.code),
      );
    expect(codes('early-primary')).toContain('FRONTIER_READY');
    expect(codes('early-years')).not.toContain('FRONTIER_READY');
  });

  it('prefers a game the child has not used lately for the skill', () => {
    const states = new Map([state('count', 'mastered', 3), state('bonds', 'building', 0)]);
    const activities = [...ACTIVITIES, activity('act-bonds-hop', 'hop', ['bonds'])];
    const sessions = [session('act-bonds', 2, ['bonds'])];
    expect(planToday(input({ states, activities, sessions }))[0]).toMatchObject({
      skillId: 'bonds',
      activityId: 'act-bonds-hop',
    });
  });

  it('makes “Your choice” what the child finished most in the last 14 days', () => {
    const sessions = [
      session('act-sub', 3, []),
      session('act-sub', 4, []),
      session('act-sounds', 5, []),
      // Too long ago, or not finished: not a favourite.
      ...[20, 21, 22].map((daysAgo) => session('act-make-ten', daysAgo, [])),
      ...[1, 2, 3].map((daysAgo) => session('act-make-ten', daysAgo, [], { finished: false })),
    ];
    const free = planToday({ ...REVIEWING, sessions }).find((c) => c.card === 'free-choice');
    expect(free).toMatchObject({ activityId: 'act-sub', skillId: 'sub' });
  });

  describe('properties', () => {
    const statuses: SkillStatus[] = [
      'not-started',
      'exploring',
      'building',
      'strong',
      'mastered',
      'review-due',
    ];
    const world = fc.record({
      states: fc.array(
        fc.tuple(fc.constantFrom(...statuses), fc.double({ min: -3, max: 3, noNaN: true })),
        {
          minLength: SKILLS.length,
          maxLength: SKILLS.length,
        },
      ),
      sessions: fc.array(
        fc.record({
          activity: fc.constantFrom(...ACTIVITIES.map((a) => a.id)),
          daysAgo: fc.integer({ min: 0, max: 30 }),
          finished: fc.boolean(),
          guarded: fc.boolean(),
        }),
        { maxLength: 12 },
      ),
      // Real activities often practise two skills, as Hop Line does.
      playable: fc.subarray([...ACTIVITIES, activity('act-hop', 'hop', ['add', 'sub'])]),
      band: fc.constantFrom('early-years' as const, 'early-primary' as const),
      literacy: fc.constantFrom(0, 50, 100),
    });
    type World = typeof world extends fc.Arbitrary<infer T> ? T : never;
    const build = ({ states, sessions, playable, band, literacy }: World) =>
      input({
        band,
        states: new Map(
          SKILLS.flatMap((s, index) => {
            const [status, ability] = states[index] ?? ['not-started', 0];
            return status === 'not-started'
              ? []
              : [state(s.id, status, ability, { nextReviewAt: NOW - DAY })];
          }),
        ),
        sessions: sessions.map((s) => {
          const target = ACTIVITIES.find((a) => a.id === s.activity)?.targetSkillIds ?? [];
          return session(s.activity, s.daysAgo, target, {
            finished: s.finished,
            ...(s.guarded ? { ended: 'activity-switched' as const } : {}),
          });
        }),
        activities: playable,
        balance: [
          { subjectId: 'mathematics', percent: 100 - literacy },
          { subjectId: 'literacy', percent: literacy },
        ],
      });

    it('gives at most 3 cards, in order, each a different activity the child can play for its skill', () => {
      fc.assert(
        fc.property(world, (generated) => {
          const planned = build(generated);
          const cards = planToday(planned);
          expect(cards.length).toBeLessThanOrEqual(3);
          expect(new Set(cards.map((c) => c.card)).size).toBe(cards.length);
          expect(cards.map((c) => TODAY_CARDS.indexOf(c.card))).toEqual(
            cards.map((c) => TODAY_CARDS.indexOf(c.card)).sort(),
          );
          expect(new Set(cards.map((c) => c.activityId)).size).toBe(cards.length);
          for (const card of cards) {
            const playable = planned.activities.find((a) => a.id === card.activityId);
            expect(playable?.targetSkillIds).toContain(card.skillId);
            expect(card.reasons.length).toBeGreaterThan(0);
            for (const reason of card.reasons)
              expect(RECOMMENDATION_REASONS).toContain(reason.code);
            // FREE_CHOICE explains the free-choice card, and only that card.
            expect(card.reasons.some((r) => r.code === 'FREE_CHOICE')).toBe(
              card.card === 'free-choice',
            );
            // Nothing from a subject set to nothing.
            const subject = SKILLS.find((s) => s.id === card.skillId)?.subjectId;
            const share = planned.balance.find((b) => b.subjectId === subject)?.percent;
            expect(share).toBeGreaterThan(0);
          }
        }),
        { numRuns: 400 },
      );
    });

    it('is the same every time for the same input', () => {
      fc.assert(
        fc.property(world, (generated) => {
          expect(planToday(build(generated))).toEqual(planToday(build(generated)));
        }),
        { numRuns: 100 },
      );
    });
  });
});
