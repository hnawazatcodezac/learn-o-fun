# 0006. Screenshot tests run in Playwright's Docker image

- Status: accepted
- Date: 2026-10-20
- Plan section: 6.8 (visual regression), 7.2 (right-to-left readiness)

## Context

Visual regression tests compare screenshots pixel by pixel. Fonts and anti-aliasing differ between Windows, macOS and the Linux machines CI uses, so a screenshot taken on one machine does not match another.

## Options considered

1. Run the browser for screenshot tests inside Playwright's official Docker image, both locally and in CI. One set of reference images that matches everywhere; needs Docker for local runs.
2. Keep reference images per operating system. No Docker, but two or more sets to maintain, and CI cannot create its own until it runs.

## Decision

Option 1.

- `npm run visual` starts `mcr.microsoft.com/playwright:v<version>-noble` (the version is read from the installed `@playwright/test`), runs the tests against its Chromium, and stops the container. The test runner and the preview server stay on the developer's machine.
- In CI the `visual` job runs inside the same image.
- Screenshot names carry no platform suffix, and each test checks that the browser is on Linux, so a reference image can never be taken from the wrong browser.
- After an intended visual change: `npm run visual -- --update-snapshots`, then review the new images.

## Consequences

- Local screenshot runs need Docker Desktop running, and the first run downloads the image (about 2 GB).
- The image tag in `.github/workflows/ci.yml` must move with the `@playwright/test` version.
- Accessibility and behaviour tests are not affected; they run in a normal local browser.
- Revisit if the image becomes a burden, or if a hosted visual-testing service is adopted.
