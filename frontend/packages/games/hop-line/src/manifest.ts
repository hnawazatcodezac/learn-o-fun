import { GameManifest } from '@learnofun/contracts';

/** The misconceptions Hop Line explains (BRIEF.md), by ID. */
export const EXPLAINED_MISCONCEPTIONS = [
  'counts-the-start',
  'extra-hop',
  'goes-to-the-number',
  'hops-backwards',
] as const;

/** What Hop Line is and can do (plan 6.2). The version is recorded on every session. */
export const manifest = GameManifest.parse({
  id: 'hop-line',
  version: '0.1.0',
  itemTypes: ['placement'],
  experienceBands: ['early-primary'],
  inputModes: ['tap', 'keyboard', 'switch'],
  accessibility: { screenReader: 'full', colourIndependent: true },
  flow: 'engine',
  assets: [],
  strings: [
    'games.hopLine.title',
    'games.hopLine.sum',
    'games.hopLine.sumAnswered',
    'games.hopLine.instructions',
    'games.hopLine.line',
    'games.hopLine.position',
    'games.hopLine.positionHops',
    'games.hopLine.positionHopsBack',
    'games.hopLine.counter',
    'games.hopLine.counterBack',
    'games.hopLine.controls',
    'games.hopLine.hop',
    'games.hopLine.back',
    'games.hopLine.land',
    'games.hopLine.tryAgain',
    'games.hopLine.hint',
    'games.hopLine.footprints',
    'games.hopLine.showMe',
    'games.hopLine.showMeStep',
    'games.hopLine.answer',
    ...EXPLAINED_MISCONCEPTIONS.map((id) => `games.hopLine.explanations.${id}`),
  ],
  signals: [],
});
