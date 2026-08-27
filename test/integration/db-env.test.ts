/**
 * VALIDATION — `lib/infra/db` throws at MODULE SCOPE without DATABASE_URL.
 *
 * This is what makes the CI `build` step fail: the workflow still provisions a
 * MongoDB service and passes `MONGODB_URI` (which nothing reads any more) and
 * never sets `DATABASE_URL`. Twenty-odd pages import this module transitively,
 * so `next build` cannot get past collecting them.
 *
 * Typecheck, lint and test all pass without it, which is why the first three CI
 * steps stay green while the build is red.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('lib/infra/db environment contract', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('throws on import when DATABASE_URL is absent', async () => {
    vi.stubEnv('DATABASE_URL', '');
    await expect(import('@/lib/infra/db')).rejects.toThrow(
      /DATABASE_URL environment variable is not defined/,
    );
    vi.unstubAllEnvs();
  });

  it('imports cleanly when DATABASE_URL is present', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@localhost/db');
    const mod = await import('@/lib/infra/db');
    expect(mod.db).toBeDefined();
    expect(typeof mod.txDb).toBe('function');
    vi.unstubAllEnvs();
  });
});
