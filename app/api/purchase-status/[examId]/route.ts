import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ confirmed: false });

  const ip = getClientIp(req.headers);
  if (!checkRateLimit(`purchase-status:${userId}:${ip}`, 40, 60_000)) {
    return NextResponse.json({ confirmed: false }, { status: 429 });
  }

  const { examId } = await params;
  await dbConnect();
  const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
  return NextResponse.json({ confirmed: !!purchase });
}
