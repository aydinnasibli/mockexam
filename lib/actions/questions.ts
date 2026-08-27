'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import { and, asc, eq, gt, inArray, lt, sql } from 'drizzle-orm';
import { db, txDb } from '@/lib/infra/db';
import { questions as questionsTable, examSessions, examResults } from '@/lib/db/schema';
import type { QuestionType, WritingTaskType } from '@/lib/domain/question-types';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { isModuleOpen, totalScheduledSeconds } from '@/lib/domain/exam-timing';
import { validateQuestion } from '@/lib/domain/question-validation';
import { requireAdminAction } from '@/lib/infra/admin';
import {
  isAllowedMediaUrl,
  INVALID_IMAGE_URL_MESSAGE,
  INVALID_AUDIO_URL_MESSAGE,
} from '@/lib/shared/media';
import { captureException } from '@/lib/infra/observability';
import { hasExamAccess } from '@/lib/db/entitlements';
import { isRateLimited, limited } from '@/lib/infra/rate-limit';
import { syncExamTotals, revalidateExam } from '@/lib/db/exam-totals';

export interface QuestionData {
  id: string;
  examId: string;
  moduleIndex: number;
  order: number;
  type: QuestionType;
  /** Questions sharing this within a module render on one screen. See IQuestion. */
  blockId: string;
  passage: string;
  audioUrl?: string;
  imageUrl?: string;
  stem: string;
  options: string[];
  openAnswers?: string[];
  correctIndex: number;
  matchItems?: string[];
  correctMatching?: number[];
  explanation: string;
  writingTaskType?: WritingTaskType;
  minWords?: number;
  maxWords?: number;
  rubric?: string;
}

/**
 * The skeleton of the paper: enough to number the questions, group them into
 * screens, draw the navigator and know what "answered" means — and NOT ONE WORD
 * of the content.
 *
 * The player used to receive every question in full at page load, so the whole
 * paper was sitting in the RSC payload from the first second. Per-module timing
 * would clamp navigation to the open section, but a candidate in Listening
 * could still read every Reading passage straight out of devtools. Clamping
 * navigation is a courtesy; withholding the text is the enforcement.
 */
export interface SessionQuestionMeta {
  id: string;
  examId: string;
  moduleIndex: number;
  order: number;
  type: QuestionType;
  /** Questions sharing this within a module render on one screen. See IQuestion. */
  blockId: string;
  /**
   * Whether a recording hangs off this question — NOT the URL.
   *
   * The briefing screen warns that a section is listening-based before the exam
   * starts, which is a fact about the paper the candidate has bought, not a
   * piece of its content. The URL itself still waits for the module to open.
   */
  hasAudio: boolean;
}

/** The renderable half, handed over one module at a time as its clock opens. */
export interface SessionQuestionContent {
  id: string;
  passage: string;
  audioUrl?: string;
  imageUrl?: string;
  stem: string;
  options: string[];
  matchItems?: string[];
  writingTaskType?: WritingTaskType;
  minWords?: number;
  maxWords?: number;
  rubric?: string;
}

/**
 * A question the player can actually draw: the skeleton with its content merged
 * in. Built client-side as each module opens; never fetched whole.
 *
 * Correct answers are absent from BOTH halves — `correctIndex`,
 * `correctMatching`, `openAnswers` and `explanation` reach the browser only
 * through `getExamQuestionsForReview`, after an attempt has been submitted.
 */
export type SessionQuestion = SessionQuestionMeta & SessionQuestionContent;

async function requireAdmin() {
  await requireAdminAction('questions', 'admin', 'Unauthorized');
}

/**
 * Bounds the id before it reaches a query.
 *
 * Was `mongoose.isValidObjectId`. Question ids are now plain `text`: rows
 * carried over from Mongo keep their 24-character ObjectId hex, and rows
 * created since take a uuid. Both are accepted; anything else is rejected here
 * rather than becoming a query for a row that cannot exist.
 */
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validId(id: string): boolean {
  return OBJECT_ID_RE.test(id) || UUID_RE.test(id);
}

/**
 * A question row as the admin and review screens want it.
 *
 * Postgres reports an absent nullable column as `null`; every interface in this
 * codebase spells that `undefined`. Converting once here keeps the distinction
 * from leaking into two near-identical mappers that then drift.
 */
