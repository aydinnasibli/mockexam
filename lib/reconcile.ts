// Reads the Epoint merchant keys and calls the payment API.
import 'server-only';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { getExamById } from '@/lib/db/exams';
import { signRequest, EPOINT_STATUS_URL } from '@/lib/epoint';
import { captureException, captureMessage } from '@/lib/observability';

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
  await dbConnect();

  const purchase = await Purchase.findOne({ userId, examId }).lean();
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

    const exam = await getExamById(examId);
    if (!exam) return false;

    const expectedCents = Math.round(exam.price * 100);
    const paidCents = Math.round((result.amount ?? 0) * 100);
    if (paidCents !== expectedCents) {
      void captureMessage('Reconcile amount mismatch', {
        level: 'error',
        extra: { examId, transaction: purchase.transactionId, expected: expectedCents, paid: paidCents },
      });
      return false;
    }

    // Grant access. The status guard avoids racing the webhook and never
    // re-completes a purchase that was meanwhile refunded.
    try {
      await Purchase.findOneAndUpdate(
        { userId, examId, status: { $nin: ['COMPLETED', 'REFUNDED'] } },
        {
          $set: {
            status: 'COMPLETED',
            transactionId: purchase.transactionId,
            amountCents: expectedCents,
            currency: 'AZN',
          },
          $addToSet: { orderHistory: purchase.transactionId },
        },
        { new: true },
      );
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
    return true;
  } catch (err) {
    void captureException(err, { tags: { fn: 'reconcilePurchase' }, extra: { examId } });
    return false;
  }
}
