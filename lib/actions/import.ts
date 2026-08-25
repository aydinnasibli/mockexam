'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import dbConnect from '@/lib/infra/mongodb';
import ExamModel, { computeExamTotals } from '@/lib/models/Exam';
import QuestionModel from '@/lib/models/Question';
import { checkRole } from '@/lib/infra/admin';
import { validateModules } from '@/lib/domain/exam-modules';
import { isExamType } from '@/lib/domain/exam-types';
import { validateQuestion } from '@/lib/domain/question-validation';
import {
  isAllowedMediaUrl,
  INVALID_IMAGE_URL_MESSAGE,
  INVALID_AUDIO_URL_MESSAGE,
} from '@/lib/shared/media';
import { captureException } from '@/lib/infra/observability';
import { syncExamTotals, revalidateExam } from '@/lib/db/exam-totals';

/**
 * Import payload schema.
 *
 * Everything an importer can set is bounded here: field lengths, array sizes,
 * enum membership, and numeric ranges. `modules` is deliberately left loose at
 * this layer — it is handed to `validateModules()`, the same validator the
 * admin create/edit form uses, so the two paths cannot drift apart.
 */
const MAX_QUESTIONS = 500;

const questionSchema = z.object({
  moduleIndex:     z.number().int().min(0).max(99).optional(),
  order:           z.number().int().min(0).max(9999).optional(),
  type:            z.enum(['mcq', 'open', 'matching', 'writing']).optional(),
  blockId:         z.string().max(120).optional(),
  passage:         z.string().max(20_000).optional(),
  // Same host rule as imageUrl — see INVALID_AUDIO_URL_MESSAGE.
  audioUrl:        z.string().max(2_000).refine(isAllowedMediaUrl, INVALID_AUDIO_URL_MESSAGE).optional(),
  // Rendered with next/image, which throws on a host outside remotePatterns —
  // so the host is constrained here rather than at render time.
  imageUrl:        z.string().max(2_000).refine(isAllowedMediaUrl, INVALID_IMAGE_URL_MESSAGE).optional(),
  stem:            z.string().max(5_000).optional(),
  options:         z.array(z.string().max(2_000)).max(10).optional(),
  openAnswers:     z.array(z.string().max(500)).max(50).optional(),
  correctIndex:    z.number().int().min(-1).max(9).optional(),
  matchItems:      z.array(z.string().max(2_000)).max(20).optional(),
  correctMatching: z.array(z.number().int().min(0).max(19)).max(20).optional(),
  explanation:     z.string().max(10_000).optional(),
  writingTaskType: z.enum(['task1', 'task2', 'integrated', 'independent', 'general']).optional(),
  minWords:        z.number().int().min(0).max(10_000).optional(),
  maxWords:        z.number().int().min(0).max(10_000).optional(),
  rubric:          z.string().max(10_000).optional(),
});

const importSchema = z.object({
  examId:      z.string().regex(/^[a-z0-9-]{1,64}$/, 'examId yalnız kiçik hərf, rəqəm və tire (-) içərə bilər (maks. 64 simvol).'),
  title:       z.string().trim().min(1).max(200),
  type:        z.string().refine(isExamType, 'Yanlış imtahan növü.'),
  description: z.string().max(5_000).optional(),
  tag:         z.string().trim().max(50).optional(),
  price:       z.number().min(0).max(10_000).optional(),
  features:    z.array(z.string().max(200)).max(20).optional(),
  isActive:    z.boolean().optional(),
  modules:     z.array(z.unknown()).min(1),
  questions:   z.array(questionSchema).max(MAX_QUESTIONS),
});

export type ImportPayload = z.input<typeof importSchema>;

