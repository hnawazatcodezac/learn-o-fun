# @learnofun/game-registry

Every game package by ID, each loaded only when it is played. The web app's game shell, the game sandbox and the conformance suite all read it, so a game added here is everywhere at once.

`npm run create-game -- <game-id>` scaffolds a game and registers it here. The tests check that every registered game loads, matches its ID, and has a story for every experience band it supports, using only items it can render.

May import only `@learnofun/game-sdk`, `@learnofun/contracts` and game packages.