function toQuestionData(d: typeof questionsTable.$inferSelect): QuestionData {
  return {
    id:              d.id,
    examId:          d.examId,
    moduleIndex:     d.moduleIndex,
    order:           d.order,
    type:            d.type,
    blockId:         d.blockId,
    passage:         d.passage,
    audioUrl:        d.audioUrl,
    imageUrl:        d.imageUrl,
    stem:            d.stem,
    options:         d.options,
    openAnswers:     d.openAnswers,
    correctIndex:    d.correctIndex,
    matchItems:      d.matchItems,
    correctMatching: d.correctMatching,
    explanation:     d.explanation,
    writingTaskType: d.writingTaskType ?? undefined,
    minWords:        d.minWords ?? undefined,
    maxWords:        d.maxWords ?? undefined,
    rubric:          d.rubric,
  };
}

/**
 * Renumber one module's questions to 0..n-1 in the given id order.
 *
 * Done in two passes inside a transaction, and it has to be.
 * `(exam_id, module_index, order)` is UNIQUE — that key is what lets the JSON
 * importer upsert instead of delete-and-reinsert, which is the fix for the
 * orphaned-question-id bug. But it also means a permutation cannot be written
 * row by row: assigning position 1 to a question while the current occupant of
 * position 1 has not moved yet violates the index mid-statement, whichever
 * order the rows are processed in.
 *
 * Pass one parks every row in negative space (`order → -order - 1`), which is
 * collision-free because the originals were unique. Pass two writes the final
 * positions into the now-empty non-negative range. A deferrable constraint
 * would express this more directly, but Postgres cannot use a deferrable
 * constraint as an `ON CONFLICT` arbiter, and the importer needs that far more
 * than this needs the shortcut.
 *
 * Interactive because the two passes must not be observable apart — this is one
 * of the few places `txDb()` is the right tool rather than the habitual one.
 */
async function repackModuleOrders(
  examId: string,
  moduleIndex: number,
  orderedIds: string[],
): Promise<void> {
  if (orderedIds.length === 0) return;
  const { db: tx, close } = txDb();
  try {
    await tx.transaction(async trx => {
      const scope = and(
        eq(questionsTable.examId, examId),
        eq(questionsTable.moduleIndex, moduleIndex),
      );
      await trx
        .update(questionsTable)
        .set({ order: sql`-${questionsTable.order} - 1` })
        .where(and(scope, inArray(questionsTable.id, orderedIds)));

      for (const [i, id] of orderedIds.entries()) {
        await trx
          .update(questionsTable)
          .set({ order: i })
          .where(and(scope, eq(questionsTable.id, id)));
      }
    });
  } finally {
    await close();
  }
}

/**
 * The paper's skeleton — every question's identity, module, order and block,
 * and nothing that can be read.
 *
 * This is what the session page ships. It is deliberately cheap and deliberately
 * empty: numbering, screen grouping and the navigator all work from it, while
 * the passages, stems and options arrive module by module from
 * `getModuleQuestionContent` as each section's clock opens.
 */
