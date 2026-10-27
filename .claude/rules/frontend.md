---
paths:
  - "frontend/apps/web/**"
  - "frontend/apps/site/**"
  - "apps/studio/**"
  - "frontend/packages/ui-kit/**"
  - "frontend/packages/i18n/**"
---

# Front-end rules

Plan sections 7 and 8 apply.

- All copy goes through ICU message catalogs. Format numbers, dates, plurals and units with `Intl`.
- In plain CSS, logical properties only; Tailwind code follows rule 10 below. Check layouts in the RTL pseudo-locale and the long-string pseudo-locale.
- WCAG 2.2 AA. Run automated accessibility checks in tests.
- One app, two areas (ADR 0007): the child area at `/` (`src/child`) and the parent dashboard at `/parent` (`src/parent`). They never import each other; shared code goes in a package or `src/shared`. The parent area stays lazily loaded.
- Child area: works through connectivity drops (events queue in IndexedDB); loads no third-party scripts; shows children no paywalls, locked content or upgrade prompts. The way into `/parent` goes through the parental gate.
- Parent area: recommendation and status text is rendered from reason codes and localized templates, in growth language. Show "early signal" when evidence is below the minimum. A third-party script it needs, such as payments, loads only on the page that uses it.
- Experience bands set reading load, interaction style and session length. Never hard-code age checks in components; read the band from config.

## Next.js (ADR 0042)

1. `apps/web` is a static export (`output: 'export'`), so the child area works offline as a PWA and can be wrapped with Capacitor later. No route segments with runtime IDs, such as `/child/[id]`: keep the child and the session in app state or the query string. No `next/image` optimization and no middleware.
2. Every game and play screen is a client component (`"use client"`). Load games with `next/dynamic` and `ssr: false`, because PixiJS, Rive, IndexedDB and audio only run in the browser.
3. Next.js is never the backend. No Server Actions, route handlers or server components that read or write children's data. All data goes through `packages/contracts`: to the mock API now, the Fastify API later.
4. The parent dashboard at `/parent` is client-side too: it calls the API, and is part of the same static export unless a later ADR decides otherwise.
5. Translations use next-intl with ICU messages, the service worker uses Serwist, mock data comes from MSW in the browser, and fonts use `next/font` with local files. The apps never request fonts from Google at runtime.
6. `apps/site`, the public website (FRONTEND-KICKOFF step 18), may use server rendering and static generation for SEO, but never holds children's data.

## Tailwind CSS (ADR 0043)

7. Generate the Tailwind theme from `docs/design-system/tokens.json` with a script, never by hand. Colour, shadow and font utilities point at the CSS variables generated from the tokens, so the Light, Dark and High contrast themes switch through the `data-theme` attribute without `dark:` variants.
8. Remove Tailwind's default colours, spacing scale, radii, shadows and font sizes, so only design-system values exist. Utilities are named after tokens:
   - colours: `bg-sun`, `text-ink`, `bg-play-ground`, `text-on-bright`;
   - spacing: `p-1` to `p-8` equal `space-1` to `space-8` (`p-5` is 24px);
   - radii: `rounded-sm`, `rounded-md`, `rounded-lg` and `rounded-full` equal the radius tokens;
   - shadows: `shadow-sm`, `shadow-lg`, `shadow-press-depth` and `shadow-focus-ring`;
   - fonts: `font-display`, `font-read` and `font-sans`;
   - sizes, in logical directions (rule 10): `min-block-target-early`, `min-block-target-play`, `min-block-target-family`, and `inline-tile-min block-tile-min`;
   - one utility per type style: `text-play-hero`, `text-read-early`, `text-family-body` and the rest.
9. No arbitrary values for colours, spacing, radii, shadows or font sizes (for example `bg-[#fff]` or `p-[13px]`). A lint rule enforces this.
10. Right-to-left support: use logical utilities only (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`, `text-end`, and for block direction and sizes `mbs-`, `pbe-`, `inset-bs-`, `inline-`, `block-`, `min-block-`, `max-inline-`). A lint rule bans the physical ones (`ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, and `mt-`, `pb-`, `top-`, `w-`, `h-`, `size-`, `min-h-`, `max-w-`). This replaces the physical-CSS-property rule for Tailwind code.
11. Every interactive element gets the focus-ring shadow on keyboard focus (`focus-visible:shadow-focus-ring`). Respect reduced motion with `motion-safe:` and `motion-reduce:`.
12. Tailwind's source scanning includes `packages/ui-kit` and `packages/games`. Use `clsx` with `tailwind-merge` for conditional classes in `ui-kit`, and `prettier-plugin-tailwindcss` for class order.
13. The plain CSS in `docs/design-system/components/bundle.css` is a visual reference only. Rebuild the components with Tailwind; do not copy its class names. PixiJS canvases are not styled with Tailwind; only the DOM around them is.
