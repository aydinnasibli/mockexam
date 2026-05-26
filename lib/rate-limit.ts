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
  const limiter = getLimiter(limit, windowMs);
  const { success } = await limiter.limit(key);
  return !success;
}