export async function getSessionQuestionMeta(examId: string): Promise<SessionQuestionMeta[]> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  // Ships the identity, module and block of every question in the paper. Cheap
  // per call, but it is the map of the whole exam, so it is not unmetered.
  if (await limited('readHeavy', 'meta', userId)) throw new Error('Rate limited');

  if (!(await hasExamAccess(userId, examId))) throw new Error('Exam not purchased');

  /*
   * Questions pointing at a module that no longer exists are EXCLUDED.
   *
   * `updateExam` replaces the module array wholesale, so shortening it strands
   * every question whose `moduleIndex` fell off the end. They are never
   * scheduled and never reachable — but they came back from this query, so they
   * still counted in `questions.length`, in the flat one-based numbering the
   * candidate sees, and in the progress-bar denominator. The paper announced
   * "45 sual" and stopped at 38.
   *
   * `updateExam` now refuses an edit that would strand questions; this keeps
   * any already stranded by an earlier edit out of a running exam.
   */
  // `getExamByIdAdmin` is wrapped in React `cache()` and the session page has
  // already resolved this exam on the same request, so this costs nothing.
  const exam = await getExamByIdAdmin(examId);
  const moduleCount = exam?.modules.length ?? 0;

  /*
   * The SESSION's frozen schedule decides which modules count, not the live bank.
   *
   * The schedule is fixed when the attempt begins — deliberately, so an admin
   * editing an exam cannot move a running candidate's deadlines. But this query
   * re-reads the bank on every page load, so a module that was EMPTY when the
   * attempt started (and was therefore skipped by `buildModuleSchedule`) and
   * then gained questions mid-attempt would, after one reload, join the flat
   * numbering, the progress denominator and the navigator grid — while having
   * no window in the schedule, so it could never be opened, and grading as
   * unanswered at submit. The candidate would be shown a total they could not
   * reach and marked down for it.
   *
   * Restricting the paper to the modules the schedule actually contains keeps
   * what the candidate sees identical to what they were signed up for. Without
   * a session — the pre-start briefing — the live bank is the right answer.
   */
  const [session] = await db
    .select({ moduleSchedule: examSessions.moduleSchedule })
    .from(examSessions)
    .where(and(
      eq(examSessions.userId, userId),
      eq(examSessions.examId, examId),
      gt(examSessions.expiresAt, new Date()),
    ))
    .limit(1);
  const scheduled = session?.moduleSchedule;
  const scheduledModules = Array.isArray(scheduled) && scheduled.length > 0
    ? new Set(scheduled.map(w => w.moduleIndex))
    : null;

  // Only the skeleton columns are selected — no stem, no options, no passage.
  // Withholding the text IS the enforcement; clamping navigation is a courtesy.
  const docs = await db
    .select({
      id:          questionsTable.id,
      examId:      questionsTable.examId,
      moduleIndex: questionsTable.moduleIndex,
      order:       questionsTable.order,
      type:        questionsTable.type,
      blockId:     questionsTable.blockId,
      audioUrl:    questionsTable.audioUrl,
    })
    .from(questionsTable)
    .where(and(
      eq(questionsTable.examId, examId),
      lt(questionsTable.moduleIndex, moduleCount),
    ))
    .orderBy(asc(questionsTable.moduleIndex), asc(questionsTable.order));

  return docs
    .filter(d => !scheduledModules || scheduledModules.has(d.moduleIndex))
    .map(d => ({
      id:          d.id,
      examId:      d.examId,
      moduleIndex: d.moduleIndex,
      order:       d.order,
      type:        d.type as QuestionType,
      blockId:     d.blockId ?? '',
      hasAudio:    !!d.audioUrl,
    }));
}

/**
 * The renderable content of ONE module, released only once its clock has opened.
 *
 * The gate is the session's own schedule — the same windows the countdown is
 * derived from — so "has this section started?" has exactly one answer and the
 * client cannot be the one giving it. Without a session there is no attempt and
 * nothing to release; a session predating per-module timing has no schedule to
 * check, so it keeps the old behaviour of the whole paper being reachable.
 *
 * A module stays readable after its time expires. The candidate has already
 * seen it, and withholding it afterwards would only break the screen they are
 * still looking at as the clock ticks over.
 */
