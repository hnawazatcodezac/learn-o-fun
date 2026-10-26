---
paths:
  - "apps/api/**"
  - "apps/worker/**"
  - "frontend/packages/contracts/**"
---

# API, worker and data rules

Plan sections 2.2, 3, 5 and 8 apply.

- Modules: identity, family, consent, catalog, sessions, learner, planner, insights, commerce, regional, admin. Respect their boundaries.
- Authorization lives in one policy module that every route calls. PostgreSQL row-level security, keyed on the requesting family, is the second wall.
- Every new endpoint: schema in `packages/contracts`, regenerated OpenAPI, and a test proving another family's token is refused.
- Child device tokens may read the catalog and that child's learner snapshot, and write that child's events. Nothing else.
- Event ingest is idempotent on the device-generated event ID and ordered by per-session sequence number. The server re-grades every response with `learning-core`.
- The worker serializes SkillState updates per child. Projections must be rebuildable from the event log.
- Check entitlements by feature key, never by plan name.
- Migrations are forward-only and reviewed. No destructive migration without an ADR.
- Never log personal data. Scrub errors before they leave the process.
