'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import ExamModel from '@/lib/models/Exam';
import { mockExams } from '@/lib/data';
import { isAdmin } from '@/lib/admin';

/** Throws if the current user is not an admin. */
async function requireAdmin() {
  const { userId } = await auth();
  if (!isAdmin(userId)) throw new Error('Forbidden');
}

// ─── Exam Actions ─────────────────────────────────────────────────────────────

export type ActionResult = { error?: string };

/**
 * Create a new exam.
 * Signature matches useActionState: (prevState, formData) => Promise<ActionResult>
 */
export async function createExam(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const examId        = (formData.get('examId') as string)?.trim();
  const title         = (formData.get('title') as string)?.trim();
  const type          = formData.get('type') as string;
  const description   = (formData.get('description') as string)?.trim();
  const tag           = (formData.get('tag') as string)?.trim();
  const price         = parseFloat(formData.get('price') as string);
  const durationMinutes = parseInt(formData.get('durationMinutes') as string, 10);
  const totalQuestions  = parseInt(formData.get('totalQuestions') as string, 10);
  const features      = (formData.getAll('features') as string[]).filter((f) => f.trim());
  const isActive      = formData.get('isActive') === 'true';

  if (!examId || !title || !type || !description || !tag || isNaN(price) || isNaN(durationMinutes) || isNaN(totalQuestions)) {
    return { error: 'Bütün tələb olunan sahələri doldurun.' };
  }

  try {
    await dbConnect();
    await ExamModel.create({ examId, title, type, description, tag, price, durationMinutes, totalQuestions, features, isActive });
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      return { error: 'Bu ID ilə imtahan artıq mövcuddur.' };
    }
    console.error('[createExam]', err);
    return { error: 'Server xətası baş verdi.' };
  }

  revalidatePath('/admin/exams');
  redirect('/admin/exams');
}

/**
 * Update an existing exam.
 * examId is bound via .bind(null, examId) before passing to useActionState.
 */
export async function updateExam(
  examId: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const title           = (formData.get('title') as string)?.trim();
  const type            = formData.get('type') as string;
  const description     = (formData.get('description') as string)?.trim();
  const tag             = (formData.get('tag') as string)?.trim();
  const price           = parseFloat(formData.get('price') as string);
  const durationMinutes = parseInt(formData.get('durationMinutes') as string, 10);
  const totalQuestions  = parseInt(formData.get('totalQuestions') as string, 10);
  const features        = (formData.getAll('features') as string[]).filter((f) => f.trim());
  const isActive        = formData.get('isActive') === 'true';

  if (!title || !type || !description || !tag || isNaN(price) || isNaN(durationMinutes) || isNaN(totalQuestions)) {
    return { error: 'Bütün tələb olunan sahələri doldurun.' };
  }

  try {
    await dbConnect();
    const exam = await ExamModel.findOneAndUpdate(
      { examId },
      { $set: { title, type, description, tag, price, durationMinutes, totalQuestions, features, isActive } },
      { new: true, runValidators: true },
    );
    if (!exam) return { error: 'İmtahan tapılmadı.' };
  } catch (err) {
    console.error('[updateExam]', err);
    return { error: 'Server xətası baş verdi.' };
  }

  revalidatePath('/admin/exams');
  redirect('/admin/exams');
}

/** Toggle exam active status. Called directly (not via form). */
export async function toggleExamActive(examId: string, newActive: boolean): Promise<void> {
  await requireAdmin();
  await dbConnect();
  await ExamModel.findOneAndUpdate({ examId }, { $set: { isActive: newActive } });
  revalidatePath('/admin/exams');
}

/** Delete an exam by its examId. */
export async function deleteExam(examId: string): Promise<void> {
  await requireAdmin();
  await dbConnect();
  await ExamModel.findOneAndDelete({ examId });
  revalidatePath('/admin/exams');
}

// ─── Seed Action ──────────────────────────────────────────────────────────────

export type SeedResult = { created: number; skipped: number; error?: string };

/** Import the default exam catalog into MongoDB. Idempotent. */
export async function seedExams(_prev: SeedResult): Promise<SeedResult> {
  await requireAdmin();

  try {
    await dbConnect();
    let created = 0;
    let skipped = 0;

    for (const exam of mockExams) {
      const exists = await ExamModel.exists({ examId: exam.id });
      if (exists) { skipped++; continue; }
      await ExamModel.create({
        examId: exam.id,
        title: exam.title,
        type: exam.type,
        description: exam.description,
        tag: exam.tag,
        price: exam.price,
        durationMinutes: exam.durationMinutes,
        totalQuestions: exam.totalQuestions,
        features: exam.features,
        isActive: true,
      });
      created++;
    }

    revalidatePath('/admin');
    revalidatePath('/admin/exams');
    return { created, skipped };
  } catch (err) {
    console.error('[seedExams]', err);
    return { created: 0, skipped: 0, error: 'Server xətası baş verdi.' };
  }
}
