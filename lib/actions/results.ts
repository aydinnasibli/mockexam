'use server';

import * as Sentry from '@sentry/nextjs';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult from '@/lib/models/ExamResult';
import QuestionModel from '@/lib/models/Question';
import { getExamByIdAdmin } from '@/lib/db/exams';
import ExamSessionModel from '@/lib/models/ExamSession';
import { isRateLimited } from '@/lib/rate-limit';
import { evaluateWriting, type WritingCriterionResult } from '@/lib/actions/writing-eval';
import { computeAuthenticScores } from '@/lib/scoring';

type AnswerRecord = {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;
  userAnswerText: string;
  correctIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
  writingScore?: number;
  writingWordCount?: number;
  writingCriteria?: WritingCriterionResult[];
  aiFeedback?: string;
  writingPending?: boolean;
};

/** Mean of the parts that actually have a value (nulls are skipped, not zeroed). */
function averageOfPresent(parts: (number | null)[]): number {
  const present = parts.filter((v): v is number => v !== null);
  return present.length ? Math.round(present.reduce((a, b) => a + b, 0) / present.length) : 0;
}

/**
 * Aggregate writing band → percentage, counting ONLY essays that were actually
 * graded. If every writing answer is still pending, returns null so writing is
 * excluded from the overall score instead of dragging it to 0.
 */
function writingScorePercent(records: AnswerRecord[]): number | null {
  const graded = records.filter(r => !r.writingPending && typeof r.writingScore === 'number');
  if (graded.length === 0) return null;
  return graded.reduce((sum, r) => sum + ((r.writingScore ?? 0) / 9) * 100, 0) / graded.length;
}

type ModuleScore = ReturnType<typeof buildModuleScores>[number] & { band?: number };

/**
 * Stamp exam-authentic scores onto `moduleScores` (mutates `.band` per module)
 * and return the attempt-level fields (IELTS overall band, SAT scaled scores).
 */
function applyAuthenticScores(
  examType: string,
  modules: { type: string }[],
  moduleScores: ModuleScore[],
  records: AnswerRecord[],
  typeOf: (questionId: string) => string | undefined,
): { overallBand?: number; totalScaled?: number; rwScaled?: number; mathScaled?: number } {
  const writingTaskBands = records
    .filter(r => typeOf(r.questionId) === 'writing' && !r.writingPending && typeof r.writingScore === 'number')
    .map(r => r.writingScore as number);

  const auth = computeAuthenticScores({ examType, modules, moduleScores, writingTaskBands });
  for (const ms of moduleScores) {
    ms.band = auth.moduleBands[ms.moduleIndex]; // undefined clears a stale band
  }
  return { overallBand: auth.overallBand, totalScaled: auth.totalScaled, rwScaled: auth.rwScaled, mathScaled: auth.mathScaled };
}

/** Build per-module scores; writing-bearing modules are marked pending until graded. */
function buildModuleScores(
  modules: { name: string }[],
  records: AnswerRecord[],
  typeOf: (questionId: string) => string | undefined,
) {
  return modules.map((mod, modIdx) => {
    const modAnswers    = records.filter(a => a.moduleIndex === modIdx);
    const modWriting    = modAnswers.filter(a => typeOf(a.questionId) === 'writing');
    const modNonWriting = modAnswers.filter(a => typeOf(a.questionId) !== 'writing');
    const gradedWriting = modWriting.filter(a => !a.writingPending && typeof a.writingScore === 'number');
    const anyPending    = modWriting.some(a => a.writingPending);

    let scorePercent = 0;
    if (modNonWriting.length > 0) {
      scorePercent = Math.round((modNonWriting.filter(a => a.isCorrect).length / modNonWriting.length) * 100);
    } else if (gradedWriting.length > 0) {
      scorePercent = Math.round(gradedWriting.reduce((s, a) => s + ((a.writingScore ?? 0) / 9) * 100, 0) / gradedWriting.length);
    }

    return {
      moduleIndex: modIdx,
      moduleName:  mod.name,
      correct:     modNonWriting.filter(a => a.isCorrect).length,
      total:       modAnswers.length,
      scorePercent,
      ...(anyPending ? { pending: true } : {}),
    };
  });
}

export type ClientAnswerInput = {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;   // -1 = unanswered, 0-3 = selected option
  userAnswerText?: string;
  timeSeconds: number;
};

