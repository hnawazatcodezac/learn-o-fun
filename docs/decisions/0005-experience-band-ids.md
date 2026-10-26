# 0005. Experience band IDs for ages 3–8

- Status: accepted
- Date: 2026-10-20
- Plan section: 3.1 (separations), 6.6 (design system), 7.4 (curricula and grades)

## Context

The plan uses experience bands to set reading load, interaction style and session length, and mentions "your five bands" (7.4), but never names them; section 3.1 gives "Early Primary" only as an example. The design tokens (FRONTEND-KICKOFF step 3) and the contracts (step 4) need stable IDs now. The first release serves ages 3–8.

## Options considered

1. Name all five bands now. Premature: the bands above age 8 are not designed, and 15–18 is an open question (plan 12.1).
2. Name only the two bands the first release needs, and add the others when they are designed.

## Decision

Option 2:

- `early-years`: ages 3–5. No reading required, spoken instructions, touch targets of about 64 px, tap and drag only.
- `early-primary`: ages 6–8. Short text with audio, 48 px touch targets.

The parent dashboard is for adults and has no band; components use the default (parent) sizes when no band is set.

The band reaches the design tokens through `<html data-band>`, set by `AppearanceProvider` from configuration. Components never check a child's age. `packages/ui-kit` defines the IDs until step 4 moves them into `packages/contracts`.

## Consequences

- Placement (plan 7.4) maps age plus reading level to one of these IDs; a 7-year-old who cannot yet read gets `early-years` presentation.
- Adding a band means adding its ID, its token overrides in `bands.css`, and its previews and tests.
- Revisit when ages 9 and up are designed.
