import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

const webhookSchema = z.object({
  meta: z.object({
    event_name: z.string(),
    custom_data: z.object({
      user_id: z.string().min(1),
      exam_id: z.string().min(1),
    }),
  }),
  data: z.object({
    id: z.union([z.string(), z.number()]),
    attributes: z.object({
      status: z.string(),
      total: z.number().optional(),
      currency: z.string().optional(),
    }),
  }),
});

export async function POST(req: NextRequest) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers.get('x-signature') ?? '';
  const rawBody = await req.text();

  if (!secret) {
    console.error('[webhook] LEMONSQUEEZY_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = webhookSchema.safeParse(raw);
  if (!parsed.success) {
    console.error('[webhook] Unexpected payload shape:', parsed.error.flatten());
    return NextResponse.json({ error: 'Unexpected payload shape' }, { status: 400 });
  }

  const { meta, data } = parsed.data;

  if (meta.event_name !== 'order_created') {
    return NextResponse.json({ received: true, skipped: true });
  }

  if (data.attributes.status !== 'paid') {
    return NextResponse.json({ received: true, skipped: true, status: data.attributes.status });
  }

  const userId = meta.custom_data.user_id;
  const examId = meta.custom_data.exam_id;
  const lsOrderId = String(data.id);
  const totalCents = data.attributes.total ?? 0;
  const currency = data.attributes.currency ?? 'AZN';

  try {
    await dbConnect();

    await Purchase.findOneAndUpdate(
      { userId, examId },
      {
        $set: { lsOrderId, amountCents: totalCents, currency, status: 'COMPLETED' },
        $addToSet: { orderHistory: lsOrderId },
      },
      { upsert: true, new: true }
    );

    console.log(`[webhook] Purchase recorded: userId=${userId}, examId=${examId}, orderId=${lsOrderId}`);
    return NextResponse.json({ received: true });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[webhook] DB error:', detail);
    return NextResponse.json({ error: 'Database error', detail }, { status: 500 });
  }
}