export async function getModuleQuestionContent(
  examId: string,
  moduleIndex: number,
): Promise<SessionQuestionContent[] | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };
  if (!Number.isInteger(moduleIndex) || moduleIndex < 0) return { error: 'Invalid module' };

  // A legitimate player asks once per module — a handful of calls per attempt.
  // The ceiling is set well above the client's 3-second failure retry so a
  // transient server error cannot escalate into a rate-limit lockout.
  if (await isRateLimited(`content:${userId}`, 120, 60_000)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz.' };
  }

  try {
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    const [session] = await db
      .select({ startedAt: examSessions.startedAt, moduleSchedule: examSessions.moduleSchedule })
      .from(examSessions)
      .where(and(
        eq(examSessions.userId, userId),
        eq(examSessions.examId, examId),
        gt(examSessions.expiresAt, new Date()),
      ))
      .limit(1);
    if (!session) return { error: 'İmtahan başlamayıb.' };

    const schedule = session.moduleSchedule;
    if (Array.isArray(schedule) && schedule.length > 0) {
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);

      /*
       * A spent paper is released NOTHING further.
       *
       * `isModuleOpen` only asks whether a module's window has begun, and once
       * the clock is past every window that is true of all of them — so on its
       * own this gate opens the entire paper the moment time runs out. That is
       * invisible while auto-submit works and catastrophic when it does not:
       * a failed submission left the candidate able to fetch and answer
       * sections they had never been shown. The clock closing the paper has to
       * close this too.
       */
      if (elapsed >= totalScheduledSeconds(schedule)) {
        return { error: 'İmtahan vaxtı bitib.' };
      }

      if (!isModuleOpen(schedule, moduleIndex, elapsed)) {
        return { error: 'Bu bölmə hələ açılmayıb.' };
      }
    }

    // Still no answer key: correctIndex, openAnswers, correctMatching and
    // explanation are all withheld from a module the candidate is sitting.
    const docs = await db
      .select({
        id:              questionsTable.id,
        passage:         questionsTable.passage,
        audioUrl:        questionsTable.audioUrl,
        imageUrl:        questionsTable.imageUrl,
        stem:            questionsTable.stem,
        options:         questionsTable.options,
        matchItems:      questionsTable.matchItems,
        writingTaskType: questionsTable.writingTaskType,
        minWords:        questionsTable.minWords,
        maxWords:        questionsTable.maxWords,
        rubric:          questionsTable.rubric,
      })
      .from(questionsTable)
      .where(and(
        eq(questionsTable.examId, examId),
        eq(questionsTable.moduleIndex, moduleIndex),
      ))
      .orderBy(asc(questionsTable.order));

    return docs.map(d => ({
      id:              d.id,
      passage:         d.passage ?? '',
      audioUrl:        d.audioUrl ?? '',
      imageUrl:        d.imageUrl ?? '',
      stem:            d.stem,
      options:         d.options ?? [],
      matchItems:      d.matchItems ?? [],
      writingTaskType: d.writingTaskType as WritingTaskType | undefined,
      minWords:        d.minWords ?? undefined,
      maxWords:        d.maxWords ?? undefined,
      rubric:          d.rubric ?? '',
    }));
  } catch (err) {
    void captureException(err, { tags: { action: 'getModuleQuestionContent' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

/** Fetch full question data (with correct answers) for a user who has completed the exam — used by the review page. */
export async function getExamQuestionsForReview(
  examId: string,
  attemptNumber: number,
): Promise<QuestionData[]> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) throw new Error('Invalid attempt');

  /*
   * The only endpoint that returns correct answers, explanations and the full
   * question text — the answer key for a paper this candidate can retake. It is
   * already gated on having filed this specific attempt, but a filed attempt
   * should not double as an unmetered scraping endpoint for the bank.
   */
  if (await limited('readHeavy', 'review', userId)) throw new Error('Rate limited');

  if (!(await hasExamAccess(userId, examId))) throw new Error('Exam not purchased');

  /*
   * Scoped to the attempt being reviewed, not to "any attempt exists".
   *
   * This is a Server Action, so it is a public POST that returns `correctIndex`,
   * `openAnswers` and `correctMatching` for the whole bank. Requiring the
   * specific attempt makes the contract match its only caller — the review page
   * for that attempt — rather than leaving the answer key readable for an exam
   * on the strength of any submission at all.
   *
   * NOTE: this does not stop a candidate reviewing attempt 1 and then sitting
   * attempt 2 with the key in hand. Nothing caps attempts — `Purchase.attemptCount`
   * is written and displayed but never enforced — and whether retakes should be
   * limited, or the key withheld while retakes remain, is a product decision.
   */
  const [attempt] = await db
    .select({ id: examResults.id })
    .from(examResults)
    .where(and(
      eq(examResults.userId, userId),
      eq(examResults.examId, examId),
      eq(examResults.attemptNumber, attemptNumber),
    ))
    .limit(1);
  if (!attempt) throw new Error('No such attempt');

  // Scoped to the live module list for the same reason `getSessionQuestionMeta`
  // is: a question stranded by a later module edit was never sat, and showing
  // it in the review would present work the candidate never had a chance to do.
  const reviewExam = await getExamByIdAdmin(examId);
  const docs = await db
    .select()
    .from(questionsTable)
    .where(and(
      eq(questionsTable.examId, examId),
      lt(questionsTable.moduleIndex, reviewExam?.modules.length ?? 0),
    ))
    .orderBy(asc(questionsTable.moduleIndex), asc(questionsTable.order));
  return docs.map(toQuestionData);
}

export async function getExamQuestions(examId: string): Promise<QuestionData[]> {
  await requireAdmin();
  const docs = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, examId))
    .orderBy(asc(questionsTable.moduleIndex), asc(questionsTable.order));
  return docs.map(toQuestionData);
}

