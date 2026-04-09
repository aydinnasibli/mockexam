import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';

/**
 * GET /api/purchases
 * Returns the list of examIds the signed-in user has purchased.
 */
export async function GET(_req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const purchases = await Purchase.find(
      { userId, status: 'COMPLETED' },
      { examId: 1, _id: 0 }
    ).lean();

    const examIds = purchases.map((p) => p.examId);
    return NextResponse.json({ examIds });
  } catch (err) {
    console.error('[/api/purchases GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
