import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Mirror the `@/*` path alias from tsconfig.json. Without this, any test that
 * reaches a module importing `@/...` fails to resolve at runtime even though it
 * typechecks — which silently put most of the server code out of reach of tests.
 *
 * `server-only` throws by design when imported outside a Server Component.
 * Under test there is no React server runtime, so point it at a harmless stub —
 * the guard still protects the real build.
 */
const alias = {
  '@': fileURLToPath(new URL('./', import.meta.url)),
  'server-only': fileURLToPath(new URL('./test/stubs/server-only.ts', import.meta.url)),
};

const exclude = ['node_modules/**', '.next/**', '.playwright-mcp/**'];

export default defineConfig({
  test: {
    /*
     * Two projects, because the two kinds of test have opposite needs.
     *
     * The domain tests are pure functions — hundreds of them, milliseconds
     * each, and they parallelise perfectly.
     *
     * The integration tests each boot a PGlite instance: a full Postgres
     * compiled to WASM, holding its own memory and running the real migrations.
     * Five of those starting at once on a loaded machine pushed past Vitest's
     * 5s default and produced intermittent failures — a flaky suite being worse
     * than no suite, since it teaches everyone to re-run instead of read. They
     * run one file at a time with a timeout that reflects what they actually
     * do, and the whole suite still finishes in seconds.
     */
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          include: ['**/*.test.ts', '**/*.test.tsx'],
          exclude: [...exclude, 'test/integration/**'],
        },
      },
      {
        resolve: { alias },
        test: {
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          exclude,
          // One PGlite at a time.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