export async function importExamFromJson(
  parsedJson: unknown,
): Promise<{ error: string } | undefined> {
  let examId: string;

  try {
    if (!(await checkRole('admin'))) return { error: 'Forbidden' };

    // 1. Validate the whole payload up front.
    const parsed = importSchema.safeParse(parsedJson);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const where = issue?.path.length ? `${issue.path.join('.')}: ` : '';
      return { error: `JSON faylı keçərsizdir — ${where}${issue?.message ?? 'naməlum xəta'}` };
    }
    const data = parsed.data;
    examId = data.examId;

    // 2. Validate modules through the same validator used by createExam.
    const modulesResult = validateModules(data.modules);
    if ('error' in modulesResult) return modulesResult;

    // 3. Per-question checks that depend on the module list or on other fields.
    for (const [i, q] of data.questions.entries()) {
      const label = `Sual #${i + 1}`;
      const qType = q.type ?? 'mcq';

      const moduleIndex = q.moduleIndex ?? 0;
      if (moduleIndex >= modulesResult.length) {
        return { error: `${label}: moduleIndex ${moduleIndex} mövcud deyil (imtahanda ${modulesResult.length} modul var).` };
      }

      // Gradability is checked by the same validator the admin form now uses,
      // so the two write paths cannot drift apart again.
      const invalid = validateQuestion({ ...q, type: qType }, label);
      if (invalid) return { error: invalid };
    }

    await dbConnect();

    // 4. Ensure the exam ID is unique before inserting.
    const exists = await ExamModel.exists({ examId });
    if (exists) {
      return { error: `Bu ID (${examId}) ilə imtahan artıq mövcuddur. Zəhmət olmasa mövcud imtahanı silin və ya fərqli ID istifadə edin.` };
    }

    const { totalQuestions, durationMinutes } = computeExamTotals(modulesResult);

    // 5. Insert the exam. `type` is narrowed to ExamType by the schema refine.
    await ExamModel.create({
      examId,
      title:          data.title,
      type:           data.type,
      description:    data.description ?? '',
      tag:            data.tag || data.type.toUpperCase(),
      price:          data.price ?? 0,
      features:       data.features ?? [],
      modules:        modulesResult,
      totalQuestions,
      durationMinutes,
      isActive:       data.isActive ?? false, // Defaults to inactive so admin can review it first
    });

    // 6. Transform and insert the questions.
    const questionsToInsert = data.questions.map((q, i) => ({
      examId,
      moduleIndex:     q.moduleIndex ?? 0,
      blockId:         q.blockId?.trim() ?? '',
      order:           q.order ?? i,
      type:            q.type ?? 'mcq',
      passage:         q.passage ?? '',
      audioUrl:        q.audioUrl ?? '',
      imageUrl:        q.imageUrl ?? '',
      stem:            q.stem ?? '',
      options:         q.options ?? [],
      openAnswers:     q.openAnswers ?? [],
      correctIndex:    q.correctIndex ?? -1,
      matchItems:      q.matchItems ?? [],
      correctMatching: q.correctMatching ?? [],
      explanation:     q.explanation ?? '',
      // Writing-specific fields
      ...(q.type === 'writing' && {
        writingTaskType: q.writingTaskType,
        minWords:        q.minWords,
        maxWords:        q.maxWords,
        rubric:          q.rubric ?? '',
      }),
    }));

    if (questionsToInsert.length > 0) {
      // The examId is known-unique at this point; this only guards against a
      // partially-failed earlier import leaving orphaned questions behind.
      await QuestionModel.deleteMany({ examId });
      await QuestionModel.insertMany(questionsToInsert);
    }

    // `computeExamTotals` above wrote the DECLARED totals; replace them with
    // the ones this bank actually produces.
    await syncExamTotals(examId);
  } catch (err) {
    void captureException(err, { tags: { action: 'importExamFromJson' } });
    return { error: 'Fayl yüklənərkən daxili server xətası baş verdi.' };
  }

  // Next.js redirect must be outside try-catch to function correctly
  revalidateExam(examId);
  redirect(`/admin/exams/${examId}/questions`); // Redirect straight to the questions view
}
