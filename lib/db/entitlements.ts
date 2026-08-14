import 'server-only';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';

/**
 * Single definition of "this user owns this exam".
 *
 * Every gate — pages, server actions, route handlers — must go through here so
 * the `status: 'COMPLETED'` filter cannot be forgotten at one call site and
 * silently hand out free access.
 */
export async function hasExamAccess(userId: string, examId: string): Promise<boolean> {
  if (!userId || !examId) return false;
  await dbConnect();
  const purchase = await Purchase.findOne(
    { userId, examId, status: 'COMPLETED' },
    { _id: 1 },
  ).lean();
  return purchase !== null;
}

/** Exam ids this user owns, for list/dashboard screens. */
export async function ownedExamIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  await dbConnect();
  const purchases = await Purchase.find(
    { userId, status: 'COMPLETED' },
    { examId: 1 },
  ).lean();
  return purchases.map(p => p.examId);
}
