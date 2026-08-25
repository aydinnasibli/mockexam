import { describe, expect, it, beforeEach } from 'vitest';

// `server-only` throws when imported outside a server context; the project
// stubs it for tests (see vitest.config.ts).
import { isRateLimitedInProcess, __resetFallbackForTests } from './rate-limit';

beforeEach(() => __resetFallbackForTests());

describe('in-process fallback', () => {
  /*
   * Exercised only when Redis is unreachable. It used to be an unconditional
   * "allow", which left the writing re-grader — a paid reasoning model — with
   * no throttle at all during an Upstash outage.
   */
  it('allows up to the limit, then blocks', () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) {
      expect(isRateLimitedInProcess('user-a', 3, 60_000, t)).toBe(false);
    }
    expect(isRateLimitedInProcess('user-a', 3, 60_000, t)).toBe(true);
  });

  it('keeps separate budgets per key', () => {
    const t = 1_000_000;
    expect(isRateLimitedInProcess('user-a', 1, 60_000, t)).toBe(false);
    expect(isRateLimitedInProcess('user-a', 1, 60_000, t)).toBe(true);
    // A different caller is unaffected.
    expect(isRateLimitedInProcess('user-b', 1, 60_000, t)).toBe(false);
  });

  it('keeps separate budgets per limit/window, so one path cannot spend another’s', () => {
    const t = 1_000_000;
    expect(isRateLimitedInProcess('user-a', 1, 60_000, t)).toBe(false);
    expect(isRateLimitedInProcess('user-a', 1, 60_000, t)).toBe(true);
    expect(isRateLimitedInProcess('user-a', 1, 10_000, t)).toBe(false);
  });

  it('resets once the window has passed', () => {
    const t = 1_000_000;
    expect(isRateLimitedInProcess('user-a', 1, 60_000, t)).toBe(false);
    expect(isRateLimitedInProcess('user-a', 1, 60_000, t)).toBe(true);
    expect(isRateLimitedInProcess('user-a', 1, 60_000, t + 60_001)).toBe(false);
  });

  it('does not grow without bound as keys churn', () => {
    const t = 1_000_000;
    for (let i = 0; i < 12_000; i++) isRateLimitedInProcess(`k${i}`, 5, 60_000, t);
    // Expired entries are pruned and the map is capped; the exact size is an
    // implementation detail, that it stays bounded is not.
    expect(isRateLimitedInProcess('k0', 5, 60_000, t + 60_001)).toBe(false);
  });
});
