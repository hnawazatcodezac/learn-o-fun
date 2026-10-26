import {
  ageInMonth,
  ApiError,
  balanceFor,
  bandForAge,
  CatalogResponse,
  ChildGoalRequest,
  ChildLearningResponse,
  ChildProfile,
  ChildProgressResponse,
  ChildSessionsResponse,
  ChildProfileRequest,
  ChildProfileResponse,
  ChildSettings,
  ChildSnapshot,
  DEFAULT_PLAY_SETTINGS,
  DEFAULT_TIME_LIMITS,
  DeviceProfilesResponse,
  EventBatch,
  ExtraTimeRequest,
  FamilyResponse,
  IngestResponse,
  LearningGoal,
  LearningSession,
  MarketConfig,
  MockAccountsResponse,
  ParentSessionResponse,
  ParentSessionState,
  ParentSignInRequest,
  PlaySettings,
  PlayToday,
  PROFILE_AGES,
  SKILL_STATUSES,
  StartSessionRequest,
  SubjectBalanceRequest,
  TimeLimitsRequest,
  TodayResponse,
  UnlockProfileRequest,
  UnlockProfileResponse,
  type ApiErrorCode,
  type ChildProfileInput,
  type Entitlements,
  type Family,
  type FamilyRole,
  type ParentAccount,
  type Recommendation,
  type SkillState,
} from '@learnofun/contracts';
import {
  DEFAULT_EVIDENCE_CONFIG,
  DEFAULT_LEARNER_CONFIG,
  deriveSeed,
  LEARNER_MODEL_VERSION,
  noEvidence,
  observations,
  PLANNER_VERSION,
  planToday,
  seedRandom,
  sessionMeasures,
  skillEvidence,
  skillState,
  uuidv7,
  type LearnerSkillState,
  type SkillEvidence,
} from '@learnofun/learning-core';
import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import { SLOW_MS, type MockControls } from './controls';
import type { MockDatabase } from './database';
import { localDate, playToday } from './play-today';
import { mayDo, type FamilyAction } from './policy';

/** A request a check refused, with the answer to send. */
interface Refused {
  response: Response;
}

/** A signed-in parent's place in one of their families, which they may act on. */
interface Access {
  account: ParentAccount;
  family: Family;
  role: FamilyRole;
  ownerName: string;
  entitlements: Entitlements;
}

interface HandlerOptions {
  db: MockDatabase;
  /** Read on every request, so a change applies to the next one. */
  controls: () => MockControls;
  /** The time now, for today's play (ADR 0022); tests pass their own. */
  now?: () => number;
  /** A new UUIDv7 for a record the API creates, such as a child; tests pass their own. */
  newId?: () => string;
}

/** A fresh seed for the IDs the mock API makes, as a server uses its own random source. */
function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

/** Matches the path on any origin, so the handlers work in the browser and in Node tests. */
const route = (path: string) => `*/api${path}`;

/** True only when a browser reports it is offline. Node has no `navigator.onLine`. */
function isDeviceOffline(): boolean {
  return typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine;
}

function fail(
  status: number,
  code: ApiErrorCode,
  message: string,
  problems?: { path: string; message: string }[],
) {
  return HttpResponse.json(
    ApiError.parse({ error: { code, message, ...(problems ? { problems } : {}) } }),
    { status },
  );
}

/** Every response is checked against its contract, so the mock can never drift from it. */
function respond<T>(schema: z.ZodType<T>, body: T, status = 200) {
  return HttpResponse.json(schema.parse(body) as never, { status });
}

function problemsOf(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

async function readBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ value: T } | { response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { response: fail(400, 'invalid-request', 'The request body is not JSON') };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return {
      response: fail(
        400,
        'invalid-request',
        'The request does not match its contract',
        problemsOf(result.error),
      ),
    };
  }
  return { value: result.data };
}

