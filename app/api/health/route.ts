import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { isRateLimited } from '@/lib/infra/rate-limit';

// Never cache — every probe must be live.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/*
 * Cap the probe so the endpoint responds fast even if the database is
 * unreachable.
 *
 * This mattered more under Mongo, whose driver defaulted to a 30-second
 * server-selection timeout while it hunted for a reachable replica. The HTTP
 * driver has no topology to discover and no connection to establish — a probe
 * is one request — but the ceiling stays, because Neon's compute can be
 * resuming from scale-to-zero and a health check should report slow rather
 * than hang.
 */
const PROBE_TIMEOUT_MS = 5_000;
const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' };

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms),
    ),
  ]);
}

async function isDatabaseHealthy(): Promise<boolean> {
  try {
    await withTimeout(
      db.execute(sql`SELECT 1`),
      PROBE_TIMEOUT_MS,
    );
    return true;
  } catch (err) {
    // Logged server-side only (PostHog picks it up). The public response never
    // echoes error detail, versions, or infra names to anonymous callers.
    console.error('[health] database check failed:', err);
    return false;
  }
}

/**
 * This endpoint is unauthenticated (uptime monitors need it) and every call
 * costs a live database round-trip, so it is rate limited per client IP to stop
 * it being used as a cheap amplification target. 30/min is far more than any
 * monitor needs. Fails open — see lib/rate-limit.ts.
 */
async function probeAllowed(): Promise<boolean> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown';
  return !(await isRateLimited(`health:${ip}`, 30, 60_000));
}

export async function GET() {
  if (!(await probeAllowed())) {
    return NextResponse.json({ status: 'rate_limited' }, { status: 429, headers: NO_STORE });
  }
  const ok = await isDatabaseHealthy();
  return NextResponse.json(
    { status: ok ? 'ok' : 'error' },
    { status: ok ? 200 : 503, headers: NO_STORE },
  );
}

// Many uptime monitors default to HEAD — same status code, no body.
export async function HEAD() {
  if (!(await probeAllowed())) {
    return new NextResponse(null, { status: 429, headers: NO_STORE });
  }
  const ok = await isDatabaseHealthy();
  return new NextResponse(null, { status: ok ? 200 : 503, headers: NO_STORE });
}
