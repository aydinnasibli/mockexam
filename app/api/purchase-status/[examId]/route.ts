import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';

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

  await dbConnect();
  const purchase = await Purchase.findOne({ userId, examId: parsed.data.examId, status: 'COMPLETED' }).lean();
  return NextResponse.json({ confirmed: !!purchase });
}
