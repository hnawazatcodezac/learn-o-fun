import {
  CatalogResponse,
  ChildLearningResponse,
  ChildProfileResponse,
  ChildProgressResponse,
  ChildSessionsResponse,
  ChildSnapshot,
  DEFAULT_PLAY_SETTINGS,
  DEFAULT_TIME_LIMITS,
  DeviceProfilesResponse,
  FamilyResponse,
  MarketConfig,
  MockAccountsResponse,
  ParentSessionResponse,
  ParentSessionState,
  TodayResponse,
} from '@learnofun/contracts';
import { getResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NORMAL_CONTROLS, SLOW_MS, type MockControls } from './controls';
import { seedData } from './data';
import { MockDatabase } from './database';
import { createHandlers } from './handlers';
import { memoryStorage } from './storage';

const ROBIN = '0192f4c1-0000-7000-8000-00000000c001';
const ARI = '0192f4c1-0000-7000-8000-00000000c002';
const SESSION = '0192f4c1-0000-7000-8000-000000005001';
const AT = '2026-10-20T09:15:00.000Z';

let storage = memoryStorage();
let controls: MockControls = NORMAL_CONTROLS;
/** The mock API's clock; the real one unless a test sets it. */
let clock: (() => number) | undefined;

function api(method: string, path: string, body?: unknown) {
  const handlers = createHandlers({
    db: new MockDatabase(seedData, storage),
    controls: () => controls,
    ...(clock ? { now: clock } : {}),
  });
  const init: RequestInit =
    body === undefined ? { method } : { method, body: JSON.stringify(body) };
  return getResponse(handlers, new Request(`http://mock.test/api${path}`, init));
}

async function json(method: string, path: string, body?: unknown) {
  const response = await api(method, path, body);
  if (!response) throw new Error(`No handler for ${method} ${path}`);
  return { status: response.status, body: (await response.json()) as Record<string, unknown> };
}

const startSession = (overrides: Record<string, unknown> = {}) => ({
  id: SESSION,
  childId: ROBIN,
  activityId: 'hop-line-add-within-20',
  gameId: 'hop-line',
  gameVersion: '0.1.0',
  contentRelease: 'mock-2026-10-20',
  policyVersion: 'placeholder-1',
  mode: 'practice',
  startedAt: AT,
  ...overrides,
});

const event = (n: number, sequence: number) => ({
  id: `0192f4c1-0000-7000-8000-00000000${String(6000 + n)}`,
  sessionId: SESSION,
  sequence,
  occurredAt: AT,
  schemaVersion: 1,
  type: 'item_skipped',
  itemId: 'hop-to-14',
});

beforeEach(() => {
  storage = memoryStorage();
  controls = NORMAL_CONTROLS;
  clock = undefined;
});

describe('read endpoints', () => {
  it('GET /catalog serves the catalog, with item templates and misconceptions', async () => {
    const { status, body } = await json('GET', '/catalog');

    expect(status).toBe(200);
    const catalog = CatalogResponse.parse(body);
    expect(catalog.skillGraph.skills).toHaveLength(30);
    expect(catalog.itemTemplates.map((template) => template.id)).toEqual([
      'hop-line-addition',
      'ten-frame-counting',
      'ten-frame-bonds-10',
      'ten-frame-make-ten',
      'tile-farm-groups',
      'tile-farm-arrays',
    ]);
    expect(catalog.misconceptions).toHaveLength(13);
  });

  it('GET /device/profiles shows the picker only nicknames, avatars and whether there is a PIN', async () => {
    const { body } = await json('GET', '/device/profiles');
    const { profiles } = DeviceProfilesResponse.parse(body);

    expect(profiles.map((p) => [p.nickname, p.hasPicturePin])).toEqual([
      ['Robin', false],
      ['Ari', true],
    ]);
    expect(Object.keys((body.profiles as object[])[0] ?? {}).sort()).toEqual([
      'avatarId',
      'hasPicturePin',
      'id',
      'nickname',
    ]);
  });

  it('POST /device/profiles/:id/unlock checks a picture PIN without revealing it', async () => {
    const unlock = async (childId: string, pin: string[]) =>
      (await json('POST', `/device/profiles/${childId}/unlock`, { pin })).body;

    expect(await unlock(ARI, ['sun', 'fish', 'star'])).toEqual({ unlocked: true });
    expect(await unlock(ARI, ['star', 'fish', 'sun'])).toEqual({ unlocked: false });
    // A profile without a PIN always opens.
    expect(await unlock(ROBIN, ['moon', 'moon', 'moon'])).toEqual({ unlocked: true });
    expect((await json('POST', `/device/profiles/${ARI}/unlock`, { pin: ['sun'] })).status).toBe(
      400,
    );
  });

  it('PUT /children/:id/settings sets and clears a picture PIN', async () => {
    const { body } = await json('GET', `/children/${ROBIN}/snapshot`);
    const { settings } = ChildSnapshot.parse(body);
    const hasPin = async () => {
      const { profiles } = DeviceProfilesResponse.parse(
        (await json('GET', '/device/profiles')).body,
      );
      return profiles.find((profile) => profile.id === ROBIN)?.hasPicturePin;
    };

    await json('PUT', `/children/${ROBIN}/settings`, {
      ...settings,
      picturePin: ['leaf', 'drop', 'sun'],
    });
    expect(await hasPin()).toBe(true);
    await json('PUT', `/children/${ROBIN}/settings`, settings);
    expect(await hasPin()).toBe(false);
  });

  it('GET /children/:id/snapshot serves one child', async () => {
    const snapshot = ChildSnapshot.parse((await json('GET', `/children/${ROBIN}/snapshot`)).body);

    expect(snapshot.child.nickname).toBe('Robin');
    expect(snapshot.activityTier).toBe('free');
    expect(snapshot.skillStates.every((state) => state.childId === ROBIN)).toBe(true);
  });

  it('GET /children/:id/today plans Today from the child’s evidence (plan 4.3, ADR 0035)', async () => {
    clock = () => Date.parse('2026-10-22T10:00:00.000Z');
    const today = TodayResponse.parse((await json('GET', `/children/${ARI}/today`)).body);

    // Ari is building counting and bonds to 10, in the café, under the maths goal; Hop Line is
    // the favourite (ADR 0035).
    expect(
      today.cards.map(({ card, skillId, activityId, reasons, policyVersion }) => ({
        card,
        skillId,
        activityId,
        codes: reasons.map((reason) => reason.code),
        policyVersion,
      })),
    ).toEqual([
      {
        card: 'review',
        skillId: 'count-to-20',
        activityId: 'ten-frame-cafe-count',
        codes: ['KEEP_BUILDING', 'PARENT_GOAL'],
        policyVersion: 'planner-1',
      },
      {
        card: 'new',
        skillId: 'number-bonds-to-10',
        activityId: 'ten-frame-cafe-bonds-to-10',
        codes: ['KEEP_BUILDING', 'PARENT_GOAL'],
        policyVersion: 'planner-1',
      },
      {
        card: 'free-choice',
        skillId: 'add-within-20',
        activityId: 'hop-line-add-within-20',
        codes: ['FREE_CHOICE'],
        policyVersion: 'planner-1',
      },
    ]);
    // The same cards keep their IDs all day.
    clock = () => Date.parse('2026-10-22T16:00:00.000Z');
    const later = TodayResponse.parse((await json('GET', `/children/${ARI}/today`)).body);
    expect(later.cards.map((card) => card.id)).toEqual(today.cards.map((card) => card.id));
    clock = undefined;
  });

  it('answers 404 for an unknown child, in the standard error shape', async () => {
    const unknown = '0192f4c1-0000-7000-8000-00000000c999';

    expect(await json('GET', `/children/${unknown}/snapshot`)).toEqual({
      status: 404,
      body: { error: { code: 'not-found', message: `No child ${unknown}` } },
    });
  });

  it('leaves requests outside /api to the network', async () => {
    const handlers = createHandlers({
      db: new MockDatabase(seedData, storage),
      controls: () => controls,
    });

    expect(
      await getResponse(handlers, new Request('http://mock.test/games/hop-line.js')),
    ).toBeUndefined();
  });
});

