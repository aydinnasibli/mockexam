import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
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
  const status = payload.status === 'success' ? 'COMPLETED' : 'FAILED';

  try {
    await dbConnect();

    await Purchase.findOneAndUpdate(
      { userId, examId },
      {
        $set: { transactionId: transaction, amountCents, currency: 'AZN', status },
        $addToSet: { orderHistory: transaction },
      },
      { upsert: true, new: true },
    );

    return NextResponse.json({ received: true });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { route: 'webhook/epoint' },
      extra: { transaction, userId, examId },
    });
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}
