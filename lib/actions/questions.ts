'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import QuestionModel, { type QuestionType, type WritingTaskType } from '@/lib/models/Question';
import Purchase from '@/lib/models/Purchase';
import { isAdmin } from '@/lib/admin';

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
  const { userId } = await auth();
  if (!isAdmin(userId)) throw new Error('Unauthorized');
}

function validId(id: string): boolean {
  return mongoose.isValidObjectId(id);
}

/** Fetch questions without correct answers for active exam sessions. */
export async function getExamQuestionsForSession(examId: string): Promise<SessionQuestion[]> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  await dbConnect();
  const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
  if (!purchase) throw new Error('Exam not purchased');

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
  const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
  if (!purchase) throw new Error('Exam not purchased');

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
    await dbConnect();

    const count = await QuestionModel.countDocuments({ examId: data.examId, moduleIndex: data.moduleIndex });
    const doc = await QuestionModel.create({ ...data, order: count });
    revalidatePath(`/admin/exams/${data.examId}/questions`);
    return { id: String(doc._id) };
  } catch (err) {
    console.error('[addQuestion]', err);
    return { error: err instanceof Error ? err.message : 'Server error' };
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
    await dbConnect();
    const doc = await QuestionModel.findByIdAndUpdate(id, data, { new: true });
    if (!doc) return { error: 'Not found' };
    revalidatePath(`/admin/exams/${doc.examId}/questions`);
    return { ok: true };
  } catch (err) {
    console.error('[updateQuestion]', err);
    return { error: err instanceof Error ? err.message : 'Server error' };
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
    console.error('[deleteQuestion]', err);
    return { error: err instanceof Error ? err.message : 'Server error' };
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
    await Promise.all(orderedIds.map((id, i) => QuestionModel.updateOne({ _id: id }, { order: i })));
    revalidatePath(`/admin/exams/${examId}/questions`);
    return { ok: true };
  } catch (err) {
    console.error('[reorderQuestions]', err);
    return { error: err instanceof Error ? err.message : 'Server error' };
  }
}
