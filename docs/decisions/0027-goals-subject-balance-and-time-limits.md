# 0027. Goals, subject balance and time limits in the dashboard

- Status: accepted
- Date: 2026-10-22
- Plan section: 4.3, 4.5, 8.7, 9; FRONTEND-KICKOFF step 10c; builds on ADR 0022 and ADR 0025

## Context

Step 10c lets parents set a child's goal, subject balance, session length and daily limit. ADR 0025 settled the balance's shape: a share per subject the child's band offers, in steps of 10% that add up to 100, kept in the child's settings, and no balance for a child with one subject. Four things were open: what a goal can be on the free plan, where `goals.custom` is off (plan 9); how many goals a child has; what to do while maths is the only subject in the data; and how limits are chosen.

## Options considered

1. **Goals on the free plan:** a focus on one subject, with a particular skill and an end date on premium / goals only on premium.
2. **How many:** one pinned goal per child / several.
3. **Subjects:** add a draft literacy subject to the mock skill graph / keep maths only, so the balance shows for nobody.
4. **Limits:** menus with set steps / any minutes within the contract's ranges.

## Decision

The first option each time, as the team chose.

- **A goal is a subject focus; premium adds a skill and an end date.** Every family can pin a focus on one of the child's subjects, open-ended. With `goals.custom` on, the goal can also name a skill in that subject and the last day it applies. The mock API refuses a skill or end date when the feature is off. A goal a family already has is kept if the plan changes (plan 9: downgrades lose nothing).
- **One goal at a time.** A child has at most one goal (`LearningGoal`): setting a new one replaces it, and a parent can clear it. The planner (step 13) will read it as plan 4.3's "skills named in parent goals".
- **A draft literacy subject.** The mock skill graph gains a few placeholder early-English skills for ages 6 to 8, marked draft for a learning designer, as the maths skills are, and with no activities until literacy games exist.
- **A child's subjects come from the market's bands.** Plan 7.4 makes age bands market configuration, so `MarketConfig` lists its experience bands with their ages and subjects: for GB, early years (3 to 5) with mathematics, and early primary (6 to 8) with mathematics and literacy, the first release's scope. A child's age picks the band, and the band gives the subjects.
- **Balance.** Each of the child's subjects gets a share in steps of 10%, adding up to 100. A share of 0% pauses that subject (plan 4.5); at least one subject stays above 0. Without a saved balance, the subjects share equally, rounded to 10% steps.
- **Limits from set steps.** Sessions of 5, 10, 15, 20 or 30 minutes; a day of 15 to 120 minutes, in steps of 15; a break reminder after 10, 15, 20 or 30 minutes. A session is never longer than the day. The daily limit cannot be turned off (plan 8.7).
- **Each side saves only what it edits.** The dashboard saves the goal, the balance and the limits through family endpoints, for owners and guardians, each with a cross-tenant test (CLAUDE.md rule 4). The device's `PUT /api/children/:id/settings` now applies only what child mode edits, the play settings and the picture PIN, so a tablet's older copy of the settings never undoes a parent's change.

## Consequences

- Parents can shape a child's learning on either plan, and premium's extra is visible but never needed.
- The literacy skills are placeholders: they appear in the balance, and from step 10d in progress as not started, until real content and games arrive.
- The step values live in one place in contracts; a learning designer can change them without touching screens.
- Revisit the free goal when pricing is decided, and the limit steps with a learning designer and real use.