export async function addQuestion(data: {
  examId: string;
  moduleIndex: number;
  type: QuestionType;
  /**
   * Groups this question onto one screen with its neighbours. Required for a
   * block-layout module — a question added without it renders as its own
   * isolated screen, which against an unpausable single-play recording is the
   * exact failure `exam-blocks.ts` exists to prevent. Only the JSON importer
   * could set it before, so anything added through the admin panel silently
   * broke the module it was added to.
   */
  blockId?: string;
  passage: string;
  audioUrl?: string;
  imageUrl?: string;
  stem: string;
  options: string[];
  openAnswers?: string[];
  correctIndex: number;
  matchItems?: string[];
  correctMatching?: number[];
  explanation: string;
  writingTaskType?: WritingTaskType;
  minWords?: number;
  maxWords?: number;
  rubric?: string;
}): Promise<{ id: string } | { error: string }> {
  try {
    await requireAdmin();
    if (!isAllowedMediaUrl(data.imageUrl)) return { error: INVALID_IMAGE_URL_MESSAGE };
    if (!isAllowedMediaUrl(data.audioUrl)) return { error: INVALID_AUDIO_URL_MESSAGE };
    // The same gradability rules the JSON importer enforces. Without them this
    // path could store an `open` question with no accepted answers or a
    // `matching` question with a short key — questions that render, count in
    // the denominator, and can never earn their marks.
    const invalid = validateQuestion(data);
    if (invalid) return { error: invalid };
    /*
     * The new question's position is chosen by the INSERT itself.
     *
     * The old path counted the module's questions and then inserted at that
     * number — a read-then-write two admins could both win, producing a
     * duplicate `order`. The sub-select makes the choice part of the same
     * statement, and the UNIQUE (exam_id, module_index, order) index is the
     * backstop if two inserts still race.
     */
    const [doc] = await db
      .insert(questionsTable)
      .values({
        ...data,
        order: sql`(SELECT coalesce(max(q."order") + 1, 0) FROM questions q
                     WHERE q.exam_id = ${data.examId} AND q.module_index = ${data.moduleIndex})`,
      })
      .returning({ id: questionsTable.id });
    // The bank changed, so the exam's advertised totals did too.
    await syncExamTotals(data.examId);
    revalidatePath(`/admin/exams/${data.examId}/questions`);
    // The bank changed, so the catalog AND this exam's detail page are stale.
    revalidateExam(data.examId);
    return { id: doc.id };
  } catch (err) {
    void captureException(err, { tags: { action: 'addQuestion' } });
    return { error: 'Server xətası.' };
  }
}

export async function updateQuestion(
  id: string,
  data: Partial<{
    type: QuestionType;
    /** See `addQuestion`. Omitted keys leave the stored value untouched. */
    blockId: string;
    passage: string;
    audioUrl?: string;
    imageUrl?: string;
    stem: string;
    options: string[];
    openAnswers?: string[];
    correctIndex: number;
    matchItems?: string[];
    correctMatching?: number[];
    explanation: string;
    writingTaskType?: WritingTaskType;
    minWords?: number;
    maxWords?: number;
    rubric?: string;
  }>
): Promise<{ ok: true } | { error: string }> {
  if (!validId(id)) return { error: 'Invalid question ID' };
  try {
    await requireAdmin();
    if (!isAllowedMediaUrl(data.imageUrl)) return { error: INVALID_IMAGE_URL_MESSAGE };
    if (!isAllowedMediaUrl(data.audioUrl)) return { error: INVALID_AUDIO_URL_MESSAGE };
    // Validate the row as it WILL BE, not as the patch describes it: a partial
    // update that only changes `type` still has to leave a gradable question
    // behind, and the fields deciding that may be untouched ones.
    const [existing] = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.id, id))
      .limit(1);
    if (!existing) return { error: 'Not found' };
    const invalid = validateQuestion({ ...toQuestionData(existing), ...data });
    if (invalid) return { error: invalid };

    // Undefined keys would otherwise be written as NULL, turning "leave this
    // alone" into "clear this". Mongoose's $set ignored them; SQL does not.
    const patch = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );

    // The enum values `runValidators` used to police are now CHECK constraints,
    // so an out-of-range `type` or `writingTaskType` is refused by the database
    // whichever path writes it.
    const [doc] = await db
      .update(questionsTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(questionsTable.id, id))
      .returning({ examId: questionsTable.examId });
    if (!doc) return { error: 'Not found' };
    revalidatePath(`/admin/exams/${doc.examId}/questions`);
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'updateQuestion' } });
    return { error: 'Server xətası.' };
  }
}

