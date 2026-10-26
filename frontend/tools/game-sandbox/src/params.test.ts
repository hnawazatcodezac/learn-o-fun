import { GameManifest, Item } from '@learnofun/contracts';
import type { GamePackage } from '@learnofun/game-sdk';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SEED, paramsToSearch, pickGame, readParams, selectStory } from './params';

const item = (id: string) =>
  Item.parse({
    id,
    type: 'choice',
    skillIds: ['add-within-10'],
    difficulty: 0,
    prompt: { en: '1 + 1' },
    options: [
      { id: 'a', label: { en: '2' } },
      { id: 'b', label: { en: '3' } },
    ],
    correctOptionIds: ['a'],
    multiple: false,
  });

const pkg: GamePackage = {
  game: {
    manifest: GameManifest.parse({
      id: 'fake-game',
      version: '1.0.0',
      itemTypes: ['choice'],
      experienceBands: ['early-years', 'early-primary'],
      inputModes: ['tap', 'keyboard', 'switch'],
      accessibility: { screenReader: 'full', colourIndependent: true },
      flow: 'engine',
      assets: [],
      strings: [],
    }),
    mount: () => {
      throw new Error('not mounted in these tests');
    },
  },
  stories: [
    { id: 'small', title: 'Small', band: 'early-years', items: [item('ey-1'), item('ey-2')] },
    { id: 'tens', title: 'Tens', band: 'early-primary', items: [item('ep-1')] },
    {
      id: 'race',
      title: 'Race',
      band: 'early-primary',
      mode: 'challenge',
      items: [item('ep-2'), item('ep-3')],
    },
  ],
};

const none = { band: undefined, story: undefined, item: undefined, mode: undefined };

describe('readParams', () => {
  it('uses defaults for an empty URL', () => {
    expect(readParams('')).toEqual({
      game: undefined,
      band: undefined,
      story: undefined,
      item: undefined,
      mode: undefined,
      seed: DEFAULT_SEED,
      theme: 'system',
      reducedMotion: false,
      textScale: 1,
      font: 'default',
    });
  });

  it('reads every setting', () => {
    expect(
      readParams(
        '?game=fake-game&band=early-years&story=small&item=ey-2&mode=challenge&seed=42&theme=dark&motion=reduced&textScale=1.5&font=dyslexia',
      ),
    ).toEqual({
      game: 'fake-game',
      band: 'early-years',
      story: 'small',
      item: 'ey-2',
      mode: 'challenge',
      seed: 42,
      theme: 'dark',
      reducedMotion: true,
      textScale: 1.5,
      font: 'dyslexia',
    });
  });

  it.each(['-1', '1.5', 'abc', '1e400'])('ignores the seed %s', (seed) => {
    expect(readParams(`?seed=${seed}`).seed).toBe(DEFAULT_SEED);
  });

  it('ignores values it does not know', () => {
    expect(readParams('?theme=neon&textScale=3&font=comic&mode=hard')).toMatchObject({
      mode: undefined,
      theme: 'system',
      textScale: 1,
      font: 'default',
    });
  });
});

describe('paramsToSearch', () => {
  it('leaves out defaults and keeps other parameters, such as the locale', () => {
    const params = { ...readParams(''), game: 'fake-game', band: 'early-years' };

    expect(paramsToSearch(params, '?locale=en-XA&seed=7')).toBe(
      '?locale=en-XA&game=fake-game&band=early-years',
    );
  });

  it('round-trips through readParams', () => {
    const params = readParams(
      '?game=fake-game&band=early-years&story=small&item=ey-2&seed=42&theme=dark&motion=reduced&textScale=1.5&font=dyslexia',
    );

    expect(readParams(paramsToSearch(params, ''))).toEqual(params);
  });
});

describe('pickGame', () => {
  it('picks the requested game, or else the first one', () => {
    expect(pickGame(['a', 'b'], 'b')).toBe('b');
    expect(pickGame(['a', 'b'], 'missing')).toBe('a');
    expect(pickGame(['a', 'b'], undefined)).toBe('a');
    expect(pickGame([], 'a')).toBeUndefined();
  });
});

describe('selectStory', () => {
  it('starts with the first band and its first story', () => {
    const selection = selectStory(pkg, none);

    expect(selection.band).toBe('early-years');
    expect(selection.bands).toEqual(['early-years', 'early-primary']);
    expect(selection.story?.id).toBe('small');
    expect(selection.items.map((entry) => entry.id)).toEqual(['ey-1', 'ey-2']);
    expect(selection.mode).toBe('practice');
  });

  it('offers only the stories for the chosen band', () => {
    const selection = selectStory(pkg, { ...none, band: 'early-primary' });

    expect(selection.stories.map((entry) => entry.id)).toEqual(['tens', 'race']);
    expect(selection.story?.id).toBe('tens');
  });

  it('plays a story in its own mode', () => {
    expect(selectStory(pkg, { ...none, band: 'early-primary', story: 'race' }).mode).toBe(
      'challenge',
    );
  });

  it('plays the mode asked for, whatever the story’s own', () => {
    expect(
      selectStory(pkg, { ...none, band: 'early-primary', story: 'race', mode: 'practice' }).mode,
    ).toBe('practice');
    expect(selectStory(pkg, { ...none, mode: 'challenge' }).mode).toBe('challenge');
  });

  it('plays a single item when one is chosen', () => {
    const selection = selectStory(pkg, {
      ...none,
      band: 'early-years',
      story: 'small',
      item: 'ey-2',
    });

    expect(selection.item?.id).toBe('ey-2');
    expect(selection.items.map((entry) => entry.id)).toEqual(['ey-2']);
  });

  it('falls back when the band, story or item does not belong to the game', () => {
    const selection = selectStory(pkg, { ...none, band: 'teen', story: 'tens', item: 'ep-1' });

    expect(selection.band).toBe('early-years');
    expect(selection.story?.id).toBe('small');
    expect(selection.item).toBeUndefined();
    expect(selection.items).toHaveLength(2);
  });

  it('has nothing to play for a band without a story', () => {
    const selection = selectStory(
      { ...pkg, stories: pkg.stories.filter((entry) => entry.band === 'early-years') },
      { ...none, band: 'early-primary' },
    );

    expect(selection.story).toBeUndefined();
    expect(selection.items).toEqual([]);
  });
});
