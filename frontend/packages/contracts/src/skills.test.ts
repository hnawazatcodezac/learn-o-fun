import { describe, expect, it } from 'vitest';
import { Skill, SkillGraph, SkillPrerequisite } from './skills';
import { problems } from './testing';

function skill(id: string) {
  return {
    id,
    subjectId: 'mathematics',
    strand: 'addition',
    title: { en: id },
    masteryDifficulty: 0.5,
    uncertaintyThreshold: 0.3,
    broad: false,
    fluency: false,
  };
}

describe('Skill', () => {
  it('accepts a skill, with or without a learning language', () => {
    expect(problems(Skill, skill('add-within-10'))).toEqual([]);
    expect(
      problems(Skill, {
        ...skill('blend-cvc-words'),
        subjectId: 'literacy',
        learningLanguage: 'en',
      }),
    ).toEqual([]);
  });

  it('needs a positive uncertainty threshold', () => {
    expect(problems(Skill, { ...skill('add-within-10'), uncertaintyThreshold: 0 })[0]?.path).toBe(
      'uncertaintyThreshold',
    );
  });
});

describe('SkillPrerequisite', () => {
  it('rejects a skill that is its own prerequisite', () => {
    expect(problems(SkillPrerequisite, { skillId: 'a', prerequisiteId: 'a' })).toEqual([
      { path: 'prerequisiteId', message: 'A skill cannot be its own prerequisite' },
    ]);
  });
});

describe('SkillGraph', () => {
  const skills = ['count-to-20', 'add-within-10', 'add-within-20'].map(skill);
  const strands = [{ id: 'addition', subjectId: 'mathematics', title: { en: 'Addition' } }];

  it('accepts a graph whose prerequisites form a DAG', () => {
    expect(
      problems(SkillGraph, {
        strands,
        skills,
        prerequisites: [
          { skillId: 'add-within-10', prerequisiteId: 'count-to-20' },
          { skillId: 'add-within-20', prerequisiteId: 'add-within-10' },
          { skillId: 'add-within-20', prerequisiteId: 'count-to-20' },
        ],
      }),
    ).toEqual([]);
  });

  it('names the skills in a cycle', () => {
    expect(
      problems(SkillGraph, {
        strands,
        skills,
        prerequisites: [
          { skillId: 'add-within-10', prerequisiteId: 'count-to-20' },
          { skillId: 'add-within-20', prerequisiteId: 'add-within-10' },
          { skillId: 'count-to-20', prerequisiteId: 'add-within-20' },
        ],
      }),
    ).toEqual([
      {
        path: 'prerequisites',
        message:
          'Prerequisites form a cycle: add-within-10 → count-to-20 → add-within-20 → add-within-10',
      },
    ]);
  });

  it('needs every skill in a listed strand of its own subject (ADR 0028)', () => {
    expect(problems(SkillGraph, { strands: [], skills, prerequisites: [] })[0]?.path).toBe(
      'strands',
    );
    const reading = [{ id: 'addition', subjectId: 'literacy', title: { en: 'Reading' } }];
    expect(problems(SkillGraph, { strands: reading, skills, prerequisites: [] })[0]).toEqual({
      path: 'skills.0.strand',
      message: 'Skill count-to-20 is mathematics, but strand addition is literacy',
    });
    const other = [{ id: 'counting', subjectId: 'mathematics', title: { en: 'Counting' } }];
    expect(problems(SkillGraph, { strands: other, skills, prerequisites: [] })[0]?.message).toBe(
      'Skill count-to-20 is in strand addition, which is not listed',
    );
  });

  it('points at prerequisites naming unknown skills', () => {
    expect(
      problems(SkillGraph, {
        strands,
        skills,
        prerequisites: [{ skillId: 'multiply-by-2', prerequisiteId: 'add-within-20' }],
      }),
    ).toEqual([{ path: 'prerequisites.0.skillId', message: 'Unknown skill multiply-by-2' }]);
  });

  it('rejects a skill listed twice', () => {
    expect(
      problems(SkillGraph, {
        strands,
        skills: [...skills, skill('add-within-10')],
        prerequisites: [],
      }),
    ).toEqual([{ path: 'skills.3', message: 'Skill add-within-10 appears more than once' }]);
  });
});
