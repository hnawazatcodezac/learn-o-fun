# 0043. Tailwind CSS for styling

- Status: accepted
- Date: 2026-10-26
- Plan section: 6.6, 7.2, 11; FRONTEND-KICKOFF steps 1–3

## Context

Since step 3d every style in the frontend has been hand-written CSS on custom properties generated from `docs/design-system/tokens.json` (ADR 0019), with a Stylelint rule for logical properties. On 2026-10-26 the human decided to style with Tailwind CSS instead.

## Options considered

1. **Tailwind CSS v4 with its theme generated from the tokens, and nothing else:** fast, consistent styling that can only use design-system values.
2. **Keep hand-written CSS on the token properties.**

## Decision

The first option.

- All apps and `packages/ui-kit` are styled with Tailwind CSS v4, and so is the games' DOM.
- A script generates the Tailwind theme from `tokens.json`; it is never written by hand. Colour, shadow and font utilities point at the CSS variables generated from the tokens, so the Light, Dark and High contrast themes switch through the `data-theme` attribute, without `dark:` variants.
- Tailwind's default colours, spacing scale, radii, shadows and font sizes are removed, so only design-system values exist. Utilities are named after tokens:
  - colours: `bg-sun`, `text-ink`, `bg-play-ground`, `text-on-bright`;
  - spacing: `p-1` to `p-8` are `space-1` to `space-8` (`p-5` is 24px);
  - radii: `rounded-sm`, `rounded-md`, `rounded-lg` and `rounded-full`;
  - shadows: `shadow-sm`, `shadow-lg`, `shadow-press-depth` and `shadow-focus-ring`;
  - fonts: `font-display`, `font-read` and `font-sans`;
  - sizes: `min-h-target-early`, `min-h-target-play`, `min-h-target-family` and `size-tile-min`;
  - one utility per type style: `text-play-hero`, `text-read-early`, `text-family-body` and the rest.
- No arbitrary values for colours, spacing, radii, shadows or font sizes, such as `bg-[#fff]` or `p-[13px]`; a lint rule enforces it.
- Logical utilities only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`); a lint rule bans the physical ones (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`). In Tailwind code this replaces the rule on physical CSS properties, which still holds for any plain CSS left.
- Every interactive element shows `focus-visible:shadow-focus-ring` on keyboard focus; motion respects `motion-safe:` and `motion-reduce:`.
- Source scanning includes `packages/ui-kit` and `packages/games`. `ui-kit` builds conditional classes with `clsx` and `tailwind-merge`, and `prettier-plugin-tailwindcss` orders classes.
- `docs/design-system/components/bundle.css` is a visual reference only: components are rebuilt with Tailwind, without its class names. PixiJS canvases are not styled with Tailwind; only the DOM around them is.

## Consequences

- Styling can use only design-system values, and lint checks it.
- The stylesheets written since step 3d (about 3,700 lines in 30 files) become Tailwind classes during step 1's move. Components keep their behaviour and tests.
- New dependencies, each explained when it is added: `tailwindcss` with its build plugin, `clsx`, `tailwind-merge`, `prettier-plugin-tailwindcss`, and a lint plugin or rule for arbitrary values and physical classes.
- ADR 0019's decisions on tokens, themes, bands, fonts and icons stand; only how styles are written changes.
- Revisit if a design-system value cannot be expressed in the generated theme.
