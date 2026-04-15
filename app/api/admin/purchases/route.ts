import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { isAdmin } from '@/lib/admin';

/**
 * GET /api/admin/purchases
 * Returns paginated list of all purchases.
 * Query params: page (default 1), limit (default 20)
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const skip = (page - 1) * limit;

  try {
    await dbConnect();

    const [purchases, total] = await Promise.all([
      Purchase.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Purchase.countDocuments(),
    ]);

    return NextResponse.json({
      purchases,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[/api/admin/purchases GET]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
