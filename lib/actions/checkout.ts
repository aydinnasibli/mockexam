'use server';

import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { purchases } from '@/lib/db/schema';
import { getExamById } from '@/lib/db/exams';
import { signRequest, encodeOrderId, EPOINT_REQUEST_URL } from '@/lib/payments/epoint';
import { isRateLimited } from '@/lib/infra/rate-limit';
import { captureException, captureMessage } from '@/lib/infra/observability';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/infra/analytics';

export type CheckoutResult =
  | { redirectUrl: string }
  | { alreadyPurchased: true }
  | { unconfigured: true; error: string }
  | { error: string };

export async function createCheckoutSession(examId: string): Promise<CheckoutResult> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  if (await isRateLimited(`checkout:${userId}`, 5, 60_000)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz. Bir az gözləyin.' };
  }

  const publicKey = process.env.EPOINT_PUBLIC_KEY;
  const privateKey = process.env.EPOINT_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return {
      unconfigured: true,
      error: 'Epoint is not configured. Set EPOINT_PUBLIC_KEY and EPOINT_PRIVATE_KEY.',
    };
  }

  const exam = await getExamById(examId);
  if (!exam) return { error: 'Exam not found' };

  const [existing] = await db
    .select({ examId: purchases.examId })
    .from(purchases)
    .where(and(
      eq(purchases.userId, userId),
      eq(purchases.examId, examId),
      eq(purchases.status, 'COMPLETED'),
    ))
    .limit(1);
  if (existing) return { alreadyPurchased: true };

  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;

  const orderId = encodeOrderId(userId, examId);

  const { data, signature } = signRequest(
    {
      public_key: publicKey,
      amount: String(exam.price),
      currency: 'AZN',
      language: 'az',
      order_id: orderId,
      description: exam.title,
      success_redirect_url: `${appUrl}/dashboard?purchased=${examId}`,
      error_redirect_url: `${appUrl}/checkout/${examId}?payment=failed`,
    },
    privateKey,
  );

  try {
    const res = await fetch(EPOINT_REQUEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data, signature }),
    });

    const result = await res.json() as {
      status: string;
      redirect_url?: string;
      transaction?: string;
      message?: string;
    };

    if (result.status !== 'success' || !result.redirect_url) {
      void captureMessage('Epoint payment creation failed', {
        level: 'error',
        extra: { result },
      });
      return { error: result.message ?? 'Ödəniş yaradıla bilmədi' };
    }

    // Record a PENDING purchase carrying Epoint's transaction id. The webhook is
    // still the primary path to COMPLETED; this only exists so we can reconcile
    // via get-status if the webhook is delayed or missed. Best-effort — a failure
    // here must never block the redirect to the bank page.
    if (result.transaction) {
      try {
        // `setWhere` keeps a COMPLETED purchase untouched: a re-entered
        // checkout must never downgrade access someone already paid for.
        await db
          .insert(purchases)
          .values({
            userId, examId,
            transactionId: result.transaction,
            amountCents: Math.round(exam.price * 100),
            currency: 'AZN',
            status: 'PENDING',
          })
          .onConflictDoUpdate({
            target: [purchases.userId, purchases.examId],
            set: {
              transactionId: result.transaction,
              amountCents: Math.round(exam.price * 100),
              currency: 'AZN',
              status: 'PENDING',
              updatedAt: new Date(),
            },
            setWhere: ne(purchases.status, 'COMPLETED'),
          });
      } catch (err) {
        // The upsert above cannot raise a duplicate-key error, so anything
        // thrown here is real. (This used to filter out Mongo's `11000`, a code
        // no Postgres driver produces.)
        void captureException(err, { tags: { action: 'createCheckoutSession', step: 'pending' } });
      }
    }

    void trackEvent(ANALYTICS_EVENTS.checkoutStarted, userId, {
      examId,
      examTitle: exam.title,
      examType: exam.type,
      priceAzn: exam.price,
    });

    return { redirectUrl: result.redirect_url };
  } catch (err) {
    void captureException(err, { tags: { action: 'createCheckoutSession' } });
    return { error: 'Ödəniş xidmətinə qoşulmaq mümkün olmadı' };
  }
}
