'use server';

import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamSessionModel from '@/lib/models/ExamSession';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { isRateLimited } from '@/lib/rate-limit';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { captureException } from '@/lib/observability';

export interface SessionInfo {
  startedAt: string;
  elapsed: number;
  totalSeconds: number;
}

/**
 * Records the authoritative start time for an exam session server-side.
 * On first call: creates the session with startedAt = now.
 * On subsequent calls (page reload): returns the existing startedAt unchanged.
 * This prevents timer manipulation via page refresh or DevTools.
 */
export async function beginExamSession(examId: string): Promise<SessionInfo | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  // 10 session-start calls per user per minute — prevents timer reset abuse
  if (await isRateLimited(`begin:${userId}`, 10, 60_000)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz. Bir az gözləyin.' };
  }

  try {
    await dbConnect();

    const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
    if (!purchase) return { error: 'Not purchased' };

    const exam = await getExamByIdAdmin(examId);
    if (!exam) return { error: 'Exam not found' };

    const totalSeconds = exam.durationMinutes * 60;
    const now = new Date();

    // Atomically create session if it doesn't exist, or return existing one.
    // $setOnInsert ensures startedAt is never overwritten on subsequent calls.
    const session = await ExamSessionModel.findOneAndUpdate(
      { userId, examId },
      { $setOnInsert: { startedAt: now, totalSeconds } },
      { upsert: true, returnDocument: 'after' },
    );

    const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);

    // Only the first call creates the session; later calls are page reloads.
    if (elapsed < 5) {
      void trackEvent(ANALYTICS_EVENTS.examStarted, userId, {
        examId, examTitle: exam.title, examType: exam.type,
      });
    }

    return {
      startedAt:    session.startedAt.toISOString(),
      elapsed:      Math.max(0, elapsed),
      totalSeconds,
    };
  } catch (err) {
    void captureException(err, { tags: { action: 'beginExamSession' } });
    return { error: 'Server xətası baş verdi.' };
  }
}
