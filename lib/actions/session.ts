'use server';

import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/infra/mongodb';
import ExamSessionModel, {
  ATTEMPT_IDLE_LIMIT_SECONDS,
  type IModuleWindow,
  type ISessionAnswer,
  type ISessionProgress,
} from '@/lib/models/ExamSession';
import QuestionModel from '@/lib/models/Question';
import { getExamByIdAdmin } from '@/lib/db/exams';
import { buildModuleSchedule, totalScheduledSeconds } from '@/lib/domain/exam-timing';
import { MAX_ANSWER_TEXT_CHARS, MAX_QUESTION_SECONDS } from '@/lib/domain/grading';
import { isRateLimited } from '@/lib/infra/rate-limit';
import { trackEvent, ANALYTICS_EVENTS } from '@/lib/infra/analytics';
import { captureException } from '@/lib/infra/observability';
import { hasExamAccess } from '@/lib/db/entitlements';

/** The candidate's mirrored draft, as the player consumes it. */
export interface SessionProgress {
  answers: Array<{
    questionId: string;
    userAnswer: number;
    userAnswerText: string;
    timeSeconds: number;
  }>;
  flagged: string[];
  currentIdx: number;
  /**
   * When the server last accepted a write, as an ISO string. The player sends
   * it back as the base of its next write so a stale tab cannot overwrite
   * newer work — see `saveSessionProgress`.
   */
  updatedAt: string | null;
}

export interface SessionInfo {
  startedAt: string;
  elapsed: number;
  totalSeconds: number;
  /**
   * Per-module windows in seconds from `startedAt`, or `null` for a session
   * created before per-module timing shipped. `null` means the player must fall
   * back to one countdown over the whole paper — an attempt already running
   * cannot have deadlines introduced underneath it.
   */
  moduleSchedule: IModuleWindow[] | null;
  /**
   * The draft mirrored from a previous visit, or `null` if none was ever saved.
   * This is what makes an attempt survive a cleared cache or a change of
   * device — localStorage alone could not.
   */
  progress: SessionProgress | null;
  /**
   * The attempt was left unattended past `ATTEMPT_IDLE_LIMIT_SECONDS`.
   *
   * The player must not offer to resume it — it finalises the mirrored draft
   * instead. Nothing is discarded: the answers are graded and the attempt
   * closed, which is the honest outcome for someone whose machine died as much
   * as for someone who walked away.
   */
  stale: boolean;
}

/**
 * Copy the stored schedule into plain objects.
 *
 * `beginExamSession` reads the session back through `findOneAndUpdate`, which
 * returns a hydrated Mongoose document — so `moduleSchedule` is a DocumentArray
 * of subdocuments, each carrying its parent, its schema and the rest of the
 * Mongoose machinery. Returning that from a Server Action asks the RSC
 * serialiser to walk a cyclic object graph, which overflows the stack:
 *
 *     RangeError: Maximum call stack size exceeded
 *
 * `peekExamSession` never hit it because it queries with `.lean()`. Rather than
 * rely on every future caller remembering which query shape it used, both paths
 * go through here — the boundary only ever sees four numbers per window.
 */
function toPlainSchedule(raw: unknown): IModuleWindow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((w: IModuleWindow) => ({
    moduleIndex: Number(w.moduleIndex),
    startsAt:    Number(w.startsAt),
    endsAt:      Number(w.endsAt),
    breakEndsAt: Number(w.breakEndsAt),
  }));
}

/**
 * Copy the stored draft into plain objects, for the same reason the schedule is
 * copied: a hydrated Mongoose subdocument cannot cross the RSC boundary.
 */
function toPlainProgress(raw: ISessionProgress | undefined | null): SessionProgress | null {
  if (!raw) return null;
  return {
    answers: (raw.answers ?? []).map((a: ISessionAnswer) => ({
      questionId:     String(a.questionId),
      userAnswer:     Number(a.userAnswer),
      userAnswerText: String(a.userAnswerText ?? ''),
      timeSeconds:    Number(a.timeSeconds ?? 0),
    })),
    flagged:    (raw.flagged ?? []).map(String),
    currentIdx: Number(raw.currentIdx ?? 0),
    updatedAt:  raw.updatedAt ? new Date(raw.updatedAt).toISOString() : null,
  };
}

