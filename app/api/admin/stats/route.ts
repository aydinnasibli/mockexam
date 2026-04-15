import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamModel from '@/lib/models/Exam';
import { isAdmin } from '@/lib/admin';

export async function GET() {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await dbConnect();

    const [
      totalPurchases,
      completedPurchases,
      totalExams,
      activeExams,
      revenueAgg,
      recentPurchases,
    ] = await Promise.all([
      Purchase.countDocuments(),
      Purchase.countDocuments({ status: 'COMPLETED' }),
      ExamModel.countDocuments(),
      ExamModel.countDocuments({ isActive: true }),
      Purchase.aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amountCents' } } },
      ]),
      Purchase.find({ status: 'COMPLETED' })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // Count total users via Clerk
    const clerk = await clerkClient();
    const totalUsers = await clerk.users.getCount();

    const totalRevenueCents = revenueAgg[0]?.total ?? 0;

    return NextResponse.json({
      totalUsers,
      totalPurchases,
      completedPurchases,
      totalExams,
      activeExams,
      totalRevenueCents,
      recentPurchases,
    });
  } catch (err) {
    console.error('[/api/admin/stats]', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