/** The mock API's endpoints under `/api` (plan 2.2), with the failure modes from the controls. */
export function createHandlers({
  db,
  controls,
  now = () => Date.now(),
  newId = () => uuidv7(now(), seedRandom(randomSeed()))[0],
}: HandlerOptions) {
  /** Applies the latency and failure controls. Returns a response if the request should fail. */
  async function interrupt(): Promise<Response | undefined> {
    const { latency, failure } = controls();
    if (latency === 'slow') await delay(SLOW_MS);
    // A real outage, or the device itself being offline, is a network error: no response at all.
    if (failure === 'offline' || isDeviceOffline()) return HttpResponse.error();
    if (failure === 'server-error') {
      return fail(500, 'server-error', 'The mock API is set to fail (development controls)');
    }
    return undefined;
  }

  const childOf = (childId: string) => db.state.children.find((child) => child.id === childId);
  const noChild = (childId: string) => fail(404, 'not-found', `No child ${childId}`);
  /** Today's play for a child with settings, from the event log (ADR 0022). */
  const playTodayOf = (child: { id: string; timeZone: string }, dailyLimitMinutes: number) =>
    playToday({
      childId: child.id,
      timeZone: child.timeZone,
      dailyLimitMinutes,
      sessions: db.state.sessions,
      events: db.state.events,
      grants: db.state.timeGrants,
      now: now(),
    });
  /** The signed-in parent and their families, or undefined when nobody is signed in. */
  const sessionOf = () => {
    const account = db.state.accounts.find((a) => a.id === db.state.signedInAccountId);
    if (!account) return undefined;
    const families = db.state.families.flatMap((family) => {
      const member = family.members.find((m) => m.accountId === account.id);
      const ownerId = family.members.find((m) => m.role === 'owner')?.accountId;
      const ownerName = db.state.accounts.find((a) => a.id === ownerId)?.displayName;
      return member && ownerName ? [{ family, role: member.role, ownerName }] : [];
    });
    return families.length > 0 ? { account, families } : undefined;
  };
  const signedOut = () => fail(401, 'unauthorized', 'Nobody is signed in');
  /**
   * The signed-in parent's place in a family, if their role may do the action there (plan 8.1).
   * Signed out is 401; another family is not found, as if it did not exist (CLAUDE.md rule 4); a
   * role that may not is 403. Every family endpoint asks here.
   */
  const familyAccess = (familyId: string, action: FamilyAction): Access | Refused => {
    const signedIn = sessionOf();
    if (!signedIn) return { response: signedOut() };
    const membership = signedIn.families.find(({ family }) => family.id === familyId);
    const entitlements = db.state.entitlements.find((e) => e.familyId === familyId);
    if (!membership || !entitlements) {
      return { response: fail(404, 'not-found', `No family ${familyId}`) };
    }
    if (!mayDo(membership.role, action)) {
      return { response: fail(403, 'forbidden', `A ${membership.role} cannot ${action} here`) };
    }
    return { ...membership, account: signedIn.account, entitlements };
  };
  const childrenOf = (familyId: string) =>
    db.state.children.filter((child) => child.familyId === familyId);
  const marketOf = (family: Family) => db.markets.find((m) => m.market === family.market);
  /** This month in a time zone, as ages are counted: in the family's zone. */
  const monthIn = (timeZone: string) => {
    const [year = 0, month = 0] = localDate(now(), timeZone).split('-').map(Number);
    return { year, month };
  };
  /**
   * What does not fit a family in a profile: its market's languages and grades, and, when the
   * birth month and year are new, the ages of this release, today in the family's zone (ADR 0026).
   */
  const profileProblems = (input: ChildProfileInput, family: Family, checkAge: boolean) => {
    const market = marketOf(family);
    if (!market) return [{ path: '', message: `Market ${family.market} has no config` }];
    const problems: { path: string; message: string }[] = [];
    if (!market.learningLanguages.includes(input.learningLanguage)) {
      problems.push({
        path: 'learningLanguage',
        message: `${input.learningLanguage} is not offered in ${market.market}`,
      });
    }
    if (input.grade !== undefined && !market.gradeScheme.grades.some((g) => g.id === input.grade)) {
      problems.push({
        path: 'grade',
        message: `Grade ${input.grade} is not in ${market.gradeScheme.id}`,
      });
    }
    if (checkAge) {
      const age = ageInMonth(input, monthIn(family.timeZone));
      if (age < PROFILE_AGES.min || age > PROFILE_AGES.max) {
        problems.push({
          path: 'birthYear',
          message: `Profiles are for ages ${String(PROFILE_AGES.min)} to ${String(PROFILE_AGES.max)}; this is ${String(age)}`,
        });
      }
    }
    return problems;
  };
  const misfit = (problems: { path: string; message: string }[]) =>
    fail(400, 'invalid-request', 'The profile does not fit this family', problems);
  /** A child of a family whose parent may do the action, or the answer that refuses. */
  const familyChild = (
    familyId: string,
    childId: string,
    action: FamilyAction,
  ): (Access & { child: ChildProfile }) | Refused => {
    const access = familyAccess(familyId, action);
    if ('response' in access) return access;
    const child = childOf(childId);
    if (!child || child.familyId !== access.family.id) return { response: noChild(childId) };
    return { ...access, child };
  };
  /**
   * What the "Goals and time" page shows (ADR 0027): the subjects of the market's band for the
   * child's age, the balance over them, the time limits and the goal.
   */
  const learningOf = (child: ChildProfile, family: Family) => {
    const market = marketOf(family);
    const settings = db.state.settings.find((s) => s.childId === child.id);
    if (!market || !settings) return undefined;
    const { subjects } = bandForAge(market, ageInMonth(child, monthIn(family.timeZone)));
    const { dailyLimitMinutes, sessionMinutes, breakReminderMinutes } = settings;
    const goal = db.state.goals.find((g) => g.childId === child.id);
    return {
      child,
      subjects,
      subjectBalance: balanceFor(subjects, settings.subjectBalance),
      timeLimits: { dailyLimitMinutes, sessionMinutes, breakReminderMinutes },
      ...(goal ? { goal } : {}),
    };
  };
  const learningResponse = (child: ChildProfile, family: Family) => {
    const learning = learningOf(child, family);
    return learning ? respond(ChildLearningResponse, learning) : noChild(child.id);
  };
  /** The events of a child's sessions, scripted and played, in the log's order. */
  const eventsOf = (childId: string) => {
    const sessions = new Set(
      db.state.sessions.filter((s) => s.childId === childId).map((s) => s.id),
    );
    return db.state.events.filter((event) => sessions.has(event.sessionId));
  };
  /** What the evidence needs beyond the events: each session's activity and its targets. */
  const contextOf = () => {
    const sessions = new Map(db.state.sessions.map((s) => [s.id, s]));
    const activities = new Map(db.catalog.activities.map((a) => [a.id, a]));
    const activityOf = (sessionId: string) => sessions.get(sessionId)?.activityId;
    return {
      itemOf: (id: string) => db.itemOf(id),
      activityOf,
      targetSkillsOf: (sessionId: string) =>
        activities.get(activityOf(sessionId) ?? '')?.targetSkillIds ?? [],
    };
  };
  /**
   * A child's skill states, worked out from their events by the learner model, the same every
   * time: a projection, never stored (CLAUDE.md rule 3, ADR 0031). Days count in the child's zone.
   */
  const learnerStatesOf = (child: ChildProfile): LearnerSkillState[] => {
    const found = observations(eventsOf(child.id), contextOf());
    return db.catalog.skillGraph.skills
      .filter((skill) => found.some((o) => o.skillId === skill.id))
      .map((skill) =>
        skillState(skill, found, now(), DEFAULT_LEARNER_CONFIG, {
          dayOf: (at) => localDate(at, child.timeZone),
        }),
      );
  };
  /** The learner states as the contract's skill states, for the device's snapshot. */
  const skillStatesOf = (child: ChildProfile): SkillState[] =>
    learnerStatesOf(child).map((state) => ({
      childId: child.id,
      skillId: state.skillId,
      ability: state.ability,
      uncertainty: state.uncertainty,
      status: state.status,
      ...(state.nextReviewAt === undefined
        ? {}
        : { nextReviewAt: new Date(state.nextReviewAt).toISOString() }),
      policyVersion: LEARNER_MODEL_VERSION,
      updatedAt: new Date(state.updatedAt ?? now()).toISOString(),
    }));
  /**
   * A Today card with what its reasons quote worked out from the events (ADR 0028, ADR 0031):
   * the counts, and when a skill to review was mastered.
   */
  const withEvidence = (
    recommendation: Recommendation,
    evidence: ReadonlyMap<string, SkillEvidence>,
    states: ReadonlyMap<string, LearnerSkillState>,
  ): Recommendation => ({
    ...recommendation,
    reasons: recommendation.reasons.map((reason) => {
      const skillId =
        reason.code === 'FRONTIER_READY' || reason.code === 'PREREQ_SUPPORT'
          ? reason.evidence.relatedSkillId
          : reason.code === 'KEEP_BUILDING'
            ? recommendation.skillId
            : undefined;
      const masteredAt = states.get(recommendation.skillId)?.masteredAt;
      if (reason.code === 'REVIEW_DUE' && masteredAt !== undefined) {
        return {
          ...reason,
          evidence: { ...reason.evidence, masteredAt: new Date(masteredAt).toISOString() },
        };
      }
      const found = skillId === undefined ? undefined : evidence.get(skillId);
      if (!found) return reason;
      return {
        ...reason,
        evidence: {
          ...reason.evidence,
          firstTryCorrect: found.firstTriesCorrect,
          firstTryTotal: found.firstTries,
          sessionCount: found.sessions,
        },
      };
    }),
  });
  /**
   * Today's cards, planned from the child's skill states and sessions (plan 4.3, ADR 0035), in
   * activities the child can play, as the app judges it: their game in this release, their band,
   * the family's plan, and a template to make their items from (ADR 0032). The
   * same for the same events and day, and planned again after every session. A card's ID is seeded
   * by the child, the day and what it holds, so it keeps its ID while it stays the same.
   */
  const todayOf = (child: ChildProfile, family: Family): Recommendation[] => {
    const learning = learningOf(child, family);
    const market = marketOf(family);
    if (!learning || !market) return [];
    const { band } = bandForAge(market, ageInMonth(child, monthIn(family.timeZone)));
    const tier =
      db.state.entitlements.find((e) => e.familyId === family.id)?.features['activities.tier'] ??
      'free';
    const { skillGraph, activities, games, itemTemplates } = db.catalog;
    const dayOf = (at: number) => localDate(at, child.timeZone);
    const today = dayOf(now());
    const found = observations(eventsOf(child.id), contextOf());
    const endedBecause = new Map(
      db.state.events.flatMap((event) =>
        event.type === 'session_ended' ? [[event.sessionId, event.reason] as const] : [],
      ),
    );
    const { goal } = learning;
    const hasItems = ({ itemSource }: (typeof activities)[number]) =>
      itemSource.kind === 'template' &&
      itemTemplates.some((template) => template.id === itemSource.templateId);
    const cards = planToday({
      band,
      now: now(),
      dayOf,
      subjects: learning.subjects,
      balance: learning.subjectBalance,
      skills: skillGraph.skills.filter(
        (skill) =>
          learning.subjects.includes(skill.subjectId) &&
          (skill.learningLanguage === undefined ||
            skill.learningLanguage === child.learningLanguage),
      ),
      prerequisites: skillGraph.prerequisites,
      states: new Map(learnerStatesOf(child).map((state) => [state.skillId, state])),
      sessions: db.state.sessions
        .filter((session) => session.childId === child.id)
        .map((session) => {
          const ended = endedBecause.get(session.id);
          return {
            activityId: session.activityId,
            startedAt: Date.parse(session.startedAt),
            finished: session.status === 'completed' || session.status === 'ended-early',
            ...(ended ? { ended } : {}),
            skillIds: [
              ...new Set(found.filter((o) => o.sessionId === session.id).map((o) => o.skillId)),
            ],
          };
        }),
      activities: activities.filter(
        (activity) =>
          games.includes(activity.gameId) &&
          activity.experienceBands.includes(band) &&
          (activity.tier === 'free' || tier === 'premium') &&
          hasItems(activity),
      ),
      goals: goal && (goal.endsOn === undefined || goal.endsOn >= today) ? [goal] : [],
    });
    const dayStart = Date.parse(`${today}T00:00:00.000Z`);
    return cards.map((card) => ({
      id: uuidv7(
        dayStart,
        seedRandom(
          deriveSeed(0, [child.id, today, card.card, card.skillId, card.activityId].join(':')),
        ),
      )[0],
      childId: child.id,
      ...card,
      policyVersion: PLANNER_VERSION,
      createdAt: new Date(now()).toISOString(),
    }));
  };
  /**
   * A child's progress in every skill of their subjects, by strand, shaped by the plan's
   * insights.detail (plan 9), and Today's cards with their evidence (ADR 0028). Answers are
   * graded again here, from items the scripts made or the templates rebuild.
   */
  const progressOf = (child: ChildProfile, family: Family, detail: 'basic' | 'full') => {
    const subjects = learningOf(child, family)?.subjects;
    if (!subjects) return undefined;
    const context = contextOf();
    const evidence = skillEvidence(
      eventsOf(child.id),
      context.itemOf,
      DEFAULT_EVIDENCE_CONFIG,
      context,
    );
    const states = new Map(learnerStatesOf(child).map((state) => [state.skillId, state]));
    const statuses = new Map([...states].map(([skillId, state]) => [skillId, state.status]));
    const { strands, skills } = db.catalog.skillGraph;
    return {
      child,
      detail,
      subjects: subjects.map((subjectId) => ({
        subjectId,
        strands: strands
          .filter((strand) => strand.subjectId === subjectId)
          .flatMap((strand) => {
            const rows = skills
              .filter(
                (skill) =>
                  skill.strand === strand.id &&
                  (skill.learningLanguage === undefined ||
                    skill.learningLanguage === child.learningLanguage),
              )
              .map((skill) => ({
                skillId: skill.id,
                status: statuses.get(skill.id) ?? ('not-started' as const),
                evidence: evidence.get(skill.id) ?? noEvidence(skill.id),
              }));
            if (rows.length === 0) return [];
            const counts = SKILL_STATUSES.flatMap((status) => {
              const count = rows.filter((row) => row.status === status).length;
              return count > 0 ? [{ status, count }] : [];
            });
            return [
              { strandId: strand.id, counts, ...(detail === 'full' ? { skills: rows } : {}) },
            ];
          }),
      })),
      today: todayOf(child, family).map((r) => withEvidence(r, evidence, states)),
    };
  };
  /**
   * A child's sessions, newest first, with plan 5.2's measures from their events, graded again
   * (ADR 0029). The headline on every plan; every measure and each question with full detail.
   */
  const historyOf = (child: ChildProfile, detail: 'basic' | 'full') => ({
    child,
    detail,
    sessions: db.state.sessions
      .filter((session) => session.childId === child.id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      .map((session) => {
        const measures = sessionMeasures(
          db.state.events.filter((event) => event.sessionId === session.id),
          (id) => db.itemOf(id),
          now(),
        );
        return {
          id: session.id,
          activityId: session.activityId,
          mode: session.mode,
          startedAt: session.startedAt,
          status: measures.status,
          timeOnTaskSeconds: Math.round(measures.timeOnTaskMs / 1000),
          attempted: measures.attempted,
          firstTryCorrect: measures.firstTryCorrect,
          ...(detail === 'full'
            ? {
                detail: {
                  presented: measures.presented,
                  skipped: measures.skipped,
                  unanswered: measures.unanswered,
                  eventuallyCorrect: measures.eventuallyCorrect,
                  supported: measures.supported,
                  learningCredit: measures.learningCredit,
                  items: measures.items,
                },
              }
            : {}),
        };
      }),
  });
  const updateSettings = (childId: string, change: Partial<ChildSettings>) => {
    db.update((state) => {
      state.settings = state.settings.map((s) => (s.childId === childId ? { ...s, ...change } : s));
    });
  };
  const pinOf = (childId: string) =>
    db.state.settings.find((settings) => settings.childId === childId)?.picturePin;

  return [
    http.get(
      route('/catalog'),
      async () => (await interrupt()) ?? respond(CatalogResponse, db.catalog),
    ),

    // A device in child mode lists who can play here, with no more than the picker needs.
    http.get(route('/device/profiles'), async () => {
      const failed = await interrupt();
      if (failed) return failed;
      // This device belongs to the first family until devices are paired (ADR 0025).
      const deviceFamily = db.state.families[0]?.id;
      return respond(DeviceProfilesResponse, {
        profiles: db.state.children
          .filter((child) => child.familyId === deviceFamily)
          .map(({ id, nickname, avatarId }) => ({
            id,
            nickname,
            avatarId,
            hasPicturePin: pinOf(id) !== undefined,
          })),
      });
    }),

    // The picker checks an entered picture PIN here, so the device never holds a sibling's PIN
    // (ADR 0018). A wrong PIN is an answer, not an error.
    http.post(route('/device/profiles/:childId/unlock'), async ({ params, request }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const childId = String(params.childId);
      if (!childOf(childId)) return noChild(childId);
      const body = await readBody(request, UnlockProfileRequest);
      if ('response' in body) return body.response;
      const pin = pinOf(childId);
      const unlocked = pin === undefined || pin.join(' ') === body.value.pin.join(' ');
      return respond(UnlockProfileResponse, { unlocked });
    }),

    // The mock sign-in (ADR 0025): the accounts to sign in as. A real API never lists these.
    http.get(route('/parent/accounts'), async () => {
      const failed = await interrupt();
      if (failed) return failed;
      return respond(MockAccountsResponse, {
        accounts: db.state.accounts.map(({ id, displayName }) => ({ id, displayName })),
      });
    }),

    http.get(route('/parent/session'), async () => {
      const failed = await interrupt();
      if (failed) return failed;
      return respond(ParentSessionState, { session: sessionOf() ?? null });
    }),

    http.post(route('/parent/session'), async ({ request }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const body = await readBody(request, ParentSignInRequest);
      if ('response' in body) return body.response;
      const { accountId } = body.value;
      if (!db.state.accounts.some((account) => account.id === accountId)) {
        return fail(400, 'invalid-request', 'No such account', [
          { path: 'accountId', message: `No account ${accountId}` },
        ]);
      }
      db.update((state) => {
        state.signedInAccountId = accountId;
      });
      const signedIn = sessionOf();
      return signedIn ? respond(ParentSessionResponse, signedIn) : signedOut();
    }),

    http.delete(route('/parent/session'), async () => {
      const failed = await interrupt();
      if (failed) return failed;
      db.update((state) => {
        delete state.signedInAccountId;
      });
      return new HttpResponse(null, { status: 204 });
    }),

    // One of the signed-in parent's families. Another family's is simply not found, so the answer
    // does not even say whether it exists (CLAUDE.md rule 4).
    http.get(route('/families/:familyId'), async ({ params }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const access = familyAccess(String(params.familyId), 'read-family');
      if ('response' in access) return access.response;
      const { account, family, role, entitlements } = access;
      return respond(FamilyResponse, {
        account,
        family,
        role,
        children: childrenOf(family.id),
        entitlements,
      });
    }),

    // An owner or guardian adds a child, within the plan's children.max (plan 9, ADR 0026). The
    // rest of the profile comes from the family, the market and the parent's own language.
    http.post(route('/families/:familyId/children'), async ({ params, request }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const access = familyAccess(String(params.familyId), 'manage-children');
      if ('response' in access) return access.response;
      const body = await readBody(request, ChildProfileRequest);
      if ('response' in body) return body.response;
      const { account, family, entitlements } = access;
      const market = marketOf(family);
      const problems = profileProblems(body.value, family, true);
      if (!market || problems.length > 0) return misfit(problems);
      const max = entitlements.features['children.max'];
      if (childrenOf(family.id).length >= max) {
        return fail(409, 'conflict', `The family's plan includes up to ${String(max)} children`);
      }
      const child = ChildProfile.parse({
        ...body.value,
        id: newId(),
        familyId: family.id,
        curriculumId: market.defaultCurriculumId,
        uiLocale: account.uiLocale,
        timeZone: family.timeZone,
        createdAt: new Date(now()).toISOString(),
      });
      db.update((state) => {
        state.children.push(child);
        state.settings.push({
          childId: child.id,
          ...DEFAULT_PLAY_SETTINGS,
          ...DEFAULT_TIME_LIMITS,
        });
      });
      return respond(ChildProfileResponse, { child }, 201);
    }),

    // An owner or guardian edits a child of that family; another family's child is not found.
    http.put(route('/families/:familyId/children/:childId'), async ({ params, request }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const access = familyAccess(String(params.familyId), 'manage-children');
      if ('response' in access) return access.response;
      const childId = String(params.childId);
      const existing = childOf(childId);
      if (!existing || existing.familyId !== access.family.id) return noChild(childId);
      const body = await readBody(request, ChildProfileRequest);
      if ('response' in body) return body.response;
      // A child who has grown past the ages can still be renamed: the ages apply to a new birth.
      const birthChanged =
        body.value.birthYear !== existing.birthYear ||
        body.value.birthMonth !== existing.birthMonth;
      const problems = profileProblems(body.value, access.family, birthChanged);
      if (problems.length > 0) return misfit(problems);
      // Every field a parent sets is replaced, so a grade left out is no longer set.
      const child = ChildProfile.parse({ ...existing, grade: undefined, ...body.value });
      db.update((state) => {
        state.children = state.children.map((c) => (c.id === childId ? child : c));
      });
      return respond(ChildProfileResponse, { child });
    }),

    // A market's options for child profiles (plan 7.4): configuration, the same for everyone.
    http.get(route('/markets/:market'), async ({ params }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const code = String(params.market);
      const market = db.markets.find((m) => m.market === code);
      return market ? respond(MarketConfig, market) : fail(404, 'not-found', `No market ${code}`);
    }),

    // A child's progress by skill, and Today's explanations, shaped by the plan (ADR 0028).
    http.get(route('/families/:familyId/children/:childId/progress'), async ({ params }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const found = familyChild(String(params.familyId), String(params.childId), 'read-family');
      if ('response' in found) return found.response;
      const detail = found.entitlements.features['insights.detail'];
      const progress = progressOf(found.child, found.family, detail);
      return progress ? respond(ChildProgressResponse, progress) : noChild(found.child.id);
    }),

    // A child's past sessions with plan 5.2's measures, shaped by the plan (ADR 0029).
    http.get(route('/families/:familyId/children/:childId/sessions'), async ({ params }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const found = familyChild(String(params.familyId), String(params.childId), 'read-family');
      if ('response' in found) return found.response;
      const detail = found.entitlements.features['insights.detail'];
      return respond(ChildSessionsResponse, historyOf(found.child, detail));
    }),

    // A child's goal, subject balance and time limits, for the "Goals and time" page (ADR 0027).
    http.get(route('/families/:familyId/children/:childId/learning'), async ({ params }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const found = familyChild(String(params.familyId), String(params.childId), 'read-family');
      if ('response' in found) return found.response;
      return learningResponse(found.child, found.family);
    }),

    http.put(
      route('/families/:familyId/children/:childId/time-limits'),
      async ({ params, request }) => {
        const failed = await interrupt();
        if (failed) return failed;
        const found = familyChild(
          String(params.familyId),
          String(params.childId),
          'manage-children',
        );
        if ('response' in found) return found.response;
        const body = await readBody(request, TimeLimitsRequest);
        if ('response' in body) return body.response;
        updateSettings(found.child.id, body.value);
        return learningResponse(found.child, found.family);
      },
    ),

    // A share for each of the child's subjects, and no other (ADR 0025, ADR 0027).
    http.put(
      route('/families/:familyId/children/:childId/subject-balance'),
      async ({ params, request }) => {
        const failed = await interrupt();
        if (failed) return failed;
        const found = familyChild(
          String(params.familyId),
          String(params.childId),
          'manage-children',
        );
        if ('response' in found) return found.response;
        const body = await readBody(request, SubjectBalanceRequest);
        if ('response' in body) return body.response;
        const subjects = learningOf(found.child, found.family)?.subjects ?? [];
        const { shares } = body.value;
        const fits =
          shares.length === subjects.length &&
          subjects.every((subject) => shares.some((share) => share.subjectId === subject));
        if (!fits) {
          return fail(400, 'invalid-request', 'Give a share for each of the child’s subjects', [
            { path: 'shares', message: `Expected ${subjects.join(', ')}` },
          ]);
        }
        updateSettings(found.child.id, { subjectBalance: shares });
        return learningResponse(found.child, found.family);
      },
    ),

    // One goal at a time; a skill or an end date needs goals.custom (plan 9, ADR 0027).
    http.put(route('/families/:familyId/children/:childId/goal'), async ({ params, request }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const found = familyChild(String(params.familyId), String(params.childId), 'manage-children');
      if ('response' in found) return found.response;
      const body = await readBody(request, ChildGoalRequest);
      if ('response' in body) return body.response;
      const { child, family, entitlements } = found;
      const { subjectId, skillId, endsOn } = body.value;
      if (
        (skillId !== undefined || endsOn !== undefined) &&
        !entitlements.features['goals.custom']
      ) {
        return fail(403, 'forbidden', 'A particular skill or an end date needs goals.custom');
      }
      const problems: { path: string; message: string }[] = [];
      if (!learningOf(child, family)?.subjects.includes(subjectId)) {
        problems.push({ path: 'subjectId', message: `${child.nickname} has no ${subjectId} here` });
      }
      const skill = db.catalog.skillGraph.skills.find((s) => s.id === skillId);
      const skillFits =
        skill?.subjectId === subjectId &&
        (skill.learningLanguage === undefined || skill.learningLanguage === child.learningLanguage);
      if (skillId !== undefined && !skillFits) {
        problems.push({ path: 'skillId', message: `No ${subjectId} skill ${skillId}` });
      }
      if (endsOn !== undefined && endsOn < localDate(now(), family.timeZone)) {
        problems.push({ path: 'endsOn', message: 'A goal ends today or later' });
      }
      if (problems.length > 0) {
        return fail(400, 'invalid-request', 'The goal does not fit this child', problems);
      }
      const goal = LearningGoal.parse({
        id: newId(),
        childId: child.id,
        subjectId,
        ...(skillId === undefined ? {} : { skillId }),
        ...(endsOn === undefined ? {} : { endsOn }),
        createdAt: new Date(now()).toISOString(),
      });
      db.update((state) => {
        state.goals = [...state.goals.filter((g) => g.childId !== child.id), goal];
      });
      return learningResponse(child, family);
    }),

    http.delete(route('/families/:familyId/children/:childId/goal'), async ({ params }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const found = familyChild(String(params.familyId), String(params.childId), 'manage-children');
      if ('response' in found) return found.response;
      db.update((state) => {
        state.goals = state.goals.filter((g) => g.childId !== found.child.id);
      });
      return learningResponse(found.child, found.family);
    }),

    http.get(route('/children/:childId/snapshot'), async ({ params }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const childId = String(params.childId);
      const child = childOf(childId);
      const settings = db.state.settings.find((s) => s.childId === childId);
      if (!child || !settings) return noChild(childId);
      const tier = db.state.entitlements.find((e) => e.familyId === child.familyId)?.features[
        'activities.tier'
      ];
      return respond(ChildSnapshot, {
        child,
        settings,
        playToday: playTodayOf(child, settings.dailyLimitMinutes),
        skillStates: skillStatesOf(child),
        activityTier: tier ?? 'free',
      });
    }),

    http.get(route('/children/:childId/today'), async ({ params }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const childId = String(params.childId);
      const child = childOf(childId);
      if (!child) return noChild(childId);
      const family = db.state.families.find((f) => f.id === child.familyId);
      return respond(TodayResponse, { cards: family ? todayOf(child, family) : [] });
    }),

    http.put(route('/children/:childId/settings'), async ({ params, request }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const childId = String(params.childId);
      if (!childOf(childId)) return noChild(childId);
      const body = await readBody(request, ChildSettings);
      if ('response' in body) return body.response;
      if (body.value.childId !== childId) {
        return fail(400, 'invalid-request', 'The settings are for a different child', [
          { path: 'childId', message: `Expected ${childId}` },
        ]);
      }
      // Child mode edits the play settings and the picture PIN. The dashboard owns the time limits
      // and the balance, so a device's older copy of them never undoes a parent's change (ADR 0027).
      const stored = db.state.settings.find((s) => s.childId === childId);
      const saved = ChildSettings.parse({
        ...(stored ?? body.value),
        ...PlaySettings.parse(body.value),
        picturePin: body.value.picturePin,
      });
      db.update((state) => {
        state.settings = stored
          ? state.settings.map((s) => (s.childId === childId ? saved : s))
          : [...state.settings, saved];
      });
      return respond(ChildSettings, saved);
    }),

    // A grown-up, past the parental gate, allows more play today (ADR 0022).
    http.post(route('/children/:childId/extra-time'), async ({ params, request }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const childId = String(params.childId);
      const child = childOf(childId);
      const settings = db.state.settings.find((s) => s.childId === childId);
      if (!child || !settings) return noChild(childId);
      const body = await readBody(request, ExtraTimeRequest);
      if ('response' in body) return body.response;
      const { date } = playTodayOf(child, settings.dailyLimitMinutes);
      db.update((state) => {
        state.timeGrants.push({ childId, date, minutes: body.value.minutes });
      });
      return respond(PlayToday, playTodayOf(child, settings.dailyLimitMinutes));
    }),

    // The device creates the session ID, so a retry returns the same session (plan 5.4).
    http.post(route('/sessions'), async ({ request }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const body = await readBody(request, StartSessionRequest);
      if ('response' in body) return body.response;
      const start = body.value;
      const existing = db.state.sessions.find((session) => session.id === start.id);
      if (existing) {
        return existing.childId === start.childId && existing.activityId === start.activityId
          ? respond(LearningSession, existing)
          : fail(
              409,
              'conflict',
              `Session ${start.id} already exists for a different child or activity`,
            );
      }
      const child = childOf(start.childId);
      if (!child) return noChild(start.childId);
      const activity = db.catalog.activities.find((a) => a.id === start.activityId);
      if (!activity) return fail(404, 'not-found', `No activity ${start.activityId}`);
      // Sessions check the activity's tier against the family's entitlements (plan 9).
      const features = db.state.entitlements.find((e) => e.familyId === child.familyId)?.features;
      if (activity.tier === 'premium' && features?.['activities.tier'] !== 'premium') {
        return fail(403, 'forbidden', `Activity ${activity.id} needs the premium plan`);
      }
      const session: LearningSession = { ...start, status: 'in-progress' };
      db.update((state) => {
        state.sessions.push(session);
      });
      return respond(LearningSession, session, 201);
    }),

    // Idempotent on the device-made event ID; stored in sequence order per session (plan 5.1, 5.4).
    http.post(route('/events'), async ({ request }) => {
      const failed = await interrupt();
      if (failed) return failed;
      const body = await readBody(request, EventBatch);
      if ('response' in body) return body.response;
      const sessions = new Set(db.state.sessions.map((session) => session.id));
      const unknown = body.value.events.flatMap((event, index) =>
        sessions.has(event.sessionId)
          ? []
          : [
              {
                path: `events.${String(index)}.sessionId`,
                message: `Unknown session ${event.sessionId}`,
              },
            ],
      );
      if (unknown.length > 0) {
        return fail(400, 'invalid-request', 'Start a session before sending its events', unknown);
      }
      const stored = new Set(db.state.events.map((event) => event.id));
      const fresh = body.value.events.filter((event) => !stored.has(event.id));
      db.update((state) => {
        state.events = [...state.events, ...fresh].sort((a, b) =>
          a.sessionId === b.sessionId
            ? a.sequence - b.sequence
            : a.sessionId.localeCompare(b.sessionId),
        );
      });
      return respond(IngestResponse, {
        accepted: fresh.length,
        duplicates: body.value.events.length - fresh.length,
      });
    }),
  ];
}
