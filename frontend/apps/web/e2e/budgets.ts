/**
 * Bundle caps for the performance budget (ADR 0040): the compressed (gzip) bytes of the scripts and
 * style sheets each area loads, at their size on the day the budget was set plus 10%. Growth past
 * a cap is a deliberate change: raise it with its reason in ADR 0040, never to make a build pass.
 */
export const BUNDLE_CAPS = {
  // 2026-10-27: 378,891 bytes, of which about 160 KB is the mock API and its data (ADR 0011).
  'child-first-load': 416_781,
  // 2026-10-27: 8,973 bytes beyond the child area's first load, for the overview.
  'parent-area': 9_871,
  // 2026-10-27: 15,636 bytes.
  'play-route': 17_200,
  // 2026-10-27: 4,553, 5,297 and 5,103 bytes.
  'game:hop-line': 5_009,
  'game:ten-frame-cafe': 5_827,
  'game:tile-farm': 5_614,
} as const;

export type BundleArea = keyof typeof BUNDLE_CAPS;
