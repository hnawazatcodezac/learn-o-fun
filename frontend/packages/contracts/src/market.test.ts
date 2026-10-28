import { describe, expect, it } from 'vitest';
import { bandForAge, MarketConfig } from './market';
import { problems } from './testing';

const market = {
  market: 'GB',
  homeRegion: 'eu-1',
  timeZone: 'Europe/London',
  privacyPolicyVersion: 'draft-2026-10',
  learningLanguages: ['en'],
  defaultCurriculumId: 'england-national-curriculum',
  gradeScheme: {
    id: 'england-school-years',
    grades: [
      { id: 'reception', name: { en: 'Reception' } },
      { id: 'year-1', name: { en: 'Year 1' } },
    ],
  },
  ageBands: [
    { band: 'early-years', minAge: 3, maxAge: 5, subjects: ['mathematics'] },
    { band: 'early-primary', minAge: 6, maxAge: 8, subjects: ['mathematics', 'literacy'] },
  ],
};

describe('MarketConfig', () => {
  it('accepts a market with its learning languages, curriculum, grades and bands', () => {
    expect(problems(MarketConfig, market)).toEqual([]);
  });

  it('needs at least one learning language, grade and band', () => {
    expect(problems(MarketConfig, { ...market, learningLanguages: [] })[0]?.path).toBe(
      'learningLanguages',
    );
    expect(
      problems(MarketConfig, { ...market, gradeScheme: { ...market.gradeScheme, grades: [] } })[0]
        ?.path,
    ).toBe('gradeScheme.grades');
    expect(problems(MarketConfig, { ...market, ageBands: [] })[0]?.path).toBe('ageBands');
  });

  it('rejects a grade or a language listed twice', () => {
    const [first] = market.gradeScheme.grades;
    expect(
      problems(MarketConfig, {
        ...market,
        gradeScheme: { ...market.gradeScheme, grades: [first, first] },
      })[0]?.message,
    ).toBe('Grade reception appears more than once');
    expect(problems(MarketConfig, { ...market, learningLanguages: ['en', 'en'] })[0]?.message).toBe(
      'Learning language en appears more than once',
    );
  });

  it('rejects bands that overlap, are out of order, or run backwards', () => {
    const [years, primary] = market.ageBands;
    expect(
      problems(MarketConfig, { ...market, ageBands: [years, { ...primary, minAge: 5 }] })[0],
    ).toEqual({
      path: 'ageBands.1.minAge',
      message: 'Band early-primary starts at 5, within the band before it',
    });
    expect(problems(MarketConfig, { ...market, ageBands: [primary, years] })[0]?.path).toBe(
      'ageBands.1.minAge',
    );
    expect(
      problems(MarketConfig, { ...market, ageBands: [{ ...years, maxAge: 2 }] })[0]?.path,
    ).toBe('ageBands.0.maxAge');
  });

  it('rejects a market code that is not a country', () => {
    expect(problems(MarketConfig, { ...market, market: 'UK1' })[0]?.path).toBe('market');
  });
});

describe('bandForAge (ADR 0027)', () => {
  const config = MarketConfig.parse(market);

  it('picks the band whose ages include the child’s', () => {
    expect(bandForAge(config, 3).band).toBe('early-years');
    expect(bandForAge(config, 5).band).toBe('early-years');
    expect(bandForAge(config, 6).band).toBe('early-primary');
    expect(bandForAge(config, 8).subjects).toEqual(['mathematics', 'literacy']);
  });

  it('gives an age outside the bands the nearest one', () => {
    expect(bandForAge(config, 2).band).toBe('early-years');
    expect(bandForAge(config, 11).band).toBe('early-primary');
  });

  it('gives an age between two bands the one below it', () => {
    const gap = MarketConfig.parse({
      ...market,
      ageBands: [market.ageBands[0], { ...market.ageBands[1], minAge: 7 }],
    });
    expect(bandForAge(gap, 6).band).toBe('early-years');
    expect(bandForAge(gap, 7).band).toBe('early-primary');
  });
});
