'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { getExamById } from '@/lib/db/exams';
import { claimFreeExam, firstExamFreeEnabled } from '@/lib/db/free-claim';
import { isRateLimited } from '@/lib/infra/rate-limit';
import { captureException } from '@/lib/infra/observability';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/infra/analytics';

export type FreeExamResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Take the promotional free paper.
 *
 * This grants a real entitlement, so it is gated exactly like checkout is:
 * authenticated, rate limited, and re-validated against the live exam record.
 * The flag is re-read HERE rather than trusted from the caller — the client is
 * told whether to show the button, but it does not get to decide whether the
 * promotion is running.
 *
 * An inactive exam is refused. A paper withdrawn from sale should not be
 * reachable through the free path just because the promotion is open.
 */
export async function claimFreeExamAction(examId: string): Promise<FreeExamResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Daxil olun' };

  if (!firstExamFreeEnabled()) {
    return { ok: false, error: 'Kampaniya artıq aktiv deyil.' };
  }

  if (await isRateLimited(`free-claim:${userId}`, 5, 60_000)) {
    return { ok: false, error: 'Çox tez-tez sorğu göndərdiniz. Bir az gözləyin.' };
  }

  const exam = await getExamById(examId);
  if (!exam || !exam.isActive) {
    return { ok: false, error: 'Sınaq tapılmadı.' };
  }

  try {
    const outcome = await claimFreeExam(userId, examId);

    if (!outcome.ok) {
      const message: Record<typeof outcome.reason, string> = {
        disabled: 'Kampaniya artıq aktiv deyil.',
        already_claimed: 'Pulsuz sınaq hüququnuzdan artıq istifadə etmisiniz.',
        already_owned: 'Bu sınaq artıq sizdədir.',
      };
      return { ok: false, error: message[outcome.reason] };
    }

    void trackEvent(ANALYTICS_EVENTS.freeExamClaimed, userId, {
      examId,
      examTitle: exam.title,
      examType: exam.type,
      // The price forgone, so the promotion's cost is measurable in PostHog
      // rather than being inferred from a purchase row with amount zero.
      listPriceAzn: exam.price,
    });

    // The dashboard lists owned exams; without this the newly granted paper is
    // missing until the cache expires on its own.
    revalidatePath('/dashboard');

    return { ok: true };
  } catch (err) {
    captureException(err, { tags: { action: 'claimFreeExam' } });
    return { ok: false, error: 'Sınaq təyin edilə bilmədi. Yenidən cəhd edin.' };
  }
}
