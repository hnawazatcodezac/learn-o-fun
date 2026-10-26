import { z } from 'zod';
import { checkUnique, ContentId, Locale, LocalizedText } from './common';

/** The six subjects in the game library. The first release covers mathematics and literacy. */
export const SUBJECTS = ['mathematics', 'literacy', 'logic', 'coding', 'science', 'arts'] as const;
export const SubjectId = z.enum(SUBJECTS);

/** The smallest unit of learning the system tracks, such as "add two numbers within 10". */
export const Skill = z.object({
  id: ContentId,
  subjectId: SubjectId,
  /** A group of related skills within the subject, such as `addition`. */
  strand: ContentId,
  title: LocalizedText,
  /**
   * Set for language-specific skills (phonics, spelling, grammar, reading), which form a separate
   * subgraph per learning language (plan 7.3). Absent for language-neutral skills such as maths.
   */
  learningLanguage: Locale.optional(),
  /** The item difficulty at which mastery is judged (plan 4.1). */
  masteryDifficulty: z.number(),
  /** Mastery needs the ability's uncertainty below this. */
  uncertaintyThreshold: z.number().positive(),
  /** Broad skills need evidence from at least two activities before mastery (plan 4.1). */
  broad: z.boolean(),
  /** Fluency skills may use timers from age 7 and get a fluency flag (plan 5.3). */
  fluency: z.boolean(),
});

/** A group of related skills within a subject, such as Counting, named for parents (ADR 0028). */
export const Strand = z.object({
  id: ContentId,
  subjectId: SubjectId,
  title: LocalizedText,
});

/** `skillId` builds on `prerequisiteId`. */
export const SkillPrerequisite = z
  .object({ skillId: ContentId, prerequisiteId: ContentId })
  .refine((edge) => edge.skillId !== edge.prerequisiteId, {
    error: 'A skill cannot be its own prerequisite',
    path: ['prerequisiteId'],
  });

/** Finds one cycle in the prerequisite edges, as a list of skill IDs, or returns undefined. */
function findCycle(edges: readonly SkillPrerequisite[]): string[] | undefined {
  const next = new Map<string, string[]>();
  for (const { skillId, prerequisiteId } of edges) {
    next.set(skillId, [...(next.get(skillId) ?? []), prerequisiteId]);
  }
  const done = new Set<string>();
  const path: string[] = [];
  const visit = (id: string): string[] | undefined => {
    const start = path.indexOf(id);
    if (start !== -1) return [...path.slice(start), id];
    if (done.has(id)) return undefined;
    path.push(id);
    for (const prerequisite of next.get(id) ?? []) {
      const cycle = visit(prerequisite);
      if (cycle) return cycle;
    }
    path.pop();
    done.add(id);
    return undefined;
  };
  for (const id of next.keys()) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return undefined;
}

/** Skills and their prerequisites. The prerequisites must form a directed acyclic graph (plan 3.3). */
export const SkillGraph = z
  .object({
    strands: z.array(Strand).min(1),
    skills: z.array(Skill).min(1),
    prerequisites: z.array(SkillPrerequisite),
  })
  .superRefine((graph, context) => {
    checkUnique(graph.strands, context, (strand) => `Strand ${strand.id}`, ['strands']);
    checkUnique(graph.skills, context, (skill) => `Skill ${skill.id}`, ['skills']);
    // Every skill is in a listed strand of its own subject.
    graph.skills.forEach((skill, index) => {
      const strand = graph.strands.find((candidate) => candidate.id === skill.strand);
      if (!strand || strand.subjectId !== skill.subjectId) {
        context.addIssue({
          code: 'custom',
          message: strand
            ? `Skill ${skill.id} is ${skill.subjectId}, but strand ${strand.id} is ${strand.subjectId}`
            : `Skill ${skill.id} is in strand ${skill.strand}, which is not listed`,
          path: ['skills', index, 'strand'],
        });
      }
    });
    const known = new Set(graph.skills.map((skill) => skill.id));
    graph.prerequisites.forEach((edge, index) => {
      for (const key of ['skillId', 'prerequisiteId'] as const) {
        if (!known.has(edge[key])) {
          context.addIssue({
            code: 'custom',
            message: `Unknown skill ${edge[key]}`,
            path: ['prerequisites', index, key],
          });
        }
      }
    });
    const cycle = findCycle(graph.prerequisites);
    if (cycle) {
      context.addIssue({
        code: 'custom',
        message: `Prerequisites form a cycle: ${cycle.join(' → ')}`,
        path: ['prerequisites'],
      });
    }
  });

export type SubjectId = z.infer<typeof SubjectId>;
export type Skill = z.infer<typeof Skill>;
export type Strand = z.infer<typeof Strand>;
export type SkillPrerequisite = z.infer<typeof SkillPrerequisite>;
export type SkillGraph = z.infer<typeof SkillGraph>;
