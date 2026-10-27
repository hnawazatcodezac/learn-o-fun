import {
  createTranslator,
  IntlErrorCode,
  type IntlConfig,
  type MessageKeys,
  type NestedKeyOf,
  type TranslationValues,
} from 'use-intl/core';
import en from './catalogs/en.json';
import { formattingLocale, isPseudoLocale, type AppLocale } from './locales';
import { pseudoLocalize } from './pseudo';

/** The English catalog: every message, and what every other locale falls back to (plan 7.1). */
export type Messages = typeof en;

/** A message key in the catalog, such as `child.title`. */
export type MessageKey = MessageKeys<Messages, NestedKeyOf<Messages>>;

/** Translates a catalog key, filling in its ICU values (plan 7.1). */
export type Translate = (key: MessageKey, values?: TranslationValues) => string;

/** What use-intl's translator and its React provider need, for one locale (ADR 0042). */
export type IntlSettings = Required<
  Pick<IntlConfig, 'locale' | 'onError' | 'getMessageFallback'>
> & { messages: Messages };

/** The translations for the app: the current locale, its messages, and a way to change it. */
export interface I18n {
  /** The current locale, a pseudo-locale included. */
  readonly locale: AppLocale;
  /** Translates a catalog key in the current locale. */
  readonly t: Translate;
  /** Whether the catalog has a message at a key, such as one a game's manifest lists. */
  has(key: string): boolean;
  /** use-intl's settings for the current locale, for React's provider. */
  readonly settings: IntlSettings;
  changeLocale(locale: AppLocale): void;
  /** Calls `listener` after each change of locale. Returns a function that stops it. */
  onLocaleChange(listener: (locale: AppLocale) => void): () => void;
}

/** The message, or group of messages, at a dotted key, such as `child.title`. */
function messageAt(messages: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        typeof node === 'object' && node !== null && Object.hasOwn(node, part)
          ? (node as Record<string, unknown>)[part]
          : undefined,
      messages,
    );
}

/**
 * A formatted message as the locale shows it: the pseudo-locales change the text once it is
 * formatted, and every other locale leaves it as it is.
 */
export function finishMessage(text: string, locale: AppLocale): string {
  return isPseudoLocale(locale) ? pseudoLocalize(text, locale) : text;
}

export interface CreateI18nOptions {
  /** Called when a key is missing from the catalog, every locale's fallback. */
  onMissingKey?: (key: string, locale: string) => void;
  /** Called when a message cannot be formatted, such as a value it needs not given. */
  onError?: (error: Error) => void;
}

/**
 * Creates the app's translations, with use-intl and ICU MessageFormat messages (plan 7.1,
 * ADR 0042). Every locale uses the English catalog until it has its own, so a regional locale such
 * as en-AE shows English with its own number formats. The pseudo-locales change the text once it
 * is formatted, in English formats; a missing key shows the key, and is reported.
 */
export function createI18n(
  locale: AppLocale,
  { onMissingKey, onError }: CreateI18nOptions = {},
): I18n {
  let current = locale;
  const listeners = new Set<(locale: AppLocale) => void>();

  const settingsFor = (next: AppLocale): IntlSettings => ({
    locale: formattingLocale(next),
    messages: en,
    onError: (error) => {
      // A missing key is reported by the fallback below; anything else is a bug in a message.
      if (error.code !== IntlErrorCode.MISSING_MESSAGE) onError?.(error);
    },
    getMessageFallback: ({ key, namespace, error }) => {
      const path = namespace === undefined ? key : `${namespace}.${key}`;
      if (error.code === IntlErrorCode.MISSING_MESSAGE) onMissingKey?.(path, next);
      return path;
    },
  });

  let settings = settingsFor(current);
  let translate = createTranslator(settings);

  const t: Translate = (key, values) => finishMessage(translate(key, values as never), current);

  return {
    get locale() {
      return current;
    },
    get settings() {
      return settings;
    },
    t,
    has: (key) => typeof messageAt(en, key) === 'string',
    changeLocale(next) {
      if (next === current) return;
      current = next;
      settings = settingsFor(next);
      translate = createTranslator(settings);
      for (const listener of listeners) listener(next);
    },
    onLocaleChange(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
