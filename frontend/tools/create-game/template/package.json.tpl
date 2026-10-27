{
  "name": "{{package}}",
  "private": true,
  "type": "module",
  "sideEffects": false,
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./conformance": "./conformance/index.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@learnofun/contracts": "*",
    "@learnofun/game-sdk": "*"
  },
  "devDependencies": {
    "@playwright/test": "^1.64.1",
    "vitest": "^5.0.5"
  }
}
