import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ examId: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ confirmed: false });

  const { examId } = await params;
  await dbConnect();
  const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
  return NextResponse.json({ confirmed: !!purchase });
}
