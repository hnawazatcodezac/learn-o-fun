# 0045. Learnofun's own icons, from the screen designs

- Status: accepted
- Date: 2026-10-27
- Plan section: 8 (UI), 12.2; FRONTEND-KICKOFF step 15

## Context

ADR 0019 took icons from Phosphor: Bold in the child app, Regular for parents. The screen designs in `learnofun-design/` (ADR 0044) draw their own icons instead: line icons on a 24-pixel grid with thick, rounded strokes in the text colour, such as sound, home, try again, hint, lock, sign in and out, play, a filled star, download and a printer. On 2026-10-27 the human moved the project to the new design. The designs' colours, type, spacing and radii already match `docs/design-system/tokens.json` exactly, in all three themes; the icons are the one essential part that differs.

## Options considered

1. **The designs' icons:** copy every icon the screens draw into ui-kit as Learnofun's own set, and remove Phosphor. Every screen matches the design. Icons the app needs and the designs do not draw are drawn in the same style.
2. **Keep Phosphor:** screens built from the designs use the nearest Phosphor icon. No icons to maintain, but no screen would match its design.

## Decision

The human chose the first option.

- ui-kit's icons are the designs' own drawings, each a component in the text colour, on the 24-pixel grid with rounded caps and joins, at the stroke width the design gives it. The world sets the size, as before: 28px in Play, 20px in Family.
- Icons the app needs that the designs do not draw (close, warning, pause, delete, and the nine picture-PIN pictures) are drawn in the same style, and listed for the human's review.
- The skill-status progress pies stay as ui-kit draws them; the designs draw the same ones.
- Illustrations (Pip, the avatars, stickers, scenes and the stretch figures) are not icons. They arrive with the screens that use them (FRONTEND-KICKOFF 15d, 9e and 10f).
- Phosphor leaves the dependencies, and the design system README says where icons come from now.

## Consequences

- Every screen can match its design, and the icons follow the child-friendly look the human asked for.
- The team owns the icons: a new one is drawn in the same style, never taken from another set.
- Revisit if an illustrator delivers a final icon set.
