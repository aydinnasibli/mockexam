import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { lte } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { examSessions, playedAudio } from '@/lib/db/schema';
import { captureException } from '@/lib/infra/observability';

/**
 * Reclaims rows whose `expires_at` has passed.
 *
 * This replaces the two Mongo TTL indexes — `ExamSession` at 7 days and
 * `PlayedAudio` at 24 hours — which Postgres has no equivalent for. Neon does
 * offer `pg_cron`, but its own documentation is explicit that jobs run only
 * while the compute is active, so with scale-to-zero they silently never fire.
 * An expiry rule that stops working when the database is idle is not an expiry
 * rule.
 *
 * IMPORTANT: this job is NOT what makes expiry correct. Every read filters on
 * `expires_at > now()` — see `liveSession` in `lib/actions/session.ts` and the
 * claim check in `lib/actions/audio.ts` — so a lapsed row is already invisible
 * to the application the instant it lapses. This only frees the space, and
 * being late or failing entirely costs disk, never correctness.
 *
 * That is a real improvement on what it replaces: Mongo's TTL monitor swept on
 * a 60-second cycle, so an expired claim stayed READABLE for up to a minute —
 * a window in which a spent listening track could be claimed again.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  /*
   * Vercel signs its cron invocations with CRON_SECRET as a bearer token.
   * Without this check the route is a public endpoint that deletes rows — and
   * while it can only delete already-expired ones, an unauthenticated delete
   * endpoint is not something to leave open on reasoning that subtle.
   */
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 });
  }
  // Constant-time, so the comparison cannot leak the secret one byte at a time
  // to a caller measuring how long the rejection takes. `timingSafeEqual`
  // throws on a length mismatch, hence the guard.
  const presented = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  if (presented.length !== expected.length || !timingSafeEqual(presented, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  try {
    /*
     * `rowCount`, not `RETURNING`.
     *
     * These used to return every deleted id purely to length-check the array,
     * which drags the whole result set back over HTTP — on the first real sweep
     * of a backlog that is the largest response this app ever produces, on a
     * route with no `maxDuration` set.
     */
    const [sessions, audio] = await Promise.all([
      db.delete(examSessions).where(lte(examSessions.expiresAt, now)),
      db.delete(playedAudio).where(lte(playedAudio.expiresAt, now)),
    ]);

    return NextResponse.json({
      sweptAt: now.toISOString(),
      examSessions: sessions.rowCount ?? 0,
      playedAudio: audio.rowCount ?? 0,
    });
  } catch (err) {
    void captureException(err, { tags: { action: 'cronSweep' } });
    return NextResponse.json({ error: 'Sweep failed' }, { status: 500 });
  }
}
