# Kickoff: the first sessions with Claude Code

Build the foundations in order, one focused session per step. Each step ends with green tests and a commit before the next begins.

## Before the first session

1. Answer the open questions in plan section 12.1 — at minimum the launch market, the team, and whether a web-only launch is acceptable.
2. Export both tabs of the Learnofun plan doc as Markdown (open the doc, click its name, then **Export → Markdown**; export each tab separately). Save them as `docs/plan.md` and `docs/game-library.md`.
3. Create an empty git repository, copy this starter kit into it, and make the first commit.
4. Start Claude Code in the repository root. Run `/context` once and check that `CLAUDE.md` appears under Memory files.

## Phase 0 — Foundations

### Session 1: Scaffold the monorepo

> Read CLAUDE.md and docs/plan.md sections 2 and 11. Propose a plan to scaffold the monorepo exactly as in section 2.6: pnpm workspaces, Turborepo, strict TypeScript, ESLint with a dependency-boundary rule, Prettier, Vitest, Playwright, and a CI workflow that runs lint, typecheck and tests. Create empty apps and packages, each with a short README. No product code yet. Show me the plan before changing anything.

Done when CI passes on the empty repo. Then ask Claude to fill in the Commands section of CLAUDE.md.

### Session 2: Contracts

> Using docs/plan.md sections 3, 5.1 and 6.2–6.4, create packages/contracts with Zod schemas for learning events, the eight item types, the game manifest, activities, skills and skill prerequisites. Export the TypeScript types. Add tests showing valid examples parse and invalid ones are rejected with clear errors.

### Session 3: Graders and evidence weights

> Implement graders for every item type and the evidence weighting rules from docs/plan.md section 5.3 in packages/learning-core, as pure functions driven by config objects. Add unit tests and fast-check property tests proving that repeats and later attempts never increase mastery evidence.

### Session 4: Learner model, mastery gate and simulator

> Implement the Elo-style ability update and the mastery gate from docs/plan.md section 4.1. Then build tools/simulator with synthetic learners (true ability per skill, learning rate, slip, guess, forgetting) and wire the release gates from section 4.6 into CI as `pnpm sim`.

### Session 5: In-session policy

> Implement the in-session policy from docs/plan.md section 4.2 as `nextStep(state, config)` returning a decision with a reason code. Add golden scenario tests for each rule and make the simulator gates pass. Do not loosen any gate.

### Session 6: Three technical spikes

Run each in its own branch; throwaway code is fine. Record each result as an ADR in docs/decisions.

1. **Rendering:** a rough Hop Line prototype with PixiJS and a Rive character, measured on a low-end Android tablet (fps, load time, bundle size).
2. **Offline events:** an IndexedDB event queue with idempotent batch sync against a stub endpoint, tested with the network switched off and on.
3. **Tenancy and auth:** PostgreSQL row-level security by family with a cross-tenant test, plus parent sign-in with passkeys and magic links using the candidate auth library.

Phase 0 ends at the gate in the roadmap: decisions signed off and spikes passing on a low-end tablet.

## Phase 1 — Vertical slice (outline)

1. Game SDK, game shell and game sandbox, with the conformance suite.
2. Hop Line, Ten Frame Café and Tile Farm, each from a game brief.
3. API modules for identity, family, consent, catalog, sessions and learner, with event ingest and the worker.
4. Parent sign-up, consent, child profile, placement, adaptive session and an explained recommendation in the family dashboard.
5. Alpha with 10–15 families.

## Working habits that keep quality high

- Start a fresh session for each step so context stays focused on one job.
- For anything touching more than one package, ask for a plan first, review it, then let Claude implement.
- Make Claude prove its work: tests, typecheck, and for games, screenshots from the sandbox.
- When Claude repeats a mistake, add a short, specific rule to CLAUDE.md or `.claude/rules/`.
- Read every diff in `learning-core` and in authorization code yourself before merging.
