import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { getExamById } from '@/lib/db/exams';
import { verifySignature, decodeData, decodeOrderId } from '@/lib/epoint';

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
    Sentry.captureMessage('EPOINT_PRIVATE_KEY is not configured', { level: 'error' });
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

  let userId: string;
  let examId: string;
  try {
    const decoded = decodeOrderId(payload.order_id);
    userId = decoded.u;
    examId = decoded.e;
  } catch {
    Sentry.captureMessage('Could not decode order_id', {
      level: 'error',
      extra: { order_id: payload.order_id },
    });
    return NextResponse.json({ error: 'Invalid order_id' }, { status: 400 });
  }

  const transaction = payload.transaction ?? payload.order_id;
  const amountCents = Math.round((payload.amount ?? 0) * 100);
  const isSuccess = payload.status === 'success';

  try {
    await dbConnect();

    // Idempotency: if this transaction was already processed, return 200 immediately
    const existing = await Purchase.findOne({ userId, examId }).lean();
    if (existing?.orderHistory?.includes(transaction)) {
      return NextResponse.json({ received: true });
    }

    if (isSuccess) {
      // Verify the paid amount matches the exam price
      const exam = await getExamById(examId);
      if (!exam) {
        Sentry.captureMessage('Webhook received for unknown exam', {
          level: 'error',
          extra: { examId, transaction },
        });
        return NextResponse.json({ error: 'Exam not found' }, { status: 400 });
      }

      const expectedCents = Math.round(exam.price * 100);
      if (amountCents !== expectedCents) {
        Sentry.captureMessage('Payment amount mismatch', {
          level: 'error',
          extra: { examId, transaction, expected: expectedCents, received: amountCents },
        });
        return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
      }

      await Purchase.findOneAndUpdate(
        { userId, examId },
        {
          $set: { transactionId: transaction, amountCents, currency: 'AZN', status: 'COMPLETED' },
          $addToSet: { orderHistory: transaction },
        },
        { upsert: true, new: true },
      );
    } else {
      // Never downgrade a COMPLETED purchase — only write FAILED if no completed purchase exists.
      // E11000 on the unique { userId, examId } index means a COMPLETED doc exists — that's expected, not an error.
      try {
        await Purchase.findOneAndUpdate(
          { userId, examId, status: { $ne: 'COMPLETED' } },
          {
            $set: { transactionId: transaction, amountCents, currency: 'AZN', status: 'FAILED' },
            $addToSet: { orderHistory: transaction },
          },
          { upsert: true, new: true },
        );
      } catch (err: any) {
        if (err.code !== 11000) throw err;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: 'webhook/epoint' },
      extra: { transaction, userId, examId },
    });
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
