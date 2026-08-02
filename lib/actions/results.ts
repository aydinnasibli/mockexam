'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult, { type IExamResult } from '@/lib/models/ExamResult';
import QuestionModel from '@/lib/models/Question';
import { getExamByIdAdmin } from '@/lib/db/exams';
import ExamSessionModel from '@/lib/models/ExamSession';
import { isRateLimited } from '@/lib/rate-limit';
import { checkRole } from '@/lib/admin';
import { evaluateWriting, type WritingCriterionResult } from '@/lib/actions/writing-eval';
import { computeAuthenticScores } from '@/lib/scoring';
import { gradeAnswers } from '@/lib/grading';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/analytics';
import { captureException, captureMessage } from '@/lib/observability';

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
  writingTaskTypeOf: (questionId: string) => string | undefined,
): { overallBand?: number; totalScaled?: number; rwScaled?: number; mathScaled?: number } {
  // Tag each graded essay with the task type declared on its question, so the
  // Task-2-counts-double weighting can't be flipped by submission order.
  const writingTasks = records
    .filter(r => typeOf(r.questionId) === 'writing' && !r.writingPending && typeof r.writingScore === 'number')
    .map(r => ({ taskType: writingTaskTypeOf(r.questionId), band: r.writingScore as number }));

  const auth = computeAuthenticScores({ examType, modules, moduleScores, writingTasks });
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

/** Everything needed to store an attempt, except the attempt number itself. */
interface NewResultInput {
  userId: string;
  examId: string;
  examTitle: string;
  examTag: string;
  examType: string;
  startedAt: Date;
  completedAt: Date;
  durationSeconds: number;
  totalQuestions: number;
  score: number;
  overallBand?: number;
  totalScaled?: number;
  rwScaled?: number;
  mathScaled?: number;
  answers: AnswerRecord[];
  moduleScores: ModuleScore[];
}

/**
 * Insert a result under the next free attempt number for this user+exam.
 *
 * Reads the current maximum, inserts at max+1, and retries if the unique index
 * rejects it (another submission landed first). Bounded so a persistent
 * failure surfaces as an error instead of spinning.
 */
async function createResultWithNextAttempt(
  doc: NewResultInput,
): Promise<mongoose.HydratedDocument<IExamResult>> {
  const MAX_TRIES = 5;
  const { userId, examId } = doc;

  for (let attemptTry = 0; attemptTry < MAX_TRIES; attemptTry++) {
    const latest = await ExamResult.findOne({ userId, examId })
      .sort({ attemptNumber: -1 })
      .select('attemptNumber')
      .lean();
    const attemptNumber = (latest?.attemptNumber ?? 0) + 1;

    try {
      return await ExamResult.create({ ...doc, attemptNumber } as Partial<IExamResult>);
    } catch (err) {
      if ((err as { code?: number }).code === 11000 && attemptTry < MAX_TRIES - 1) continue;
      throw err;
    }
  }
  throw new Error('Could not allocate an attempt number after repeated collisions');
}

export type ClientAnswerInput = {
  questionId: string;
  /**
   * Ignored by the server — the module is read from the question document.
   * Still accepted so existing clients keep working.
   * @deprecated
   */
  moduleIndex?: number;
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

    // Validate the purchase before consuming an attempt number, so a failed
    // submission can't permanently burn one.
    const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
    if (!purchase) return { error: 'Exam not purchased' };

    const exam = await getExamByIdAdmin(examId);
    if (!exam) return { error: 'Exam not found' };

    // Validate against server-side session. Log overtime but still accept the submission
    // (this is a practice platform — we never discard a student's work).
    const session = await ExamSessionModel.findOne({ userId, examId }).lean();
    let serverElapsed: number | null = null;
    if (session) {
      serverElapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);
      if (serverElapsed > session.totalSeconds + 300) {
        void captureMessage('Exam submission overtime', {
          level: 'warning',
          extra: { userId, examId, serverElapsed, allowed: session.totalSeconds },
        });
      }
      // Use server-tracked startedAt so the stored record is always authoritative
      startDate.setTime(new Date(session.startedAt).getTime());
    }

    // The client reports its own elapsed time, so cap it against what the server
    // actually observed. Without this a crafted payload could report an
    // arbitrary duration, which would then poison the per-user time aggregates
    // on the dashboard and the admin panel. Falls back to the exam's own length
    // when there is no session row (e.g. it expired via TTL before submission).
    const durationCeiling = serverElapsed !== null
      ? serverElapsed + 300
      : exam.durationMinutes * 60 + 300;
    const safeDurationSeconds = Math.min(Math.round(durationSeconds), Math.max(0, durationCeiling));

    // Fetch the authoritative question set. Only the fields grading and score
    // aggregation need — notably NOT `passage`/`stem`/`rubric`, which can run to
    // tens of KB per question and are re-queried by the writing grader when an
    // essay is actually assessed.
    const questionDocs = await QuestionModel.find({ examId })
      .select('_id correctIndex moduleIndex order type openAnswers correctMatching writingTaskType')
      .sort({ moduleIndex: 1, order: 1 })
      .lean();

    if (questionDocs.length === 0) return { error: 'Bu imtahanda sual yoxdur.' };

    // Lookup for the two per-question attributes the scoring aggregation needs.
    const metaById = new Map(
      questionDocs.map(q => [String(q._id), {
        type: q.type,
        writingTaskType: q.writingTaskType,
      }])
    );

    // Grade against the authoritative question set (see lib/grading.ts): the
    // denominator is the exam's real question count, so a partial or padded
    // payload cannot inflate the score, and moduleIndex/correctIndex always
    // come from the database rather than the request body.
    const answerRecords: AnswerRecord[] = gradeAnswers(
      questionDocs.map(q => ({
        id:              String(q._id),
        moduleIndex:     q.moduleIndex,
        type:            q.type,
        correctIndex:    q.correctIndex,
        openAnswers:     q.openAnswers,
        correctMatching: q.correctMatching,
      })),
      answers,
    );

    const typeOf = (questionId: string) => metaById.get(questionId)?.type;
    const writingTaskTypeOf = (questionId: string) => metaById.get(questionId)?.writingTaskType;

    // Compute non-writing scores first (instant, no external calls)
    const nonWritingAnswers = answerRecords.filter(a => typeOf(a.questionId) !== 'writing');

    const nonWritingScore = nonWritingAnswers.length > 0
      ? (nonWritingAnswers.filter(a => a.isCorrect).length / nonWritingAnswers.length) * 100
      : null;

    // Overall starts as the objective-only score. Writing is added once graded;
    // while it is pending it is excluded so an ungraded essay never shows as 0.
    const initialScore = nonWritingScore !== null ? Math.round(nonWritingScore) : 0;

    const moduleScores = buildModuleScores(exam.modules, answerRecords, typeOf);
    const authentic = applyAuthenticScores(exam.type, exam.modules, moduleScores, answerRecords, typeOf, writingTaskTypeOf);

    // Persist the result BEFORE AI evaluation — never lose student work.
    //
    // The attempt number is derived from the results that actually exist rather
    // than from Purchase.attemptCount, because a purchase can be revoked and
    // re-granted (which resets the counter to 0) while the old results remain.
    // Deriving it here, and retrying on the unique-index collision that a
    // concurrent submit would cause, keeps `{userId, examId, attemptNumber}`
    // unique without ever locking the student out.
    const result = await createResultWithNextAttempt({
      userId,
      examId,
      examTitle:       exam.title,
      examTag:         exam.tag,
      examType:        exam.type,
      startedAt:       startDate,
      completedAt:     new Date(),
      durationSeconds: safeDurationSeconds,
      // The number of questions actually graded, which is now also the score's
      // denominator. `exam.totalQuestions` is the sum the modules *declare* and
      // can drift from the real question bank, so it would misreport the attempt.
      totalQuestions:  answerRecords.length,
      score:           initialScore,
      ...authentic,
      answers:         answerRecords,
      moduleScores,
    });
    const attemptNumber = result.attemptNumber;

    // Keep the purchase counter in step for the admin views. Best-effort: the
    // result is already saved and must never be rolled back over this — but the
    // failure is still reported rather than swallowed, since a counter that
    // silently drifts from the real attempt count is a reporting bug.
    try {
      await Purchase.updateOne(
        { userId, examId },
        { $max: { attemptCount: attemptNumber } },
      );
    } catch (err) {
      void captureException(err, {
        tags: { action: 'saveExamResult', step: 'syncAttemptCount' },
        extra: { userId, examId, attemptNumber },
      });
    }

    await ExamSessionModel.deleteOne({ userId, examId });

    // Writing is NOT graded here — it stays "pending" on the saved result so the
    // student is redirected to their results instantly (grading two essays takes
    // ~10-15s). The review page auto-grades pending essays on load (with a
    // visible "yoxlanılır" state) via reevaluatePendingWriting.

    void trackEvent(ANALYTICS_EVENTS.examSubmitted, userId, {
      examId,
      examTitle:      exam.title,
      examType:       exam.type,
      attemptNumber,
      score:          initialScore,
      totalQuestions: answerRecords.length,
      answered:       answerRecords.filter(a => a.userAnswer !== -1 || a.userAnswerText.trim()).length,
      durationSeconds: safeDurationSeconds,
    });

    return { resultId: result._id.toString(), attemptNumber };
  } catch (err) {
    void captureException(err, { tags: { action: 'saveExamResult' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

/**
 * Grade any still-"pending" writing answers on a result document (a live,
 * non-lean Mongoose doc), then recompute the overall + module scores and save.
 * No auth — the caller is responsible for authorising. Shared by the student
 * results-page auto-grade and the admin re-grade tools. Only touches pending
 * essays, so it is safe to call repeatedly.
 */
async function gradePendingWritingOnResult(
  result: mongoose.HydratedDocument<IExamResult>,
): Promise<{ graded: number; pending: number }> {
  const exam = await getExamByIdAdmin(result.examId);
  if (!exam) return { graded: 0, pending: 0 };

  const questionDocs = await QuestionModel.find({ examId: result.examId })
    .select('_id type stem passage writingTaskType rubric')
    .lean();
  const qmap = new Map(questionDocs.map(q => [String(q._id), q]));
  const typeOf = (questionId: string) => qmap.get(questionId)?.type;
  const writingTaskTypeOf = (questionId: string) => qmap.get(questionId)?.writingTaskType;

  const records = result.answers as unknown as AnswerRecord[];
  const allPending = records.filter(r => typeOf(r.questionId) === 'writing' && r.writingPending);
  if (allPending.length === 0) return { graded: 0, pending: 0 };

  // A blank essay is a genuine 0 — resolve it immediately, no AI call needed.
  for (const rec of allPending) {
    if (!(rec.userAnswerText ?? '').trim()) {
      rec.writingPending = false;
      rec.writingScore = 0;
      rec.writingWordCount = 0;
      rec.writingCriteria = undefined;
      rec.aiFeedback = 'Cavab verilməyib.';
    }
  }

  const toGrade = allPending.filter(r => (r.userAnswerText ?? '').trim());
  await Promise.all(toGrade.map(async (rec) => {
    const q = qmap.get(rec.questionId);
    const evalResult = await evaluateWriting({
      essay: rec.userAnswerText ?? '',
      prompt: [q?.passage, q?.stem].filter(Boolean).join('\n\n'),
      rubric: q?.rubric,
      taskType: q?.writingTaskType,
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
  const auth = applyAuthenticScores(exam.type, exam.modules, modScores, records, typeOf, writingTaskTypeOf);

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

  const stillPending = records.filter(r => typeOf(r.questionId) === 'writing' && r.writingPending).length;
  return { graded: allPending.length - stillPending, pending: stillPending };
}

/**
 * Student-facing: grade the pending essays on their own result. Called
 * automatically when the results page opens (there is no manual button).
 */
export async function reevaluatePendingWriting(
  examId: string,
  attemptNumber: number,
): Promise<{ ok: true; graded: number; pending: number } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };
  if (!examId || !Number.isInteger(attemptNumber) || attemptNumber < 1) return { error: 'Invalid request' };

  // Guard against hammering the grader from repeated page loads.
  if (await isRateLimited(`reeval:${userId}`, 10, 5 * 60_000)) {
    return { error: 'Çox tez yoxlanıldı. Bir az gözləyin.' };
  }

  try {
    await dbConnect();
    const result = await ExamResult.findOne({ userId, examId, attemptNumber });
    if (!result) return { error: 'Nəticə tapılmadı.' };
    const r = await gradePendingWritingOnResult(result);
    revalidatePath(`/dashboard/analytics/${examId}/${attemptNumber}/review`);
    return { ok: true, graded: r.graded, pending: r.pending };
  } catch (err) {
    void captureException(err, { tags: { action: 'reevaluatePendingWriting' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

// ── Admin: writing-evaluation problems dashboard ────────────────────────────

export interface WritingEvalProblem {
  resultId: string;
  userId: string;
  examId: string;
  examTitle: string;
  examTag: string;
  attemptNumber: number;
  completedAt: string;      // ISO
  completedAtLabel: string; // pre-formatted on the server (avoids hydration mismatch)
  pendingCount: number;
  wordCounts: number[];
}

/** Admin-only: every result that still has ungraded (pending) writing. */
export async function getWritingEvalProblems(): Promise<WritingEvalProblem[]> {
  if (!(await checkRole('admin'))) return [];
  await dbConnect();
  const docs = await ExamResult.find({ 'answers.writingPending': true })
    .sort({ completedAt: -1 })
    .limit(200)
    .lean();
  return docs.map(d => {
    const pending = (d.answers ?? []).filter((a) => a.writingPending);
    return {
      resultId:      String(d._id),
      userId:        d.userId,
      examId:        d.examId,
      examTitle:     d.examTitle,
      examTag:       d.examTag,
      attemptNumber: d.attemptNumber,
      completedAt:   d.completedAt.toISOString(),
      completedAtLabel: d.completedAt.toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
      pendingCount:  pending.length,
      wordCounts:    pending.map((a) => (a.userAnswerText ?? '').trim().split(/\s+/).filter(Boolean).length),
    };
  });
}

/** Admin-only: manually (re-)grade the pending writing on one result. */
export async function adminRegradeResult(
  resultId: string,
): Promise<{ ok: true; graded: number; pending: number } | { error: string }> {
  if (!(await checkRole('admin'))) return { error: 'Forbidden' };
  if (!mongoose.isValidObjectId(resultId)) return { error: 'Yanlış nəticə ID.' };
  try {
    await dbConnect();
    const result = await ExamResult.findById(resultId);
    if (!result) return { error: 'Nəticə tapılmadı.' };
    const r = await gradePendingWritingOnResult(result);
    revalidatePath('/admin/writing');
    revalidatePath(`/dashboard/analytics/${result.examId}/${result.attemptNumber}/review`);
    return { ok: true, graded: r.graded, pending: r.pending };
  } catch (err) {
    void captureException(err, { tags: { action: 'adminRegradeResult' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

/** Admin-only: (re-)grade all pending results in one pass (bounded). */
export async function adminRegradeAllPending(): Promise<
  { ok: true; processed: number; graded: number; stillPending: number } | { error: string }
> {
  if (!(await checkRole('admin'))) return { error: 'Forbidden' };
  try {
    await dbConnect();
    const docs = await ExamResult.find({ 'answers.writingPending': true })
      .sort({ completedAt: 1 })
      .limit(25);
    let graded = 0, stillPending = 0;
    for (const result of docs) {
      const r = await gradePendingWritingOnResult(result);
      graded += r.graded;
      stillPending += r.pending;
    }
    revalidatePath('/admin/writing');
    return { ok: true, processed: docs.length, graded, stillPending };
  } catch (err) {
    void captureException(err, { tags: { action: 'adminRegradeAllPending' } });
    return { error: 'Server xətası baş verdi.' };
  }
}
