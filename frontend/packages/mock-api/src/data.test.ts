import { templateMaker } from '@learnofun/learning-core';
import { describe, expect, it } from 'vitest';
import seedJson from './data/mock-data.json';
import { parseMockData, seedData } from './data';

describe('the mock data file', () => {
  it('passes every contract and reference check', () => {
    expect(() => parseMockData(seedJson)).not.toThrow();
  });

  it('is served as it is: checking it changes nothing, so a page need not check it again', () => {
    expect(parseMockData(seedJson)).toStrictEqual(seedJson);
    expect(seedData).toBe(seedJson);
  });

  it('marks the skill graph as a draft for learning-designer review', () => {
    expect(seedJson.meta.skillGraph.status).toBe('draft');
    expect(seedJson.meta.skillGraph.note).toMatch(/learning designer/);
  });

  it('has 25 maths skills, and activities for the slice games', () => {
    const { skills } = seedData.catalog.skillGraph;
    expect(skills.filter((s) => s.subjectId === 'mathematics')).toHaveLength(25);
    expect(new Set(seedData.catalog.activities.map((a) => a.gameId))).toEqual(
      new Set(['hop-line', 'ten-frame-cafe', 'tile-farm']),
    );
  });

  it('has draft early-English skills, in English, with no activities yet (ADR 0027)', () => {
    const literacy = seedData.catalog.skillGraph.skills.filter((s) => s.subjectId === 'literacy');
    const ids = new Set(literacy.map((skill) => skill.id));

    expect(literacy).toHaveLength(5);
    expect(literacy.every((skill) => skill.learningLanguage === 'en')).toBe(true);
    expect(seedJson.meta.skillGraph.note).toMatch(/early-English/);
    expect(
      seedData.catalog.activities.some((a) => a.targetSkillIds.some((id) => ids.has(id))),
    ).toBe(false);
  });

  it('gives GB the release’s bands: maths from 3, and literacy too from 6 (ADR 0027)', () => {
    expect(seedData.markets[0]?.ageBands).toEqual([
      { band: 'early-years', minAge: 3, maxAge: 5, subjects: ['mathematics'] },
      { band: 'early-primary', minAge: 6, maxAge: 8, subjects: ['mathematics', 'literacy'] },
    ]);
  });

  it('checks that the bands cover the profile ages and offer subjects with skills', () => {
    const short = structuredClone(seedJson);
    short.markets[0]?.ageBands.pop();
    expect(() => parseMockData(short)).toThrow(/bands do not cover ages 3 to 8/);

    const noSkills = structuredClone(seedJson);
    noSkills.markets[0]?.ageBands[1]?.subjects.push('science');
    expect(() => parseMockData(noSkills)).toThrow(/offers science, which has no skills/);
  });

  it('checks that a child has at most one goal, naming a skill that exists', () => {
    const twice = structuredClone(seedJson);
    const [goal] = twice.goals;
    if (goal) twice.goals.push({ ...goal, id: '0192f4c1-0000-7000-8000-00000000d002' });
    expect(() => parseMockData(twice)).toThrow(/Goal for child .* appears more than once/);

    const unknown = structuredClone(seedJson);
    const [first] = unknown.goals;
    if (first) Object.assign(first, { skillId: 'no-such-skill' });
    expect(() => parseMockData(unknown)).toThrow(/Unknown skill no-such-skill/);
  });

  it('has two families and three children, aged 6, 7 and 8 in October 2026 (ADR 0025)', () => {
    expect(seedData.families).toHaveLength(2);
    expect(seedData.accounts).toHaveLength(2);
    const ages = seedData.children.map(
      (child) => 2026 - child.birthYear - (child.birthMonth > 10 ? 1 : 0),
    );
    expect(ages.sort()).toEqual([6, 7, 8]);
  });

  it('fails loudly, naming the problem, when a reference is broken', () => {
    const broken = structuredClone(seedJson);
    const first = broken.sessionScripts[0];
    if (first) first.activityId = 'no-such-activity';

    expect(() => parseMockData(broken)).toThrow(/Unknown activity no-such-activity/);
  });

  it('releases the three games, and only games with something to play (ADR 0035)', () => {
    expect(seedData.catalog.games).toEqual(['hop-line', 'ten-frame-cafe', 'tile-farm']);
    const broken = structuredClone(seedJson);
    broken.catalog.games.push('no-such-game');
    expect(() => parseMockData(broken)).toThrow(/Game no-such-game is in the release/);
  });

  it('marks the GB grade scheme as a draft, with the school years for ages 3 to 8 (ADR 0026)', () => {
    expect(seedJson.meta.markets).toMatch(/draft/);
    const [market] = seedData.markets;
    expect(market?.market).toBe('GB');
    expect(market?.learningLanguages).toEqual(['en']);
    expect(market?.gradeScheme.grades.map((grade) => grade.id)).toEqual([
      'nursery',
      'reception',
      'year-1',
      'year-2',
      'year-3',
      'year-4',
    ]);
  });

  it('checks that every family’s market is configured', () => {
    const broken = structuredClone(seedJson);
    const [family] = broken.families;
    if (family) family.market = 'FR';

    expect(() => parseMockData(broken)).toThrow(/is in market FR, which has no config/);
  });

  it('checks each child’s grade and learning language against their family’s market', () => {
    const badGrade = structuredClone(seedJson);
    const [first] = badGrade.children;
    if (first) first.grade = 'year-9';
    expect(() => parseMockData(badGrade)).toThrow(/Grade year-9 is not in england-school-years/);

    const badLanguage = structuredClone(seedJson);
    const [second] = badLanguage.children;
    if (second) second.learningLanguage = 'fr';
    expect(() => parseMockData(badLanguage)).toThrow(/Learning language fr is not offered in GB/);
  });

  it('has the item templates of the three games, and the misconceptions they point to', () => {
    expect(seedData.catalog.itemTemplates.map((template) => template.id)).toEqual([
      'hop-line-addition',
      'ten-frame-counting',
      'ten-frame-bonds-10',
      'ten-frame-make-ten',
      'tile-farm-groups',
      'tile-farm-arrays',
    ]);
    expect(seedData.catalog.misconceptions.map((misconception) => misconception.id)).toEqual([
      'counts-the-start',
      'extra-hop',
      'goes-to-the-number',
      'hops-backwards',
      'counts-one-twice',
      'gives-the-part',
      'counts-all',
      'stops-at-ten',
      'counts-moved-twice',
      'adds-the-numbers',
      'counts-one-row',
      'counts-the-rows',
      'skips-a-row',
    ]);
  });

  it('makes every item template’s levels harder in order, for the policy to aim with (ADR 0032)', () => {
    for (const template of seedData.catalog.itemTemplates) {
      const { levelDifficulty } = templateMaker(template);
      levelDifficulty.slice(1).forEach((difficulty, index) => {
        expect(difficulty, `${template.id} level ${String(index + 1)}`).toBeGreaterThan(
          levelDifficulty[index] ?? Infinity,
        );
      });
    }
  });

  it('lets making ten give evidence for adding within 20, a second game for it (ADR 0037)', () => {
    const makeTen = seedData.catalog.activities.find((a) => a.id === 'ten-frame-cafe-make-ten');
    expect(makeTen?.targetSkillIds).toContain('add-within-20');
    const games = new Set(
      seedData.catalog.activities
        .filter((activity) => activity.targetSkillIds.includes('add-within-20'))
        .map((activity) => activity.gameId),
    );
    expect([...games].sort()).toEqual(['hop-line', 'ten-frame-cafe']);
  });

  it('checks the skills and misconceptions an item template names', () => {
    const broken = structuredClone(seedJson);
    const [template] = broken.catalog.itemTemplates;
    if (!template) throw new Error('The data file has no item template');
    template.skillIds = ['no-such-skill'];
    template.misconceptions.extraHop = 'no-such-misconception';

    expect(() => parseMockData(broken)).toThrow(/Unknown skill no-such-skill/);
    expect(() => parseMockData(broken)).toThrow(/Unknown misconception no-such-misconception/);
  });

  it('checks the times-table skills a field template names (ADR 0038)', () => {
    const broken = structuredClone(seedJson);
    const arrays = broken.catalog.itemTemplates.find(
      (template) => template.id === 'tile-farm-arrays',
    ) as unknown as { timesTables: { skillIds: string[] } } | undefined;
    if (!arrays) throw new Error('The data file has no arrays template');
    arrays.timesTables.skillIds = ['no-such-table'];

    expect(() => parseMockData(broken)).toThrow(/Unknown skill no-such-table/);
  });

  it('checks the skill each misconception belongs to', () => {
    const broken = structuredClone(seedJson);
    const [misconception] = broken.catalog.misconceptions;
    if (!misconception) throw new Error('The data file has no misconception');
    misconception.skillId = 'no-such-skill';

    expect(() => parseMockData(broken)).toThrow(/Unknown skill no-such-skill/);
  });

  it('checks that every child’s time limits are among the steps (ADR 0027)', () => {
    const offStep = structuredClone(seedJson);
    const [first] = offStep.settings;
    if (first) first.sessionMinutes = 8;

    expect(() => parseMockData(offStep)).toThrow(/sessionMinutes 8 is not one of the steps/);
  });

  it('fails loudly when a record breaks its contract', () => {
    const broken = structuredClone(seedJson) as unknown as { children: { birthMonth: number }[] };
    const first = broken.children[0];
    if (first) first.birthMonth = 13;

    expect(() => parseMockData(broken)).toThrow(/children\[0\]\.birthMonth/);
  });
});
