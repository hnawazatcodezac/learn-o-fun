import { z } from 'zod';
import { ExperienceBand } from './bands';
import { checkUnique, ContentId, Locale, LocalizedText, Market } from './common';
import { SubjectId } from './skills';

/** A school year within a market's grade scheme, such as Year 3 (plan 7.4). */
export const Grade = z.object({
  id: ContentId,
  name: LocalizedText,
});

/** A market's school years, youngest first (plan 7.4). Each market configures its own. */
export const GradeScheme = z.object({
  id: ContentId,
  grades: z
    .array(Grade)
    .min(1, { error: 'A grade scheme has at least one grade' })
    .superRefine((grades, context) => {
      checkUnique(grades, context, (grade) => `Grade ${grade.id}`);
    }),
});

/**
 * An experience band in a market: the ages it covers and the subjects it offers there (plan 7.4,
 * ADR 0027). A child's age picks the band.
 */
export const AgeBand = z
  .object({
    band: ExperienceBand,
    minAge: z.int().min(0),
    maxAge: z.int().min(0),
    subjects: z
      .array(SubjectId)
      .min(1, { error: 'A band offers at least one subject' })
      .superRefine((subjects, context) => {
        checkUnique(subjects, context, (subject) => `Subject ${subject}`);
      }),
  })
  .refine((band) => band.minAge <= band.maxAge, {
    error: 'A band’s youngest age is at most its oldest',
    path: ['maxAge'],
  });

/**
 * GET /api/markets/:market: what a market configures for child profiles (plan 7.4): the
 * languages content is delivered in there, the default curriculum, the grade scheme and the
 * experience bands. Data, not code, so a new market changes no code.
 */
export const MarketConfig = z.object({
  market: Market,
  /** The first is the default for a new child. */
  learningLanguages: z
    .array(Locale)
    .min(1, { error: 'A market offers at least one learning language' })
    .superRefine((locales, context) => {
      checkUnique(locales, context, (locale) => `Learning language ${locale}`);
    }),
  defaultCurriculumId: ContentId,
  gradeScheme: GradeScheme,
  /** Youngest first, with no age in two bands. */
  ageBands: z
    .array(AgeBand)
    .min(1, { error: 'A market has at least one experience band' })
    .superRefine((bands, context) => {
      checkUnique(bands, context, (band) => `Band ${band.band}`);
      bands.forEach((band, index) => {
        const previous = bands[index - 1];
        if (previous && band.minAge <= previous.maxAge) {
          context.addIssue({
            code: 'custom',
            message: `Band ${band.band} starts at ${String(band.minAge)}, within the band before it`,
            path: [index, 'minAge'],
          });
        }
      });
    }),
});

/**
 * The band for a child's age in a market: the last band that starts at or below it, or the
 * youngest. So a child who has grown past the bands keeps the oldest until older ones exist.
 */
export function bandForAge(market: Pick<MarketConfig, 'ageBands'>, age: number): AgeBand {
  const [youngest, ...older] = market.ageBands;
  if (!youngest) throw new Error('A market has at least one experience band');
  return older.reduce((chosen, band) => (age >= band.minAge ? band : chosen), youngest);
}

export type Grade = z.infer<typeof Grade>;
export type GradeScheme = z.infer<typeof GradeScheme>;
export type AgeBand = z.infer<typeof AgeBand>;
export type MarketConfig = z.infer<typeof MarketConfig>;