describe('the parent session (ADR 0025)', () => {
  const SAM = '0192f4c1-0000-7000-8000-00000000a001';
  const ALEX = '0192f4c1-0000-7000-8000-00000000a002';
  const FREE = '0192f4c1-0000-7000-8000-00000000f001';
  const PREMIUM = '0192f4c1-0000-7000-8000-00000000f002';
  const signIn = (accountId: string) => json('POST', '/parent/session', { accountId });

  it('GET /parent/accounts lists the accounts the mock sign-in offers, by name only', async () => {
    const { body } = await json('GET', '/parent/accounts');

    expect(MockAccountsResponse.parse(body).accounts).toEqual([
      { id: SAM, displayName: 'Sam' },
      { id: ALEX, displayName: 'Alex' },
    ]);
  });

  it('says nobody is signed in, as an answer, and family endpoints answer 401', async () => {
    expect(await json('GET', '/parent/session')).toEqual({ status: 200, body: { session: null } });
    expect((await json('GET', `/families/${FREE}`)).body).toMatchObject({
      error: { code: 'unauthorized' },
    });
  });

  it('signs in as an account, with every family it belongs to and its role in each', async () => {
    const { status, body } = await signIn(SAM);

    expect(status).toBe(200);
    const session = ParentSessionResponse.parse(body);
    expect(session.account.displayName).toBe('Sam');
    expect(
      session.families.map(({ family, role, ownerName }) => [family.id, role, ownerName]),
    ).toEqual([
      [FREE, 'owner', 'Sam'],
      [PREMIUM, 'guardian', 'Alex'],
    ]);
    // The session lasts, as a real API's would.
    const state = ParentSessionState.parse((await json('GET', '/parent/session')).body);
    expect(state.session?.account.displayName).toBe('Sam');
  });

  it('GET /families/:id serves a family of the signed-in parent, with its children and plan', async () => {
    await signIn(SAM);
    const free = FamilyResponse.parse((await json('GET', `/families/${FREE}`)).body);
    const premium = FamilyResponse.parse((await json('GET', `/families/${PREMIUM}`)).body);

    expect(free.children.map((child) => child.nickname)).toEqual(['Robin', 'Ari']);
    expect(free.entitlements.features['activities.tier']).toBe('free');
    expect(premium).toMatchObject({ role: 'guardian' });
    expect(premium.children.map((child) => child.nickname)).toEqual(['Nia']);
    expect(premium.entitlements.features['insights.detail']).toBe('full');
  });

  it('never serves another family: it is not found, as if it did not exist (CLAUDE.md rule 4)', async () => {
    await signIn(ALEX);

    const { status, body } = await json('GET', `/families/${FREE}`);
    expect(status).toBe(404);
    expect(JSON.stringify(body)).not.toMatch(/Robin|Ari/);
  });

  it('refuses an account that does not exist', async () => {
    expect((await signIn('0192f4c1-0000-7000-8000-00000000a999')).status).toBe(400);
  });

  it('DELETE /parent/session signs out', async () => {
    await signIn(SAM);
    const response = await api('DELETE', '/parent/session');

    expect(response?.status).toBe(204);
    expect((await json('GET', '/parent/session')).body).toEqual({ session: null });
  });
});

