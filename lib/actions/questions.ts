'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@clerk/nextjs/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/infra/mongodb';
import QuestionModel, { type QuestionType, type WritingTaskType } from '@/lib/models/Question';
import ExamResult from '@/lib/models/ExamResult';
import ExamSessionModel from '@/lib/models/ExamSession';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { isModuleOpen, totalScheduledSeconds } from '@/lib/domain/exam-timing';
import { validateQuestion } from '@/lib/domain/question-validation';
import { checkRole } from '@/lib/infra/admin';
import {
  isAllowedMediaUrl,
  INVALID_IMAGE_URL_MESSAGE,
  INVALID_AUDIO_URL_MESSAGE,
} from '@/lib/shared/media';
import { captureException } from '@/lib/infra/observability';
import { hasExamAccess } from '@/lib/db/entitlements';
import { isRateLimited } from '@/lib/infra/rate-limit';
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
  if (!(await checkRole('admin'))) throw new Error('Unauthorized');
}

function validId(id: string): boolean {
  return mongoose.isValidObjectId(id);
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

  await dbConnect();
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
  const session = await ExamSessionModel.findOne({ userId, examId })
    .select('moduleSchedule')
    .lean();
  const scheduled = session?.moduleSchedule;
  const scheduledModules = Array.isArray(scheduled) && scheduled.length > 0
    ? new Set(scheduled.map(w => w.moduleIndex))
    : null;

  const docs = await QuestionModel.find({ examId, moduleIndex: { $lt: moduleCount } })
    .select('_id examId moduleIndex order type blockId audioUrl')
    .sort({ moduleIndex: 1, order: 1 })
    .lean();

  return docs
    .filter(d => !scheduledModules || scheduledModules.has(d.moduleIndex))
    .map(d => ({
      id:          String(d._id),
      examId:      d.examId,
      moduleIndex: d.moduleIndex,
      order:       d.order,
      type:        d.type,
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
    await dbConnect();
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    const session = await ExamSessionModel.findOne({ userId, examId })
      .select('startedAt moduleSchedule')
      .lean();
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

    const docs = await QuestionModel.find({ examId, moduleIndex })
      .select('_id passage audioUrl imageUrl stem options matchItems writingTaskType minWords maxWords rubric')
      .sort({ order: 1 })
      .lean();

    return docs.map(d => ({
      id:              String(d._id),
      passage:         d.passage ?? '',
      audioUrl:        d.audioUrl ?? '',
      imageUrl:        d.imageUrl ?? '',
      stem:            d.stem,
      options:         d.options ?? [],
      matchItems:      d.matchItems ?? [],
      writingTaskType: d.writingTaskType,
      minWords:        d.minWords,
      maxWords:        d.maxWords,
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

  await dbConnect();
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
  const attempt = await ExamResult.exists({ userId, examId, attemptNumber });
  if (!attempt) throw new Error('No such attempt');

  // Scoped to the live module list for the same reason `getSessionQuestionMeta`
  // is: a question stranded by a later module edit was never sat, and showing
  // it in the review would present work the candidate never had a chance to do.
  const reviewExam = await getExamByIdAdmin(examId);
  const docs = await QuestionModel.find({ examId, moduleIndex: { $lt: reviewExam?.modules.length ?? 0 } })
    .sort({ moduleIndex: 1, order: 1 })
    .lean();
  return docs.map(d => ({
    id:              String(d._id),
    examId:          d.examId,
    moduleIndex:     d.moduleIndex,
    order:           d.order,
    type:            d.type,
    blockId:         d.blockId ?? '',
    passage:         d.passage ?? '',
    audioUrl:        d.audioUrl ?? '',
    imageUrl:        d.imageUrl ?? '',
    stem:            d.stem,
    options:         d.options ?? [],
    openAnswers:     d.openAnswers ?? [],
    correctIndex:    d.correctIndex ?? -1,
    matchItems:      d.matchItems ?? [],
    correctMatching: d.correctMatching ?? [],
    explanation:     d.explanation ?? '',
    writingTaskType: d.writingTaskType,
    minWords:        d.minWords,
    maxWords:        d.maxWords,
    rubric:          d.rubric ?? '',
  }));
}

export async function getExamQuestions(examId: string): Promise<QuestionData[]> {
  await requireAdmin();
  await dbConnect();
  const docs = await QuestionModel.find({ examId }).sort({ moduleIndex: 1, order: 1 }).lean();
  return docs.map(d => ({
    id:              String(d._id),
    examId:          d.examId,
    moduleIndex:     d.moduleIndex,
    order:           d.order,
    type:            d.type,
    blockId:         d.blockId ?? '',
    passage:         d.passage ?? '',
    audioUrl:        d.audioUrl ?? '',
    imageUrl:        d.imageUrl ?? '',
    stem:            d.stem,
    options:         d.options ?? [],
    openAnswers:     d.openAnswers ?? [],
    correctIndex:    d.correctIndex ?? -1,
    matchItems:      d.matchItems ?? [],
    correctMatching: d.correctMatching ?? [],
    explanation:     d.explanation ?? '',
    writingTaskType: d.writingTaskType,
    minWords:        d.minWords,
    maxWords:        d.maxWords,
    rubric:          d.rubric ?? '',
  }));
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
    await dbConnect();

    const count = await QuestionModel.countDocuments({ examId: data.examId, moduleIndex: data.moduleIndex });
    const doc = await QuestionModel.create({ ...data, order: count });
    // The bank changed, so the exam's advertised totals did too.
    await syncExamTotals(data.examId);
    revalidatePath(`/admin/exams/${data.examId}/questions`);
    // The bank changed, so the catalog AND this exam's detail page are stale.
    revalidateExam(data.examId);
    return { id: String(doc._id) };
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
    await dbConnect();

    // Validate the document as it WILL BE, not as the patch describes it: a
    // partial update that only changes `type` still has to leave a gradable
    // question behind, and the fields deciding that may be untouched ones.
    const existing = await QuestionModel.findById(id).lean();
    if (!existing) return { error: 'Not found' };
    const invalid = validateQuestion({ ...existing, ...data });
    if (invalid) return { error: invalid };

    // `runValidators` so a partial update is held to the same schema rules as a
    // create — without it, an edit could write a question `type` or
    // `writingTaskType` the enum does not allow.
    const doc = await QuestionModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
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
    await dbConnect();
    const doc = await QuestionModel.findByIdAndDelete(id);
    if (!doc) return { error: 'Not found' };
    const remaining = await QuestionModel.find({ examId: doc.examId, moduleIndex: doc.moduleIndex }).sort({ order: 1 });
    await Promise.all(remaining.map((q, i) => QuestionModel.updateOne({ _id: q._id }, { order: i })));
    await syncExamTotals(doc.examId);
    revalidatePath(`/admin/exams/${doc.examId}/questions`);
    revalidateExam(doc.examId);
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'deleteQuestion' } });
    return { error: 'Server xətası.' };
  }
}

export async function reorderQuestions(
  examId: string,
  moduleIndex: number,
  orderedIds: string[]
): Promise<{ ok: true } | { error: string }> {
  if (orderedIds.some(id => !validId(id))) return { error: 'Invalid question ID in list' };
  try {
    await requireAdmin();
    await dbConnect();
    // Scoped to the exam and module being reordered, so an id belonging to a
    // different exam cannot have its `order` rewritten by passing it in here.
    await Promise.all(orderedIds.map((id, i) =>
      QuestionModel.updateOne({ _id: id, examId, moduleIndex }, { order: i }),
    ));
    revalidatePath(`/admin/exams/${examId}/questions`);
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'reorderQuestions' } });
    return { error: 'Server xətası.' };
  }
}
