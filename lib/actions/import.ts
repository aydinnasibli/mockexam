'use server';

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import dbConnect from '@/lib/mongodb';
import ExamModel, { computeExamTotals } from '@/lib/models/Exam';
import QuestionModel from '@/lib/models/Question';
import { isAdmin } from '@/lib/admin';

export async function importExamFromJson(parsedJson: any) {
  try {
    const { userId } = await auth();
    if (!isAdmin(userId)) return { error: 'Forbidden' };

    await dbConnect();

    // 1. Validate basic exam fields
    if (!parsedJson.examId || !parsedJson.title || !parsedJson.type || !parsedJson.modules) {
      return { error: 'JSON faylında vacib sahələr çatmır (examId, title, type, modules).' };
    }

    if (!parsedJson.questions || !Array.isArray(parsedJson.questions)) {
      return { error: 'JSON faylında "questions" array kimi təqdim olunmalıdır.' };
    }

    // 2. Compute totals
    const { totalQuestions, durationMinutes } = computeExamTotals(parsedJson.modules);

    // 3. Ensure Exam ID is unique before inserting
    const exists = await ExamModel.exists({ examId: parsedJson.examId });
    if (exists) {
      return { error: `Bu ID (${parsedJson.examId}) ilə imtahan artıq mövcuddur. Zəhmət olmasa mövcud imtahanı silin və ya fərqli ID istifadə edin.` };
    }

    // 4. Insert Exam
    await ExamModel.create({
      examId: parsedJson.examId,
      title: parsedJson.title,
      type: parsedJson.type,
      description: parsedJson.description || '',
      tag: parsedJson.tag || parsedJson.type.toUpperCase(),
      price: parsedJson.price || 0,
      features: parsedJson.features || [],
      modules: parsedJson.modules,
      totalQuestions,
      durationMinutes,
      isActive: parsedJson.isActive ?? false, // Defaults to inactive so admin can review it first
    });

    // 5. Transform and Insert Questions
    const questionsToInsert = parsedJson.questions.map((q: any, i: number) => ({
      examId: parsedJson.examId, // strict binding to the imported exam
      moduleIndex: q.moduleIndex ?? 0,
      order: q.order ?? i,
      type: q.type || 'mcq',
      passage: q.passage || '',
      stem: q.stem || '',
      options: q.options || [],
      openAnswers: q.openAnswers || [],
      correctIndex: q.correctIndex ?? -1,
      explanation: q.explanation || '',
    }));

    if (questionsToInsert.length > 0) {
      // Clean up any existing questions for this examId just in case (though it shouldn't exist)
      await QuestionModel.deleteMany({ examId: parsedJson.examId });
      await QuestionModel.insertMany(questionsToInsert);
    }

  } catch (err: any) {
    console.error('[importExamFromJson]', err);
    return { error: err.message || 'Fayl yüklənərkən daxili server xətası baş verdi.' };
  }

  // Next.js redirect must be outside try-catch to function correctly
  revalidatePath('/admin/exams');
  revalidatePath('/exams');
  redirect(`/admin/exams/${parsedJson.examId}/questions`); // Redirect straight to the questions view
}