describe('child profiles in the dashboard (ADR 0026)', () => {
  const SAM = '0192f4c1-0000-7000-8000-00000000a001';
  const ALEX = '0192f4c1-0000-7000-8000-00000000a002';
  const FREE = '0192f4c1-0000-7000-8000-00000000f001';
  const PREMIUM = '0192f4c1-0000-7000-8000-00000000f002';
  const NIA = '0192f4c1-0000-7000-8000-00000000c003';
  const signIn = (accountId: string) => json('POST', '/parent/session', { accountId });
  const profile = (overrides: Record<string, unknown> = {}) => ({
    nickname: 'Kit',
    birthYear: 2021,
    birthMonth: 6,
    learningLanguage: 'en',
    grade: 'reception',
    avatarId: 'purple-star',
    ...overrides,
  });
  const add = (familyId: string, body: unknown) =>
    json('POST', `/families/${familyId}/children`, body);
  const edit = (familyId: string, childId: string, body: unknown) =>
    json('PUT', `/families/${familyId}/children/${childId}`, body);
  const childrenIn = async (familyId: string) =>
    FamilyResponse.parse((await json('GET', `/families/${familyId}`)).body).children;
  /** Changes the saved state directly, as the next request will find it. */
  const change = (update: Parameters<MockDatabase['update']>[0]) => {
    new MockDatabase(seedData, storage).update(update);
  };

  beforeEach(() => {
    // 22 October 2026, 11:00 in London.
    clock = () => Date.parse('2026-10-22T10:00:00.000Z');
  });

  it('GET /markets/:market serves the market’s languages, curriculum and grades', async () => {
    const { status, body } = await json('GET', '/markets/GB');

    expect(status).toBe(200);
    expect(MarketConfig.parse(body)).toMatchObject({
      learningLanguages: ['en'],
      defaultCurriculumId: 'england-national-curriculum',
      gradeScheme: { id: 'england-school-years' },
    });
    expect((await json('GET', '/markets/FR')).status).toBe(404);
  });

  it('adds a child, completed from the family, the market and the parent, with default settings', async () => {
    await signIn(ALEX);
    const { status, body } = await add(PREMIUM, profile());

    expect(status).toBe(201);
    const { child } = ChildProfileResponse.parse(body);
    expect(child).toMatchObject({
      ...profile(),
      familyId: PREMIUM,
      curriculumId: 'england-national-curriculum',
      uiLocale: 'en-GB',
      timeZone: 'Europe/London',
      createdAt: '2026-10-22T10:00:00.000Z',
    });
    expect((await childrenIn(PREMIUM)).map((c) => c.nickname)).toEqual(['Nia', 'Kit']);
    const snapshot = ChildSnapshot.parse(
      (await json('GET', `/children/${child.id}/snapshot`)).body,
    );
    expect(snapshot.settings).toEqual({
      childId: child.id,
      ...DEFAULT_PLAY_SETTINGS,
      ...DEFAULT_TIME_LIMITS,
    });
  });

  it('adds a child without a grade: "Not set"', async () => {
    await signIn(ALEX);
    const { child } = ChildProfileResponse.parse(
      (await add(PREMIUM, profile({ grade: undefined }))).body,
    );

    expect(child.grade).toBeUndefined();
  });

  it('lets a guardian add and edit too, but not a caregiver (plan 8.1)', async () => {
    await signIn(SAM);
    expect((await add(PREMIUM, profile())).status).toBe(201);

    change((state) => {
      const sam = state.families[1]?.members.find((member) => member.accountId === SAM);
      if (sam) sam.role = 'caregiver';
    });
    expect((await add(PREMIUM, profile({ nickname: 'Jo' }))).body).toMatchObject({
      error: { code: 'forbidden' },
    });
    expect((await edit(PREMIUM, NIA, profile())).status).toBe(403);
    // A caregiver can still see the family.
    expect((await childrenIn(PREMIUM)).map((c) => c.nickname)).toEqual(['Nia', 'Kit']);
  });

  it('refuses a child over the plan’s children.max (plan 9)', async () => {
    await signIn(SAM);
    const { status, body } = await add(FREE, profile());

    expect(status).toBe(409);
    expect(body).toMatchObject({ error: { code: 'conflict' } });
    expect((await childrenIn(FREE)).map((c) => c.nickname)).toEqual(['Robin', 'Ari']);
  });

  it('never adds to or edits another family: not found (CLAUDE.md rule 4)', async () => {
    await signIn(ALEX);

    expect((await add(FREE, profile())).status).toBe(404);
    expect((await edit(FREE, ROBIN, profile())).status).toBe(404);
    // Nor through Alex's own family's address.
    const { status, body } = await edit(PREMIUM, ROBIN, profile());
    expect(status).toBe(404);
    expect(JSON.stringify(body)).not.toMatch(/Robin/);

    await signIn(SAM);
    expect((await childrenIn(FREE)).map((c) => c.nickname)).toEqual(['Robin', 'Ari']);
  });

  it('answers 401 while nobody is signed in', async () => {
    expect((await add(PREMIUM, profile())).status).toBe(401);
    expect((await edit(PREMIUM, NIA, profile())).status).toBe(401);
  });

  it.each([
    [2023, 10, 201, 'turned 3 this month'],
    [2023, 11, 400, 'turns 3 next month'],
    [2017, 11, 201, 'is 8, turning 9 next month'],
    [2017, 10, 400, 'turned 9 this month'],
    [2024, 1, 400, 'is 2'],
  ])(
    'takes ages 3 to 8 today in the family’s zone: born %i-%i, %i (%s)',
    async (birthYear, birthMonth, status) => {
      await signIn(ALEX);
      const response = await add(PREMIUM, profile({ birthYear, birthMonth, grade: undefined }));

      expect(response.status).toBe(status);
      if (status === 400) {
        expect(response.body).toMatchObject({ error: { problems: [{ path: 'birthYear' }] } });
      }
    },
  );

  it('refuses a grade or a learning language the market does not offer, naming the field', async () => {
    await signIn(ALEX);

    expect((await add(PREMIUM, profile({ grade: 'year-9' }))).body).toMatchObject({
      error: { problems: [{ path: 'grade' }] },
    });
    expect((await add(PREMIUM, profile({ learningLanguage: 'fr' }))).body).toMatchObject({
      error: { problems: [{ path: 'learningLanguage' }] },
    });
    expect((await add(PREMIUM, profile({ dateOfBirth: '2021-06-14' }))).status).toBe(400);
  });

  it('edits a profile, which the device’s picker then shows', async () => {
    await signIn(SAM);
    const robin = seedData.children[0];
    if (!robin) throw new Error('No Robin in the mock data');
    const { status, body } = await edit(FREE, ROBIN, {
      nickname: 'Robbie',
      birthYear: robin.birthYear,
      birthMonth: robin.birthMonth,
      learningLanguage: robin.learningLanguage,
      avatarId: 'orange-circle',
    });

    expect(status).toBe(200);
    const { child } = ChildProfileResponse.parse(body);
    // Everything a parent sets is replaced: the grade left out is no longer set.
    expect(child).toEqual({
      ...robin,
      nickname: 'Robbie',
      avatarId: 'orange-circle',
      grade: undefined,
    });
    const profiles = DeviceProfilesResponse.parse((await json('GET', '/device/profiles')).body);
    expect(profiles.profiles.map((p) => p.nickname)).toEqual(['Robbie', 'Ari']);
  });

  it('still lets a parent rename a child who has grown past 8, unless the birth changes', async () => {
    change((state) => {
      const robin = state.children.find((child) => child.id === ROBIN);
      if (robin) robin.birthYear = 2016;
    });
    await signIn(SAM);
    const same = profile({ birthYear: 2016, birthMonth: 5, grade: 'year-4' });

    expect((await edit(FREE, ROBIN, same)).status).toBe(200);
    expect((await edit(FREE, ROBIN, { ...same, birthMonth: 4 })).status).toBe(400);
  });
});

