'use server';

import mongoose from 'mongoose';
import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/infra/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult, { type IExamResult } from '@/lib/models/ExamResult';
import QuestionModel from '@/lib/models/Question';
import { getExamByIdAdmin } from '@/lib/db/exams';
import ExamSessionModel from '@/lib/models/ExamSession';
import PlayedAudioModel from '@/lib/models/PlayedAudio';
import { isRateLimited } from '@/lib/infra/rate-limit';
import { checkRole } from '@/lib/infra/admin';
import { evaluateWriting, type WritingCriterionResult } from '@/lib/infra/writing-eval';
import { computeAuthenticScores, overallPercent } from '@/lib/domain/scoring';
import { gradeAnswers } from '@/lib/domain/grading';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/infra/analytics';
import { captureException, captureMessage } from '@/lib/infra/observability';
import { hasExamAccess } from '@/lib/db/entitlements';

type AnswerRecord = {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;
  userAnswerText: string;
  correctIndex: number;
  isCorrect: boolean;
  /** Marks available / earned. Only `matching` is ever worth more than 1. */
  marks: number;
  earnedMarks: number;
  timeSeconds: number;
  writingScore?: number;
  writingWordCount?: number;
  writingCriteria?: WritingCriterionResult[];
  aiFeedback?: string;
  writingPending?: boolean;
};

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
    .map(r => ({
      taskType: writingTaskTypeOf(r.questionId),
      band: r.writingScore as number,
      // Tagged so a paper with two writing sections scores each from its own
      // essays rather than handing both the same all-essays band.
      moduleIndex: r.moduleIndex,
    }));

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

    /*
     * Scored in MARKS, not in questions.
     *
     * A matching question is worth one mark per item, so a section's mark total
     * is not its document count — an IELTS reading section of 40 documents can
     * carry 53 marks. Counting documents both denied partial credit and fed the
     * band tables a number that did not mean what they expect.
     */
    const earned = modNonWriting.reduce((sum, a) => sum + (a.earnedMarks ?? 0), 0);
    const available = modNonWriting.reduce((sum, a) => sum + (a.marks ?? 1), 0);

    let scorePercent = 0;
    if (available > 0) {
      scorePercent = Math.round((earned / available) * 100);
    } else if (gradedWriting.length > 0) {
      scorePercent = Math.round(gradedWriting.reduce((s, a) => s + ((a.writingScore ?? 0) / 9) * 100, 0) / gradedWriting.length);
    }

    return {
      moduleIndex: modIdx,
      moduleName:  mod.name,
      correct:     earned,
      // Writing-only modules have no marks of their own; fall back to the
      // answer count so the module still reports a sensible denominator.
      total:       available > 0 ? available : modAnswers.length,
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
    if (!(await hasExamAccess(userId, examId))) return { error: 'Exam not purchased' };

    // Three independent reads, issued together: the exam definition, the
    // session clock, and the authoritative question set. In sequence they were
    // three round-trips stacked in front of the student's submission.
    //
    // Only the fields grading and score aggregation need are selected —
    // notably NOT `passage`/`stem`/`rubric`, which can run to tens of KB per
    // question and are re-queried by the writing grader when an essay is
    // actually assessed.
    const [exam, session, questionDocs] = await Promise.all([
      getExamByIdAdmin(examId),
      ExamSessionModel.findOne({ userId, examId }).lean(),
      QuestionModel.find({ examId })
        .select('_id correctIndex moduleIndex order type openAnswers correctMatching writingTaskType')
        .sort({ moduleIndex: 1, order: 1 })
        .lean(),
    ]);

    if (!exam) return { error: 'Exam not found' };

    // Validate against server-side session. Log overtime but still accept the submission
    // (this is a practice platform — we never discard a student's work).
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

    /*
     * Grade only the questions the candidate could actually reach.
     *
     * `updateExam` replaces the module array wholesale, so an earlier edit can
     * have left questions pointing at a module that no longer exists. The
     * player already excludes them — they are unreachable and unscheduled — but
     * grading still loaded every question for the exam, so each orphan was
     * recorded as unanswered and counted in `totalQuestions`. The results page
     * then reported a paper longer than the one that was sat.
     *
     * Filtered here rather than in the query so the three reads above stay
     * parallel; the module count is only known once the exam has resolved.
     */
    /*
     * ...and only the modules this ATTEMPT was actually scheduled to sit.
     *
     * A module that was empty when the attempt began is skipped by
     * `buildModuleSchedule`, so it has no window and can never be opened. If
     * questions are added to it mid-attempt, they would otherwise be graded
     * here as unanswered — marking the candidate down for a section the
     * schedule never gave them. `getSessionQuestionMeta` hides them for the
     * same reason; the two must agree or the denominator drifts from the paper.
     */
    const scheduled = session?.moduleSchedule;
    const scheduledModules = Array.isArray(scheduled) && scheduled.length > 0
      ? new Set(scheduled.map(w => w.moduleIndex))
      : null;

    const liveQuestionDocs = questionDocs.filter(q =>
      q.moduleIndex < exam.modules.length
      && (!scheduledModules || scheduledModules.has(q.moduleIndex)),
    );

    if (liveQuestionDocs.length === 0) return { error: 'Bu imtahanda sual yoxdur.' };

    // Lookup for the two per-question attributes the scoring aggregation needs.
    const metaById = new Map(
      liveQuestionDocs.map(q => [String(q._id), {
        type: q.type,
        writingTaskType: q.writingTaskType,
      }])
    );

    // Grade against the authoritative question set (see lib/grading.ts): the
    // denominator is the exam's real question count, so a partial or padded
    // payload cannot inflate the score, and moduleIndex/correctIndex always
    // come from the database rather than the request body.
    const answerRecords: AnswerRecord[] = gradeAnswers(
      liveQuestionDocs.map(q => ({
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

    const moduleScores = buildModuleScores(exam.modules, answerRecords, typeOf);

    // The headline percentage is the mean of the SECTIONS (see `overallPercent`).
    // Writing modules are marked pending here and so are excluded until graded —
    // an ungraded essay never shows as a zero.
    const initialScore = overallPercent(moduleScores);
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
      // The number of questions actually graded. NOT the score's denominator —
      // that is the mark total, which is larger wherever a matching question
      // carries several items. `exam.totalQuestions` is the sum the modules
      // *declare* and can drift from the real bank, so it would misreport this.
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

    /*
     * Cleanup, in its own guard — the attempt is already saved.
     *
     * This used to sit bare inside the main `try`, so a failure here threw past
     * the return and the student was told the submission had failed. It had
     * not: the result was in the database. They would retry, and the retry
     * filed the SAME attempt a second time as N+1 — while the surviving session
     * also meant the next visit resumed an attempt that was already submitted.
     * A failed delete costs a stale session that the 7-day TTL clears; it must
     * never cost a duplicate attempt.
     */
    try {
      await ExamSessionModel.deleteOne({ userId, examId });
      /*
       * Filing the result is what releases the listening tracks.
       *
       * The claim deliberately survives `restartExamSession` — that is what
       * stops "play, reload, start over" from handing the recording back. But
       * an attempt that has actually been submitted is over, and the next one
       * must start with the audio fresh, or unlimited attempts would only be
       * unlimited for candidates who never listened.
       */
      await PlayedAudioModel.deleteMany({ userId, examId });
    } catch (err) {
      void captureException(err, {
        tags: { action: 'saveExamResult', step: 'clearSession' },
        extra: { userId, examId, attemptNumber },
      });
    }

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
 * How long one grader may hold a result before another caller may take over.
 *
 * Must exceed the worst case of a real grading pass, or a slow-but-healthy run
 * would have its claim stolen and the duplicate call this exists to prevent
 * happens anyway. `evaluateWriting` bounds itself at GRADER_TIMEOUT_MS (90s)
 * with GRADER_MAX_RETRIES (1) — so ~3 minutes per essay, and essays on one
 * result are graded concurrently. Five minutes clears that with margin.
 *
 * It must also stay SHORT enough that a claim orphaned by a killed serverless
 * instance is retaken on a later visit rather than leaving the essay pending
 * for ever. Five minutes means the student's next page load recovers it.
 */
const WRITING_CLAIM_TTL_MS = 5 * 60_000;

/**
 * Take exclusive ownership of this result's pending essays.
 *
 * A single-document conditional update, so the database decides the winner —
 * exactly as `markAudioPlayed` leans on a unique index rather than on a
 * read-then-write. Returns false when someone else holds a live claim, and the
 * caller then reports the essays as still pending, which is what they are.
 */
async function claimWritingGrade(resultId: mongoose.Types.ObjectId): Promise<boolean> {
  const staleBefore = new Date(Date.now() - WRITING_CLAIM_TTL_MS);
  const res = await ExamResult.updateOne(
    {
      _id: resultId,
      $or: [
        { writingGradingAt: { $exists: false } },
        { writingGradingAt: null },
        { writingGradingAt: { $lte: staleBefore } },
      ],
    },
    { $set: { writingGradingAt: new Date() } },
  );
  return res.modifiedCount === 1;
}

/** Release the claim, whatever the outcome. Never throws into the caller. */
async function releaseWritingGrade(resultId: mongoose.Types.ObjectId): Promise<void> {
  try {
    await ExamResult.updateOne({ _id: resultId }, { $unset: { writingGradingAt: '' } });
  } catch (err) {
    // A stuck claim expires on its own via WRITING_CLAIM_TTL_MS, so this is
    // reported rather than retried — it must never mask a completed grading.
    void captureException(err, {
      tags: { action: 'releaseWritingGrade' },
      extra: { resultId: String(resultId) },
    });
  }
}

/**
 * Grade any still-"pending" writing answers on a result document (a live,
 * non-lean Mongoose doc), then recompute the overall + module scores and save.
 * No auth — the caller is responsible for authorising. Shared by the student
 * results-page auto-grade and the admin re-grade tools. Only touches pending
 * essays, so it is safe to call repeatedly.
 *
 * Concurrency-safe: the result is claimed before any grader call, so two tabs
 * on the same review page cost one assessment rather than two. A caller that
 * loses the race reports the essays as pending and returns immediately.
 */
async function gradePendingWritingOnResult(
  result: mongoose.HydratedDocument<IExamResult>,
): Promise<{ graded: number; pending: number }> {
  const records = result.answers as unknown as AnswerRecord[];

  /*
   * Cheap pre-check, before any query or any claim.
   *
   * `writingPending` is only ever written onto a writing record (see
   * `gradeAnswers`), so its absence everywhere means there is nothing here to
   * grade. The review page calls this on EVERY load, and a finished result is
   * by far the common case — it used to pay for an exam read and a full
   * question-bank read to discover that. This is a narrowing test only: the
   * type-checked filter below still decides what actually gets graded.
   */
  if (!records.some(r => r.writingPending)) return { graded: 0, pending: 0 };

  // Someone else is already grading this result. Their pass will resolve the
  // same essays, so report them as pending rather than paying to duplicate it.
  if (!(await claimWritingGrade(result._id))) {
    return { graded: 0, pending: records.filter(r => r.writingPending).length };
  }

  try {
    return await runWritingGrade(result, records);
  } finally {
    await releaseWritingGrade(result._id);
  }
}

/** The grading pass itself. Only ever called with the claim held. */
async function runWritingGrade(
  result: mongoose.HydratedDocument<IExamResult>,
  records: AnswerRecord[],
): Promise<{ graded: number; pending: number }> {
  const startedAt = Date.now();
  const exam = await getExamByIdAdmin(result.examId);
  if (!exam) return { graded: 0, pending: 0 };

  const questionDocs = await QuestionModel.find({ examId: result.examId })
    .select('_id type stem passage writingTaskType rubric')
    .lean();
  const qmap = new Map(questionDocs.map(q => [String(q._id), q]));
  const typeOf = (questionId: string) => qmap.get(questionId)?.type;
  const writingTaskTypeOf = (questionId: string) => qmap.get(questionId)?.writingTaskType;

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

  const modScores = buildModuleScores(exam.modules, records, typeOf);
  const auth = applyAuthenticScores(exam.type, exam.modules, modScores, records, typeOf, writingTaskTypeOf);

  // Writing has now been scored, so its module joins the section mean.
  result.score = overallPercent(modScores);
  // Plain objects into a Mongoose DocumentArray field: the cast names the target
  // type rather than reaching for `as never`, which suppressed every check here.
  result.moduleScores = modScores as unknown as IExamResult['moduleScores'];
  result.examType = result.examType ?? exam.type;
  result.overallBand = auth.overallBand;
  result.totalScaled = auth.totalScaled;
  result.rwScaled = auth.rwScaled;
  result.mathScaled = auth.mathScaled;
  result.markModified('answers');
  result.markModified('moduleScores');
  await result.save();

  const stillPending = records.filter(r => typeOf(r.questionId) === 'writing' && r.writingPending).length;
  const graded = allPending.length - stillPending;

  /*
   * Report the grading pass.
   *
   * `writingGraded` was declared in ANALYTICS_EVENTS and emitted from nowhere,
   * which left the one funnel step whose failure is SILENT with no telemetry at
   * all: a grader without quota returns `pending` for ever, the student sees
   * "yoxlanılır…", and nothing anywhere records that it happened. `stillPending`
   * is the number worth alerting on. The bands come along because a model
   * drifting generous is only visible as a distribution shift over time.
   */
  void trackEvent(ANALYTICS_EVENTS.writingGraded, result.userId, {
    examId:       result.examId,
    examType:     exam.type,
    attemptNumber: result.attemptNumber,
    essays:       allPending.length,
    graded,
    stillPending,
    bands:        records
      .filter(r => typeOf(r.questionId) === 'writing' && typeof r.writingScore === 'number')
      .map(r => r.writingScore as number),
    durationMs:   Date.now() - startedAt,
  });

  return { graded, pending: stillPending };
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

/**
 * How long one sweep may run before it stops and reports what it managed.
 *
 * Each result can hold several essays and each essay is a bounded but slow
 * grader call, so twenty-five of them in sequence is minutes of work — well
 * past the execution limit of a serverless request. Being killed mid-loop
 * loses no grading (every result is saved as it completes) but does lose the
 * REPORT, so the admin is told the sweep failed when much of it succeeded.
 * Stopping on a budget turns that into an honest partial result.
 */
const REGRADE_BUDGET_MS = 60_000;
const REGRADE_MAX_RESULTS = 25;

/** Admin-only: (re-)grade pending results in one pass, bounded by count and time. */
export async function adminRegradeAllPending(): Promise<
  { ok: true; processed: number; graded: number; stillPending: number; remaining: number } | { error: string }
> {
  if (!(await checkRole('admin'))) return { error: 'Forbidden' };
  try {
    await dbConnect();
    const docs = await ExamResult.find({ 'answers.writingPending': true })
      .sort({ completedAt: 1 })
      .limit(REGRADE_MAX_RESULTS);

    const deadline = Date.now() + REGRADE_BUDGET_MS;
    let processed = 0, graded = 0, stillPending = 0;

    for (const result of docs) {
      // Checked before starting each result rather than after: the budget is
      // there to stop a new slow grader call, not to interrupt one in flight.
      if (Date.now() > deadline) break;
      const r = await gradePendingWritingOnResult(result);
      processed++;
      graded += r.graded;
      stillPending += r.pending;
    }

    revalidatePath('/admin/writing');
    return { ok: true, processed, graded, stillPending, remaining: docs.length - processed };
  } catch (err) {
    void captureException(err, { tags: { action: 'adminRegradeAllPending' } });
    return { error: 'Server xətası baş verdi.' };
  }
}
