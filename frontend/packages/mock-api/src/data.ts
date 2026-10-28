import {
  BREAK_REMINDER_STEPS,
  CatalogResponse,
  type ItemTemplate,
  DAILY_LIMIT_STEPS,
  PROFILE_AGES,
  SESSION_MINUTE_STEPS,
  ChildProfile,
  ChildSettings,
  ConsentRecord,
  ContentId,
  Entitlements,
  Family,
  Features,
  LearningGoal,
  MarketConfig,
  Mode,
  ParentAccount,
  Timestamp,
  Uuidv7,
} from '@learnofun/contracts';
import { z } from 'zod';
import seedJson from './data/mock-data.json';

/** The records the mock API serves and changes: everything in the data file except the catalog. */
export const MockRecords = z.object({
  accounts: z.array(ParentAccount),
  families: z.array(Family),
  children: z.array(ChildProfile),
  settings: z.array(ChildSettings),
  goals: z.array(LearningGoal),
  entitlements: z.array(Entitlements),
  /** Every consent given, oldest first; the latest for a family applies (plan 8.4, ADR 0046). */
  consents: z.array(ConsentRecord),
});
// Skill states are not here: the learner model works them out from the events (ADR 0031).

/** How a scripted item went (ADR 0028): right first time, right on the second try, right after a hint, shown a worked example, or skipped. */
export const SCRIPT_OUTCOMES = ['first-try', 'second-try', 'hint', 'show-me', 'skipped'] as const;
export const ScriptOutcome = z.enum(SCRIPT_OUTCOMES);

/**
 * A past session as a script (ADR 0025, ADR 0028): when it started, the activity, and how each
 * item went, skill by skill. The mock API plays it through the session engine into events. A
 * group's items sit at the skill's mastery difficulty, or `aboveMastery` above it, as the
 * in-session policy serves a child doing well (ADR 0034).
 */
export const SessionScript = z.object({
  childId: Uuidv7,
  activityId: ContentId,
  mode: Mode,
  startedAt: Timestamp,
  items: z
    .array(
      z.object({
        skillId: ContentId,
        outcomes: z.array(ScriptOutcome).min(1),
        aboveMastery: z.number().optional(),
      }),
    )
    .min(1),
});

export type ScriptOutcome = z.infer<typeof ScriptOutcome>;
export type SessionScript = z.infer<typeof SessionScript>;

type Issue = (message: string, path: (string | number)[]) => void;

function checkUnique(
  ids: readonly string[],
  kind: string,
  path: (string | number)[],
  issue: Issue,
) {
  const seen = new Set<string>();
  ids.forEach((id, index) => {
    if (seen.has(id)) issue(`${kind} ${id} appears more than once`, [...path, index]);
    seen.add(id);
  });
}

/** Cross-checks that every reference in the data points at something that exists. */
/** The skills some of a template's items assess besides its `skillIds`. */
function conditionalSkillIds(template: ItemTemplate): string[] {
  switch (template.generator) {
    case 'number-line-addition':
      // Sums within ten.
      return template.skillIdsWithinTen;
    case 'field-equal-groups':
    case 'field-array':
      // Rows of a times-table length.
      return template.timesTables?.skillIds ?? [];
    default:
      return [];
  }
}

