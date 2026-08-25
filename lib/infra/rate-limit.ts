// Holds the Upstash REST token; a client-side import must fail the build.
import 'server-only';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { captureException } from '@/lib/infra/observability';

const limiters = new Map<string, Ratelimit>();

/**
 * Fail-open budget for a single limiter call.
 *
 * The client library defaults to 5 retries with `Math.exp(n) * 50` backoff,
 * which is roughly 4.2s of stalling before it gives up. That turns an Upstash
 * outage into a latency incident on every rate-limited path (checkout, exam
 * submission, contact form, audio), not just a loss of rate limiting. Capping
 * retries and setting the limiter's own timeout keeps a Redis outage to a
 * sub-second penalty; `timeout` makes Ratelimit resolve as allowed on its own.
 */
const REDIS_RETRIES = 1;
const LIMITER_TIMEOUT_MS = 1_000;

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      retry: { retries: REDIS_RETRIES, backoff: (n) => n * 100 },
    });
  }
  return redis;
}

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  if (!limiters.has(cacheKey)) {
    const windowSecs = Math.floor(windowMs / 1000);
    limiters.set(cacheKey, new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
      prefix: '@testcentre/ratelimit',
      timeout: LIMITER_TIMEOUT_MS,
    }));
  }
  return limiters.get(cacheKey)!;
}

/*
 * ── In-process fallback ──────────────────────────────────────────────────────
 *
 * Used only when Redis is unreachable. Previously that case returned `false` —
 * fully open — so an Upstash outage left checkout, exam submission, the contact
 * form and the writing re-grader with no throttle at all. The grader calls a
 * paid reasoning model, so "no limiter" is a cost exposure, not just a missing
 * guard.
 *
 * This is deliberately weaker than the real thing and cannot replace it: the
 * counter is per instance, so N instances allow roughly N × limit, and it is
 * lost on cold start. That is fine for what it is for — bounding the damage
 * during an outage rather than enforcing a global quota.
 *
 * A fixed window, not a sliding one: an outage is not the moment to spend
 * memory on precision.
 */
const MAX_FALLBACK_KEYS = 10_000;
const fallbackHits = new Map<string, { count: number; resetAt: number }>();

function pruneFallback(now: number): void {
  for (const [k, v] of fallbackHits) if (v.resetAt <= now) fallbackHits.delete(k);
  // Hard ceiling so a flood of distinct keys during an outage cannot grow this
  // without bound. Dropping the oldest entries only loosens the limit, which is
  // the safe direction for a fallback.
  if (fallbackHits.size > MAX_FALLBACK_KEYS) {
    const excess = fallbackHits.size - MAX_FALLBACK_KEYS;
    let i = 0;
    for (const k of fallbackHits.keys()) {
      if (i++ >= excess) break;
      fallbackHits.delete(k);
    }
  }
}

/** Exported for tests only. */
export function __resetFallbackForTests(): void {
  fallbackHits.clear();
}

export function isRateLimitedInProcess(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  pruneFallback(now);
  const bucketKey = `${key}:${limit}:${windowMs}`;
  const entry = fallbackHits.get(bucketKey);

  if (!entry || entry.resetAt <= now) {
    fallbackHits.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > limit;
}

export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const limiter = getLimiter(limit, windowMs);
    const { success } = await limiter.limit(key);
    return !success;
  } catch (err) {
    /*
     * Degrade, don't disable.
     *
     * An Upstash outage must never take checkout or the contact form down, so
     * this still errs towards allowing — but through a per-instance counter
     * rather than an unconditional `false`. Surfaced in PostHog either way.
     */
    void captureException(err, { tags: { fn: 'isRateLimited', mode: 'fallback' } });
    return isRateLimitedInProcess(key, limit, windowMs);
  }
}
