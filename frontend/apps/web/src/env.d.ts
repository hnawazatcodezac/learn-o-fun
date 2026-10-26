/**
 * Whether the development tools are in: the pseudo-locales and the Language menu, the mock API
 * panel, the game stories route, and MSW's own worker without caching. True on the development
 * server and in the test build the Playwright suites run (`npm run build:e2e`), false in
 * production, where the code drops out. Replaced when the code is built (next.config.ts, ADR 0041).
 */
declare const __DEV_TOOLS__: boolean;

declare namespace NodeJS {
  interface ProcessEnv {
    /** 'mock' (the default until a backend exists, ADR 0011) or 'live'. */
    readonly NEXT_PUBLIC_API_MODE?: 'mock' | 'live';
  }
}
