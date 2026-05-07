/**
 * Simple in-memory rate limiter for server actions.
 *
 * NOTE: This resets on every cold start. For multi-instance deployments,
 * swap the Map for a Redis/Upstash store. For a single Node.js process
 * (Vercel serverless per-region, Railway, Render) this is sufficient.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/**
 * Returns true if the caller has exceeded the rate limit.
 *
 * @param key      Unique identifier (e.g. userId + action name)
 * @param limit    Max requests allowed in the window
 * @param windowMs Time window in milliseconds
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || now > bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.count >= limit) return true;

  bucket.count += 1;
  return false;
}
