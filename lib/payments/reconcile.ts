// Reads the Epoint merchant keys and calls the payment API.
import 'server-only';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { purchases } from '@/lib/db/schema';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { signRequest, EPOINT_STATUS_URL } from '@/lib/payments/epoint';
import { captureException, captureMessage } from '@/lib/infra/observability';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/infra/analytics';

/**
 * Safety net for a missed or delayed webhook.
 *
 * The webhook is the primary way a purchase becomes COMPLETED. If Epoint ever
 * fails to deliver it (downtime, misconfig, transient 5xx), a paying user would
 * be left without access. Because Epoint only redirects to `success_redirect_url`
 * *after* the payment is finalised, `get-status` is authoritative by the time the
 * user lands back on our site — so we re-query it and grant access ourselves,
 * applying the exact same amount check the webhook does.
 *
 * Returns true iff the purchase is (now) COMPLETED. Never grants access on
 * anything other than an Epoint-confirmed `success` with a matching amount.
 */
export async function reconcilePurchase(userId: string, examId: string): Promise<boolean> {
  const [purchase] = await db
    .select()
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.examId, examId)))
    .limit(1);
  if (!purchase) return false;
  if (purchase.status === 'COMPLETED') return true;
  // A refunded purchase stays revoked; a PENDING one with a transaction id can
  // be reconciled. Anything else has nothing to confirm.
  if (purchase.status !== 'PENDING' || !purchase.transactionId) return false;

  const publicKey = process.env.EPOINT_PUBLIC_KEY;
  const privateKey = process.env.EPOINT_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  try {
    const { data, signature } = signRequest(
      { public_key: publicKey, transaction: purchase.transactionId },
      privateKey,
    );
    const res = await fetch(EPOINT_STATUS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ data, signature }),
    });
    const result = (await res.json()) as { status?: string; amount?: number };

    if (result.status !== 'success') return false;

    /*
     * Same two rules as the webhook, for the same reason — this path exists to
     * rescue a payment the webhook missed, so it must not fail on the states
     * that made the webhook fail. `getExamByIdAdmin` so a deactivated exam
     * still resolves, and the price quoted at checkout (stored on the PENDING
     * row) rather than the live one, so a mid-payment reprice cannot deny
     * access to a payment that was correct when it was authorised.
     */
    const exam = await getExamByIdAdmin(examId);
    if (!exam) return false;

    const expectedCents = purchase.amountCents ?? Math.round(exam.price * 100);
    const paidCents = Math.round((result.amount ?? 0) * 100);
    if (paidCents !== expectedCents) {
      void captureMessage('Reconcile amount mismatch', {
        level: 'error',
        extra: { examId, transaction: purchase.transactionId, expected: expectedCents, paid: paidCents, quotedAtCheckout: purchase.amountCents ?? null },
      });
      return false;
    }

    // Grant access. The status guard avoids racing the webhook and never
    // re-completes a purchase that was meanwhile refunded.
    const [completed] = await db
      .update(purchases)
      .set({
        status: 'COMPLETED',
        transactionId: purchase.transactionId,
        amountCents: expectedCents,
        currency: 'AZN',
        orderHistory: sql`CASE WHEN ${purchases.orderHistory} @> ARRAY[${purchase.transactionId}]::text[]
                               THEN ${purchases.orderHistory}
                               ELSE array_append(${purchases.orderHistory}, ${purchase.transactionId}) END`,
        updatedAt: new Date(),
      })
      .where(and(
        eq(purchases.userId, userId),
        eq(purchases.examId, examId),
        notInArray(purchases.status, ['COMPLETED', 'REFUNDED']),
      ))
      .returning({ id: purchases.id });

    /*
     * Report the sale HERE too.
     *
     * This was the only completion path that never emitted
     * `purchaseCompleted`, so every purchase the reconciler rescued was
     * invisible to revenue reporting — and since it runs whenever the webhook
     * did not land, that is not a rare path. Gated on the update actually
     * transitioning a row, so a second reconcile cannot double-count.
     */
    if (completed) {
      void trackEvent(ANALYTICS_EVENTS.purchaseCompleted, userId, {
        examId,
        examTitle:  exam.title,
        examType:   exam.type,
        revenueAzn: expectedCents / 100,
        transaction: purchase.transactionId,
        via: 'reconcile',
      });
      return true;
    }

    /*
     * Nothing transitioned, so report what is actually true.
     *
     * This used to `return true` regardless. The guard excludes REFUNDED, so a
     * refund landing between the read at the top and this write meant the row
     * was revoked while the caller was told the purchase was confirmed. Only
     * the UI flag was affected — `hasExamAccess` re-reads the database — but it
     * is still the wrong answer, and re-reading it costs one query on a path
     * that has already made an outbound API call.
     */
    const [current] = await db
      .select({ status: purchases.status })
      .from(purchases)
      .where(and(eq(purchases.userId, userId), eq(purchases.examId, examId)))
      .limit(1);
    return current?.status === 'COMPLETED';
  } catch (err) {
    void captureException(err, { tags: { fn: 'reconcilePurchase' }, extra: { examId } });
    return false;
  }
}
