'use server';

import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult from '@/lib/models/ExamResult';
import { getExamById } from '@/lib/db/exams';

export async function saveExamResult(data: {
  examId: string;
  startedAt: string;
  durationSeconds: number;
  score: number;
}): Promise<{ resultId: string; attemptNumber: number } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  const { examId, startedAt, durationSeconds, score } = data;

  if (typeof durationSeconds !== 'number' || durationSeconds < 0) return { error: 'Invalid durationSeconds' };
  if (typeof score !== 'number' || score < 0 || score > 100) return { error: 'Invalid score' };

  await dbConnect();

  const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
  if (!purchase) return { error: 'Exam not purchased' };

  const exam = await getExamById(examId);
  if (!exam) return { error: 'Exam not found' };

  const attemptNumber = (await ExamResult.countDocuments({ userId, examId })) + 1;

  const result = await ExamResult.create({
    userId,
    examId,
    examTitle: exam.title,
    examTag: exam.tag,
    attemptNumber,
    startedAt: new Date(startedAt),
    completedAt: new Date(),
    durationSeconds,
    totalQuestions: exam.totalQuestions,
    score,
  });

  return { resultId: result._id.toString(), attemptNumber };
}
