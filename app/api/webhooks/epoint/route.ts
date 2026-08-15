import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/infra/mongodb';
import Purchase from '@/lib/models/Purchase';
import { getExamById } from '@/lib/db/exams';
import { verifySignature, decodeData, decodeOrderId } from '@/lib/payments/epoint';
import { captureException, captureMessage } from '@/lib/infra/observability';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/infra/analytics';

interface EpointCallback {
  order_id: string;
  status: string;
  code?: string;
  message?: string;
  transaction?: string;
  bank_transaction?: string;
  amount?: number;
  card_mask?: string;
  rrn?: string;
  operation_code?: string;
}

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const privateKey = process.env.EPOINT_PRIVATE_KEY;
  if (!privateKey) {
    void captureMessage('EPOINT_PRIVATE_KEY is not configured', { level: 'error' });
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const formData = await req.formData();
  const data = formData.get('data') as string | null;
  const signature = formData.get('signature') as string | null;

  if (!data || !signature) {
    return NextResponse.json({ error: 'Missing data or signature' }, { status: 400 });
  }

  if (!verifySignature(data, signature, privateKey)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: EpointCallback;
  try {
    payload = decodeData<EpointCallback>(data);
  } catch {
    return NextResponse.json({ error: 'Invalid data encoding' }, { status: 400 });
  }

  // Payments created by the /testpayment harness carry a TEST- order_id and
  // grant no exam access. The signature is already verified above, so just
  // acknowledge the callback without touching purchase data.
  if (payload.order_id?.startsWith('TEST-')) {
    return NextResponse.json({ received: true, test: true });
  }

  let userId: string;
  let examId: string;
  try {
    const decoded = decodeOrderId(payload.order_id);
    userId = decoded.u;
    examId = decoded.e;
  } catch {
    void captureMessage('Could not decode order_id', {
      level: 'error',
      extra: { order_id: payload.order_id },
    });
    return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 });
  }

  const transaction = payload.transaction ?? payload.order_id;
  const amountCents = Math.round((payload.amount ?? 0) * 100);
  const status = payload.status;

  try {
    await dbConnect();

    if (status === 'success') {
      // Verify the paid amount matches the exam price before granting access.
      const exam = await getExamById(examId);
      if (!exam) {
        void captureMessage('Webhook received for unknown exam', {
          level: 'error',
          extra: { examId, transaction },
        });
        return NextResponse.json({ error: 'Exam not found' }, { status: 400 });
      }

      const expectedCents = Math.round(exam.price * 100);
      if (amountCents !== expectedCents) {
        void captureMessage('Payment amount mismatch', {
          level: 'error',
          extra: { examId, transaction, expected: expectedCents, received: amountCents },
        });
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
      }

      // Idempotent: re-applying COMPLETED for the same transaction is a no-op.
      const before = await Purchase.findOne({ userId, examId }).lean();
      await Purchase.findOneAndUpdate(
        { userId, examId },
        {
          $set: { transactionId: transaction, amountCents, currency: 'AZN', status: 'COMPLETED' },
          $addToSet: { orderHistory: transaction },
        },
        { upsert: true, new: true },
      );

      // Only report a purchase the first time it reaches COMPLETED — Epoint can
      // redeliver a webhook, and a duplicate would inflate revenue reporting.
      if (before?.status !== 'COMPLETED') {
        void trackEvent(ANALYTICS_EVENTS.purchaseCompleted, userId, {
          examId,
          examTitle:   exam.title,
          examType:    exam.type,
          revenueAzn:  amountCents / 100,
          transaction,
        });
      }
    } else if (status === 'returned') {
      // Refund / chargeback — revoke access. Only an existing purchase is flipped
      // to REFUNDED; never upsert a row that was never there. Idempotent.
      const refunded = await Purchase.findOneAndUpdate(
        { userId, examId, status: { $ne: 'REFUNDED' } },
        {
          $set: { status: 'REFUNDED' },
          $addToSet: { orderHistory: `refund:${transaction}` },
        },
        { new: true },
      );

      // `refunded` is null when there was nothing to revoke, or when this is a
      // redelivery of a refund already applied — neither should be reported.
      if (refunded) {
        void trackEvent(ANALYTICS_EVENTS.purchaseRefunded, userId, {
          examId,
          revenueAzn: -(refunded.amountCents ?? 0) / 100,
          transaction,
        });
      }
    } else if (status === 'failed' || status === 'error' || status === 'server_error') {
      // Record the failure, but never clobber a COMPLETED or REFUNDED purchase.
      // E11000 on the unique { userId, examId } index means such a row already
      // exists — that's expected here, not an error.
      try {
        await Purchase.findOneAndUpdate(
          { userId, examId, status: { $nin: ['COMPLETED', 'REFUNDED'] } },
          {
            $set: { transactionId: transaction, amountCents, currency: 'AZN', status: 'FAILED' },
            $addToSet: { orderHistory: transaction },
          },
          { upsert: true, new: true },
        );
      } catch (err) {
        if ((err as { code?: number }).code !== 11000) throw err;
      }
    }
    // Any other status (e.g. 'new') is a non-final state — acknowledge only.

    return NextResponse.json({ received: true });
  } catch (err) {
    void captureException(err, {
      tags: { route: 'webhook/epoint' },
      extra: { transaction, userId, examId },
    });
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