export async function deleteQuestion(id: string): Promise<{ ok: true } | { error: string }> {
  if (!validId(id)) return { error: 'Invalid question ID' };
  try {
    await requireAdmin();
    const [doc] = await db
      .delete(questionsTable)
      .where(eq(questionsTable.id, id))
      .returning({ examId: questionsTable.examId, moduleIndex: questionsTable.moduleIndex });
    if (!doc) return { error: 'Not found' };

    // Close the gap the delete left. Sequential and transactional rather than
    // the old Promise.all: with a UNIQUE order per module, concurrent renumbers
    // collide with each other.
    const remaining = await db
      .select({ id: questionsTable.id })
      .from(questionsTable)
      .where(and(
        eq(questionsTable.examId, doc.examId),
        eq(questionsTable.moduleIndex, doc.moduleIndex),
      ))
      .orderBy(asc(questionsTable.order));
    await repackModuleOrders(doc.examId, doc.moduleIndex, remaining.map(q => q.id));

    await syncExamTotals(doc.examId);
    revalidatePath(`/admin/exams/${doc.examId}/questions`);
    revalidateExam(doc.examId);
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'deleteQuestion' } });
    return { error: 'Server xətası.' };
  }
}

/** Ceiling on one module's bank; the importer caps a whole paper at 500. */
const MAX_MODULE_QUESTIONS = 500;

export async function reorderQuestions(
  examId: string,
  moduleIndex: number,
  orderedIds: string[]
): Promise<{ ok: true } | { error: string }> {
  if (!Array.isArray(orderedIds)) return { error: 'Invalid question list' };
  if (orderedIds.length > MAX_MODULE_QUESTIONS) return { error: 'Çox sayda sual göndərildi.' };
  if (orderedIds.some(id => !validId(id))) return { error: 'Invalid question ID in list' };
  if (new Set(orderedIds).size !== orderedIds.length) return { error: 'Təkrarlanan sual ID.' };
  try {
    await requireAdmin();

    /*
     * The list must be a PERMUTATION of the module, not a subset.
     *
     * `repackModuleOrders` parks the listed rows in negative space and then
     * writes 0..n-1 back. Any row it was not given keeps its original
     * non-negative `order`, so a partial list collides with it on
     * `questions_slot_key` and the transaction aborts — surfacing to the admin
     * as a bare "Server xətası" for what is really a malformed request. Saying
     * so up front also stops a stale client silently renumbering a module it
     * has an out-of-date view of.
     */
    const existing = await db
      .select({ id: questionsTable.id })
      .from(questionsTable)
      .where(and(
        eq(questionsTable.examId, examId),
        eq(questionsTable.moduleIndex, moduleIndex),
      ));
    const inModule = new Set(existing.map(q => q.id));
    if (orderedIds.length !== inModule.size || orderedIds.some(id => !inModule.has(id))) {
      return {
        error: 'Sual siyahısı köhnəlib — səhifəni yeniləyib yenidən cəhd edin.',
      };
    }

    // Scoped to the exam and module being reordered, so an id belonging to a
    // different exam cannot have its `order` rewritten by passing it in here.
    await repackModuleOrders(examId, moduleIndex, orderedIds);
    revalidatePath(`/admin/exams/${examId}/questions`);
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'reorderQuestions' } });
    return { error: 'Server xətası.' };
  }
}
