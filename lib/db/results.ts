import dbConnect from '@/lib/mongodb';
import ExamResult from '@/lib/models/ExamResult';

export interface ResultSummary {
  id: string;
  examId: string;
  examTitle: string;
  examTag: string;
  attemptNumber: number;
  completedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  score: number;
}

export async function getUserResults(userId: string): Promise<ResultSummary[]> {
  await dbConnect();
  const docs = await ExamResult.find({ userId }).sort({ completedAt: -1 }).lean();
  return docs.map(d => ({
    id:              String(d._id),
    examId:          d.examId,
    examTitle:       d.examTitle,
    examTag:         d.examTag,
    attemptNumber:   d.attemptNumber,
    completedAt:     d.completedAt.toISOString(),
    durationSeconds: d.durationSeconds,
    totalQuestions:  d.totalQuestions,
    score:           d.score,
  }));
}

export async function getExamResults(userId: string, examId: string): Promise<ResultSummary[]> {
  await dbConnect();
  const docs = await ExamResult.find({ userId, examId }).sort({ completedAt: -1 }).lean();
  return docs.map(d => ({
    id:              String(d._id),
    examId:          d.examId,
    examTitle:       d.examTitle,
    examTag:         d.examTag,
    attemptNumber:   d.attemptNumber,
    completedAt:     d.completedAt.toISOString(),
    durationSeconds: d.durationSeconds,
    totalQuestions:  d.totalQuestions,
    score:           d.score,
  }));
}
