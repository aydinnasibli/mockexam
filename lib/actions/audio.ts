'use server';

import * as Sentry from '@sentry/nextjs';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import ExamSessionModel, { type IExamSession } from '@/lib/models/ExamSession';
import { isRateLimited } from '@/lib/rate-limit';

/** Read-only check — does NOT mark the audio as played. Used on component mount. */
export async function checkAudioPlayed(
  examId: string,
  audioUrl: string,
): Promise<{ alreadyPlayed: boolean } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };
  if (!examId || !audioUrl) return { error: 'Invalid params' };

  try {
    await dbConnect();
    const session = await ExamSessionModel.findOne({ userId, examId }).lean();
    if (!session) return { error: 'Session tapılmadı.' };
    const played = (session as IExamSession).playedAudioUrls ?? [];
    return { alreadyPlayed: played.includes(audioUrl) };
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'checkAudioPlayed' } });
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

    const session = await ExamSessionModel.findOne({ userId, examId }).lean();
    if (!session) return { error: 'Session tapılmadı.' };

    const played = (session as IExamSession).playedAudioUrls ?? [];

    if (played.includes(audioUrl)) {
      return { alreadyPlayed: true };
    }

    // Atomically push the URL — $addToSet prevents duplicates even under race conditions
    await ExamSessionModel.updateOne(
      { userId, examId },
      { $addToSet: { playedAudioUrls: audioUrl } },
    );

    return { alreadyPlayed: false };
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'markAudioPlayed' } });
    return { error: 'Server xətası.' };
  }
}
