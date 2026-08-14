import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { reconcilePurchase } from '@/lib/reconcile';
import { isRateLimited } from '@/lib/rate-limit';

const paramsSchema = z.object({
  examId: z.string().min(1),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ confirmed: false });

  const parsed = paramsSchema.safeParse(await params);
  if (!parsed.success) return NextResponse.json({ confirmed: false }, { status: 400 });

  // A PENDING purchase makes this endpoint fan out to Epoint's get-status API,
  // so an authenticated caller could otherwise turn one exam page into unbounded
  // outbound traffic against the payment provider. Every other rate-sensitive
  // path here is limited (checkout, submit, audio, contact, health); this was
  // the only one that was not. 30/min is far above the app's own usage — the
  // purchase card fires exactly one request per exam page view.
  if (await isRateLimited(`purchase-status:${userId}`, 30, 60_000)) {
    return NextResponse.json({ confirmed: false }, { status: 429 });
  }

  // Returns true if the purchase is already COMPLETED, and also actively
  // reconciles a PENDING one against Epoint's get-status as a webhook fallback.
  const confirmed = await reconcilePurchase(userId, parsed.data.examId);
  return NextResponse.json({ confirmed });
}
