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

/* ── Named tiers ─────────────────────────────────────────────────────────────
 *
 * The limits above each call site used to be bare numbers, which made it
 * impossible to answer "is this endpoint protected, and by how much?" without
 * reading every action. These tiers give the common cases one definition and
 * one place to tune.
 *
 * A handful of call sites deliberately keep explicit numbers instead — the
 * audio pair, exam submission, the writing re-grader — because their budgets
 * were reasoned about individually and the reasoning is documented there. A
 * tier would flatten that into a number nobody could question.
 */
export const RATE_LIMIT_TIERS = {
  /** Authenticated reads that hit the database but return little. */
  read: { limit: 120, windowMs: 60_000 },
  /** Authenticated reads that return a whole paper or answer key. */
  readHeavy: { limit: 30, windowMs: 60_000 },
  /** Authenticated mutations owned by the user (settings, drafts). */
  write: { limit: 30, windowMs: 60_000 },
  /** Ordinary admin console actions. Role-gated already; this bounds a
   *  compromised or scripted admin session rather than a stranger. */
  admin: { limit: 60, windowMs: 60_000 },
  /** Admin actions that rewrite a lot at once: import, seed, resync. */
  adminHeavy: { limit: 10, windowMs: 60_000 },
  /** Anything that spends money per call — paid model, payment creation. */
  expensive: { limit: 5, windowMs: 5 * 60_000 },
  /** Unauthenticated surfaces keyed by IP. */
  publicIp: { limit: 60, windowMs: 60_000 },
} as const;

export type RateLimitTier = keyof typeof RATE_LIMIT_TIERS;

/**
 * Tier-based wrapper around `isRateLimited`.
 *
 * `scope` names the endpoint and `id` the actor, so keys stay unique per
 * action rather than sharing one bucket across everything a user does.
 */
export async function limited(tier: RateLimitTier, scope: string, id: string): Promise<boolean> {
  const { limit, windowMs } = RATE_LIMIT_TIERS[tier];
  return isRateLimited(`${scope}:${id}`, limit, windowMs);
}

/**
 * Best-effort client IP for keying unauthenticated limits.
 *
 * Trusts `x-forwarded-for` because Vercel sets it and strips any client-sent
 * value at the edge. Falls back to a shared 'unknown' bucket, which is the
 * conservative direction: unattributable traffic shares one budget rather than
 * getting an unlimited one each.
 */
export function clientIp(h: Headers): string {
  const fwd = h.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]!.trim();
  return h.get('x-real-ip') ?? 'unknown';
}
