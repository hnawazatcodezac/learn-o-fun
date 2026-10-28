import { z } from 'zod';

/**
 * IDs of records created while the app runs: families, children, sessions, events and the
 * rest. Devices create session and event IDs themselves (CLAUDE.md rule 8).
 */
export const Uuidv7 = z.uuidv7({ error: 'Expected a UUIDv7 string' });

/**
 * IDs of content written in the repo, such as skills, activities, games and items: lowercase
 * words and digits joined by single hyphens, for example `add-within-20` (ADR 0009).
 */
export const ContentId = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
  error: 'Expected a content ID: lowercase letters and digits joined by single hyphens',
});

/** A moment in time: an ISO 8601 string in UTC, ending in Z (CLAUDE.md rule 8). */
export const Timestamp = z.iso.datetime({
  error: 'Expected an ISO 8601 timestamp in UTC, ending in Z',
});

/** A calendar date, YYYY-MM-DD. */
export const IsoDate = z.iso.date({ error: 'Expected a date as YYYY-MM-DD' });

/** Language (ISO 639), optional script, optional region: en, en-GB, zh-Hant-TW, es-419. */
const LOCALE_SHAPE = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-(?:[A-Z]{2}|\d{3}))?$/;

function isCanonicalLocale(value: string): boolean {
  // Intl accepts any well-formed tag, even "english", so check the shape first.
  if (!LOCALE_SHAPE.test(value)) return false;
  try {
    return Intl.getCanonicalLocales(value)[0] === value;
  } catch {
    return false;
  }
}

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** A BCP 47 language tag in canonical form, such as `en`, `en-GB` or `ar-AE`. */
export const Locale = z.string().refine(isCanonicalLocale, {
  error: 'Expected a BCP 47 locale in canonical form, such as en-GB',
});

/** The country whose law, prices and defaults apply: ISO 3166-1 alpha-2, such as `GB`. */
export const Market = z
  .string()
  .regex(/^[A-Z]{2}$/, { error: 'Expected an ISO 3166 country code, such as GB' });

/** Where a family's personal data lives, such as `eu-1` (plan 3.1). */
export const HomeRegion = z
  .string()
  .regex(/^[a-z]{2}-\d+$/, { error: 'Expected a region such as eu-1' });

/** An IANA time zone, such as `Europe/London`. A child's learning day is counted in it. */
export const TimeZone = z.string().refine(isTimeZone, {
  error: 'Expected an IANA time zone, such as Europe/London',
});

/** A semantic version, such as `1.2.0`. */
export const SemVer = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/, { error: 'Expected a version such as 1.2.0' });

/** Content text by locale, such as `{ "en": "Add within 20" }`. At least one locale. */
export const LocalizedText = z
  .record(Locale, z.string().trim().min(1, { error: 'Text must not be empty' }))
  .refine((text) => Object.keys(text).length > 0, {
    error: 'Give the text in at least one locale',
  });

export type Uuidv7 = z.infer<typeof Uuidv7>;
export type ContentId = z.infer<typeof ContentId>;
export type Timestamp = z.infer<typeof Timestamp>;
export type IsoDate = z.infer<typeof IsoDate>;
export type Locale = z.infer<typeof Locale>;
export type Market = z.infer<typeof Market>;
export type TimeZone = z.infer<typeof TimeZone>;
export type SemVer = z.infer<typeof SemVer>;
export type LocalizedText = z.infer<typeof LocalizedText>;

/** Adds an issue for every value that appears more than once, at its position in the array. */
export function checkUnique<T>(
  values: readonly T[],
  context: z.core.$RefinementCtx,
  describe: (value: T) => string,
  path: (string | number)[] = [],
) {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    const key = describe(value);
    if (seen.has(key)) {
      context.addIssue({
        code: 'custom',
        message: `${key} appears more than once`,
        path: [...path, index],
      });
    }
    seen.add(key);
  });
}
