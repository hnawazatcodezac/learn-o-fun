import { describe, expect, it } from 'vitest';
import { Activity } from './activity';
import { GameManifest } from './game';
import { problems } from './testing';

const manifest = {
  id: 'hop-line',
  version: '0.1.0',
  itemTypes: ['placement'],
  experienceBands: ['early-primary'],
  inputModes: ['tap', 'drag', 'keyboard', 'switch'],
  accessibility: { screenReader: 'full', colourIndependent: true },
  flow: 'engine',
  assets: [{ id: 'frog', kind: 'animation', path: 'frog.riv' }],
  strings: ['games.hopLine.title', 'games.hopLine.hint'],
  signals: [{ name: 'jumpCount', kind: 'number' }],
};

describe('GameManifest', () => {
  it('accepts a manifest, filling in no signals by default', () => {
    expect(problems(GameManifest, manifest)).toEqual([]);
    const withoutSignals = Object.fromEntries(
      Object.entries(manifest).filter(([key]) => key !== 'signals'),
    );
    expect(GameManifest.parse(withoutSignals).signals).toEqual([]);
  });

  it('lets a self-driven game render no item types, but not an engine-driven one', () => {
    expect(problems(GameManifest, { ...manifest, flow: 'self', itemTypes: [] })).toEqual([]);
    expect(problems(GameManifest, { ...manifest, itemTypes: [] })).toEqual([
      { path: 'itemTypes', message: 'An engine-driven game renders at least one item type' },
    ]);
  });

  it('requires keyboard and switch operation', () => {
    expect(problems(GameManifest, { ...manifest, inputModes: ['tap', 'drag'] })).toEqual([
      {
        path: 'inputModes',
        message: 'Every game must be keyboard operable (.claude/rules/games.md)',
      },
      {
        path: 'inputModes',
        message: 'Every game must be switch operable (.claude/rules/games.md)',
      },
    ]);
  });

  it('rejects a bad version, message key or duplicate signal', () => {
    expect(problems(GameManifest, { ...manifest, version: '1' })[0]?.path).toBe('version');
    expect(problems(GameManifest, { ...manifest, strings: ['Hop Line'] })[0]?.path).toBe(
      'strings.0',
    );
    expect(
      problems(GameManifest, {
        ...manifest,
        signals: [
          { name: 'jumpCount', kind: 'number' },
          { name: 'jumpCount', kind: 'boolean' },
        ],
      }),
    ).toEqual([{ path: 'signals.1', message: 'Signal jumpCount appears more than once' }]);
  });
});

describe('Activity', () => {
  const activity = {
    id: 'hop-line-add-within-20',
    gameId: 'hop-line',
    title: { en: 'Hop Line: add within 20' },
    targetSkillIds: ['add-within-20', 'counting-on'],
    itemSource: { kind: 'template', templateId: 'add-on-number-line' },
    modes: ['practice', 'challenge'],
    experienceBands: ['early-primary'],
    minutes: 5,
    tier: 'free',
  };

  it('accepts an activity from a template or a bank', () => {
    expect(problems(Activity, activity)).toEqual([]);
    expect(
      problems(Activity, {
        ...activity,
        itemSource: { kind: 'bank', itemIds: ['hop-to-14'] },
        markets: ['GB'],
      }),
    ).toEqual([]);
  });

  it('rejects duplicates and empty lists', () => {
    expect(
      problems(Activity, { ...activity, experienceBands: ['early-primary', 'early-primary'] }),
    ).toEqual([
      { path: 'experienceBands.1', message: 'Band early-primary appears more than once' },
    ]);
    expect(problems(Activity, { ...activity, targetSkillIds: [] })[0]?.path).toBe('targetSkillIds');
    expect(
      problems(Activity, { ...activity, itemSource: { kind: 'bank', itemIds: [] } })[0]?.path,
    ).toBe('itemSource.itemIds');
  });

  it('rejects an unknown band and tier', () => {
    expect(problems(Activity, { ...activity, experienceBands: ['teens'] })[0]?.message).toBe(
      'Expected an experience band: early-years, early-primary',
    );
    expect(problems(Activity, { ...activity, tier: 'gold' })[0]?.path).toBe('tier');
  });

  it('needs about how long it takes, in whole minutes from 1 to 30 (ADR 0021)', () => {
    const withoutMinutes = Object.fromEntries(
      Object.entries(activity).filter(([field]) => field !== 'minutes'),
    );
    expect(problems(Activity, withoutMinutes)[0]?.path).toBe('minutes');
    for (const minutes of [0, 31, 4.5]) {
      expect(problems(Activity, { ...activity, minutes })[0]?.path, String(minutes)).toBe(
        'minutes',
      );
    }
  });
});
