import { GameManifest } from '@learnofun/contracts';

/** The misconceptions Ten Frame Café explains (BRIEF.md), by ID. */
export const EXPLAINED_MISCONCEPTIONS = [
  'counts-one-twice',
  'gives-the-part',
  'counts-all',
  'stops-at-ten',
  'counts-moved-twice',
] as const;

/** The fruit the café can draw and name (BRIEF.md, localization). */
export const FRUITS = ['apple', 'pear', 'lemon', 'strawberry'] as const;

/** What Ten Frame Café is and can do (plan 6.2). The version is recorded on every session. */
export const manifest = GameManifest.parse({
  id: 'ten-frame-cafe',
  version: '0.1.0',
  itemTypes: ['numeric'],
  experienceBands: ['early-primary'],
  inputModes: ['tap', 'keyboard', 'switch'],
  accessibility: { screenReader: 'full', colourIndependent: true },
  flow: 'engine',
  assets: [],
  strings: [
    'games.tenFrameCafe.title',
    ...FRUITS.map((fruit) => `games.tenFrameCafe.fruit.${fruit}`),
    'games.tenFrameCafe.order.fillTo',
    'games.tenFrameCafe.order.fillUp',
    'games.tenFrameCafe.order.makeTen',
    'games.tenFrameCafe.instructions.fillTo',
    'games.tenFrameCafe.instructions.fillUp',
    'games.tenFrameCafe.instructions.makeTen',
    'games.tenFrameCafe.trays',
    'games.tenFrameCafe.trayCount',
    'games.tenFrameCafe.value.fillTo',
    'games.tenFrameCafe.value.fillUp',
    'games.tenFrameCafe.value.fillUpSpill',
    'games.tenFrameCafe.value.makeTen',
    'games.tenFrameCafe.counter',
    'games.tenFrameCafe.total',
    'games.tenFrameCafe.controls',
    'games.tenFrameCafe.add',
    'games.tenFrameCafe.takeAway',
    'games.tenFrameCafe.move',
    'games.tenFrameCafe.moveBack',
    'games.tenFrameCafe.serve',
    'games.tenFrameCafe.tryAgain',
    'games.tenFrameCafe.hint',
    'games.tenFrameCafe.hintFill',
    'games.tenFrameCafe.hintMakeTen',
    'games.tenFrameCafe.hintSpill',
    'games.tenFrameCafe.showMe',
    'games.tenFrameCafe.showMeStep',
    'games.tenFrameCafe.sum.fillTo',
    'games.tenFrameCafe.sum.fillToTen',
    'games.tenFrameCafe.sum.fillUp',
    'games.tenFrameCafe.sum.makeTen',
    'games.tenFrameCafe.answer.fillTo',
    'games.tenFrameCafe.answer.fillToTen',
    'games.tenFrameCafe.answer.fillUp',
    'games.tenFrameCafe.answer.makeTen',
    ...EXPLAINED_MISCONCEPTIONS.map((id) => `games.tenFrameCafe.explanations.${id}`),
  ],
  signals: [],
});