describe('goals, subject balance and time limits (ADR 0027)', () => {
  const SAM = '0192f4c1-0000-7000-8000-00000000a001';
  const ALEX = '0192f4c1-0000-7000-8000-00000000a002';
  const FREE = '0192f4c1-0000-7000-8000-00000000f001';
  const PREMIUM = '0192f4c1-0000-7000-8000-00000000f002';
  const NIA = '0192f4c1-0000-7000-8000-00000000c003';
  const signIn = (accountId: string) => json('POST', '/parent/session', { accountId });
  const path = (familyId: string, childId: string, part: string) =>
    `/families/${familyId}/children/${childId}/${part}`;
  const learning = async (familyId: string, childId: string) =>
    ChildLearningResponse.parse((await json('GET', path(familyId, childId, 'learning'))).body);
  const limits = { sessionMinutes: 15, dailyLimitMinutes: 45, breakReminderMinutes: 15 };

  beforeEach(() => {
    clock = () => Date.parse('2026-10-22T10:00:00.000Z');
  });

  it('serves a child’s subjects from the band for their age, with equal shares, limits and goal', async () => {
    await signIn(SAM);
    const robin = await learning(FREE, ROBIN);
    const ari = await learning(FREE, ARI);

    expect(robin).toMatchObject({
      subjects: ['mathematics', 'literacy'],
      subjectBalance: [
        { subjectId: 'mathematics', percent: 50 },
        { subjectId: 'literacy', percent: 50 },
      ],
      timeLimits: { dailyLimitMinutes: 30, sessionMinutes: 10, breakReminderMinutes: 20 },
    });
    expect(robin.goal).toBeUndefined();
    expect(ari.goal).toMatchObject({ subjectId: 'mathematics' });
    // Only child mode needs the picture PIN.
    expect(JSON.stringify(ari)).not.toMatch(/picturePin/);
  });

  it('gives a child aged 3 to 5 the early-years subjects: maths alone', async () => {
    await signIn(ALEX);
    const added = await json('POST', `/families/${PREMIUM}/children`, {
      nickname: 'Kit',
      birthYear: 2021,
      birthMonth: 6,
      learningLanguage: 'en',
      avatarId: 'purple-star',
    });
    const kit = ChildProfileResponse.parse(added.body).child;

    expect(await learning(PREMIUM, kit.id)).toMatchObject({
      subjects: ['mathematics'],
      subjectBalance: [{ subjectId: 'mathematics', percent: 100 }],
    });
  });

  it('saves time limits from the steps, which the device then uses', async () => {
    await signIn(SAM);
    const { status, body } = await json('PUT', path(FREE, ROBIN, 'time-limits'), limits);

    expect(status).toBe(200);
    expect(ChildLearningResponse.parse(body).timeLimits).toEqual(limits);
    const snapshot = ChildSnapshot.parse((await json('GET', `/children/${ROBIN}/snapshot`)).body);
    expect(snapshot.settings).toMatchObject(limits);
    expect(snapshot.playToday.allowedSeconds).toBe(45 * 60);
  });

  it('refuses limits off the steps, or a session longer than the day', async () => {
    await signIn(SAM);

    expect(
      (await json('PUT', path(FREE, ROBIN, 'time-limits'), { ...limits, sessionMinutes: 12 }))
        .status,
    ).toBe(400);
    expect(
      (
        await json('PUT', path(FREE, ROBIN, 'time-limits'), {
          ...limits,
          sessionMinutes: 30,
          dailyLimitMinutes: 15,
        })
      ).body,
    ).toMatchObject({ error: { problems: [{ path: 'sessionMinutes' }] } });
  });

  it('saves a balance over exactly the child’s subjects', async () => {
    await signIn(SAM);
    const shares = [
      { subjectId: 'mathematics', percent: 70 },
      { subjectId: 'literacy', percent: 30 },
    ];

    expect((await json('PUT', path(FREE, ROBIN, 'subject-balance'), { shares })).status).toBe(200);
    expect((await learning(FREE, ROBIN)).subjectBalance).toEqual(shares);

    const onlyMaths = [{ subjectId: 'mathematics', percent: 100 }];
    expect(
      (await json('PUT', path(FREE, ROBIN, 'subject-balance'), { shares: onlyMaths })).body,
    ).toMatchObject({ error: { problems: [{ path: 'shares' }] } });
    const science = [...shares.slice(0, 1), { subjectId: 'science', percent: 30 }];
    expect(
      (await json('PUT', path(FREE, ROBIN, 'subject-balance'), { shares: science })).status,
    ).toBe(400);
  });

  it('on the free plan, sets a subject focus, one at a time, but no skill or end date', async () => {
    await signIn(SAM);
    const { body } = await json('PUT', path(FREE, ARI, 'goal'), { subjectId: 'literacy' });

    expect(ChildLearningResponse.parse(body).goal).toMatchObject({
      childId: ARI,
      subjectId: 'literacy',
      createdAt: '2026-10-22T10:00:00.000Z',
    });
    expect((await learning(FREE, ARI)).goal?.subjectId).toBe('literacy');

    const skill = await json('PUT', path(FREE, ARI, 'goal'), {
      subjectId: 'mathematics',
      skillId: 'add-within-10',
    });
    expect(skill.status).toBe(403);
    expect(skill.body).toMatchObject({ error: { code: 'forbidden' } });
    expect(
      (
        await json('PUT', path(FREE, ARI, 'goal'), {
          subjectId: 'mathematics',
          endsOn: '2026-11-30',
        })
      ).status,
    ).toBe(403);
    expect(
      (await json('PUT', path(FREE, ARI, 'goal'), { subjectId: 'science' })).body,
    ).toMatchObject({ error: { problems: [{ path: 'subjectId' }] } });
  });

  it('on premium, a goal can name a skill in its subject and the last day it applies', async () => {
    await signIn(ALEX);
    const goal = { subjectId: 'mathematics', skillId: 'number-bonds-to-10', endsOn: '2026-11-30' };
    const { status, body } = await json('PUT', path(PREMIUM, NIA, 'goal'), goal);

    expect(status).toBe(200);
    expect(ChildLearningResponse.parse(body).goal).toMatchObject(goal);
    expect(
      (await json('PUT', path(PREMIUM, NIA, 'goal'), { ...goal, skillId: 'letter-sounds' })).body,
    ).toMatchObject({ error: { problems: [{ path: 'skillId' }] } });
    expect(
      (await json('PUT', path(PREMIUM, NIA, 'goal'), { ...goal, endsOn: '2026-10-21' })).body,
    ).toMatchObject({ error: { problems: [{ path: 'endsOn' }] } });
  });

  it('clears a goal', async () => {
    await signIn(SAM);
    const { status, body } = await json('DELETE', path(FREE, ARI, 'goal'));

    expect(status).toBe(200);
    expect(ChildLearningResponse.parse(body).goal).toBeUndefined();
    expect((await learning(FREE, ARI)).goal).toBeUndefined();
  });

  it('never reads or changes another family’s child: not found (CLAUDE.md rule 4)', async () => {
    await signIn(ALEX);

    for (const familyId of [FREE, PREMIUM]) {
      const read = await json('GET', path(familyId, ROBIN, 'learning'));
      expect(read.status).toBe(404);
      expect(JSON.stringify(read.body)).not.toMatch(/Robin/);
      expect((await json('PUT', path(familyId, ROBIN, 'time-limits'), limits)).status).toBe(404);
      expect(
        (await json('PUT', path(familyId, ARI, 'goal'), { subjectId: 'mathematics' })).status,
      ).toBe(404);
      expect((await json('DELETE', path(familyId, ARI, 'goal'))).status).toBe(404);
    }
    await signIn(SAM);
    expect((await learning(FREE, ARI)).goal?.subjectId).toBe('mathematics');
  });

  it('lets a caregiver look, but not change (plan 8.1); and nobody signed out', async () => {
    expect((await json('GET', path(FREE, ROBIN, 'learning'))).status).toBe(401);

    new MockDatabase(seedData, storage).update((state) => {
      const sam = state.families[1]?.members.find((member) => member.accountId === SAM);
      if (sam) sam.role = 'caregiver';
    });
    await signIn(SAM);
    expect((await json('GET', path(PREMIUM, NIA, 'learning'))).status).toBe(200);
    expect((await json('PUT', path(PREMIUM, NIA, 'time-limits'), limits)).status).toBe(403);
    expect(
      (await json('PUT', path(PREMIUM, NIA, 'goal'), { subjectId: 'mathematics' })).status,
    ).toBe(403);
  });
});