function checkReferences(data: MockData, issue: Issue) {
  const { catalog, accounts, families, children, settings, goals } = data;
  const skills = new Set(catalog.skillGraph.skills.map((skill) => skill.id));
  const activities = new Map(catalog.activities.map((activity) => [activity.id, activity]));
  const childIds = new Set(children.map((child) => child.id));

  // A game in the release has something to play (ADR 0035).
  catalog.games.forEach((game, index) => {
    if (!catalog.activities.some((activity) => activity.gameId === game)) {
      issue(`Game ${game} is in the release but has no activity`, ['catalog', 'games', index]);
    }
  });
  checkUnique(
    catalog.activities.map((a) => a.id),
    'Activity',
    ['catalog', 'activities'],
    issue,
  );
  checkUnique(
    accounts.map((a) => a.id),
    'Account',
    ['accounts'],
    issue,
  );
  checkUnique(
    families.map((f) => f.id),
    'Family',
    ['families'],
    issue,
  );
  checkUnique(
    children.map((c) => c.id),
    'Child',
    ['children'],
    issue,
  );

  catalog.activities.forEach((activity, index) => {
    activity.targetSkillIds.forEach((skillId, skillIndex) => {
      if (!skills.has(skillId)) {
        issue(`Unknown skill ${skillId}`, [
          'catalog',
          'activities',
          index,
          'targetSkillIds',
          skillIndex,
        ]);
      }
    });
  });

  // Item templates name skills and misconceptions, and every misconception names its skill.
  const misconceptions = new Set(catalog.misconceptions.map((misconception) => misconception.id));
  catalog.misconceptions.forEach((misconception, index) => {
    if (!skills.has(misconception.skillId)) {
      issue(`Unknown skill ${misconception.skillId}`, [
        'catalog',
        'misconceptions',
        index,
        'skillId',
      ]);
    }
  });
  catalog.itemTemplates.forEach((template, index) => {
    const path = ['catalog', 'itemTemplates', index];
    const skillIds = [...template.skillIds, ...conditionalSkillIds(template)];
    for (const skillId of new Set(skillIds)) {
      if (!skills.has(skillId)) issue(`Unknown skill ${skillId}`, path);
    }
    for (const misconceptionId of Object.values(template.misconceptions)) {
      if (!misconceptions.has(misconceptionId)) {
        issue(`Unknown misconception ${misconceptionId}`, [...path, 'misconceptions']);
      }
    }
  });

  checkUnique(
    data.markets.map((m) => m.market),
    'Market',
    ['markets'],
    issue,
  );
  const markets = new Map(data.markets.map((market) => [market.market, market]));
  const subjectsWithSkills = new Set(catalog.skillGraph.skills.map((skill) => skill.subjectId));
  data.markets.forEach((market, index) => {
    // Every age a profile can be made for has a band, and every band's subjects have skills.
    const first = market.ageBands[0];
    const last = market.ageBands[market.ageBands.length - 1];
    if (!first || !last || first.minAge > PROFILE_AGES.min || last.maxAge < PROFILE_AGES.max) {
      issue(
        `Market ${market.market}'s bands do not cover ages ${String(PROFILE_AGES.min)} to ${String(PROFILE_AGES.max)}`,
        ['markets', index, 'ageBands'],
      );
    }
    market.ageBands.forEach((band, bandIndex) => {
      band.subjects.forEach((subject, subjectIndex) => {
        if (!subjectsWithSkills.has(subject)) {
          issue(`Band ${band.band} offers ${subject}, which has no skills`, [
            'markets',
            index,
            'ageBands',
            bandIndex,
            'subjects',
            subjectIndex,
          ]);
        }
      });
    });
  });

  const accountIds = new Set(accounts.map((account) => account.id));
  families.forEach((family, index) => {
    if (!markets.has(family.market)) {
      issue(`Family ${family.id} is in market ${family.market}, which has no config`, [
        'families',
        index,
      ]);
    }
    family.members.forEach((member, memberIndex) => {
      if (!accountIds.has(member.accountId)) {
        issue(`Unknown account ${member.accountId}`, ['families', index, 'members', memberIndex]);
      }
    });
    const entitlement = data.entitlements.find((e) => e.familyId === family.id);
    if (!entitlement) {
      issue(`Family ${family.id} has no entitlements`, ['families', index]);
      return;
    }
    const count = children.filter((child) => child.familyId === family.id).length;
    if (count > entitlement.features['children.max']) {
      issue(`Family ${family.id} has more children than children.max allows`, ['families', index]);
    }
  });

  const familyIds = new Set(families.map((family) => family.id));
  children.forEach((child, index) => {
    if (!familyIds.has(child.familyId))
      issue(`Unknown family ${child.familyId}`, ['children', index]);
    // A child's grade and learning language come from their family's market (ADR 0026).
    const market = markets.get(families.find((f) => f.id === child.familyId)?.market ?? '');
    if (market && !market.learningLanguages.includes(child.learningLanguage)) {
      issue(`Learning language ${child.learningLanguage} is not offered in ${market.market}`, [
        'children',
        index,
        'learningLanguage',
      ]);
    }
    if (market && child.grade && !market.gradeScheme.grades.some((g) => g.id === child.grade)) {
      issue(`Grade ${child.grade} is not in ${market.gradeScheme.id}`, [
        'children',
        index,
        'grade',
      ]);
    }
    if (!settings.some((s) => s.childId === child.id)) {
      issue(`Child ${child.id} has no settings`, ['children', index]);
    }
  });

  const unknownChild = (records: readonly { childId: string }[], path: string) => {
    records.forEach((record, index) => {
      if (!childIds.has(record.childId)) issue(`Unknown child ${record.childId}`, [path, index]);
    });
  };
  unknownChild(settings, 'settings');
  // Time limits are one of the steps a parent can choose (ADR 0027).
  const steps = {
    sessionMinutes: SESSION_MINUTE_STEPS,
    dailyLimitMinutes: DAILY_LIMIT_STEPS,
    breakReminderMinutes: BREAK_REMINDER_STEPS,
  } as const satisfies Record<string, readonly number[]>;
  settings.forEach((setting, index) => {
    for (const [key, choices] of Object.entries(steps)) {
      const value = setting[key as keyof typeof steps];
      if (!(choices as readonly number[]).includes(value)) {
        issue(`${key} ${String(value)} is not one of the steps`, ['settings', index, key]);
      }
    }
  });
  unknownChild(goals, 'goals');
  goals.forEach((goal, index) => {
    if (goal.skillId !== undefined && !skills.has(goal.skillId)) {
      issue(`Unknown skill ${goal.skillId}`, ['goals', index, 'skillId']);
    }
  });
  checkUnique(
    goals.map((goal) => goal.childId),
    'Goal for child',
    ['goals'],
    issue,
  );

  checkUnique(
    settings.map((s) => s.childId),
    'Settings for child',
    ['settings'],
    issue,
  );

  // A consent names a family and one of its members.
  data.consents.forEach((consent, index) => {
    const family = families.find((candidate) => candidate.id === consent.familyId);
    if (!family) issue(`Unknown family ${consent.familyId}`, ['consents', index, 'familyId']);
    else if (!family.members.some((member) => member.accountId === consent.accountId)) {
      issue(`Account ${consent.accountId} is not in family ${family.id}`, [
        'consents',
        index,
        'accountId',
      ]);
    }
  });

  // A script plays an activity the child's family can play, practising skills it targets.
  data.sessionScripts.forEach((script, index) => {
    const child = children.find((candidate) => candidate.id === script.childId);
    if (!child) issue(`Unknown child ${script.childId}`, ['sessionScripts', index, 'childId']);
    const activity = activities.get(script.activityId);
    if (!activity) {
      issue(`Unknown activity ${script.activityId}`, ['sessionScripts', index, 'activityId']);
      return;
    }
    const tier = data.entitlements.find((e) => e.familyId === child?.familyId)?.features[
      'activities.tier'
    ];
    if (activity.tier === 'premium' && tier !== 'premium') {
      issue(`Activity ${activity.id} needs the premium plan`, ['sessionScripts', index]);
    }
    script.items.forEach((group, groupIndex) => {
      if (!activity.targetSkillIds.includes(group.skillId)) {
        issue(`Activity ${activity.id} does not target ${group.skillId}`, [
          'sessionScripts',
          index,
          'items',
          groupIndex,
          'skillId',
        ]);
      }
    });
  });
}

