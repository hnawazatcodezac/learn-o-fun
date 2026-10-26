# 0026. Child profiles in the parent dashboard

- Status: accepted
- Date: 2026-10-22
- Plan section: 1 (family dashboard), 3.1, 5.5, 7.4, 8 (data minimisation, roles), 9; FRONTEND-KICKOFF step 10b

## Context

Step 10b lets parents add a child and edit a child's profile: nickname, birth year and month, learning language and an optional grade (plan 1, CLAUDE.md rule 7), plus the avatar the child picks their profile by. Plan 8 gives full child management to owners and guardians, not caregivers, and plan 9 limits children with `children.max`. Four things were not decided: what the grade offers when the data has no grade scheme, which ages can be added, what "Add a child" does at the limit, and what settings a new child starts with.

## Options considered

1. **Grade:** a draft grade scheme for the placeholder market in the mock data / no grade until the launch market is chosen.
2. **Ages:** 3 to 8, the ages this release has activities and bands for / 3 to 18, older children using the 6–8 band for now.
3. **At the child limit:** "Add a child" shown but unavailable, saying why, with a link to the plan / hidden.
4. **A new child's settings:** the same defaults for every child / shorter sessions and days for ages 3–5.

## Decision

The first option each time, as the team chose.

- **A draft grade scheme.** The mock data holds England's school years for ages 3 to 8, for the placeholder GB market: Nursery, Reception, and Years 1 to 4. It is marked draft, like the skill graph, until the launch market is decided (plan 12.1). Grade stays optional and starts as "Not set". The parent chooses it; it is never worked out from the age.
- **Ages 3 to 8.** When a child is added, or their birth month and year change, those must give an age of 3 to 8 today in the family's time zone, counting the birthday as reached from the first of its month. A child who grows past 8 can still be renamed. Other ages get a short explanation. The age is one pure function with the date passed in (`ageInMonth` in contracts), used by the form and the mock API alike.
- **The rest of a profile comes from elsewhere.** A market's learning languages, default curriculum and grade scheme are configuration (plan 7.4), served by `GET /api/markets/:market`. A new child takes the market's default curriculum, the family's time zone, and the app language of the parent who adds them.
- **At the limit, "Add a child" explains.** It stays visible but unavailable, with "Your plan includes up to N children" and a link to the Plan page. The mock API refuses a child over the limit too. Upgrades are offered only here, in the dashboard (plan 9).
- **The same defaults for every new child**, kept in one place: 10-minute sessions, 30 minutes a day, a break reminder after 20 minutes, sound, music, spoken instructions and timers on, motion and contrast as the device sets them, the standard font and text size. They are what the fixture children have. Parents change them in step 10c.
- **Roles and tenancy.** Owners and guardians can add and edit children; a caregiver is refused. Another family's child is not found. Each endpoint has a cross-tenant test (CLAUDE.md rule 4).
- **Not in 10b:** deleting a profile. Plan 5.5 deletes everything about a child with the profile, while learning events are append-only (rule 3); that needs its own decision with the backend.

## Consequences

- Parents can set up every child the first release serves, and nothing more personal than rule 7 allows: two menus for the birth month and year, never a full date.
- The grade list and its names are mock data; replacing them with the launch market's scheme changes no code.
- When older bands and activities arrive, the age range widens in one function.
- Revisit the defaults with a learning designer, and when 10c gives parents the controls.
