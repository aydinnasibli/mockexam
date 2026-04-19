import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

/**
 * Verifies that the incoming webhook request is genuinely from LemonSqueezy
 * by comparing the X-Signature header against an HMAC-SHA256 of the raw body.
 */
function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  // Use timing-safe comparison
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(signature, 'hex'));
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/lemonsqueezy
 * Receives order_created events from LemonSqueezy.
 * On a successful paid order, records the purchase in MongoDB.
 */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!checkRateLimit(`webhook:${ip}`, 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers.get('x-signature') ?? '';
  const rawBody = await req.text();

  // Strictly require the webhook secret and signature verification
  if (!secret) {
    console.error('[webhook] LEMONSQUEEZY_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = (payload.meta as Record<string, unknown>)?.event_name as string | undefined;
  const customData = (payload.meta as Record<string, unknown>)?.custom_data as Record<string, string> | undefined;
  const data = payload.data as Record<string, unknown> | undefined;
  const attributes = data?.attributes as Record<string, unknown> | undefined;

  // We only handle successful orders
  if (eventName !== 'order_created') {
    return NextResponse.json({ received: true, skipped: true });
  }

  const status = attributes?.status as string | undefined;
  if (status !== 'paid') {
    return NextResponse.json({ received: true, skipped: true, status });
  }

  const userId = customData?.user_id;
  const examId = customData?.exam_id;
  const lsOrderId = String(data?.id ?? '');
  const totalCents = (attributes?.total as number) ?? 0;
  const currency = (attributes?.currency as string) ?? 'AZN';

  if (!userId || !examId || !lsOrderId) {
    console.error('[webhook] Missing required fields:', { userId, examId, lsOrderId });
    return NextResponse.json({ error: 'Missing custom_data' }, { status: 400 });
  }

  try {
    await dbConnect();

    // Upsert by (userId, examId) — idempotent even if webhook fires twice.
    // $addToSet preserves all historical order IDs even after refund/repurchase.
    await Purchase.findOneAndUpdate(
      { userId, examId },
      {
        $set: {
          lsOrderId,
          amountCents: totalCents,
          currency,
          status: 'COMPLETED',
        },
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
