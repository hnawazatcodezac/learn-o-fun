import { GameManifest } from '@learnofun/contracts';

/** What {{name}} is and can do (plan 6.2). The version is recorded on every session. */
export const manifest = GameManifest.parse({
  id: '{{id}}',
  version: '0.1.0',
  itemTypes: ['choice'],
  experienceBands: ['early-years', 'early-primary'],
  inputModes: ['tap', 'keyboard', 'switch'],
  accessibility: { screenReader: 'full', colourIndependent: true },
  flow: 'engine',
  assets: [],
  strings: [
    'games.{{camel}}.title',
    'games.{{camel}}.instructions',
    'games.{{camel}}.answers',
    'games.{{camel}}.hintCrossedOut',
    'games.{{camel}}.hintLookAgain',
    'ui.answer.correct',
    'ui.answer.tryAgain',
  ],
  signals: [],
});
