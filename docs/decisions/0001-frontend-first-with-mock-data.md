# 0001. Build the web frontend first, against mock data

- Status: accepted
- Date: 2026-10-20
- Plan section: 10 (roadmap), 2.2 (API modules)

## Context

The plan's roadmap starts with Phase 0 foundations, including spikes for authentication and PostgreSQL row-level security, and builds the API modules alongside the games in Phase 1. The team has chosen to build the web frontend vertical slice first, following `docs/FRONTEND-KICKOFF.md`, and to postpone all server work.

## Options considered

1. Follow the plan's order (`docs/KICKOFF.md`): contracts and `learning-core` first, then the rendering, offline and tenancy spikes, then the API and frontend together. Proves the riskiest server pieces early, but is slower to show anything a child or parent can use.
2. Frontend first, against mock data (`docs/FRONTEND-KICKOFF.md`): apps, games and `learning-core` in the browser, with every API call answered by mock handlers that validate against `packages/contracts`. Fast visible progress and early playtests; the server-side risks wait.

## Decision

Option 2. No `apps/api`, `apps/worker`, database or real authentication until the frontend slice is done (FRONTEND-KICKOFF step 15).

All mock data lives in one JSON file inside `packages/mock-api`: the fixture family and children, the draft skill graph, activities and anything else the handlers serve. The mock API validates the file against the Zod schemas in `packages/contracts` when it loads, so a bad fixture fails loudly instead of reaching the apps.

## Consequences

- Easier: the slice can be seen and played early; contracts are exercised by real UI before any server exists; all mock data is readable and editable in one place.
- Harder: the plan's Phase 0 gate (authentication and row-level security spikes) is postponed, so those risks stay unproven for longer. Mocks can drift from what a real server will do; keeping both sides on `packages/contracts` limits that. A single JSON file grows with the content.
- Revisit when backend work starts (the step 15 status document lists what the server must provide), or when the JSON file becomes hard to review, at which point split it by entity and keep it as JSON.
