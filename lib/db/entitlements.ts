import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { purchases } from '@/lib/db/schema';

/**
 * Single definition of "this user owns this exam".
 *
 * Every gate — pages, server actions, route handlers — must go through here so
 * the `status: 'COMPLETED'` filter cannot be forgotten at one call site and
 * silently hand out free access.
 *
 * Both reads are served index-only by `purchases_entitlement_idx`, a PARTIAL
 * index over `(user_id, exam_id) WHERE status = 'COMPLETED'`. Because the
 * predicate is baked into the index, only completed purchases are stored in it
 * at all and `status` never has to be compared — which is a little tighter than
 * the Mongo compound it replaces, where every row was indexed regardless.
 */
export async function hasExamAccess(userId: string, examId: string): Promise<boolean> {
  if (!userId || !examId) return false;
  const [row] = await db
    .select({ examId: purchases.examId })
    .from(purchases)
    .where(and(
      eq(purchases.userId, userId),
      eq(purchases.examId, examId),
      eq(purchases.status, 'COMPLETED'),
    ))
    .limit(1);
  return row !== undefined;
}

/** Exam ids this user owns, for list/dashboard screens. */
export async function ownedExamIds(userId: string): Promise<string[]> {
  if (!userId) return [];
  const rows = await db
    .select({ examId: purchases.examId })
    .from(purchases)
    .where(and(eq(purchases.userId, userId), eq(purchases.status, 'COMPLETED')));
  return rows.map(p => p.examId);
}
