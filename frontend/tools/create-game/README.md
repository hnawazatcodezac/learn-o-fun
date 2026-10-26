# create-game

Scaffolds a new game package (plan 6.8), so the work goes into the mechanic, not the plumbing:

```
npm run create-game -- <game-id> [--name "Display name"]
```

It creates `packages/games/<game-id>` from `template/`:

- a manifest, a starter `GameModule` that renders choice items and crosses out a wrong answer as its hint (ADR 0013), and its styles;
- `BRIEF.md` with the game brief template from `docs/game-library.md`, to fill in and have reviewed before writing the game;
- sandbox stories for each experience band, and tests for the manifest and stories.

It also registers the game in `@learnofun/game-registry`, adds its interface strings to the English catalog under `games.<gameId>`, formats the new files and runs `npm install`.

Template files end in `.tpl`, so no tool treats them as code; `{{id}}`, `{{name}}`, `{{camel}}` and `{{package}}` are filled in.
