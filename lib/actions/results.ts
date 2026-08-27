'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { and, asc, desc, eq, gt, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { db, txDb } from '@/lib/infra/db';
import {
  questions as questionsTable,
  examSessions,
  playedAudio,
  examResults,
  examAnswers,
  purchases,
} from '@/lib/db/schema';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { isRateLimited, limited } from '@/lib/infra/rate-limit';
import { checkRole } from '@/lib/infra/admin';
import { evaluateWriting, type WritingCriterionResult } from '@/lib/infra/writing-eval';
import { computeAuthenticScores, overallPercent } from '@/lib/domain/scoring';
import type { ExamVariant } from '@/lib/domain/exam-types';
import { gradeAnswers } from '@/lib/domain/grading';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/infra/analytics';
import { captureException, captureMessage } from '@/lib/infra/observability';
import { hasExamAccess } from '@/lib/db/entitlements';

/**
 * Bounds a result id before it reaches a query.
 *
 * Was `mongoose.isValidObjectId`. Result ids are `text` now: rows carried over
 * from Mongo keep their 24-character ObjectId hex, rows created since take a
 * uuid. Both are accepted, anything else is refused here.
 */
function validResultId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id)
    || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

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
 * Is this record an essay?
 *
 * Asks the live question first, then falls back to the record's own writing
 * fields. The fallback is what keeps a deleted or re-imported question from
 * silently reclassifying an essay: `typeOf` alone returned undefined, the essay
 * was counted as an ordinary one-mark answer earning zero, and it dragged its
 * section's percentage down while also never being graded.
 */
function isWritingRecord(
  r: AnswerRecord,
  typeOf: (questionId: string) => string | undefined,
): boolean {
  const known = typeOf(r.questionId);
  if (known) return known === 'writing';
  return r.writingPending === true
    || typeof r.writingScore === 'number'
    || (r.writingCriteria?.length ?? 0) > 0;
}

/**
 * Stamp exam-authentic scores onto `moduleScores` (mutates `.band` per module)
 * and return the attempt-level fields (IELTS overall band, SAT scaled scores).
 */