/**
 * The single mock data file (ADR 0001): a free-form `meta` block for notes, the catalog, and the
 * records. Every record must pass its contract, and every reference must resolve.
 */
export const MockData = z
  .object({
    meta: z.record(z.string(), z.unknown()),
    catalog: CatalogResponse,
    /** Each market's configuration (plan 7.4): read-only, like the catalog. */
    markets: z.array(MarketConfig),
    /** Past sessions, played into events when the mock API starts (ADR 0028). */
    sessionScripts: z.array(SessionScript),
    /** What a family that signs up starts with, until plans come as data (step 17, ADR 0046). */
    freePlanFeatures: Features,
    ...MockRecords.shape,
  })
  .superRefine((data, context) => {
    checkReferences(data, (message, path) => {
      context.addIssue({ code: 'custom', message, path });
    });
  });

export type MockRecords = z.infer<typeof MockRecords>;
export type MockData = z.infer<typeof MockData>;

/** Parses mock data, failing loudly with every problem listed. */
export function parseMockData(value: unknown): MockData {
  const result = MockData.safeParse(value);
  if (!result.success) {
    throw new Error(`The mock data file is invalid:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/**
 * `src/data/mock-data.json`. A unit test checks it against every contract and reference, and that
 * checking leaves it unchanged, so a page uses it as it is rather than checking it again on every
 * load, which kept a first visit waiting (ADR 0040).
 */
export const seedData = seedJson as unknown as MockData;
