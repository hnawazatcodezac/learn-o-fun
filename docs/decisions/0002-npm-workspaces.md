# 0002. npm workspaces instead of pnpm

- Status: accepted
- Date: 2026-10-20
- Plan section: 2.6 (repository layout)

## Context

Plan section 2.6 and CLAUDE.md specified a pnpm monorepo with Turborepo. The team prefers npm.

## Options considered

1. pnpm workspaces: a package can import only what it declares, fast installs, one shared store on disk. Needs pnpm installed separately.
2. npm workspaces: ships with Node, nothing extra to install, familiar to everyone. Hoists dependencies to the root `node_modules`, so a package can import a dependency it never declared (a "phantom dependency") and it still works on that machine.

## Decision

npm workspaces with Turborepo. Commands are `npm install`, `npm run <script>` and `npm test`. Workspace packages depend on each other with `"*"` versions, because npm does not support pnpm's `workspace:` protocol. The root `package.json` sets `packageManager` to npm, which Turborepo requires.

## Consequences

- Easier: one less tool to install and explain.
- Harder: phantom dependencies. A lint rule must fail when a package imports something missing from its own `package.json`.
- Revisit if install times or phantom-dependency bugs become a real cost.
