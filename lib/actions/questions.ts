'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/infra/mongodb';
import QuestionModel, { type QuestionType, type WritingTaskType } from '@/lib/models/Question';
import ExamResult from '@/lib/models/ExamResult';
import { checkRole } from '@/lib/infra/admin';
import { isAllowedImageUrl, INVALID_IMAGE_URL_MESSAGE } from '@/lib/shared/media';
import { captureException } from '@/lib/infra/observability';
import { hasExamAccess } from '@/lib/db/entitlements';

export interface QuestionData {
  id: string;
  examId: string;
  moduleIndex: number;
  order: number;
  type: QuestionType;
  passage: string;
  audioUrl?: string;
  imageUrl?: string;
  stem: string;
  options: string[];
  openAnswers?: string[];
  correctIndex: number;
  matchItems?: string[];
  correctMatching?: number[];
  explanation: string;
  writingTaskType?: WritingTaskType;
  minWords?: number;
  maxWords?: number;
  rubric?: string;
}

/** Safe subset served to exam-takers — correctIndex, correctMatching, and explanation are omitted. */
export interface SessionQuestion {
  id: string;
  examId: string;
  moduleIndex: number;
  order: number;
  type: QuestionType;
  passage: string;
  audioUrl?: string;
  imageUrl?: string;
  stem: string;
  options: string[];
  matchItems?: string[];
  writingTaskType?: WritingTaskType;
  minWords?: number;
  maxWords?: number;
  rubric?: string;
}

async function requireAdmin() {
  if (!(await checkRole('admin'))) throw new Error('Unauthorized');
}

function validId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

/** Fetch questions without correct answers for active exam sessions. */
export async function getExamQuestionsForSession(examId: string): Promise<SessionQuestion[]> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();
  if (!(await hasExamAccess(userId, examId))) throw new Error('Exam not purchased');

  const docs = await QuestionModel.find({ examId }).sort({ moduleIndex: 1, order: 1 }).lean();
  return docs.map(d => ({
    id:              String(d._id),
    examId:          d.examId,
    moduleIndex:     d.moduleIndex,
    order:           d.order,
    type:            d.type,
    passage:         d.passage ?? '',
    audioUrl:        d.audioUrl ?? '',
    imageUrl:        d.imageUrl ?? '',
    stem:            d.stem,
    options:         d.options ?? [],
    matchItems:      d.matchItems ?? [],
    writingTaskType: d.writingTaskType,
    minWords:        d.minWords,
    maxWords:        d.maxWords,
    rubric:          d.rubric ?? '',
  }));
}

/** Fetch full question data (with correct answers) for a user who has completed the exam — used by the review page. */
export async function getExamQuestionsForReview(examId: string): Promise<QuestionData[]> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();
  if (!(await hasExamAccess(userId, examId))) throw new Error('Exam not purchased');

  const hasCompletedAttempt = await ExamResult.exists({ userId, examId });
  if (!hasCompletedAttempt) throw new Error('No completed attempt');

  const docs = await QuestionModel.find({ examId }).sort({ moduleIndex: 1, order: 1 }).lean();
  return docs.map(d => ({
    id:              String(d._id),
    examId:          d.examId,
    moduleIndex:     d.moduleIndex,
    order:           d.order,
    type:            d.type,
    passage:         d.passage ?? '',
    audioUrl:        d.audioUrl ?? '',
    imageUrl:        d.imageUrl ?? '',
    stem:            d.stem,
    options:         d.options ?? [],
    openAnswers:     d.openAnswers ?? [],
    correctIndex:    d.correctIndex ?? -1,
    matchItems:      d.matchItems ?? [],
    correctMatching: d.correctMatching ?? [],
    explanation:     d.explanation ?? '',
    writingTaskType: d.writingTaskType,
    minWords:        d.minWords,
    maxWords:        d.maxWords,
    rubric:          d.rubric ?? '',
  }));
}