describe('progress by skill, and Today’s explanations (ADR 0028)', () => {
  const SAM = '0192f4c1-0000-7000-8000-00000000a001';
  const ALEX = '0192f4c1-0000-7000-8000-00000000a002';
  const FREE = '0192f4c1-0000-7000-8000-00000000f001';
  const PREMIUM = '0192f4c1-0000-7000-8000-00000000f002';
  const NIA = '0192f4c1-0000-7000-8000-00000000c003';
  const signIn = (accountId: string) => json('POST', '/parent/session', { accountId });
  const progress = async (familyId: string, childId: string) =>
    ChildProgressResponse.parse(
      (await json('GET', `/families/${familyId}/children/${childId}/progress`)).body,
    );
  const skillOf = (result: Awaited<ReturnType<typeof progress>>, skillId: string) =>
    result.subjects
      .flatMap((subject) => subject.strands)
      .flatMap((strand) => strand.skills ?? [])
      .find((skill) => skill.skillId === skillId);

  beforeEach(() => {
    clock = () => Date.parse('2026-10-22T10:00:00.000Z');
  });

  it('on premium, lists every skill with its status and the evidence from the events', async () => {
    await signIn(ALEX);
    const nia = await progress(PREMIUM, NIA);

    expect(nia.detail).toBe('full');
    expect(nia.subjects.map((subject) => subject.subjectId)).toEqual(['mathematics', 'literacy']);
    expect(skillOf(nia, 'add-within-10')).toEqual({
      skillId: 'add-within-10',
      status: 'review-due',
      evidence: {
        firstTries: 90,
        firstTriesCorrect: 70,
        items: 90,
        sessions: 5,
        earlySignal: false,
      },
    });
    expect(skillOf(nia, 'repeated-addition')?.evidence).toMatchObject({
      firstTries: 13,
      firstTriesCorrect: 11,
      sessions: 3,
    });
    // Skills ahead are listed too, not started.
    expect(skillOf(nia, 'letter-sounds')).toEqual({
      skillId: 'letter-sounds',
      status: 'not-started',
      evidence: { firstTries: 0, firstTriesCorrect: 0, items: 0, sessions: 0, earlySignal: true },
    });
  });

  it('on the free plan, summarises each strand without its skills (plan 9)', async () => {
    await signIn(SAM);
    const { body } = await json('GET', `/families/${FREE}/children/${ROBIN}/progress`);
    const robin = ChildProgressResponse.parse(body);
    const counting = robin.subjects[0]?.strands.find((s) => s.strandId === 'counting');

    expect(robin.detail).toBe('basic');
    expect(JSON.stringify(body)).not.toMatch(/"skills"|"firstTries"/);
    const inCounting = seedData.catalog.skillGraph.skills.filter((s) => s.strand === 'counting');
    expect(counting?.counts.reduce((sum, c) => sum + c.count, 0)).toBe(inCounting.length);
    expect(counting?.counts).toContainEqual({ status: 'mastered', count: 1 });
  });

  it('fills Today’s reasons with what they quote, from the events, on every plan', async () => {
    await signIn(ALEX);
    const nia = await progress(PREMIUM, NIA);
    expect(nia.today[0]).toMatchObject({
      card: 'review',
      skillId: 'add-within-10',
      reasons: [{ code: 'REVIEW_DUE', evidence: { masteredAt: '2026-09-26T16:08:00.000Z' } }],
    });

    // Arrays are new, from Tile Farm: repeated addition, which they build on, is strong.
    expect(nia.today[1]).toMatchObject({
      card: 'new',
      skillId: 'arrays',
      activityId: 'tile-farm-arrays',
      reasons: [
        {
          code: 'FRONTIER_READY',
          evidence: {
            relatedSkillId: 'repeated-addition',
            firstTryCorrect: 11,
            firstTryTotal: 13,
            sessionCount: 3,
          },
        },
      ],
    });

    await signIn(SAM);
    const robin = await progress(FREE, ROBIN);
    expect(robin.today.map((card) => card.reasons)).toEqual([
      [{ code: 'REVIEW_DUE', evidence: { masteredAt: '2026-09-21T15:08:30.000Z' } }],
      [
        {
          code: 'FRONTIER_READY',
          evidence: {
            relatedSkillId: 'number-bonds-to-10',
            firstTryCorrect: 62,
            firstTryTotal: 78,
            sessionCount: 5,
          },
        },
      ],
      [{ code: 'FREE_CHOICE', evidence: {} }],
    ]);
    const ari = await progress(FREE, ARI);
    expect(ari.today[0]?.reasons).toEqual([
      {
        code: 'KEEP_BUILDING',
        evidence: { firstTryCorrect: 9, firstTryTotal: 16, sessionCount: 2 },
      },
      { code: 'PARENT_GOAL', evidence: { goalId: '0192f4c1-0000-7000-8000-00000000d001' } },
    ]);
  });

  /** One Hop Line item played on a device this morning: 5 + 3, landed right first time. */
  const playOneRightItem = async (childId: string) => {
    await json(
      'POST',
      '/sessions',
      startSession({ childId, startedAt: '2026-10-22T09:00:00.000Z' }),
    );
    const at = (seconds: number) =>
      new Date(Date.parse('2026-10-22T09:00:00.000Z') + seconds * 1000).toISOString();
    const envelope = (n: number, seconds: number) => ({
      id: `0192f4c1-0000-7000-8000-00000000${String(7000 + n)}`,
      sessionId: SESSION,
      sequence: n,
      occurredAt: at(seconds),
      schemaVersion: 1,
    });
    // 5 + 3 on the line, landed right first time: evidence for adding within 10 and 20.
    const itemId = 'hop-line-addition-5-plus-3';
    const sent = await json('POST', '/events', {
      events: [
        {
          ...envelope(0, 0),
          type: 'session_started',
          activityId: 'hop-line-add-within-20',
          gameId: 'hop-line',
          gameVersion: '0.1.0',
          contentRelease: 'mock-2026-10-20',
          mode: 'practice',
          policyVersion: 'placeholder-2',
        },
        {
          ...envelope(1, 1),
          type: 'item_presented',
          itemId,
          skillIds: ['add-within-10', 'add-within-20'],
          difficulty: 0,
          role: 'target',
        },
        {
          ...envelope(2, 9),
          type: 'response_submitted',
          itemId,
          attempt: 1,
          response: { type: 'placement', at: { kind: 'line', position: 8 } },
          latencyMs: 8000,
          support: 'none',
        },
      ],
    });
    expect(sent.body).toEqual({ accepted: 3, duplicates: 0 });
  };

  it('counts a session played on the device, graded again from its template item', async () => {
    await signIn(ALEX);
    const adding = async () => skillOf(await progress(PREMIUM, NIA), 'add-within-10')?.evidence;
    const before = await adding();
    await playOneRightItem(NIA);

    const after = await adding();
    expect(after?.firstTries).toBe((before?.firstTries ?? 0) + 1);
    expect(after?.firstTriesCorrect).toBe((before?.firstTriesCorrect ?? 0) + 1);
  });

  it('credits adding within 20 from the café’s making ten, a second game for it (ADR 0037)', async () => {
    await signIn(ALEX);
    const before = skillOf(await progress(PREMIUM, NIA), 'add-within-20')?.evidence;
    await json(
      'POST',
      '/sessions',
      startSession({
        childId: NIA,
        activityId: 'ten-frame-cafe-make-ten',
        gameId: 'ten-frame-cafe',
        startedAt: '2026-10-22T09:00:00.000Z',
      }),
    );
    const at = (seconds: number) =>
      new Date(Date.parse('2026-10-22T09:00:00.000Z') + seconds * 1000).toISOString();
    const envelope = (n: number, seconds: number) => ({
      id: `0192f4c1-0000-7000-8000-00000000${String(7100 + n)}`,
      sessionId: SESSION,
      sequence: n,
      occurredAt: at(seconds),
      schemaVersion: 1,
    });
    // 8 + 5, made as 10 and 3: right first time. The mock API grades it again from its ID.
    const itemId = 'ten-frame-make-ten-8-plus-5-pear';
    const sent = await json('POST', '/events', {
      events: [
        {
          ...envelope(0, 0),
          type: 'session_started',
          activityId: 'ten-frame-cafe-make-ten',
          gameId: 'ten-frame-cafe',
          gameVersion: '0.1.0',
          contentRelease: 'mock-2026-10-20',
          mode: 'practice',
          policyVersion: 'adaptive-1',
        },
        {
          ...envelope(1, 1),
          type: 'item_presented',
          itemId,
          skillIds: ['make-ten-to-add', 'number-bonds-to-20', 'add-within-20'],
          difficulty: -0.1,
          role: 'target',
        },
        {
          ...envelope(2, 9),
          type: 'response_submitted',
          itemId,
          attempt: 1,
          response: { type: 'numeric', value: { kind: 'decimal', value: 13 } },
          latencyMs: 8000,
          support: 'none',
        },
      ],
    });
    expect(sent.body).toEqual({ accepted: 3, duplicates: 0 });

    const after = skillOf(await progress(PREMIUM, NIA), 'add-within-20')?.evidence;
    expect(after?.firstTries).toBe((before?.firstTries ?? 0) + 1);
    expect(after?.firstTriesCorrect).toBe((before?.firstTriesCorrect ?? 0) + 1);
    expect(skillOf(await progress(PREMIUM, NIA), 'make-ten-to-add')?.evidence.firstTries).toBe(1);
  });

  it('plans Today again after a session: once Nia has done the review, it moves on', async () => {
    await signIn(ALEX);
    expect((await progress(PREMIUM, NIA)).today[0]).toMatchObject({
      skillId: 'add-within-10',
      reasons: [{ code: 'REVIEW_DUE' }],
    });
    await playOneRightItem(NIA);

    // The right review keeps the skill mastered; equal groups, still building, take its card.
    const after = (await progress(PREMIUM, NIA)).today;
    expect(after.map((card) => card.skillId)).not.toContain('add-within-10');
    expect(after[0]).toMatchObject({
      card: 'review',
      skillId: 'equal-groups',
      activityId: 'tile-farm-equal-groups',
      reasons: [{ code: 'KEEP_BUILDING' }],
    });
  });

  it('never shows another family’s child: not found (CLAUDE.md rule 4)', async () => {
    expect((await json('GET', `/families/${FREE}/children/${ROBIN}/progress`)).status).toBe(401);
    await signIn(ALEX);
    for (const familyId of [FREE, PREMIUM]) {
      const { status, body } = await json(
        'GET',
        `/families/${familyId}/children/${ROBIN}/progress`,
      );
      expect(status).toBe(404);
      expect(JSON.stringify(body)).not.toMatch(/Robin/);
    }
  });
});

