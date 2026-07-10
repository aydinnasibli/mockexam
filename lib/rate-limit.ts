import * as Sentry from '@sentry/nextjs';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  if (!limiters.has(cacheKey)) {
    const windowSecs = Math.floor(windowMs / 1000);
    limiters.set(cacheKey, new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSecs} s`),
      prefix: '@testcentre/ratelimit',
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
    // take down checkout or the contact form. Surfaced in Sentry for visibility.
    Sentry.captureException(err, { tags: { fn: 'isRateLimited' } });
    return false;
  }
}
