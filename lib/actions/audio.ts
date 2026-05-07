'use server';

import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import ExamSessionModel from '@/lib/models/ExamSession';
import { isRateLimited } from '@/lib/rate-limit';

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
  if (isRateLimited(`audio:${userId}`, 20, 60_000)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz.' };
  }

  try {
    await dbConnect();

    const session = await ExamSessionModel.findOne({ userId, examId }).lean();
    if (!session) return { error: 'Session tapılmadı.' };

    // Cast to access playedAudioUrls (added via schema update)
    const played: string[] = (session as unknown as { playedAudioUrls: string[] }).playedAudioUrls ?? [];

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
    console.error('[markAudioPlayed]', err);
    return { error: 'Server xətası.' };
  }
}