describe('session history (ADR 0029)', () => {
  const SAM = '0192f4c1-0000-7000-8000-00000000a001';
  const ALEX = '0192f4c1-0000-7000-8000-00000000a002';
  const FREE = '0192f4c1-0000-7000-8000-00000000f001';
  const PREMIUM = '0192f4c1-0000-7000-8000-00000000f002';
  const NIA = '0192f4c1-0000-7000-8000-00000000c003';
  const signIn = (accountId: string) => json('POST', '/parent/session', { accountId });
  const history = async (familyId: string, childId: string) =>
    ChildSessionsResponse.parse(
      (await json('GET', `/families/${familyId}/children/${childId}/sessions`)).body,
    );

  beforeEach(() => {
    clock = () => Date.parse('2026-10-22T10:00:00.000Z');
  });

  it('on premium, lists every session newest first with every plan 5.2 measure', async () => {
    await signIn(ALEX);
    const nia = await history(PREMIUM, NIA);

    expect(nia.detail).toBe('full');
    expect(nia.sessions.map((s) => s.startedAt.slice(0, 10))).toEqual([
      '2026-10-16',
      '2026-10-09',
      '2026-10-02',
      '2026-09-30',
      '2026-09-26',
      '2026-09-23',
      '2026-09-19',
      '2026-09-16',
    ]);
    // 9 October: eight right first time, and one right after a hint.
    expect(nia.sessions[1]).toMatchObject({
      activityId: 'tile-farm-equal-groups',
      status: 'completed',
      timeOnTaskSeconds: 300,
      attempted: 9,
      firstTryCorrect: 8,
      detail: {
        presented: 9,
        skipped: 0,
        unanswered: 0,
        eventuallyCorrect: 9,
        supported: 1,
        learningCredit: 1,
      },
    });
    expect(nia.sessions[1]?.detail?.items.map((item) => item.outcome)).toEqual([
      ...Array<string>(8).fill('first-try'),
      'with-hint',
    ]);
  });

  it('on the free plan, carries the headline measures only (plan 9)', async () => {
    await signIn(SAM);
    const { body } = await json('GET', `/families/${FREE}/children/${ROBIN}/sessions`);
    const robin = ChildSessionsResponse.parse(body);

    expect(robin.detail).toBe('basic');
    expect(robin.sessions).toHaveLength(21);
    expect(JSON.stringify(body)).not.toMatch(/"detail":\{|learningCredit|"items"/);
    // 19 October: five right first time out of seven answered; one question skipped.
    expect(robin.sessions[0]).toEqual({
      id: expect.any(String) as string,
      activityId: 'hop-line-subtract-within-20',
      mode: 'practice',
      startedAt: '2026-10-19T15:00:00.000Z',
      status: 'completed',
      timeOnTaskSeconds: expect.any(Number) as number,
      attempted: 7,
      firstTryCorrect: 5,
    });
  });

  it('shows a session played on the device as it stands: unfinished, can carry on', async () => {
    await signIn(SAM);
    await json('POST', '/sessions', startSession({ startedAt: '2026-10-22T09:50:00.000Z' }));

    const [latest] = (await history(FREE, ROBIN)).sessions;
    expect(latest).toMatchObject({ id: SESSION, status: 'interrupted', attempted: 0 });
  });

  it('never shows another family’s child’s sessions: not found (CLAUDE.md rule 4)', async () => {
    expect((await json('GET', `/families/${FREE}/children/${ROBIN}/sessions`)).status).toBe(401);
    await signIn(ALEX);
    for (const familyId of [FREE, PREMIUM]) {
      const { status, body } = await json(
        'GET',
        `/families/${familyId}/children/${ROBIN}/sessions`,
      );
      expect(status).toBe(404);
      expect(JSON.stringify(body)).not.toMatch(/Robin/);
    }
  });
});

describe('PUT /children/:id/settings', () => {
  const settings = () => ({ ...seedData.settings[1], textScale: 1.5 });

  it('saves the settings, and a reload keeps them', async () => {
    expect((await json('PUT', `/children/${ARI}/settings`, settings())).status).toBe(200);

    const snapshot = ChildSnapshot.parse((await json('GET', `/children/${ARI}/snapshot`)).body);
    expect(snapshot.settings.textScale).toBe(1.5);
  });

  it('rejects settings that break the contract, naming the field', async () => {
    const { status, body } = await json('PUT', `/children/${ARI}/settings`, {
      ...settings(),
      textScale: 3,
    });

    expect(status).toBe(400);
    expect(body).toMatchObject({
      error: { code: 'invalid-request', problems: [{ path: 'textScale' }] },
    });
  });

  it('rejects settings for a different child', async () => {
    expect((await json('PUT', `/children/${ROBIN}/settings`, settings())).status).toBe(400);
  });

  it('applies only what child mode edits, never undoing a parent’s limits (ADR 0027)', async () => {
    // The parent sets a shorter day in the dashboard...
    new MockDatabase(seedData, storage).update((state) => {
      const ari = state.settings.find((s) => s.childId === ARI);
      if (ari) Object.assign(ari, { dailyLimitMinutes: 15, sessionMinutes: 5 });
    });
    // ...and a tablet with an older copy of the settings saves a play setting.
    const { body } = await json('PUT', `/children/${ARI}/settings`, {
      ...settings(),
      sound: false,
      picturePin: ['moon', 'leaf', 'drop'],
    });

    expect(body).toMatchObject({
      sound: false,
      textScale: 1.5,
      picturePin: ['moon', 'leaf', 'drop'],
      dailyLimitMinutes: 15,
      sessionMinutes: 5,
    });
    const snapshot = ChildSnapshot.parse((await json('GET', `/children/${ARI}/snapshot`)).body);
    expect(snapshot.settings).toMatchObject({ sound: false, dailyLimitMinutes: 15 });
  });
});

describe('POST /sessions', () => {
  it('starts a session', async () => {
    const { status, body } = await json('POST', '/sessions', startSession());

    expect(status).toBe(201);
    expect(body).toMatchObject({ id: SESSION, status: 'in-progress' });
  });

  it('returns the same session when the device retries', async () => {
    await json('POST', '/sessions', startSession());
    const retry = await json('POST', '/sessions', startSession());

    expect(retry).toMatchObject({ status: 200, body: { id: SESSION } });
  });

  it('refuses a premium activity on the free plan', async () => {
    const { status, body } = await json(
      'POST',
      '/sessions',
      startSession({ activityId: 'tile-farm-arrays', gameId: 'tile-farm' }),
    );

    expect(status).toBe(403);
    expect(body).toMatchObject({ error: { code: 'forbidden' } });
  });

  it('refuses an unknown activity', async () => {
    expect(
      (await json('POST', '/sessions', startSession({ activityId: 'no-such-activity' }))).status,
    ).toBe(404);
  });
});

describe('POST /events', () => {
  beforeEach(async () => {
    await json('POST', '/sessions', startSession());
  });

  it('stores new events', async () => {
    expect(await json('POST', '/events', { events: [event(1, 0), event(2, 1)] })).toEqual({
      status: 200,
      body: { accepted: 2, duplicates: 0 },
    });
  });

  it('is idempotent on the event ID: a resent batch is stored once', async () => {
    await json('POST', '/events', { events: [event(1, 0), event(2, 1)] });
    const resent = await json('POST', '/events', {
      events: [event(1, 0), event(2, 1), event(3, 2)],
    });

    expect(resent.body).toEqual({ accepted: 1, duplicates: 2 });
    const stored = new MockDatabase(seedData, storage).state.events;
    expect(stored.filter((e) => e.sessionId === SESSION)).toHaveLength(3);
  });

  it('keeps events in sequence order within the session', async () => {
    await json('POST', '/events', { events: [event(3, 2), event(1, 0)] });
    await json('POST', '/events', { events: [event(2, 1)] });

    const stored = new MockDatabase(seedData, storage).state.events;
    expect(stored.filter((e) => e.sessionId === SESSION).map((e) => e.sequence)).toEqual([0, 1, 2]);
  });

  it('refuses events for a session that was never started', async () => {
    const stray = { ...event(4, 0), sessionId: '0192f4c1-0000-7000-8000-000000005999' };
    const { status, body } = await json('POST', '/events', { events: [stray] });

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { problems: [{ path: 'events.0.sessionId' }] } });
  });
});

