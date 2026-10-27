# @learnofun/ui-preview

A development-only page per ui-kit component, in every experience band, theme and locale. Never deployed. Plan sections 6.6 and 8.6.

- `npm run dev -w @learnofun/ui-preview` serves it on http://localhost:5175. The toolbar and the URL pick the component, band, theme, locale and reduced motion, for example `?component=button&band=early-years&theme=dark&locale=en-XB`.
- `npm run e2e -w @learnofun/ui-preview` runs the WCAG 2.2 AA checks on every combination and the reduced-motion tests, on the built preview, a Next.js static export (port 4175, ADR 0041, ADR 0042).
- `npm run visual` (from `frontend/`) compares screenshots in English and right to left, using the browser in Playwright's Docker image so they match everywhere (ADR 0006). Docker must be running. For now the screenshots are taken from the development server (ADR 0041). After an intended visual change, run `npm run visual -- --update-snapshots` and review the new images in `e2e/__screenshots__/`.

To add a component, add its ID to `COMPONENTS` in `src/matrix.ts`, a preview to `src/previews.tsx`, and its name under `dev.preview.components` in the English catalog.
