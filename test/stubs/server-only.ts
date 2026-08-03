// Test-only stub for the `server-only` package.
//
// `server-only` throws when imported outside a React Server Component. Vitest
// has no server runtime, so importing any module marked server-only would fail
// to load. Aliasing it here (see vitest.config.ts) lets those modules be tested
// directly; the real guard is untouched in dev and production builds.
export {};
