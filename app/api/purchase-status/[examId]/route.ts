import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { reconcilePurchase } from '@/lib/reconcile';

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

  // Returns true if the purchase is already COMPLETED, and also actively
  // reconciles a PENDING one against Epoint's get-status as a webhook fallback.
  const confirmed = await reconcilePurchase(userId, parsed.data.examId);
  return NextResponse.json({ confirmed });
}
