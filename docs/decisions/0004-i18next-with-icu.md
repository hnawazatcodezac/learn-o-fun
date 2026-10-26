# 0004. i18next with ICU MessageFormat for interface text

- Status: accepted; superseded in part by 0042 (next-intl replaces i18next; ICU messages stay)
- Date: 2026-10-20
- Plan section: 7.1 (interface text)

## Context

Plan section 7.1 asks for ICU MessageFormat catalogs (plurals, gender and select), fallback chains per locale and `Intl` formatting, using "FormatJS or i18next with ICU support; choose in the first spike".

## Options considered

1. FormatJS (`intl-messageformat`) with a small in-house React hook. ICU is its native format; one package; the smallest bundle.
2. i18next with `i18next-icu` and `react-i18next`. Widely used and familiar, with built-in fallback chains, language-change events, post-processors, missing-key reporting and a large ecosystem of extraction and translation-management tools. ICU support comes from `i18next-icu`, which uses `intl-messageformat` underneath.

## Decision

Option 2, the team's choice.

- `packages/i18n` creates the i18next instance (`createI18n`), holds the catalogs, and implements the pseudo-locales as an i18next post-processor. It does not depend on React, so games can receive a plain `t()` later.
- `packages/ui-kit` holds the React binding (`I18nProvider`, `useI18n`) on top of `react-i18next`.
- Messages use ICU syntax (`{count, plural, …}`), never i18next's own `{{name}}` interpolation.
- Message keys are typed from the English catalog, so an unknown key fails the typecheck.

## Consequences

- Easier: a familiar API; fallback and missing-key handling are built in.
- Harder: bundle size. Each app's JavaScript grew from 69 KB to 98 KB gzipped in step 2. Precompiling messages so the ICU parser is not shipped is a candidate for the performance work in FRONTEND-KICKOFF step 15.
- Every message must be written in ICU syntax.
- Revisit if the bundle budget is threatened, or if the translation management system needs a different format.