export async function getExamQuestions(examId: string): Promise<QuestionData[]> {
  await requireAdmin();
  await dbConnect();
  const docs = await QuestionModel.find({ examId }).sort({ moduleIndex: 1, order: 1 }).lean();
  return docs.map(d => ({
    id:              String(d._id),
    examId:          d.examId,
    moduleIndex:     d.moduleIndex,
    order:           d.order,
    type:            d.type,
    passage:         d.passage ?? '',
    audioUrl:        d.audioUrl ?? '',
    imageUrl:        d.imageUrl ?? '',
    stem:            d.stem,
    options:         d.options ?? [],
    openAnswers:     d.openAnswers ?? [],
    correctIndex:    d.correctIndex ?? -1,
    matchItems:      d.matchItems ?? [],
    correctMatching: d.correctMatching ?? [],
    explanation:     d.explanation ?? '',
    writingTaskType: d.writingTaskType,
    minWords:        d.minWords,
    maxWords:        d.maxWords,
    rubric:          d.rubric ?? '',
  }));
}

export async function addQuestion(data: {
  examId: string;
  moduleIndex: number;
  type: QuestionType;
  passage: string;
  audioUrl?: string;
  imageUrl?: string;
  stem: string;
  options: string[];
  openAnswers?: string[];
  correctIndex: number;
  matchItems?: string[];
  correctMatching?: number[];
  explanation: string;
  writingTaskType?: WritingTaskType;
  minWords?: number;
  maxWords?: number;
  rubric?: string;
}): Promise<{ id: string } | { error: string }> {
  try {
    await requireAdmin();
    if (!isAllowedImageUrl(data.imageUrl)) return { error: INVALID_IMAGE_URL_MESSAGE };
    await dbConnect();

    const count = await QuestionModel.countDocuments({ examId: data.examId, moduleIndex: data.moduleIndex });
    const doc = await QuestionModel.create({ ...data, order: count });
    revalidatePath(`/admin/exams/${data.examId}/questions`);
    return { id: String(doc._id) };
  } catch (err) {
    void captureException(err, { tags: { action: 'addQuestion' } });
    return { error: 'Server xətası.' };
  }
}

export async function updateQuestion(
  id: string,
  data: Partial<{
    type: QuestionType;
    passage: string;
    audioUrl?: string;
    imageUrl?: string;
    stem: string;
    options: string[];
    openAnswers?: string[];
    correctIndex: number;
    matchItems?: string[];
    correctMatching?: number[];
    explanation: string;
    writingTaskType?: WritingTaskType;
    minWords?: number;
    maxWords?: number;
    rubric?: string;
  }>
): Promise<{ ok: true } | { error: string }> {
  if (!validId(id)) return { error: 'Invalid question ID' };
  try {
    await requireAdmin();
    if (!isAllowedImageUrl(data.imageUrl)) return { error: INVALID_IMAGE_URL_MESSAGE };
    await dbConnect();
    // `runValidators` so a partial update is held to the same schema rules as a
    // create — without it, an edit could write a question `type` or
    // `writingTaskType` the enum does not allow.
    const doc = await QuestionModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!doc) return { error: 'Not found' };
    revalidatePath(`/admin/exams/${doc.examId}/questions`);
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'updateQuestion' } });
    return { error: 'Server xətası.' };
  }
}

export async function deleteQuestion(id: string): Promise<{ ok: true } | { error: string }> {
  if (!validId(id)) return { error: 'Invalid question ID' };
  try {
    await requireAdmin();
    await dbConnect();
    const doc = await QuestionModel.findByIdAndDelete(id);
    if (!doc) return { error: 'Not found' };
    const remaining = await QuestionModel.find({ examId: doc.examId, moduleIndex: doc.moduleIndex }).sort({ order: 1 });
    await Promise.all(remaining.map((q, i) => QuestionModel.updateOne({ _id: q._id }, { order: i })));
    revalidatePath(`/admin/exams/${doc.examId}/questions`);
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'deleteQuestion' } });
    return { error: 'Server xətası.' };
  }
}

export async function reorderQuestions(
  examId: string,
  moduleIndex: number,
  orderedIds: string[]
): Promise<{ ok: true } | { error: string }> {
  if (orderedIds.some(id => !validId(id))) return { error: 'Invalid question ID in list' };
  try {
    await requireAdmin();
    await dbConnect();
    // Scoped to the exam and module being reordered, so an id belonging to a
    // different exam cannot have its `order` rewritten by passing it in here.
    await Promise.all(orderedIds.map((id, i) =>
      QuestionModel.updateOne({ _id: id, examId, moduleIndex }, { order: i }),
    ));
    revalidatePath(`/admin/exams/${examId}/questions`);
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'reorderQuestions' } });
    return { error: 'Server xətası.' };
  }
}
