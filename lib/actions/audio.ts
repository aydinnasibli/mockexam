'use server';

import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/infra/mongodb';
import ExamSessionModel, { type IExamSession } from '@/lib/models/ExamSession';
import PlayedAudioModel from '@/lib/models/PlayedAudio';
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
    await dbConnect();
    // Checked here as everywhere else. The queries below are already scoped to
    // this user so nothing leaked without it, but a gate present on every
    // neighbour and absent on one stops being harmless the moment someone
    // reuses the function — the same argument `getSessionClock` makes.
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    const session = await ExamSessionModel.findOne({ userId, examId }).lean();
    if (!session) return { error: 'Session tapılmadı.' };

    // The durable record is authoritative; it outlives a restart, which is the
    // whole point (see PlayedAudio). The session's own list is still consulted
    // so an attempt already in flight when this shipped keeps its spent tracks.
    const durable = await PlayedAudioModel.exists({ userId, examId, audioUrl });
    const legacy = ((session as IExamSession).playedAudioUrls ?? []).includes(audioUrl);
    return { alreadyPlayed: !!durable || legacy };
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
    await dbConnect();
    // The session check below already implies this — a session cannot exist
    // without `beginExamSession` having verified access — but stating it keeps
    // the two audio actions identically gated rather than one relying on a
    // transitive guarantee the other spells out.
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    // A track can only be claimed against a real attempt.
    const session = await ExamSessionModel.findOne({ userId, examId }).select('playedAudioUrls').lean();
    if (!session) return { error: 'Session tapılmadı.' };

    // Already spent by an attempt that predates the durable record.
    if (((session as IExamSession).playedAudioUrls ?? []).includes(audioUrl)) {
      return { alreadyPlayed: true };
    }

    /*
     * The claim is the INSERT.
     *
     * A unique index on {userId, examId, audioUrl} means exactly one concurrent
     * caller can succeed and every other gets a duplicate-key error — the
     * database decides, not a read-then-write in application code, which is
     * what let two tabs both be told the track was still available.
     *
     * And because this record is not the session, `restartExamSession` no
     * longer refunds the listen: deleting the attempt leaves the claim standing
     * until its TTL expires.
     */
    try {
      await PlayedAudioModel.create({ userId, examId, audioUrl, playedAt: new Date() });
      return { alreadyPlayed: false };
    } catch (err) {
      if ((err as { code?: number }).code === 11000) return { alreadyPlayed: true };
      throw err;
    }

  } catch (err) {
    void captureException(err, { tags: { action: 'markAudioPlayed' } });
    return { error: 'Server xətası.' };
  }
}