/**
 * How many questions each module actually has IN THE BANK.
 *
 * The schedule is built from this rather than from the module's declared
 * `questions` count so a module the player cannot render is skipped along with
 * its duration. A module with no question bank and no UI would otherwise donate
 * its minutes to the candidate's clock as free time, because `computeExamTotals`
 * sums every module's duration whether or not it has anything in it.
 */
async function questionCountsByModule(examId: string, moduleCount: number): Promise<number[]> {
  const rows = await QuestionModel.aggregate<{ _id: number; n: number }>([
    { $match: { examId } },
    { $group: { _id: '$moduleIndex', n: { $sum: 1 } } },
  ]);
  const counts = new Array<number>(moduleCount).fill(0);
  for (const r of rows) {
    if (Number.isInteger(r._id) && r._id >= 0 && r._id < moduleCount) counts[r._id] = r.n;
  }
  return counts;
}

/**
 * Has this attempt been left alone too long?
 *
 * Falls back to `startedAt` for sessions predating `lastSeenAt`, which is the
 * conservative reading: an attempt with no recorded heartbeat has not shown
 * signs of life since it began.
 */
function isAttemptStale(session: { lastSeenAt?: Date | null; startedAt: Date }): boolean {
  const last = session.lastSeenAt ? new Date(session.lastSeenAt) : new Date(session.startedAt);
  return (Date.now() - last.getTime()) / 1000 > ATTEMPT_IDLE_LIMIT_SECONDS;
}

/** `exists: false` means the clock has not been started for this exam yet. */
export type SessionPeek =
  | { exists: false }
  | ({ exists: true } & SessionInfo);

/**
 * Read-only counterpart to `beginExamSession`: reports whether a session is
 * already running WITHOUT creating one.
 *
 * The player needs this because the timer must not start until the student
 * presses "Başla" on the briefing screen. Loading the page can therefore no
 * longer be what creates the session — but a reload mid-exam still has to drop
 * the student straight back into a running clock rather than showing the
 * briefing again (which would silently burn exam time).
 */
