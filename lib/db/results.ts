import 'server-only';
import dbConnect from '@/lib/infra/mongodb';
import ExamResult, { type IExamResult } from '@/lib/models/ExamResult';

/**
 * Cap on how many attempts a single listing loads. Well above any realistic
 * study history, but it keeps one heavy account from stalling a page.
 */
const MAX_RESULTS = 500;

/** Fields needed for a summary — deliberately excludes the heavy `answers` array. */
const SUMMARY_FIELDS =
  'examId examTitle examTag examType attemptNumber completedAt durationSeconds ' +
  'totalQuestions score overallBand totalScaled rwScaled mathScaled moduleScores';

export interface ModuleScoreSummary {
  moduleIndex: number;
  moduleName: string;
  correct: number;
  total: number;
  scorePercent: number;
  pending?: boolean;
  band?: number;
}

export interface ResultSummary {
  id: string;
  examId: string;
  examTitle: string;
  examTag: string;
  examType?: string;
  attemptNumber: number;
  completedAt: string;
  durationSeconds: number;
  totalQuestions: number;
  score: number;
  overallBand?: number;
  totalScaled?: number;
  rwScaled?: number;
  mathScaled?: number;
  moduleScores: ModuleScoreSummary[];
}

export interface WritingCriterionDetail {
  criterion: string;
  score: number;
  comment: string;
}

export interface AnswerDetail {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;
  userAnswerText: string;
  correctIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
  writingScore?: number;
  writingWordCount?: number;
  writingCriteria?: WritingCriterionDetail[];
  aiFeedback?: string;
  writingPending?: boolean;
}

export interface ResultDetail extends ResultSummary {
  answers: AnswerDetail[];
}

/** The subset of an ExamResult document a summary is built from. */
type SummarySource = Pick<
  IExamResult,
  | 'examId' | 'examTitle' | 'examTag' | 'examType' | 'attemptNumber' | 'completedAt'
  | 'durationSeconds' | 'totalQuestions' | 'score' | 'overallBand' | 'totalScaled'
  | 'rwScaled' | 'mathScaled' | 'moduleScores'
> & { _id: unknown };

function mapSummary(d: SummarySource): ResultSummary {
  return {
    id:              String(d._id),
    examId:          d.examId,
    examTitle:       d.examTitle,
    examTag:         d.examTag,
    examType:        d.examType,
    attemptNumber:   d.attemptNumber,
    completedAt:     d.completedAt.toISOString(),
    durationSeconds: d.durationSeconds,
    totalQuestions:  d.totalQuestions,
    score:           d.score,
    overallBand:     d.overallBand,
    totalScaled:     d.totalScaled,
    rwScaled:        d.rwScaled,
    mathScaled:      d.mathScaled,
    moduleScores:    (d.moduleScores ?? []).map((m: ModuleScoreSummary) => ({
      moduleIndex:  m.moduleIndex,
      moduleName:   m.moduleName,
      correct:      m.correct,
      total:        m.total,
      scorePercent: m.scorePercent,
      pending:      m.pending,
      band:         m.band,
    })),
  };
}

export async function getUserResults(userId: string): Promise<ResultSummary[]> {
  await dbConnect();
  const docs = await ExamResult.find({ userId })
    .select(SUMMARY_FIELDS)
    .sort({ completedAt: -1 })
    .limit(MAX_RESULTS)
    .lean();
  return docs.map(mapSummary);
}

export async function getExamResults(userId: string, examId: string): Promise<ResultSummary[]> {
  await dbConnect();
  const docs = await ExamResult.find({ userId, examId })
    .select(SUMMARY_FIELDS)
    .sort({ completedAt: -1 })
    .limit(MAX_RESULTS)
    .lean();
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
      questionId:      a.questionId,
      moduleIndex:     a.moduleIndex,
      userAnswer:      a.userAnswer,
      userAnswerText:  a.userAnswerText ?? '',
      correctIndex:    a.correctIndex,
      isCorrect:       a.isCorrect,
      timeSeconds:     a.timeSeconds,
      writingScore:    a.writingScore,
      writingWordCount:a.writingWordCount,
      writingCriteria: a.writingCriteria,
      aiFeedback:      a.aiFeedback,
      writingPending:  a.writingPending,
    })),
  };
}
