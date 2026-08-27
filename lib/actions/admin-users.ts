'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { exams as examsTable, purchases } from '@/lib/db/schema';
import { checkRole } from '@/lib/infra/admin';
import { ADMIN_GRANT_PREFIX } from '@/lib/domain/exam-types';
import { captureException } from '@/lib/infra/observability';
import { limited } from '@/lib/infra/rate-limit';

export async function grantExamAccess(
  targetUserId: string,
  examId: string,
): Promise<{ success: true } | { error: string }> {
  try {
    if (!(await checkRole('admin'))) return { error: 'Forbidden' };
    const { userId: adminId } = await auth();
    // Hands out paid access for free — bounded even for a legitimate admin.
    if (adminId && await limited('adminHeavy', 'grant', adminId)) {
      return { error: 'Çox tez-tez sorğu göndərdiniz. Bir az gözləyin.' };
    }

    if (!targetUserId?.startsWith('user_')) return { error: 'Yanlış istifadəçi ID.' };
    if (!examId?.trim()) return { error: 'İmtahan seçilməyib.' };

    const [exam] = await db
      .select({ id: examsTable.id })
      .from(examsTable)
      .where(eq(examsTable.id, examId))
      .limit(1);
    if (!exam) return { error: 'İmtahan tapılmadı.' };

    const note = `${ADMIN_GRANT_PREFIX} by ${adminId} at ${new Date().toISOString()}`;
    const grantTxn = `${ADMIN_GRANT_PREFIX}-${Date.now()}`;

    /*
     * Insert the grant, or convert an unpaid row into one — in a single
     * statement, so the "already has access" check cannot go stale between
     * reading and writing.
     *
     * `setWhere` carries the refusal: a COMPLETED purchase matches nothing, so
     * an existing entitlement is never overwritten by a grant. The caller is
     * told which happened by whether a row comes back.
     */
    const [granted] = await db
      .insert(purchases)
      .values({
        userId: targetUserId,
        examId,
        transactionId: grantTxn,
        amountCents: 0,
        currency: 'AZN',
        status: 'COMPLETED',
        attemptCount: 0,
        orderHistory: [note],
      })
      .onConflictDoUpdate({
        target: [purchases.userId, purchases.examId],
        set: {
          transactionId: grantTxn,
          amountCents: 0,
          status: 'COMPLETED',
          // Keep the old transaction reference in history, then convert.
          orderHistory: sql`${purchases.orderHistory} || ARRAY[
            'prev-txn:' || ${purchases.transactionId}, ${note}
          ]::text[]`,
          updatedAt: new Date(),
        },
        setWhere: sql`${purchases.status} <> 'COMPLETED'`,
      })
      .returning({ id: purchases.id });

    if (!granted) return { error: 'Bu istifadəçinin artıq bu imtahana girişi var.' };

    revalidatePath(`/admin/users/${targetUserId}`);
    revalidatePath('/admin/purchases');
    return { success: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'grantExamAccess' } });
    return { error: 'Giriş verilərkən server xətası baş verdi.' };
  }
}

export async function revokeExamAccess(
  targetUserId: string,
  examId: string,
): Promise<{ success: true } | { error: string }> {
  try {
    if (!(await checkRole('admin'))) return { error: 'Forbidden' };
    const { userId: revokerId } = await auth();
    if (revokerId && await limited('adminHeavy', 'grant', revokerId)) {
      return { error: 'Çox tez-tez sorğu göndərdiniz. Bir az gözləyin.' };
    }

    const [purchase] = await db
      .select({ transactionId: purchases.transactionId })
      .from(purchases)
      .where(and(eq(purchases.userId, targetUserId), eq(purchases.examId, examId)))
      .limit(1);
    if (!purchase) return { error: 'Giriş qeydi tapılmadı.' };

    if (!(purchase.transactionId ?? '').startsWith(ADMIN_GRANT_PREFIX)) {
      return { error: 'Ödənişli alış geri alına bilməz — yalnız admin qrantları silinir.' };
    }

    /*
     * The prefix guard is repeated in the DELETE, not just checked above.
     *
     * A read-then-delete could in principle race a real payment landing on the
     * same row between the two statements, and this endpoint destroys a payment
     * record. Restating the condition means only a grant can ever be deleted,
     * whatever happens in between.
     */
    await db
      .delete(purchases)
      .where(and(
        eq(purchases.userId, targetUserId),
        eq(purchases.examId, examId),
        sql`${purchases.transactionId} LIKE ${ADMIN_GRANT_PREFIX + '%'}`,
      ));

    revalidatePath(`/admin/users/${targetUserId}`);
    revalidatePath('/admin/purchases');
    return { success: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'revokeExamAccess' } });
    return { error: 'Giriş silinərkən server xətası baş verdi.' };
  }
}
