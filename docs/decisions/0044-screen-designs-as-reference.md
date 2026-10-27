# 0044. The screen designs are the reference for how the app looks and behaves

- Status: accepted; amended 2026-10-26 (when the designs are built) and 2026-10-27 (the designs are built now)
- Date: 2026-10-26
- Plan section: 1, 4.4, 6.7, 8.1, 8.7, 12.2; FRONTEND-KICKOFF steps 1, 9, 10, 15, 16–18

## Context

On 2026-10-26 the human added two things: a refresh of the design system, and `learnofun-design/`, four HTML files that show the intended UI of every screen, to be treated as the reference for how the application should look and behave. The four files are self-unpacking design exports: 12 child-app screens on a tablet artboard (1194×834), 8 parent-dashboard screens, 5 sign-up screens and 8 website screens.

The refresh adds the `site-title` type style, Pip (a placeholder frog guide for the website hero, Hop Line and celebrations, never the parent dashboard) and the website's call-to-action rules. Most of the screens give the existing features a new look, and those planned for steps 16 to 18. Some add features the plan does not have, and four points disagreed with the plan or with approved decisions.

## Options considered

1. **The games:** keep each approved brief's mechanic in the designs' look / switch to the three answer tiles the designs draw.
2. **Rewards:** stickers for finishing a session and stars from skill growth / leave rewards out until a learning designer reviews them.
3. **The parental gate:** a parent PIN for every age, as designed / keep ADR 0008's sum for children under 9.
4. **The refresh folder:** merge it into `docs/design-system` and delete it / keep both copies.

## Decision

The human chose the first option for the games, rewards and the refresh folder, and the second for the gate.

- **The design system:** the refreshed `README.md` and `tokens.json` are now `docs/design-system/`, the source of truth, and ui-kit's CSS is generated from them again. `docs/design-system-refresh` is deleted.
- **The screens:** `learnofun-design/` is the reference for each screen's layout, colours, type, spacing, components and responsive behaviour, wherever it agrees with the plan and the decisions recorded here and in earlier ADRs. Where it does not, these decisions win.
- **The games keep their approved mechanics** (plan 6.7): the child hops and lands, fills the tray, plants and counts the rows, and the misconception checks stay. They take the designs' look: the scene art, Pip, the prompt with its number chip, the feedback banner and the progress dots. The designs' answer tiles are not used for them.
- **Rewards:** a sticker for each finished session, never for right answers or speed. A game's 1 to 3 stars show how far its skills have grown, from the learner model, never from a game score (CLAUDE.md rule 9). The star count is the stickers collected. No streaks, and missing a day loses nothing (plan 8.7, 12.2).
- **The parental gate stays as ADR 0008 decided:** a sum for children under 9, and the parent PIN from age 9. The designs' keypad screen is used where a PIN applies.
- **Defaults the human was told of:**
  - The new look lands as the screens are rebuilt with Tailwind (FRONTEND-KICKOFF 1c–1e), before the tools move to Next.js (1b), so nothing is styled twice.
  - The features the designs add are new sub-steps of steps 9 and 10, which are reopened: Today as the day's path, the library's categories and stars, stickers, the paused and break screens, and the dashboard's sidebar, charts, skill map, activity export, play-time windows, hidden games, grown-up invites, devices, notifications and settings.
  - Steps 16 to 18 follow the sign-up, plan and billing, and website designs.
  - The mock data keeps its own families; the designs' names are sample content.
  - The speaker buttons beside titles appear once there is audio, not before.
  - Bracketed placeholders such as `[YEARLY PRICE]` stay placeholders until the human gives the values.

## Amendment, 2026-10-27: the new design is built now

The human reviewed the designs again and moved the project to them on 2026-10-27, with updated exports (the child app now has 14 screens). The colours, type, spacing and radii in every screen already match `docs/design-system/tokens.json`, in all three themes, so no old value remains there. The icons are the designs' own (ADR 0045). Nothing new is built in the old look: FRONTEND-KICKOFF 15d, 9e and 10f bring the designs to every existing screen, and steps 16 to 18 follow them. Where a design and a rule or decision disagree, such as a child typing a username, the rule wins, as above.

## Amendment, 2026-10-26: the designs wait for another review

Later the same day the human asked for the designs not to be built yet: they will review them once more first. Until then:

- FRONTEND-KICKOFF 1c–1e move the current look to Tailwind unchanged, checked screenshot by screenshot. This replaces the first default above.
- 9e, 10f and 15d, and the designs' parts of steps 16 to 18, wait for that review.
- The merged design system stays as it is unless the review changes it.

## Consequences

- One visual reference for every screen, checked against the plan before it is built.
- The dashboard and the child app gain features that need contracts, mock handlers and cross-tenant tests; each is planned in its sub-step.
- Revisit a screen if its design and a later decision disagree; record which one changes.
