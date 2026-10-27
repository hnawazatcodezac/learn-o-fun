# 0003. Keep the web frontend in its own `frontend/` folder

- Status: accepted; the workflow moved to the root on 2026-10-27 (see below)
- Date: 2026-10-20
- Plan section: 2.6 (repository layout)

## Context

Plan section 2.6 puts `apps/`, `packages/` and `tools/` at the repository root. While only the frontend is being built (ADR 0001), the team wants all frontend code, tooling and CI in a separate `frontend/` folder.

## Options considered

1. The root layout from plan 2.6: one workspace at the root, which the backend apps join later.
2. A `frontend/` folder holding its own npm workspace (apps, packages, tools, config files and `.github/`), with `docs/`, `CLAUDE.md` and `.claude/` staying at the top level.

## Decision

Option 2. npm commands run from `frontend/`, and the path patterns in `.claude/rules/` point into it.

## Consequences

- Frontend work is self-contained and could become its own repository.
- GitHub Actions reads workflows only from `.github/workflows` at the repository root, so `frontend/.github/workflows/ci.yml` runs only if `frontend/` is the root of its own repository. If the repository root is the project folder instead, move `.github/` to the root and set `defaults.run.working-directory: frontend` and `cache-dependency-path: frontend/package-lock.json`.
- `contracts` and `learning-core` are meant to be shared with the server (plan 2.3), and now live under `frontend/packages`. When backend work starts, decide whether the backend joins this workspace or those packages move somewhere both can use.
- Revisit when git is set up and when backend work starts.
- 2026-10-27, FRONTEND-KICKOFF 1g: git was set up with the project folder as the repository's root, so the workflow is `.github/workflows/ci.yml` at the root, running every command in `frontend/` (`defaults.run.working-directory`, with `frontend/package-lock.json` for the npm cache).