export async function saveExamResult(data: {
  examId: string;
  startedAt: string;
  durationSeconds: number;
  answers: ClientAnswerInput[];
}): Promise<{ resultId: string; attemptNumber: number } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  // 5 submissions per user per 5 minutes — prevents spam
  if (await isRateLimited(`submit:${userId}`, 5, 5 * 60_000)) {
    return { error: 'Çox tez-tez imtahan göndərdiniz. Bir az gözləyin.' };
  }

  const { examId, startedAt, durationSeconds, answers } = data;

  if (typeof durationSeconds !== 'number' || durationSeconds < 0 || !Number.isFinite(durationSeconds)) return { error: 'Invalid durationSeconds' };
  const startDate = new Date(startedAt);
  if (isNaN(startDate.getTime())) return { error: 'Invalid startedAt date' };
  if (!Array.isArray(answers) || answers.length > 2000) return { error: 'Invalid answers' };

  try {
    await dbConnect();

    // Atomically claim the next attempt number — also validates the purchase exists
    const updatedPurchase = await Purchase.findOneAndUpdate(
      { userId, examId, status: 'COMPLETED' },
      { $inc: { attemptCount: 1 } },
      { returnDocument: 'after' }
    );
    if (!updatedPurchase) return { error: 'Exam not purchased' };
    const attemptNumber = updatedPurchase.attemptCount;

    const exam = await getExamByIdAdmin(examId);
    if (!exam) return { error: 'Exam not found' };

    // Validate against server-side session. Log overtime but still accept the submission
    // (this is a practice platform — we never discard a student's work).
    const session = await ExamSessionModel.findOne({ userId, examId }).lean();
    if (session) {
      const serverElapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      if (serverElapsed > session.totalSeconds + 300) {
        Sentry.captureMessage('Exam submission overtime', {
          level: 'warning',
          extra: { userId, examId, serverElapsed, allowed: session.totalSeconds },
        });
      }
      // Use server-tracked startedAt so the stored record is always authoritative
      startDate.setTime(new Date(session.startedAt).getTime());
    }

    // Fetch authoritative correct answers from the database
    const questionDocs = await QuestionModel.find({ examId })
      .select('_id correctIndex moduleIndex type openAnswers correctMatching stem passage writingTaskType rubric')
      .lean();
    const correctMap = new Map(
      questionDocs.map(q => [String(q._id), {
        correctIndex: q.correctIndex,
        moduleIndex: q.moduleIndex,
        type: q.type,
        openAnswers: q.openAnswers || [],
        correctMatching: q.correctMatching || [],
        stem: q.stem ?? '',
        passage: q.passage ?? '',
        writingTaskType: q.writingTaskType,
        rubric: q.rubric ?? '',
      }])
    );

    // Build verified answer records — correctIndex and isCorrect come from DB, not client
    // Writing questions are evaluated separately via AI after this map
    const answerRecords: AnswerRecord[] = answers.map(a => {
      const authoritative = correctMap.get(a.questionId);
      const correctIndex = authoritative?.correctIndex ?? -1;
      let isCorrect = false;

      if (authoritative?.type === 'mcq') {
        isCorrect = a.userAnswer !== -1 && a.userAnswer === correctIndex;
      } else if (authoritative?.type === 'open') {
        if (a.userAnswerText && authoritative.openAnswers && authoritative.openAnswers.length > 0) {
          const normalizedInput = a.userAnswerText.replace(/\s+/g, '').toLowerCase().replace(/,/g, '.');
          isCorrect = authoritative.openAnswers.some(ans => {
            const normalizedAns = String(ans).replace(/\s+/g, '').toLowerCase().replace(/,/g, '.');
            return normalizedAns === normalizedInput;
          });
        }
      } else if (authoritative?.type === 'matching') {
        // userAnswerText is a JSON array string e.g. "[1,0,2,0,1]"
        if (a.userAnswerText && authoritative.correctMatching && authoritative.correctMatching.length > 0) {
          try {
            const userMatches: number[] = JSON.parse(a.userAnswerText);
            isCorrect = authoritative.correctMatching.length === userMatches.length &&
              authoritative.correctMatching.every((correct, idx) => correct === userMatches[idx]);
          } catch {
            isCorrect = false;
          }
        }
      }
      // writing: isCorrect stays false (AI-scored separately below)

      return {
        questionId:  a.questionId,
        moduleIndex: a.moduleIndex,
        userAnswer:  a.userAnswer,
        userAnswerText: a.userAnswerText || '',
        correctIndex,
        isCorrect,
        timeSeconds: Math.max(0, Math.round(a.timeSeconds)),
        // Writing answers start "pending" until the AI grader fills them in below.
        ...(authoritative?.type === 'writing' ? { writingPending: true } : {}),
      };
    });

    const typeOf = (questionId: string) => correctMap.get(questionId)?.type;

    // Compute non-writing scores first (instant, no external calls)
    const nonWritingAnswers = answerRecords.filter(a => {
      const auth = correctMap.get(a.questionId);
      return auth?.type !== 'writing';
    });

    const nonWritingScore = nonWritingAnswers.length > 0
      ? (nonWritingAnswers.filter(a => a.isCorrect).length / nonWritingAnswers.length) * 100
      : null;

    // Overall starts as the objective-only score. Writing is added once graded;
    // while it is pending it is excluded so an ungraded essay never shows as 0.
    const initialScore = nonWritingScore !== null ? Math.round(nonWritingScore) : 0;

    const moduleScores = buildModuleScores(exam.modules, answerRecords, typeOf);
    const authentic = applyAuthenticScores(exam.type, exam.modules, moduleScores, answerRecords, typeOf);

    // Persist the result BEFORE AI evaluation — never lose student work
    const result = await ExamResult.create({
      userId,
      examId,
      examTitle:       exam.title,
      examTag:         exam.tag,
      examType:        exam.type,
      attemptNumber,
      startedAt:       startDate,
      completedAt:     new Date(),
      durationSeconds,
      totalQuestions:  exam.totalQuestions,
      score:           initialScore,
      ...authentic,
      answers:         answerRecords,
      moduleScores,
    });

    await ExamSessionModel.deleteOne({ userId, examId });

    // Writing is NOT graded here — it stays "pending" on the saved result so the
    // student is redirected to their results instantly (grading two essays takes
    // ~10-15s). The review page auto-grades pending essays on load (with a
    // visible "yoxlanılır" state) via reevaluatePendingWriting.

    return { resultId: result._id.toString(), attemptNumber };
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'saveExamResult' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

/**
 * Re-grade any writing answers left "pending" (the AI grader was unavailable at
 * submit time). Safe to call repeatedly — it only touches pending essays and
 * recomputes the overall + module scores. Used by the "re-check" button on the
 * review page so writing evaluation is effectively "available all the time".
 */
export async function reevaluatePendingWriting(
  examId: string,
  attemptNumber: number,
): Promise<{ ok: true; graded: number; pending: number } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };
  if (!examId || !Number.isInteger(attemptNumber) || attemptNumber < 1) return { error: 'Invalid request' };

  // Guard against hammering the grader: 10 re-checks per user per 5 minutes.
  if (await isRateLimited(`reeval:${userId}`, 10, 5 * 60_000)) {
    return { error: 'Çox tez yenidən yoxladınız. Bir az gözləyin.' };
  }

  try {
    await dbConnect();

    const result = await ExamResult.findOne({ userId, examId, attemptNumber });
    if (!result) return { error: 'Nəticə tapılmadı.' };

    const exam = await getExamByIdAdmin(examId);
    if (!exam) return { error: 'Exam not found' };

    const questionDocs = await QuestionModel.find({ examId })
      .select('_id type stem passage writingTaskType rubric')
      .lean();
    const qmap = new Map(questionDocs.map(q => [String(q._id), q]));
    const typeOf = (questionId: string) => qmap.get(questionId)?.type;

    const records = result.answers as unknown as AnswerRecord[];
    const pendingWriting = records.filter(
      r => typeOf(r.questionId) === 'writing' && r.writingPending && (r.userAnswerText ?? '').trim(),
    );

    if (pendingWriting.length > 0) {
      await Promise.all(pendingWriting.map(async (rec) => {
        const q = qmap.get(rec.questionId);
        const evalResult = await evaluateWriting({
          essay: rec.userAnswerText ?? '',
          prompt: [q?.passage, q?.stem].filter(Boolean).join('\n\n'),
          rubric: q?.rubric,
          taskType: q?.writingTaskType as any,
          examType: exam.type,
          examName: exam.title,
        });
        rec.writingWordCount = evalResult.wordCount;
        rec.aiFeedback = evalResult.overallComment;
        if (evalResult.pending) {
          rec.writingPending = true;
          rec.writingScore = undefined;
          rec.writingCriteria = undefined;
        } else {
          rec.writingPending = false;
          rec.writingScore = evalResult.bandScore;
          rec.writingCriteria = evalResult.criteriaFeedback;
        }
      }));

      const nonWriting = records.filter(r => typeOf(r.questionId) !== 'writing');
      const nonWritingScore = nonWriting.length > 0
        ? (nonWriting.filter(r => r.isCorrect).length / nonWriting.length) * 100
        : null;

      const modScores = buildModuleScores(exam.modules, records, typeOf);
      const auth = applyAuthenticScores(exam.type, exam.modules, modScores, records, typeOf);

      result.score = averageOfPresent([nonWritingScore, writingScorePercent(records)]);
      result.moduleScores = modScores as never;
      result.examType = result.examType ?? exam.type;
      result.overallBand = auth.overallBand;
      result.totalScaled = auth.totalScaled;
      result.rwScaled = auth.rwScaled;
      result.mathScaled = auth.mathScaled;
      result.markModified('answers');
      result.markModified('moduleScores');
      await result.save();

      revalidatePath(`/dashboard/analytics/${examId}/${attemptNumber}/review`);
    }

    const stillPending = records.filter(
      r => typeOf(r.questionId) === 'writing' && r.writingPending,
    ).length;

    return { ok: true, graded: pendingWriting.length - stillPending, pending: stillPending };
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'reevaluatePendingWriting' } });
    return { error: 'Server xətası baş verdi.' };
  }
}
