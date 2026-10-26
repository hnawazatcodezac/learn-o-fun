import { GameManifest } from '@learnofun/contracts';

/** What Demo choice is and can do (plan 6.2). The version is recorded on every session. */
export const manifest = GameManifest.parse({
  id: 'demo-choice',
  version: '0.1.0',
  itemTypes: ['choice'],
  experienceBands: ['early-years', 'early-primary'],
  inputModes: ['tap', 'keyboard', 'switch'],
  accessibility: { screenReader: 'full', colourIndependent: true },
  flow: 'engine',
  assets: [],
  strings: [
    'games.demoChoice.title',
    'games.demoChoice.instructions',
    'games.demoChoice.answers',
    'games.demoChoice.hintCrossedOut',
    'games.demoChoice.hintLookAgain',
    'ui.answer.correct',
    'ui.answer.tryAgain',
  ],
  signals: [],
});
