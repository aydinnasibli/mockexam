import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    // Mirror the `@/*` path alias from tsconfig.json. Without this, any test
    // that reaches a module importing `@/...` fails to resolve at runtime even
    // though it typechecks — which silently put most of the server code out of
    // reach of tests.
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
      // `server-only` throws by design when imported outside a Server
      // Component. Under test there is no React server runtime, so point it at
      // a harmless stub — the guard still protects the real build.
      'server-only': fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    // Exclude build output and dependencies from test discovery.
    exclude: ['node_modules/**', '.next/**', '.playwright-mcp/**'],
  },
});
