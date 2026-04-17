'use server';

import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult from '@/lib/models/ExamResult';
import { getExamById } from '@/lib/db/exams';

export type AnswerRecord = {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;
  correctIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
};

export type ModuleScoreRecord = {
  moduleIndex: number;
  moduleName: string;
  correct: number;
  total: number;
  scorePercent: number;
};

export async function saveExamResult(data: {
  examId: string;
  startedAt: string;
  durationSeconds: number;
  score: number;
  answers: AnswerRecord[];
  moduleScores: ModuleScoreRecord[];
}): Promise<{ resultId: string; attemptNumber: number } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  const { examId, startedAt, durationSeconds, score, answers, moduleScores } = data;

  if (typeof durationSeconds !== 'number' || durationSeconds < 0 || !Number.isFinite(durationSeconds)) return { error: 'Invalid durationSeconds' };
  if (typeof score !== 'number' || score < 0 || score > 100 || !Number.isFinite(score)) return { error: 'Invalid score' };
  const startDate = new Date(startedAt);
  if (isNaN(startDate.getTime())) return { error: 'Invalid startedAt date' };

  await dbConnect();

  const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
  if (!purchase) return { error: 'Exam not purchased' };

  const exam = await getExamById(examId);
  if (!exam) return { error: 'Exam not found' };

  const attemptNumber = (await ExamResult.countDocuments({ userId, examId })) + 1;

  const result = await ExamResult.create({
    userId,
    examId,
    examTitle:       exam.title,
    examTag:         exam.tag,
    attemptNumber,
    startedAt:       startDate,
    completedAt:     new Date(),
    durationSeconds,
    totalQuestions:  exam.totalQuestions,
    score,
    answers,
    moduleScores,
  });

  return { resultId: result._id.toString(), attemptNumber };
}
