'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamModel from '@/lib/models/Exam';
import { checkRole } from '@/lib/admin';
import { ADMIN_GRANT_PREFIX } from '@/lib/exam-types';
import { captureException } from '@/lib/observability';

export async function grantExamAccess(
  targetUserId: string,
  examId: string,
): Promise<{ success: true } | { error: string }> {
  try {
    if (!(await checkRole('admin'))) return { error: 'Forbidden' };
    const { userId: adminId } = await auth();

    if (!targetUserId?.startsWith('user_')) return { error: 'Yanlış istifadəçi ID.' };
    if (!examId?.trim()) return { error: 'İmtahan seçilməyib.' };

    await dbConnect();

    const exam = await ExamModel.findOne({ examId }).lean();
    if (!exam) return { error: 'İmtahan tapılmadı.' };

    const note = `${ADMIN_GRANT_PREFIX} by ${adminId} at ${new Date().toISOString()}`;
    const existing = await Purchase.findOne({ userId: targetUserId, examId });

    if (existing) {
      if (existing.status === 'COMPLETED') {
        return { error: 'Bu istifadəçinin artıq bu imtahana girişi var.' };
      }
      // Keep the old transaction reference in history, then convert to a grant
      existing.orderHistory.push(`prev-txn:${existing.transactionId}`, note);
      existing.transactionId = `${ADMIN_GRANT_PREFIX}-${Date.now()}`;
      existing.amountCents = 0;
      existing.status = 'COMPLETED';
      await existing.save();
    } else {
      await Purchase.create({
        userId: targetUserId,
        examId,
        transactionId: `${ADMIN_GRANT_PREFIX}-${Date.now()}`,
        amountCents: 0,
        currency: 'AZN',
        status: 'COMPLETED',
        attemptCount: 0,
        orderHistory: [note],
      });
    }

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

    await dbConnect();

    const purchase = await Purchase.findOne({ userId: targetUserId, examId });
    if (!purchase) return { error: 'Giriş qeydi tapılmadı.' };

    if (!(purchase.transactionId ?? '').startsWith(ADMIN_GRANT_PREFIX)) {
      return { error: 'Ödənişli alış geri alına bilməz — yalnız admin qrantları silinir.' };
    }

    await purchase.deleteOne();

    revalidatePath(`/admin/users/${targetUserId}`);
    revalidatePath('/admin/purchases');
    return { success: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'revokeExamAccess' } });
    return { error: 'Giriş silinərkən server xətası baş verdi.' };
  }
}
