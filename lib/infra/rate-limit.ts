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

export async function isRateLimited(key: string, limit: number, windowMs: number): Promise<boolean> {
  try {
    const limiter = getLimiter(limit, windowMs);
    const { success } = await limiter.limit(key);
    return !success;
  } catch (err) {
    // Fail open: if the limiter (Upstash) is unreachable, never let that outage
    // take down checkout or the contact form. Surfaced in PostHog for visibility.
    void captureException(err, { tags: { fn: 'isRateLimited' } });
    return false;
  }
}