describe('today’s play and more time (ADR 0022)', () => {
  // An hour after the session below began: still 20 October in Robin's time zone (London).
  beforeEach(() => {
    clock = () => Date.parse(AT) + 60 * 60_000;
  });

  /** An eight-minute session for Robin, sent to the mock API. */
  async function playEightMinutes() {
    await json('POST', '/sessions', startSession());
    const envelope = (sequence: number, minutes: number) => ({
      id: `0192f4c1-0000-7000-8000-00000000${String(7000 + sequence)}`,
      sessionId: SESSION,
      sequence,
      occurredAt: new Date(Date.parse(AT) + minutes * 60_000).toISOString(),
      schemaVersion: 1,
    });
    await json('POST', '/events', {
      events: [
        {
          ...envelope(0, 0),
          type: 'session_started',
          activityId: 'hop-line-add-within-20',
          gameId: 'hop-line',
          gameVersion: '0.1.0',
          contentRelease: 'mock-2026-10-20',
          mode: 'practice',
          policyVersion: 'placeholder-2',
        },
        { ...envelope(1, 8), type: 'session_completed' },
      ],
    });
  }

  it('the snapshot says how much the child has played today and may play', async () => {
    await playEightMinutes();
    const snapshot = ChildSnapshot.parse((await json('GET', `/children/${ROBIN}/snapshot`)).body);

    expect(snapshot.playToday).toEqual({
      date: '2026-10-20',
      playedSeconds: 8 * 60,
      allowedSeconds: snapshot.settings.dailyLimitMinutes * 60,
    });
  });

  it('POST /children/:id/extra-time allows more today, and a reload keeps it', async () => {
    const before = ChildSnapshot.parse((await json('GET', `/children/${ROBIN}/snapshot`)).body);
    const { status, body } = await json('POST', `/children/${ROBIN}/extra-time`, { minutes: 10 });

    expect(status).toBe(200);
    expect(body).toMatchObject({ allowedSeconds: before.playToday.allowedSeconds + 10 * 60 });
    const after = ChildSnapshot.parse((await json('GET', `/children/${ROBIN}/snapshot`)).body);
    expect(after.playToday.allowedSeconds).toBe(before.playToday.allowedSeconds + 10 * 60);
  });

  it('refuses extra time outside 5 to 60 minutes', async () => {
    const { status, body } = await json('POST', `/children/${ROBIN}/extra-time`, { minutes: 3 });

    expect(status).toBe(400);
    expect(body).toMatchObject({ error: { code: 'invalid-request' } });
  });
});

describe('failure modes', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('offline: a network error, with no response at all', async () => {
    controls = { latency: 'none', failure: 'offline' };

    const response = await api('GET', '/catalog');
    expect(response?.type).toBe('error');
  });

  it('server error: a 500 in the standard error shape', async () => {
    controls = { latency: 'none', failure: 'server-error' };

    const { status, body } = await json('GET', '/catalog');
    expect(status).toBe(500);
    expect(body).toMatchObject({ error: { code: 'server-error' } });
  });

  it('slow: answers only after the delay', async () => {
    vi.useFakeTimers();
    controls = { latency: 'slow', failure: 'none' };
    let answered = false;
    const pending = api('GET', '/catalog').then((response) => {
      answered = true;
      return response;
    });

    await vi.advanceTimersByTimeAsync(SLOW_MS - 100);
    expect(answered).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    expect((await pending)?.status).toBe(200);
  });
});
