import 'server-only';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { examResults, examAnswers, type ModuleScore } from '@/lib/db/schema';

/**
 * Cap on how many attempts a single listing loads. Well above any realistic
 * study history, but it keeps one heavy account from stalling a page.
 */
const MAX_RESULTS = 500;

/**
 * Fields a summary is built from.
 *
 * This used to be a Mongoose projection string whose entire job was excluding
 * the `answers` array — every answer record and every essay, in the same
 * document. Answers are their own table now, so a summary simply does not join
 * them and the heavy data is not merely unselected but unreachable.
 */
const summaryColumns = {
  id:              examResults.id,
  examId:          examResults.examId,
  examTitle:       examResults.examTitle,
  examTag:         examResults.examTag,
  examType:        examResults.examType,
  attemptNumber:   examResults.attemptNumber,
  completedAt:     examResults.completedAt,
  durationSeconds: examResults.durationSeconds,
  totalQuestions:  examResults.totalQuestions,
  score:           examResults.score,
  overallBand:     examResults.overallBand,
  totalScaled:     examResults.totalScaled,
  rwScaled:        examResults.rwScaled,
  mathScaled:      examResults.mathScaled,
  moduleScores:    examResults.moduleScores,
};

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
  /** Marks available / earned — only `matching` is ever worth more than 1. */
  marks: number;
  earnedMarks: number;
  correctIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
  writingScore?: number;
  writingWordCount?: number;
  writingCriteria?: WritingCriterionDetail[];
  aiFeedback?: string;
  writingPending?: boolean;
  /**
   * What the candidate was actually asked, snapshotted when the attempt was
   * filed. Empty only for attempts migrated from Mongo whose question had
   * already been destroyed by a re-import — see `questionId` below.
   */
  qStem: string;
  qOptions: string[];
  qPassage: string;
  /**
   * Null when the question this answer refers to no longer exists.
   *
   * The review page must render these as unavailable rather than as a wrong
   * answer. `lib/domain/review-items.ts` merges the two, so a missing
   * question costs its explanation rather than the whole breakdown.
   */
  questionMissing: boolean;
}

export interface ResultDetail extends ResultSummary {
  answers: AnswerDetail[];
}

/**
 * Derived from the table rather than from `summaryColumns`, so nullability is
 * carried through — a column-map lookup reports the base data type and quietly
 * drops the `| null` that every optional column actually has.
 */
type SummaryRow = Pick<typeof examResults.$inferSelect, keyof typeof summaryColumns>;

/**
 * `score`, `overallBand` and `writingScore` are `numeric`, which the driver
 * returns as strings — numeric is arbitrary precision and has no lossless JS
 * number to decode into. Every consumer treats them as numbers, so the
 * conversion happens once, here.
 */
function mapSummary(d: SummaryRow): ResultSummary {
  return {
    id:              d.id,
    examId:          d.examId,
    examTitle:       d.examTitle,
    examTag:         d.examTag,
    examType:        d.examType ?? undefined,
    attemptNumber:   d.attemptNumber,
    completedAt:     d.completedAt.toISOString(),
    durationSeconds: d.durationSeconds,
    totalQuestions:  d.totalQuestions,
    score:           Number(d.score),
    overallBand:     d.overallBand == null ? undefined : Number(d.overallBand),
    totalScaled:     d.totalScaled ?? undefined,
    rwScaled:        d.rwScaled ?? undefined,
    mathScaled:      d.mathScaled ?? undefined,
    moduleScores:    (d.moduleScores ?? []).map((m: ModuleScore) => ({
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
  const rows = await db
    .select(summaryColumns)
    .from(examResults)
    .where(eq(examResults.userId, userId))
    .orderBy(desc(examResults.completedAt))
    .limit(MAX_RESULTS);
  return rows.map(mapSummary);
}

export async function getExamResults(userId: string, examId: string): Promise<ResultSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(examResults)
    .where(and(eq(examResults.userId, userId), eq(examResults.examId, examId)))
    .orderBy(desc(examResults.completedAt))
    .limit(MAX_RESULTS);
  return rows.map(mapSummary);
}

export async function getResultDetail(
  userId: string,
  examId: string,
  attemptNumber: number,
): Promise<ResultDetail | null> {
  const [result] = await db
    .select(summaryColumns)
    .from(examResults)
    .where(and(
      eq(examResults.userId, userId),
      eq(examResults.examId, examId),
      eq(examResults.attemptNumber, attemptNumber),
    ))
    .limit(1);
  if (!result) return null;

  // Ordered by module then insertion, which reproduces the order the embedded
  // array preserved implicitly.
  const answers = await db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.resultId, result.id))
    .orderBy(asc(examAnswers.moduleIndex), asc(examAnswers.id));

  return {
    ...mapSummary(result),
    answers: answers.map(a => ({
      questionId:       a.questionId ?? '',
      moduleIndex:      a.moduleIndex,
      userAnswer:       a.userAnswer,
      userAnswerText:   a.userAnswerText,
      // Attempts saved before per-item marking have neither field; a single
      // mark scored by `isCorrect` reproduces exactly what they used to show.
      marks:            a.marks ?? 1,
      earnedMarks:      a.earnedMarks ?? (a.isCorrect ? 1 : 0),
      correctIndex:     a.correctIndex,
      isCorrect:        a.isCorrect,
      timeSeconds:      a.timeSeconds,
      writingScore:     a.writingScore == null ? undefined : Number(a.writingScore),
      writingWordCount: a.writingWordCount ?? undefined,
      writingCriteria:  a.writingCriteria ?? undefined,
      aiFeedback:       a.aiFeedback ?? undefined,
      writingPending:   a.writingPending,
      qStem:            a.qStem,
      qOptions:         a.qOptions,
      qPassage:         a.qPassage,
      questionMissing:  a.questionId === null,
    })),
  };
}
