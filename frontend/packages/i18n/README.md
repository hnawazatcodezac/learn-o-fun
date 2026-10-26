# @learnofun/i18n

ICU MessageFormat catalogs, locale fallback chains, the long-string and right-to-left pseudo-locales, and `Intl` formatting helpers for numbers, dates, plurals and units. Plan sections 7.1 and 7.2.

Built on i18next with ICU messages (ADR 0004). No React here; the React binding lives in `@learnofun/ui-kit`.

- `createI18n(locale)`: an i18next instance whose keys are typed from `src/catalogs/en.json`.
- `en-XA` (long, accented) and `en-XB` (long, right to left) pseudo-locales, applied after formatting.
- `createFormatters({ locale, numberingSystem })`: numbers, units, dates, relative time, lists and plural categories.
- `getDirection`, `pickLocale` and the locale lists.

Messages use ICU syntax, for example `{count, plural, one {# game} other {# games}}`.

May import no other Learnofun package.
