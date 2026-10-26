import { GameManifest } from '@learnofun/contracts';

/** The misconceptions Tile Farm explains (BRIEF.md), by ID. */
export const EXPLAINED_MISCONCEPTIONS = [
  'adds-the-numbers',
  'counts-one-row',
  'counts-the-rows',
  'skips-a-row',
] as const;

/** The crops the farm can draw and name (BRIEF.md, localization). */
export const CROPS = ['carrot', 'cabbage', 'sunflower'] as const;

/** What Tile Farm is and can do (plan 6.2). The version is recorded on every session. */
export const manifest = GameManifest.parse({
  id: 'tile-farm',
  version: '0.1.0',
  itemTypes: ['numeric'],
  experienceBands: ['early-primary'],
  inputModes: ['tap', 'keyboard', 'switch'],
  accessibility: { screenReader: 'full', colourIndependent: true },
  flow: 'engine',
  assets: [],
  strings: [
    'games.tileFarm.title',
    ...CROPS.map((crop) => `games.tileFarm.crop.${crop}`),
    'games.tileFarm.order.equalGroups',
    'games.tileFarm.order.array',
    'games.tileFarm.instructions.equalGroups',
    'games.tileFarm.instructions.array',
    'games.tileFarm.field',
    'games.tileFarm.value',
    'games.tileFarm.counted',
    'games.tileFarm.runningTotal',
    'games.tileFarm.controls',
    'games.tileFarm.plant',
    'games.tileFarm.dig',
    'games.tileFarm.addRow',
    'games.tileFarm.addOne',
    'games.tileFarm.takeOne',
    'games.tileFarm.done',
    'games.tileFarm.tryAgain',
    'games.tileFarm.hint',
    'games.tileFarm.showMe',
    'games.tileFarm.showMeStep',
    'games.tileFarm.sum.more',
    'games.tileFarm.sum.groups',
    'games.tileFarm.sum.array',
    'games.tileFarm.list.more',
    'games.tileFarm.answer',
    ...EXPLAINED_MISCONCEPTIONS.map((id) => `games.tileFarm.explanations.${id}`),
  ],
  signals: [],
});
