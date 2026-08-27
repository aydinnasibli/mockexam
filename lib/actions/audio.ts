'use server';

import { auth } from '@clerk/nextjs/server';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { examSessions, playedAudio } from '@/lib/db/schema';
import { isRateLimited } from '@/lib/infra/rate-limit';
import { captureException } from '@/lib/infra/observability';
import { hasExamAccess } from '@/lib/db/entitlements';

/** Read-only check — does NOT mark the audio as played. Used on component mount. */
export async function checkAudioPlayed(
  examId: string,
  audioUrl: string,
): Promise<{ alreadyPlayed: boolean } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };
  if (!examId || !audioUrl) return { error: 'Invalid params' };

  /*
   * Deliberately far above `markAudioPlayed`'s budget, because the two failures
   * are not symmetrical. The player treats an error here as "not yet played"
   * and shows the Play button — so a limit that trips during a legitimate
   * attempt offers a spent track back, and the candidate only discovers
   * otherwise when `markAudioPlayed` stops it a second later. The rule is still
   * enforced (that claim is the atomic one); this is purely a backstop against
   * someone hammering the endpoint, so it is set where honest use never reaches.
   */
  if (await isRateLimited(`audiocheck:${userId}`, 60, 60_000)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz.' };
  }

  try {
    // Checked here as everywhere else. The queries below are already scoped to
    // this user so nothing leaked without it, but a gate present on every
    // neighbour and absent on one stops being harmless the moment someone
    // reuses the function — the same argument `getSessionClock` makes.
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    const [session] = await db
      .select({ id: examSessions.id })
      .from(examSessions)
      .where(and(
        eq(examSessions.userId, userId),
        eq(examSessions.examId, examId),
        gt(examSessions.expiresAt, new Date()),
      ))
      .limit(1);
    if (!session) return { error: 'Session tapılmadı.' };

    /*
     * `expires_at > now()` is not an optimisation — it is the rule.
     *
     * Postgres has no TTL index, so nothing deletes a lapsed claim at the
     * moment it lapses; a sweep reclaims the space later. Correctness therefore
     * has to live in the read, and this is strictly tighter than the Mongo TTL
     * it replaces, whose monitor ran on a 60-second cycle and left an expired
     * claim readable — and a spent track re-claimable — for up to a minute.
     *
     * The legacy `playedAudioUrls` check is gone: those entries were promoted
     * to real rows in this table by the backfill, so there is one authority.
     */
    const [durable] = await db
      .select({ id: playedAudio.id })
      .from(playedAudio)
      .where(and(
        eq(playedAudio.userId, userId),
        eq(playedAudio.examId, examId),
        eq(playedAudio.audioUrl, audioUrl),
        gt(playedAudio.expiresAt, new Date()),
      ))
      .limit(1);
    return { alreadyPlayed: !!durable };
  } catch (err) {
    void captureException(err, { tags: { action: 'checkAudioPlayed' } });
    return { error: 'Server xətası.' };
  }
}

/**
 * Marks an audio URL as played for this user's session.
 * Returns { alreadyPlayed: true } if the audio was already consumed.
 * Returns { alreadyPlayed: false } on first play (and records it).
 */
export async function markAudioPlayed(
  examId: string,
  audioUrl: string,
): Promise<{ alreadyPlayed: boolean } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  if (!examId || !audioUrl) return { error: 'Invalid params' };

  // 20 calls per user per minute — generous enough for legitimate use
  if (await isRateLimited(`audio:${userId}`, 20, 60_000)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz.' };
  }

  try {
    // The session check below already implies this — a session cannot exist
    // without `beginExamSession` having verified access — but stating it keeps
    // the two audio actions identically gated rather than one relying on a
    // transitive guarantee the other spells out.
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    // A track can only be claimed against a real, unexpired attempt.
    const [session] = await db
      .select({ id: examSessions.id })
      .from(examSessions)
      .where(and(
        eq(examSessions.userId, userId),
        eq(examSessions.examId, examId),
        gt(examSessions.expiresAt, new Date()),
      ))
      .limit(1);
    if (!session) return { error: 'Session tapılmadı.' };

    /*
     * The claim is the INSERT, and the whole rule is this one statement.
     *
     * The unique index on (user_id, exam_id, audio_url) means exactly one
     * concurrent caller can win — the database decides, not a read-then-write
     * in application code, which is what let two tabs both be told the track
     * was still available.
     *
     * The conditional DO UPDATE folds expiry into the same atomic step:
     *   no row            → INSERT succeeds, returns an id       → first play
     *   row, expired      → the WHERE holds, claim is renewed    → first play
     *   row, still live   → the WHERE fails, nothing returned    → already played
     * Expressing it as a returned row rather than a caught duplicate-key
     * exception means the success path is no longer the one that throws.
     *
     * And because this record is not the session, `restartExamSession` cannot
     * refund the listen: deleting the attempt leaves the claim standing.
     */
    const now = new Date();
    const claimed = await db
      .insert(playedAudio)
      .values({ userId, examId, audioUrl, playedAt: now })
      .onConflictDoUpdate({
        target: [playedAudio.userId, playedAudio.examId, playedAudio.audioUrl],
        set: {
          playedAt: now,
          expiresAt: sql`now() + interval '24 hours'`,
        },
        setWhere: sql`${playedAudio.expiresAt} <= now()`,
      })
      .returning({ id: playedAudio.id });

    return { alreadyPlayed: claimed.length === 0 };

  } catch (err) {
    void captureException(err, { tags: { action: 'markAudioPlayed' } });
    return { error: 'Server xətası.' };
  }
}
