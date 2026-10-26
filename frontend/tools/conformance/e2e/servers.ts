/**
 * The conformance suite runs the web app and the game sandbox on ports of its own, so it can run
 * beside their own Playwright tests (ADR 0014).
 */
export const SHELL_PORT = 5183;
export const SANDBOX_PORT = 5186;
export const SHELL_URL = `http://localhost:${String(SHELL_PORT)}`;
export const SANDBOX_URL = `http://localhost:${String(SANDBOX_PORT)}`;
