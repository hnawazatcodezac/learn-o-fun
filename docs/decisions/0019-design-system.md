# 0019. The design system: generated tokens, self-hosted fonts and Phosphor icons

- Status: accepted; superseded in part by 0043 (styles are written with Tailwind; the token, theme, band and font rules stay) and by 0045 (icons are the screen designs' own, not Phosphor)
- Date: 2026-10-21
- Plan section: 6.6 (design system), 7.2 (right to left), 8.6 (accessibility); supersedes the draft tokens of FRONTEND-KICKOFF step 3a

## Context

Steps 3a–3c built the UI kit on draft tokens, marked as placeholders "until the art direction is set". The team has since added the art direction as `docs/design-system/`: a README (voice, colour, type, space, motion, icons, experience bands), `tokens.json` (colours in three themes, type, spacing, radius, sizes and shadows) and six component specs with HTML previews. An updated kickoff reopens step 3 to build on it. The updated kickoff was based on the original file, so it also restated pnpm, two apps and other wording that ADRs 0002, 0003 and 0007 had replaced.

## Decision

- **The design system is the source of truth for visual design** (CLAUDE.md, FRONTEND-KICKOFF scope). Only its design-system parts were merged into the live kickoff; npm, the one web app, the `frontend/` folder and the progress list stay. Step 3 reopens as 3d (tokens, fonts, themes, every stylesheet moved over) and 3e (the six components, the rest restyled, used in the apps).
- **Tokens are generated, never copied.** A script turns `docs/design-system/tokens.json` into CSS custom properties in `packages/ui-kit`, and a test fails whenever the generated file and `tokens.json` differ. The properties carry the token names exactly (`--sun`, `--space-5`, `--radius-lg`), as the design system's own `components/bundle.css` uses them; a type style becomes one property per field (`--play-label-font-size`, `--play-label-line-height`, `--play-label-font-weight`, `--play-label-font-family`). Type sizes are written in rem (px ÷ 16), so the child's text-size setting and the browser's font settings scale them; at the default size they are exactly the design system's pixels. Themes take the design system's IDs (`light`, `dark`, `contrast`) on `data-theme`; without one, the device's colour-scheme and contrast preferences choose. The draft `--lf-*` tokens are deleted.
- **Fonts are self-hosted** through Fontsource packages: Baloo 2, Andika and Readex Pro (loaded with next/font since FRONTEND-KICKOFF 1g, ADR 0042). Nothing is fetched from Google, as the README requires (children's IP addresses).
- **Icons come from Phosphor** (`@phosphor-icons/react`): Bold in the child app and Regular for parents, as the README says, though the design system does not hold the icon files yet. Skill statuses keep the progress-pie icons drawn in the SkillStatus spec. The weight follows the world through Phosphor's icon context, set from the band, and the size is a role: 28px (1.75rem) in Play, 20px (1.25rem) in Family. Marks inside a component take the size its spec gives (the 16px SkillStatus icon, the check in a progress dot).
- **Where the specs disagree, the READMEs win** (decided 2026-10-21): a component's README first, then the design-system README, then `components/bundle.css` for what neither says (dot sizes, chip padding). So answer-tile numbers are `play-number` (56px), not bundle.css's 44px; play-button presses take 150ms, not 120ms; and child text never goes below 20px, so chips, the card length, the trail label, the tile's state words and the feedback's second line use `play-label`, the second lines at bundle.css's weight 500.
- **Today keeps ADR 0018's rule until step 14:** only playable cards, in the spec's order. After that, the spec's "exactly three cards" holds.
- **The two worlds, by band.** The UI kit maps the design system's worlds onto a few role properties (`--ui-*`): a page with an experience band is Play (`play-ground`, `sun` primary, `radius-lg`, `play-*` and `read-*` type, `target-early` for ages 3–5 and `target-play` for 6–8); a page without one, the parent dashboard, is Family (`family-ground`, `action` primary, `radius-md`, `family-*` type, `target-family`). Components use the roles, so one Button serves both worlds. These are aliases of design-system tokens, not new values.

### Gaps the design system leaves, as the team decided

- **Disabled controls:** `surface-sunken` fill, `ink-muted` label and a `line` border, with no `press-depth` ledge, so disabled shows by shape as well as colour.
- **Dialog backdrop:** `navy` at 50% opacity. The 50% is the one new value; the design team to confirm it.
- **Avatars:** filled with `sun`, `sky`, `leaf`, `navy`, `coral` and `teal`, with spoken labels naming only their shapes (Circle, Square, Triangle, Star, Heart, Diamond). Avatar IDs in the data stay as they are.
- **Motion:** 150ms and 250ms, easing out, the two ends of the README's 150–250ms; celebrations stop by 1.2 seconds. Under reduced motion, movement becomes a 150ms fade.
- Borders on controls are 2px and on answer tiles 3px, as in `components/bundle.css`.
- **Phones:** below 480px (30rem) wide, the game shell's Pause and Hint show only their icons, as square buttons the band's target size, with their words kept as the buttons' names for screen readers. The bar then keeps to one row. A game's row of controls may share the width in equal columns. The reason: with `read-early` at 30px and 56px play buttons, early-primary Hop Line overflowed 360×640 in the long pseudo-locale by 90px, and ADR 0012 requires the fit. Amended in step 3e: the ProgressTrail's dots have fixed sizes, so on phones its "6 of 8" sits between Pause and Hint and the trail takes a second row (28px to spare in the long pseudo-locale).
- **Selected options** (a chosen avatar, text size or switch) take AnswerTile's selected state in both worlds: `sky-soft` with a `sky-ink` border and text, plus a tick or an underline so it never relies on colour. Before, they were filled with the primary colour, which put more than one `sun` on a child screen.

## Consequences

- Every screen and game moves to the design system's colours, type and shapes, and every screenshot baseline is regenerated (in Docker, ADR 0006).
- A change to `tokens.json` reaches the apps by regenerating one file; a forgotten regeneration fails the tests.
- Two font packages and one icon package join the dependencies.
- Where the design system says nothing (a value, a state, a component), the team is asked, and the answer is added to the design system or recorded here.
