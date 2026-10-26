# 0009. Readable IDs for content, UUIDv7 for runtime records

- Status: accepted
- Date: 2026-10-20
- Plan section: 2.4 (content management), 3.4 (modelling rules)

## Context

CLAUDE.md rule 8 says IDs are UUIDv7. Content such as skills, activities, games, items and misconceptions is written by people as files in the repo, reviewed in diffs, and published as versioned releases (plan 2.4). Records created while the app runs (families, children, sessions, events, recommendations) are created by devices and servers.

## Options considered

1. UUIDv7 everywhere. One ID format, but content files fill with IDs like `0192f4c1-7a2b-7c3d-…` that a tool must generate and no reviewer can read.
2. Readable names for content and UUIDv7 for runtime records. Content IDs such as `add-within-20` and `hop-line` read well in files, diffs and the mock data, and stay stable across releases.

## Decision

Option 2, the team's choice.

- Content IDs are `ContentId` in `packages/contracts`: lowercase letters and digits joined by single hyphens, such as `add-within-20`. Generated items use their template's ID plus a number.
- Runtime records keep UUIDv7 (`Uuidv7`), and devices create session and event IDs themselves, as rule 8 says.
- Content is always referenced by ID plus content release (plan 3.4), so an ID never has to change meaning.

## Consequences

- Content files and the mock data file stay readable.
- Content IDs must be unique within their kind; the schemas check this wherever a list could repeat one, such as the skill graph.
- Renaming a content ID is a breaking content change: old sessions refer to the old ID through their content release.
- CLAUDE.md rule 8 now reads with this split in mind.