export async function peekExamSession(examId: string): Promise<SessionPeek | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  try {
    await dbConnect();

    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    const session = await ExamSessionModel.findOne({ userId, examId }).lean();
    if (!session) return { exists: false };

    const startedAt = new Date(session.startedAt);
    return {
      exists:         true,
      startedAt:      startedAt.toISOString(),
      elapsed:        Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000)),
      totalSeconds:   session.totalSeconds,
      moduleSchedule: toPlainSchedule(session.moduleSchedule),
      progress:       toPlainProgress(session.progress),
      stale:          isAttemptStale(session),
    };
  } catch (err) {
    void captureException(err, { tags: { action: 'peekExamSession' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

/**
 * Just the clock, for the player's periodic re-sync.
 *
 * The re-sync loop used `peekExamSession`, which carries the whole mirrored
 * draft — every answer and every essay, up to 20 KB each — and it runs once a
 * minute plus on every `visibilitychange`, purely to compare two integers. This
 * reads two fields and returns two numbers.
 */
export async function getSessionClock(
  examId: string,
): Promise<{ elapsed: number; totalSeconds: number } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  try {
    await dbConnect();
    // Checked here as everywhere else. The query is already scoped to this user
    // so nothing leaked without it, but a gate that is present on every
    // neighbour and absent on one is the kind of asymmetry that stops being
    // harmless the moment someone reuses the function.
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    /*
     * This IS the heartbeat.
     *
     * The player calls it every sixty seconds while an attempt is running, so
     * it is the natural place to record that the attempt is still being sat.
     * `lastSeenAt` is what `isAttemptStale` reads.
     */
    const session = await ExamSessionModel.findOneAndUpdate(
      { userId, examId },
      { $set: { lastSeenAt: new Date() } },
      { new: true, projection: { startedAt: 1, totalSeconds: 1 } },
    ).lean();
    if (!session) return { error: 'Session tapılmadı.' };

    return {
      elapsed:      Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)),
      totalSeconds: session.totalSeconds,
    };
  } catch (err) {
    void captureException(err, { tags: { action: 'getSessionClock' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

/**
 * Records the authoritative start time for an exam session server-side.
 * On first call: creates the session with startedAt = now.
 * On subsequent calls (page reload): returns the existing startedAt unchanged.
 * This prevents timer manipulation via page refresh or DevTools.
 */
export async function beginExamSession(examId: string): Promise<SessionInfo | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  // 10 session-start calls per user per minute — prevents timer reset abuse
  if (await isRateLimited(`begin:${userId}`, 10, 60_000)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz. Bir az gözləyin.' };
  }

  try {
    await dbConnect();

    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    const exam = await getExamByIdAdmin(examId);
    if (!exam) return { error: 'Exam not found' };

    const counts = await questionCountsByModule(examId, exam.modules.length);
    const schedule = buildModuleSchedule(exam.modules, counts);

    // The schedule is authoritative for the clock: it excludes modules with no
    // questions, so `exam.durationMinutes` (which sums every module) is only the
    // fallback for an exam whose bank is empty everywhere.
    const scheduled = totalScheduledSeconds(schedule);
    const totalSeconds = scheduled > 0 ? scheduled : exam.durationMinutes * 60;
    const now = new Date();

    // Atomically create session if it doesn't exist, or return existing one.
    // $setOnInsert ensures startedAt is never overwritten on subsequent calls —
    // and, with it, that the deadlines a candidate is being held to are the ones
    // fixed when they pressed Start, not whatever the exam says now.
    const session = await ExamSessionModel.findOneAndUpdate(
      { userId, examId },
      { $setOnInsert: { startedAt: now, totalSeconds, moduleSchedule: schedule } },
      { upsert: true, returnDocument: 'after' },
    );

    const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000);

    // Only the first call creates the session; later calls are page reloads.
    if (elapsed < 5) {
      void trackEvent(ANALYTICS_EVENTS.examStarted, userId, {
        examId, examTitle: exam.title, examType: exam.type,
      });
    }

    return {
      startedAt:      session.startedAt.toISOString(),
      elapsed:        Math.max(0, elapsed),
      // Read back from the session, never from what we just computed: on a
      // reload the stored values win, and they can differ if the exam was
      // edited after this attempt began.
      totalSeconds:   session.totalSeconds,
      moduleSchedule: toPlainSchedule(session.moduleSchedule),
      progress:       toPlainProgress(session.progress),
      // A session created or resumed right now is by definition not stale.
      stale:          false,
    };
  } catch (err) {
    void captureException(err, { tags: { action: 'beginExamSession' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

/**
 * Throw away an in-progress attempt so the next visit starts a fresh clock.
 *
 * Without this there was no way out of a started session: `peekExamSession`
 * finds it, the player resumes into it, and a candidate who abandoned an
 * attempt hours earlier was dropped back onto a spent clock that auto-submitted
 * on arrival. Submitting already deletes the session (see `saveExamResult`);
 * this is the same cleanup for the case where the candidate never finished.
 *
 * A restart no longer refunds a listening track. `playedAudioUrls` used to live
 * on this document, so deleting it handed the recording back — and since this
 * screen is one reload away at any moment, the single-play rule could be beaten
 * by playing the track, reloading and starting over. On IELTS that costs two
 * minutes of answers, because Listening is the first module. The claim now
 * lives in its own record with a short TTL (see `PlayedAudio`), so a restart
 * keeps the track spent while a genuine retake later still gets it back.
 */
export async function restartExamSession(examId: string): Promise<{ ok: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  // Same budget as beginExamSession: a restart is only useful paired with one.
  if (await isRateLimited(`restart:${userId}`, 10, 60_000)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz. Bir az gözləyin.' };
  }

  try {
    await dbConnect();
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };
    await ExamSessionModel.deleteOne({ userId, examId });
    return { ok: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'restartExamSession' } });
    return { error: 'Server xətası baş verdi.' };
  }
}

/** Hard caps on a mirrored draft, so one client cannot grow a session document without bound. */
const MAX_PROGRESS_ANSWERS = 2_000;
const MAX_PROGRESS_FLAGGED = 2_000;

/**
 * Mirror the candidate's in-progress answers to the server.
 *
 * Answers used to live ONLY in the browser's localStorage, which meant a
 * cleared cache, a crashed machine or simply signing in from another device
 * lost the lot — mid-attempt, with the server clock still running and no way
 * back except `restartExamSession`, which throws the attempt away. The player
 * calls this on a debounce as answers change, and again when the tab is hidden.
 *
 * Nothing here is trusted for marking. `saveExamResult` still grades against
 * the question bank at submit time; this is a draft, not a score. It also never
 * creates a session — a draft for an attempt that was never started, or that
 * has already been submitted, is silently dropped rather than resurrecting a
 * clock.
 */
export async function saveSessionProgress(
  examId: string,
  draft: {
    answers: Array<{ questionId: string; userAnswer?: number; userAnswerText?: string; timeSeconds?: number }>;
    flagged: string[];
    currentIdx: number;
  },
  /**
   * The `updatedAt` of the draft this write is based on, or null when the
   * client restored a session that had none. The write only lands if the stored
   * draft is still that one.
   */
  baseUpdatedAt: string | null,
): Promise<{ ok: true; updatedAt: string } | { stale: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  // The player debounces to roughly one write every few seconds; this is the
  // ceiling that stops a broken client from hammering the database.
  if (await isRateLimited(`progress:${userId}`, 60, 60_000)) {
    return { error: 'Çox tez-tez yadda saxlanıldı.' };
  }

  if (!Array.isArray(draft?.answers) || !Array.isArray(draft?.flagged)) {
    return { error: 'Invalid progress' };
  }

  try {
    await dbConnect();
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    // Clamp every field before it is stored, exactly as grading does with a
    // submission: this is client-supplied data written straight to a document.
    const answers: ISessionAnswer[] = draft.answers
      .slice(0, MAX_PROGRESS_ANSWERS)
      .filter(a => a && typeof a.questionId === 'string' && a.questionId.length <= 64)
      .map(a => ({
        questionId:     a.questionId,
        userAnswer:     typeof a.userAnswer === 'number' && Number.isFinite(a.userAnswer)
          ? Math.trunc(a.userAnswer)
          : -1,
        userAnswerText: typeof a.userAnswerText === 'string'
          ? a.userAnswerText.slice(0, MAX_ANSWER_TEXT_CHARS)
          : '',
        timeSeconds:    typeof a.timeSeconds === 'number' && Number.isFinite(a.timeSeconds)
          ? Math.min(MAX_QUESTION_SECONDS, Math.max(0, Math.round(a.timeSeconds)))
          : 0,
      }));

    const flagged = draft.flagged
      .filter((id): id is string => typeof id === 'string' && id.length <= 64)
      .slice(0, MAX_PROGRESS_FLAGGED);

    const currentIdx = Number.isFinite(draft.currentIdx)
      ? Math.max(0, Math.trunc(draft.currentIdx))
      : 0;

    /*
     * Compare-and-set, not last-writer-wins.
     *
     * This was a bare whole-document `$set`, which is the wrong shape for a
     * feature whose whole point is that an attempt can be picked up on another
     * device. The player also flushes on `visibilitychange`, so merely
     * backgrounding a tab that had been sitting on an old draft was enough to
     * write it over work done since — silently, and over the answers the
     * feature exists to protect.
     *
     * Pinning the filter to the draft this write was based on means a stale
     * writer matches nothing and is told so, instead of winning.
     */
    const now = new Date();
    const base = baseUpdatedAt ? new Date(baseUpdatedAt) : null;
    const res = await ExamSessionModel.updateOne(
      {
        userId,
        examId,
        // No base means the client started from a session with no stored draft;
        // it may only create the first one.
        ...(base && !Number.isNaN(base.getTime())
          ? { 'progress.updatedAt': base }
          : { progress: { $exists: false } }),
      },
      { $set: { progress: { answers, flagged, currentIdx, updatedAt: now }, lastSeenAt: now } },
    );

    if (res.matchedCount === 1) return { ok: true, updatedAt: now.toISOString() };

    // Nothing matched for one of two reasons, and they are not the same: the
    // attempt is gone (submitted, restarted, expired), or this draft is stale.
    const exists = await ExamSessionModel.exists({ userId, examId });
    if (!exists) return { error: 'Session tapılmadı.' };

    return { stale: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'saveSessionProgress' } });
    return { error: 'Server xətası baş verdi.' };
  }
}
