import { describe, expect, it } from 'vitest';
import {
  ContentId,
  Locale,
  LocalizedText,
  Market,
  SemVer,
  Timestamp,
  TimeZone,
  Uuidv7,
} from './common';
import { problems } from './testing';

describe('Uuidv7', () => {
  it('accepts a version 7 UUID', () => {
    expect(problems(Uuidv7, '0192f4c1-7a2b-7c3d-8e4f-5a6b7c8d9e0f')).toEqual([]);
  });

  it.each(['0192f4c1-7a2b-4c3d-8e4f-5a6b7c8d9e0f', 'not-an-id', ''])('rejects %j', (value) => {
    expect(problems(Uuidv7, value)).toEqual([{ path: '', message: 'Expected a UUIDv7 string' }]);
  });
});

describe('ContentId', () => {
  it.each(['add-within-20', 'hop-line', 'year-3', 'a'])('accepts %j', (value) => {
    expect(problems(ContentId, value)).toEqual([]);
  });

  it.each(['Add-within-20', 'add_within_20', 'add--within', '-add', 'add within'])(
    'rejects %j',
    (value) => {
      expect(problems(ContentId, value)[0]?.message).toMatch(/^Expected a content ID/);
    },
  );
});

describe('Timestamp', () => {
  it.each(['2026-10-20T09:15:00Z', '2026-10-20T09:15:00.123Z'])('accepts UTC %j', (value) => {
    expect(problems(Timestamp, value)).toEqual([]);
  });

  it.each(['2026-10-20T13:15:00+04:00', '2026-10-20T09:15:00', '2026-10-20', 'yesterday'])(
    'rejects %j',
    (value) => {
      expect(problems(Timestamp, value)).toEqual([
        { path: '', message: 'Expected an ISO 8601 timestamp in UTC, ending in Z' },
      ]);
    },
  );
});

describe('Locale', () => {
  it.each(['en', 'en-GB', 'ar-AE', 'en-XA'])('accepts %j', (value) => {
    expect(problems(Locale, value)).toEqual([]);
  });

  it.each(['en-gb', 'en_GB', 'english', ''])('rejects %j', (value) => {
    expect(problems(Locale, value)[0]?.message).toBe(
      'Expected a BCP 47 locale in canonical form, such as en-GB',
    );
  });
});

describe('Market, TimeZone and SemVer', () => {
  it('accept valid values', () => {
    expect(problems(Market, 'GB')).toEqual([]);
    expect(problems(TimeZone, 'Asia/Dubai')).toEqual([]);
    expect(problems(SemVer, '1.2.0')).toEqual([]);
  });

  it('reject invalid values with a clear message', () => {
    expect(problems(Market, 'gb')[0]?.message).toBe(
      'Expected an ISO 3166 country code, such as GB',
    );
    expect(problems(TimeZone, 'Mars/Olympus')[0]?.message).toBe(
      'Expected an IANA time zone, such as Europe/London',
    );
    expect(problems(SemVer, 'v1')[0]?.message).toBe('Expected a version such as 1.2.0');
  });
});

describe('LocalizedText', () => {
  it('accepts text by locale', () => {
    expect(problems(LocalizedText, { en: 'Add within 20', 'en-US': 'Add within 20' })).toEqual([]);
  });

  it('rejects no text, empty text and bad locales', () => {
    expect(problems(LocalizedText, {})[0]?.message).toBe('Give the text in at least one locale');
    expect(problems(LocalizedText, { en: '  ' })[0]?.message).toBe('Text must not be empty');
    expect(problems(LocalizedText, { english: 'Hi' })[0]?.path).toBe('english');
  });
});