function applyAuthenticScores(
  examType: string,
  variant: ExamVariant,
  modules: { type: string }[],
  moduleScores: ModuleScore[],
  records: AnswerRecord[],
  typeOf: (questionId: string) => string | undefined,
  writingTaskTypeOf: (questionId: string) => string | undefined,
): { overallBand?: number; totalScaled?: number; rwScaled?: number; mathScaled?: number } {
  // Tag each graded essay with the task type declared on its question, so the
  // Task-2-counts-double weighting can't be flipped by submission order.
  const writingTasks = records
    .filter(r => isWritingRecord(r, typeOf) && !r.writingPending && typeof r.writingScore === 'number')
    .map(r => ({
      taskType: writingTaskTypeOf(r.questionId),
      band: r.writingScore as number,
      // Tagged so a paper with two writing sections scores each from its own
      // essays rather than handing both the same all-essays band.
      moduleIndex: r.moduleIndex,
    }));

  const auth = computeAuthenticScores({ examType, variant, modules, moduleScores, writingTasks });
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
    const modWriting    = modAnswers.filter(a => isWritingRecord(a, typeOf));
    const modNonWriting = modAnswers.filter(a => !isWritingRecord(a, typeOf));
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
 * Did this failure mean "another submission took that attempt number"?
 *
 * Narrow on purpose. A bare `code === '23505'` also matched a unique violation
 * raised by the ANSWERS insert, which the loop would then retry — filing a
 * second result row for one submission. The attempt key is the only collision
 * worth retrying; anything else is a real fault and must surface.
 */
function isAttemptNumberCollision(err: unknown): boolean {
  const e = err as { code?: string; constraint?: string } | null;
  if (e?.code !== '23505') return false;
  // Drivers that do not surface `constraint` fall back to the old behaviour;
  // the transaction below means a spurious retry can no longer duplicate a row.
  return e.constraint === undefined || e.constraint === 'exam_results_attempt_key';
}

/**
 * Insert a result, and its answers, under the next free attempt number.
 *
 * Chooses the attempt number inside the INSERT, and retries if the unique index
 * rejects it (another submission landed first). Bounded so a persistent failure
 * surfaces as an error instead of spinning.
 */
async function createResultWithNextAttempt(
  doc: NewResultInput,
  snapshots: Map<string, QuestionSnapshot>,
): Promise<{ id: string; attemptNumber: number }> {
  const MAX_TRIES = 5;
  const { userId, examId, answers, moduleScores, ...head } = doc;

  /*
   * The result and its answers are ONE unit of work.
   *
   * They used to be two statements with nothing around them, so a failure on
   * the second left the attempt in the database with zero answers: it consumed
   * an attempt number, listed on the dashboard as a filed result, and opened an
   * empty review. The caller then reported "Server xətası baş verdi", so the
   * candidate retried — and the retry filed a SECOND attempt while the empty
   * first one stayed on their record.
   *
   * This is the one write in the system where a partial success loses a
   * candidate's work outright, which makes it the strongest case in the
   * codebase for an interactive transaction — see `lib/infra/db.ts` on why
   * `txDb()` is otherwise avoided.
   */
  const { db: tx, close } = txDb();
  try {
    for (let attemptTry = 0; attemptTry < MAX_TRIES; attemptTry++) {
      /*
       * The attempt number is chosen by the INSERT, not read first.
       *
       * `(user_id, exam_id, attempt_number)` is UNIQUE, so a sub-select for
       * max+1 evaluated inside the statement closes most of the race the old
       * read-then-write left open. Two submissions landing in the same instant
       * still collide on the index rather than both writing attempt 3, and the
       * retry below picks that up — the guarantee comes from the constraint,
       * exactly as it did from Mongo's unique index.
       */
      try {
        return await tx.transaction(async trx => {
          const [row] = await trx
            .insert(examResults)
            .values({
              userId, examId,
              examTitle: head.examTitle,
              examTag: head.examTag,
              examType: head.examType,
              startedAt: head.startedAt,
              completedAt: head.completedAt,
              durationSeconds: head.durationSeconds,
              totalQuestions: head.totalQuestions,
              score: String(head.score),
              overallBand: head.overallBand == null ? null : String(head.overallBand),
              totalScaled: head.totalScaled ?? null,
              rwScaled: head.rwScaled ?? null,
              mathScaled: head.mathScaled ?? null,
              moduleScores,
              attemptNumber: sql`(SELECT coalesce(max(r.attempt_number) + 1, 1) FROM exam_results r
                                   WHERE r.user_id = ${userId} AND r.exam_id = ${examId})`,
            })
            .returning({ id: examResults.id, attemptNumber: examResults.attemptNumber });

          if (answers.length > 0) {
            await trx
              .insert(examAnswers)
              .values(answers.map(a => toAnswerRow(row.id, a, snapshots.get(a.questionId))));
          }
          return row;
        });
      } catch (err) {
        if (isAttemptNumberCollision(err) && attemptTry < MAX_TRIES - 1) continue;
        throw err;
      }
    }
    throw new Error('Could not allocate an attempt number after repeated collisions');
  } finally {
    await close();
  }
}

/**
 * One answer as a row, including the snapshot of what was asked.
 *
 * `qStem`/`qOptions`/`qPassage` are copied at submit time, when the question is
 * guaranteed to exist. That is what makes a filed attempt reviewable for ever:
 * the review page renders these, never a join onto the live bank, so a later
 * re-import or deletion can no longer turn a real attempt into a page of
 * fabricated wrong answers.
 */
function toAnswerRow(resultId: string, a: AnswerRecord, q?: QuestionSnapshot) {
  return {
    resultId,
    questionId:       a.questionId,
    moduleIndex:      a.moduleIndex,
    userAnswer:       a.userAnswer,
    userAnswerText:   a.userAnswerText ?? '',
    correctIndex:     a.correctIndex,
    isCorrect:        a.isCorrect,
    marks:            a.marks ?? 1,
    earnedMarks:      a.earnedMarks ?? 0,
    timeSeconds:      a.timeSeconds ?? 0,
    writingScore:     a.writingScore == null ? null : String(a.writingScore),
    writingWordCount: a.writingWordCount ?? null,
    writingCriteria:  a.writingCriteria ?? null,
    aiFeedback:       a.aiFeedback ?? null,
    writingPending:   a.writingPending ?? false,
    qStem:            q?.stem ?? '',
    qOptions:         q?.options ?? [],
    qPassage:         q?.passage ?? '',
  };
}

type QuestionSnapshot = { stem: string; options: string[]; passage: string };

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

    // Validate the purchase before consuming an attempt number, so a failed
    // submission can't permanently burn one.
    if (!(await hasExamAccess(userId, examId))) return { error: 'Exam not purchased' };

    // Three independent reads, issued together: the exam definition, the
    // session clock, and the authoritative question set. In sequence they were
    // three round-trips stacked in front of the student's submission.
    //
    /*
     * `stem`, `options` and `passage` ARE selected here, deliberately, even
     * though grading does not need them.
     *
     * They are the snapshot written onto each answer row. Copying what was
     * asked at the moment the attempt is filed is what makes a result
     * reviewable for ever: the review page renders these rather than joining
     * onto the live bank, so a later re-import or deletion cannot turn a real
     * attempt into a page of fabricated wrong answers. That failure reached
     * 1,064 of 1,310 answers on ielts-academic-1 before the migration.
     *
     * It costs one heavier read per submission — submissions are rare and this
     * is the one moment the content is guaranteed to still exist. `rubric` is
     * still excluded; only the writing grader needs it, and it re-queries.
     */
    const [exam, session, questionDocs] = await Promise.all([
      getExamByIdAdmin(examId),
      db.select()
        .from(examSessions)
        .where(and(
          eq(examSessions.userId, userId),
          eq(examSessions.examId, examId),
          gt(examSessions.expiresAt, new Date()),
        ))
        .limit(1)
        .then(r => r[0] ?? null),
      db.select({
          _id:             questionsTable.id,
          stem:            questionsTable.stem,
          options:         questionsTable.options,
          passage:         questionsTable.passage,
          correctIndex:    questionsTable.correctIndex,
          moduleIndex:     questionsTable.moduleIndex,
          order:           questionsTable.order,
          type:            questionsTable.type,
          openAnswers:     questionsTable.openAnswers,
          correctMatching: questionsTable.correctMatching,
          writingTaskType: questionsTable.writingTaskType,
        })
        .from(questionsTable)
        .where(eq(questionsTable.examId, examId))
        .orderBy(asc(questionsTable.moduleIndex), asc(questionsTable.order)),
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
    const writingTaskTypeOf = (questionId: string) => metaById.get(questionId)?.writingTaskType ?? undefined;

    const moduleScores = buildModuleScores(exam.modules, answerRecords, typeOf);

    // The headline percentage is the mean of the SECTIONS (see `overallPercent`).
    // Writing modules are marked pending here and so are excluded until graded —
    // an ungraded essay never shows as a zero.
    const initialScore = overallPercent(moduleScores);
    const authentic = applyAuthenticScores(exam.type, exam.variant, exam.modules, moduleScores, answerRecords, typeOf, writingTaskTypeOf);

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
    }, new Map(questionDocs.map(q => [
      String(q._id),
      { stem: q.stem, options: q.options, passage: q.passage },
    ])));
    const attemptNumber = result.attemptNumber;

    // Keep the purchase counter in step for the admin views. Best-effort: the
    // result is already saved and must never be rolled back over this — but the
    // failure is still reported rather than swallowed, since a counter that
    // silently drifts from the real attempt count is a reporting bug.
    try {
      // `$max` semantics: only ever move the counter forward, so an
      // out-of-order write cannot walk it backwards.
      await db
        .update(purchases)
        .set({ attemptCount: sql`greatest(${purchases.attemptCount}, ${attemptNumber})` })
        .where(and(eq(purchases.userId, userId), eq(purchases.examId, examId)));
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
      await db
        .delete(examSessions)
        .where(and(eq(examSessions.userId, userId), eq(examSessions.examId, examId)));
      /*
       * Filing the result is what releases the listening tracks.
       *
       * The claim deliberately survives `restartExamSession` — that is what
       * stops "play, reload, start over" from handing the recording back. But
       * an attempt that has actually been submitted is over, and the next one
       * must start with the audio fresh, or unlimited attempts would only be
       * unlimited for candidates who never listened.
       */
      await db
        .delete(playedAudio)
        .where(and(eq(playedAudio.userId, userId), eq(playedAudio.examId, examId)));
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

    return { resultId: result.id, attemptNumber };
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
 * A filed attempt and its answers, loaded as plain objects for grading.
 *
 * `rowId` is carried on each answer so a graded essay can be written back to
 * its own row. It replaces the hydrated Mongoose document the grader used to
 * mutate in place — the same data, but with the write made explicit instead of
 * hidden behind `save()` and `markModified`.
 */
type GradableAnswer = AnswerRecord & {
  rowId: number;
  /** The prompt as it was at submit time — see `qStem`/`qPassage` on the row. */
  qStem: string;
  qPassage: string;
};

interface GradableResult {
  id: string;
  userId: string;
  examId: string;
  examType: string | null;
  attemptNumber: number;
  score: number;
  answers: GradableAnswer[];
}

async function loadGradable(where: SQL | undefined): Promise<GradableResult | null> {
  const [r] = await db.select().from(examResults).where(where).limit(1);
  if (!r) return null;
  const rows = await db
    .select()
    .from(examAnswers)
    .where(eq(examAnswers.resultId, r.id))
    .orderBy(asc(examAnswers.moduleIndex), asc(examAnswers.id));
  return {
    id: r.id,
    userId: r.userId,
    examId: r.examId,
    examType: r.examType,
    attemptNumber: r.attemptNumber,
    score: Number(r.score),
    answers: rows.map(a => ({
      rowId:            a.id,
      qStem:            a.qStem,
      qPassage:         a.qPassage,
      questionId:       a.questionId ?? '',
      moduleIndex:      a.moduleIndex,
      userAnswer:       a.userAnswer,
      userAnswerText:   a.userAnswerText,
      correctIndex:     a.correctIndex,
      isCorrect:        a.isCorrect,
      marks:            a.marks,
      earnedMarks:      a.earnedMarks,
      timeSeconds:      a.timeSeconds,
      writingScore:     a.writingScore == null ? undefined : Number(a.writingScore),
      writingWordCount: a.writingWordCount ?? undefined,
      writingCriteria:  a.writingCriteria ?? undefined,
      aiFeedback:       a.aiFeedback ?? undefined,
      writingPending:   a.writingPending,
    })),
  };
}

/**
 * Take exclusive ownership of this result's pending essays.
 *
 * A single-document conditional update, so the database decides the winner —
 * exactly as `markAudioPlayed` leans on a unique index rather than on a
 * read-then-write. Returns false when someone else holds a live claim, and the
 * caller then reports the essays as still pending, which is what they are.
 */
async function claimWritingGrade(resultId: string): Promise<boolean> {
  const staleBefore = new Date(Date.now() - WRITING_CLAIM_TTL_MS);
  // One conditional UPDATE ... RETURNING: the row comes back only if this
  // caller took the claim. No read-then-write for a second tab to slip through.
  const claimed = await db
    .update(examResults)
    .set({ writingGradingAt: new Date() })
    .where(and(
      eq(examResults.id, resultId),
      or(
        isNull(examResults.writingGradingAt),
        lte(examResults.writingGradingAt, staleBefore),
      ),
    ))
    .returning({ id: examResults.id });
  return claimed.length === 1;
}

/** Release the claim, whatever the outcome. Never throws into the caller. */
async function releaseWritingGrade(resultId: string): Promise<void> {
  try {
    await db
      .update(examResults)
      .set({ writingGradingAt: null })
      .where(eq(examResults.id, resultId));
  } catch (err) {
    // A stuck claim expires on its own via WRITING_CLAIM_TTL_MS, so this is
    // reported rather than retried — it must never mask a completed grading.
    void captureException(err, {
      tags: { action: 'releaseWritingGrade' },
      extra: { resultId },
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
  result: GradableResult,
): Promise<{ graded: number; pending: number }> {
  const records = result.answers;

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
  if (!(await claimWritingGrade(result.id))) {
    return { graded: 0, pending: records.filter(r => r.writingPending).length };
  }

  try {
    return await runWritingGrade(result, records);
  } finally {
    await releaseWritingGrade(result.id);
  }
}

/** The grading pass itself. Only ever called with the claim held. */
async function runWritingGrade(
  result: GradableResult,
  records: GradableAnswer[],
): Promise<{ graded: number; pending: number }> {
  const startedAt = Date.now();
  const exam = await getExamByIdAdmin(result.examId);
  if (!exam) return { graded: 0, pending: 0 };

  const questionDocs = await db
    .select({
      _id:             questionsTable.id,
      type:            questionsTable.type,
      stem:            questionsTable.stem,
      passage:         questionsTable.passage,
      writingTaskType: questionsTable.writingTaskType,
      rubric:          questionsTable.rubric,
    })
    .from(questionsTable)
    .where(eq(questionsTable.examId, result.examId));
  const qmap = new Map(questionDocs.map(q => [String(q._id), q]));
  const typeOf = (questionId: string) => qmap.get(questionId)?.type;
  const writingTaskTypeOf = (questionId: string) => qmap.get(questionId)?.writingTaskType ?? undefined;

  /*
   * Keyed on the ROW's own flag, not on the live question's type.
   *
   * `writingPending` is only ever set on a writing record (see `gradeAnswers`),
   * so it is sufficient on its own — and it is the only signal that survives
   * the question being deleted or re-imported. Requiring `typeOf(...)` to
   * resolve meant an essay whose question had gone was never picked up: it
   * could not be graded, could not be cleared, and sat in the admin queue for
   * ever while the student was shown "yoxlanılır…" indefinitely.
   */
  const allPending = records.filter(r => r.writingPending);
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
      /*
       * The live question first, the attempt's own snapshot as the fallback.
       *
       * `saveExamResult` copies what was asked onto every answer row, so a
       * deleted or re-imported question no longer costs the grader its prompt —
       * it grades exactly what the candidate was shown.
       */
      prompt: [q?.passage || rec.qPassage, q?.stem || rec.qStem].filter(Boolean).join('\n\n'),
      rubric: q?.rubric,
      taskType: q?.writingTaskType ?? undefined,
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
  const auth = applyAuthenticScores(exam.type, exam.variant, exam.modules, modScores, records, typeOf, writingTaskTypeOf);

  /*
   * Write back explicitly, in two parts.
   *
   * The Mongoose version mutated a hydrated document and called `save()`, which
   * meant the answers rode along invisibly — and needed `markModified` to
   * persist at all, because a mutation inside a nested array is not something
   * the ODM can see. Answers are rows now, so each graded essay is its own
   * UPDATE and nothing depends on remembering to flag a subdocument dirty.
   *
   * Only the essays this pass touched are written; the rest of the attempt is
   * left exactly as it was filed.
   */
  result.score = overallPercent(modScores);
  result.examType = result.examType ?? exam.type;

  await db
    .update(examResults)
    .set({
      score:        String(result.score),
      moduleScores: modScores,
      examType:     result.examType,
      overallBand:  auth.overallBand == null ? null : String(auth.overallBand),
      totalScaled:  auth.totalScaled ?? null,
      rwScaled:     auth.rwScaled ?? null,
      mathScaled:   auth.mathScaled ?? null,
    })
    .where(eq(examResults.id, result.id));

  await Promise.all(allPending.map(rec =>
    db
      .update(examAnswers)
      .set({
        writingPending:   rec.writingPending ?? false,
        writingScore:     rec.writingScore == null ? null : String(rec.writingScore),
        writingWordCount: rec.writingWordCount ?? null,
        writingCriteria:  rec.writingCriteria ?? null,
        aiFeedback:       rec.aiFeedback ?? null,
      })
      .where(eq(examAnswers.id, rec.rowId)),
  ));

  const stillPending = records.filter(r => r.writingPending).length;
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
  /*
   * An essay that stays pending is the one failure nobody sees.
   *
   * The student is shown "yoxlanılır…" indefinitely, `ReviewClient` swallows
   * the error by design so as not to alarm them, and their band is computed
   * from the sections that did grade. Nothing else reports it — the analytics
   * event below is a metric, and metrics need someone to build an alert.
   * Raising it through the error channel puts it where an outage is already
   * watched, so a lapsed OpenAI quota surfaces on its own.
   */
  if (stillPending > 0) {
    void captureMessage('Writing still pending after grading', {
      level: 'warning',
      extra: {
        userId: result.userId,
        examId: result.examId,
        attemptNumber: result.attemptNumber,
        stillPending,
        graded,
      },
    });
  }

  void trackEvent(ANALYTICS_EVENTS.writingGraded, result.userId, {
    examId:       result.examId,
    examType:     exam.type,
    attemptNumber: result.attemptNumber,
    essays:       allPending.length,
    graded,
    stillPending,
    bands:        records
      .filter(r => typeof r.writingScore === 'number')
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
    const result = await loadGradable(and(
      eq(examResults.userId, userId),
      eq(examResults.examId, examId),
      eq(examResults.attemptNumber, attemptNumber),
    ));
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
  const { userId: adminId } = await auth();
  if (adminId && await limited('admin', 'writing-queue', adminId)) return [];
  /*
   * The writing queue, as one grouped join.
   *
   * In Mongo this filtered `{'answers.writingPending': true}` across a multikey
   * array inside the heaviest documents in the system, and needed a partial
   * compound index plus a page of reasoning about why a multikey index cannot
   * serve a sorted stream. Answers are rows now, so it is an ordinary join
   * against a partial index on a boolean column — and it reads only the pending
   * answers rather than every answer of every matching attempt.
   */
  const rows = await db
    .select({
      resultId:       examResults.id,
      userId:         examResults.userId,
      examId:         examResults.examId,
      examTitle:      examResults.examTitle,
      examTag:        examResults.examTag,
      attemptNumber:  examResults.attemptNumber,
      completedAt:    examResults.completedAt,
      userAnswerText: examAnswers.userAnswerText,
    })
    .from(examAnswers)
    .innerJoin(examResults, eq(examResults.id, examAnswers.resultId))
    .where(eq(examAnswers.writingPending, true))
    .orderBy(desc(examResults.completedAt))
    .limit(1000);

  const byResult = new Map<string, WritingEvalProblem>();
  for (const r of rows) {
    let entry = byResult.get(r.resultId);
    if (!entry) {
      entry = {
        resultId:      r.resultId,
        userId:        r.userId,
        examId:        r.examId,
        examTitle:     r.examTitle,
        examTag:       r.examTag,
        attemptNumber: r.attemptNumber,
        completedAt:   r.completedAt.toISOString(),
        completedAtLabel: r.completedAt.toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
        pendingCount:  0,
        wordCounts:    [],
      };
      byResult.set(r.resultId, entry);
    }
    entry.pendingCount++;
    entry.wordCounts.push((r.userAnswerText ?? '').trim().split(/\s+/).filter(Boolean).length);
  }
  return [...byResult.values()].slice(0, 200);
}

/** Admin-only: manually (re-)grade the pending writing on one result. */
export async function adminRegradeResult(
  resultId: string,
): Promise<{ ok: true; graded: number; pending: number } | { error: string }> {
  if (!(await checkRole('admin'))) return { error: 'Forbidden' };
  // Each call can fan out to several paid grader requests.
  const { userId: adminId } = await auth();
  if (adminId && await limited('expensive', 'regrade-one', adminId)) {
    return { error: 'Çox tez-tez yenidən qiymətləndirdiniz. Bir az gözləyin.' };
  }
  if (!validResultId(resultId)) return { error: 'Yanlış nəticə ID.' };
  try {
    const result = await loadGradable(eq(examResults.id, resultId));
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
  // Up to 25 results × several essays each, all billed. The tightest budget
  // in the codebase, and the one most worth having.
  const { userId: sweeperId } = await auth();
  if (sweeperId && await limited('expensive', 'regrade-all', sweeperId)) {
    return { error: 'Çox tez-tez işlədildi. Bir az gözləyin.' };
  }
  try {
    // Oldest first: a sweep bounded by time should clear the longest-waiting
    // essays, not whichever happen to sort first.
    const pendingIds = await db
      .selectDistinct({ id: examResults.id, completedAt: examResults.completedAt })
      .from(examAnswers)
      .innerJoin(examResults, eq(examResults.id, examAnswers.resultId))
      .where(eq(examAnswers.writingPending, true))
      .orderBy(asc(examResults.completedAt))
      .limit(REGRADE_MAX_RESULTS);

    const docs = (await Promise.all(
      pendingIds.map(p => loadGradable(eq(examResults.id, p.id))),
    )).filter((r): r is GradableResult => r !== null);

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
