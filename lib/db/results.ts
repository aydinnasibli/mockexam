import dbConnect from '@/lib/mongodb';
import ExamResult from '@/lib/models/ExamResult';

export interface ModuleScoreSummary {
  moduleIndex: number;
  moduleName: string;
  correct: number;
  total: number;
  scorePercent: number;
}

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
  moduleScores: ModuleScoreSummary[];
}

export interface AnswerDetail {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;
  correctIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
}

export interface ResultDetail extends ResultSummary {
  answers: AnswerDetail[];
}

function mapSummary(d: ReturnType<typeof Object.assign>): ResultSummary {
  return {
    id:              String(d._id),
    examId:          d.examId,
    examTitle:       d.examTitle,
    examTag:         d.examTag,
    attemptNumber:   d.attemptNumber,
    completedAt:     d.completedAt.toISOString(),
    durationSeconds: d.durationSeconds,
    totalQuestions:  d.totalQuestions,
    score:           d.score,
    moduleScores:    (d.moduleScores ?? []).map((m: ModuleScoreSummary) => ({
      moduleIndex:  m.moduleIndex,
      moduleName:   m.moduleName,
      correct:      m.correct,
      total:        m.total,
      scorePercent: m.scorePercent,
    })),
  };
}

export async function getUserResults(userId: string): Promise<ResultSummary[]> {
  await dbConnect();
  const docs = await ExamResult.find({ userId }).sort({ completedAt: -1 }).lean();
  return docs.map(mapSummary);
}

export async function getExamResults(userId: string, examId: string): Promise<ResultSummary[]> {
  await dbConnect();
  const docs = await ExamResult.find({ userId, examId }).sort({ completedAt: -1 }).lean();
  return docs.map(mapSummary);
}

export async function getResultDetail(
  userId: string,
  examId: string,
  attemptNumber: number,
): Promise<ResultDetail | null> {
  await dbConnect();
  const doc = await ExamResult.findOne({ userId, examId, attemptNumber }).lean();
  if (!doc) return null;
  return {
    ...mapSummary(doc),
    answers: (doc.answers ?? []).map((a) => ({
      questionId:   a.questionId,
      moduleIndex:  a.moduleIndex,
      userAnswer:   a.userAnswer,
      correctIndex: a.correctIndex,
      isCorrect:    a.isCorrect,
      timeSeconds:  a.timeSeconds,
    })),
  };
}
