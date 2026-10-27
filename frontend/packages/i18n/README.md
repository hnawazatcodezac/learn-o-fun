# @learnofun/i18n

ICU MessageFormat catalogs, locale fallback chains, the long-string and right-to-left pseudo-locales, and `Intl` formatting helpers for numbers, dates, plurals and units. Plan sections 7.1 and 7.2.

Built on use-intl, next-intl's core, with ICU messages (ADR 0042, which replaced i18next from ADR 0004). No React here; the React binding, use-intl's provider and hooks, lives in `@learnofun/ui-kit`.

- `createI18n(locale)`: the app's translations, with keys typed from `src/catalogs/en.json`: `t`, `has`, the current `locale`, `changeLocale`, `onLocaleChange`, and the `settings` ui-kit gives use-intl's provider. Every locale uses the English catalog until it has its own; a missing key shows the key and is reported.
- `createTranslate(i18n)`: `t` for keys known only at run time, such as a game's.
- `en-XA` (long, accented) and `en-XB` (long, right to left) pseudo-locales, applied after formatting.
- `createFormatters({ locale, numberingSystem })`: numbers, units, dates, relative time, lists and plural categories.
- `getDirection`, `pickLocale` and the locale lists.

Messages use ICU syntax, for example `{count, plural, one {# game} other {# games}}`.

May import no other Learnofun package.
