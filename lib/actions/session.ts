'use server';

import { auth } from '@clerk/nextjs/server';
import { and, count, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import {
  questions as questionsTable,
  examSessions,
  type ModuleWindow,
  type SessionAnswer,
  type SessionProgress as StoredProgress,
} from '@/lib/db/schema';
import { getExamByIdAdmin } from '@/lib/db/exams';
import {
  buildModuleSchedule,
  endBreakEarly,
  finishModuleEarly,
  locateInSchedule,
  totalScheduledSeconds,
  ATTEMPT_IDLE_LIMIT_SECONDS,
} from '@/lib/domain/exam-timing';
import { MAX_ANSWER_TEXT_CHARS, MAX_QUESTION_SECONDS } from '@/lib/domain/grading';
import { isRateLimited, limited } from '@/lib/infra/rate-limit';
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
  moduleSchedule: ModuleWindow[] | null;
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
/**
 * How long a session survives after it is started.
 *
 * Replaces the 7-day Mongo TTL index, which Postgres has no equivalent for.
 * The difference that matters is WHERE the rule lives: the TTL monitor deleted
 * documents on a 60-second sweep, so expiry was a property of a background job.
 * Here it is a property of the read — `liveSession` filters every access — and
 * the sweep only reclaims space. Being late costs disk, never correctness.
 */
const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * This user's attempt at this exam, if it has not lapsed.
 *
 * Every read and every write goes through this, so no call site can forget the
 * expiry check and resurrect an attempt whose clock ran out days ago.
 */
function liveSession(userId: string, examId: string) {
  return and(
    eq(examSessions.userId, userId),
    eq(examSessions.examId, examId),
    gt(examSessions.expiresAt, new Date()),
  );
}

function toPlainSchedule(raw: unknown): ModuleWindow[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw.map((w: ModuleWindow) => ({
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
function toPlainProgress(raw: StoredProgress | undefined | null): SessionProgress | null {
  if (!raw) return null;
  return {
    answers: (raw.answers ?? []).map((a: SessionAnswer) => ({
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
  // The question bank lives in Postgres now, even though the surrounding
  // session logic still reads Mongo — so this count must come from there or it
  // would be answering from a store nothing writes to any more.
  const rows = await db
    .select({ moduleIndex: questionsTable.moduleIndex, n: count() })
    .from(questionsTable)
    .where(eq(questionsTable.examId, examId))
    .groupBy(questionsTable.moduleIndex);
  const counts = new Array<number>(moduleCount).fill(0);
  for (const r of rows) {
    if (Number.isInteger(r.moduleIndex) && r.moduleIndex >= 0 && r.moduleIndex < moduleCount) {
      counts[r.moduleIndex] = r.n;
    }
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
function isAttemptStale(session: { lastSeenAt: Date | null; startedAt: Date }): boolean {
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

  // Read-only, but it hits the database on every player mount and resume.
  if (await limited('read', 'peek', userId)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz.' };
  }

  try {
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    const [session] = await db
      .select()
      .from(examSessions)
      .where(liveSession(userId, examId))
      .limit(1);
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

  /*
   * The heartbeat runs once a minute per active attempt plus on every
   * `visibilitychange`, so the ceiling is set well above honest use — this
   * exists to stop a loop hammering it, not to police a running exam.
   */
  if (await limited('read', 'clock', userId)) {
    return { error: 'Çox tez-tez sorğu göndərdiniz.' };
  }

  try {
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
    const [session] = await db
      .update(examSessions)
      .set({ lastSeenAt: new Date() })
      .where(liveSession(userId, examId))
      .returning({ startedAt: examSessions.startedAt, totalSeconds: examSessions.totalSeconds });
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

    /*
     * Create the session if absent; otherwise hand back a LIVE one untouched,
     * or restart a LAPSED one in place — all in one statement, so a
     * double-click cannot produce two and nothing races between the branches.
     *
     * For a live session `startedAt` is never overwritten, and with it the
     * deadlines a candidate is held to stay the ones fixed when they pressed
     * Start, whatever the exam says now. That was `$setOnInsert`.
     *
     * A LAPSED session has to be restarted rather than returned, and that is
     * what the CASE arms below add. Every other access goes through
     * `liveSession`, which requires `expires_at > now()` — so once a session
     * lapses `peekExamSession` reports none and the player shows the briefing.
     * Handing the spent row back from here meant pressing Start returned an
     * `elapsed` measured from days ago: `remaining` was 0, the player's
     * auto-submit fired immediately, and an EMPTY attempt was filed against the
     * candidate's record, consuming an attempt number. `expires_at` stayed in
     * the past too, so the clock, the draft mirror and module content all
     * reported "Session tapılmadı" for as long as the row survived — up to a
     * day, since the sweep runs nightly.
     *
     * Under Mongo the TTL monitor deleted the document, so this same upsert
     * inserted a fresh one. Moving expiry from a TTL index to a column brought
     * back the case the TTL used to erase; these CASE arms are what replaces it.
     *
     * DO NOTHING would be wrong, and so would `setWhere`: both return no row
     * when they do not fire, so an ordinary reload would look like a failure.
     * Assigning every column through a CASE keeps the row eligible for
     * RETURNING in all three branches — the standard upsert-and-read idiom,
     * with the lapsed case folded in.
     */
    const lapsed = sql`${examSessions.expiresAt} <= now()`;
    const [session] = await db
      .insert(examSessions)
      .values({
        userId, examId, startedAt: now, totalSeconds, moduleSchedule: schedule,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + SESSION_LIFETIME_MS),
      })
      .onConflictDoUpdate({
        target: [examSessions.userId, examSessions.examId],
        set: {
          startedAt:      sql`CASE WHEN ${lapsed} THEN excluded.started_at       ELSE ${examSessions.startedAt} END`,
          totalSeconds:   sql`CASE WHEN ${lapsed} THEN excluded.total_seconds    ELSE ${examSessions.totalSeconds} END`,
          moduleSchedule: sql`CASE WHEN ${lapsed} THEN excluded.module_schedule  ELSE ${examSessions.moduleSchedule} END`,
          // A lapsed attempt's draft is already unreachable — every read filters
          // on expiry — so a restart starts from a clean sheet rather than
          // resurrecting answers the candidate was told were gone.
          progress:       sql`CASE WHEN ${lapsed} THEN NULL::jsonb              ELSE ${examSessions.progress} END`,
          expiresAt:      sql`CASE WHEN ${lapsed} THEN excluded.expires_at       ELSE ${examSessions.expiresAt} END`,
          // Always: the candidate is demonstrably here right now.
          lastSeenAt:     sql`excluded.last_seen_at`,
        },
      })
      .returning();

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
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };
    await db
      .delete(examSessions)
      .where(and(eq(examSessions.userId, userId), eq(examSessions.examId, examId)));
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
/**
 * Rewrite a running session's schedule, and keep the clock with it.
 *
 * The shared spine of the two "skip ahead" actions. Both do the same thing —
 * shorten the attempt by handing back time the candidate no longer wants — and
 * differ only in which window they truncate, so `apply` is the whole difference
 * and everything else (auth, entitlement, the elapsed clock, the write) is here
 * once.
 *
 * `apply` returning null means there was nothing to reclaim: the phase had
 * already moved on, or the caller named a phase that is not running. That is a
 * `stale` reply rather than an error, which is what makes a double-click and a
 * click that races the clock both harmless.
 */
async function rescheduleSession(
  examId: string,
  rateKey: string,
  apply: (schedule: ModuleWindow[], elapsed: number) => ModuleWindow[] | null,
): Promise<{ ok: true; schedule: ModuleWindow[]; totalSeconds: number } | { stale: true } | { error: string }> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthorized' };

  // Deliberate, confirmed actions — a handful per attempt at most.
  if (await isRateLimited(`${rateKey}:${userId}`, 30, 60_000)) {
    return { error: 'Çox tez-tez cəhd etdiniz.' };
  }

  try {
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    const [session] = await db
      .select({ startedAt: examSessions.startedAt, schedule: examSessions.moduleSchedule })
      .from(examSessions)
      .where(and(eq(examSessions.userId, userId), eq(examSessions.examId, examId)))
      .limit(1);

    if (!session) return { error: 'Sessiya tapılmadı.' };

    // A session predating per-module timing has one clock over the whole paper
    // and no windows to move: there is nothing here to skip ahead of.
    const schedule = session.schedule;
    if (!schedule || schedule.length === 0) return { stale: true };

    const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
    const next = apply(schedule, elapsed);
    if (!next) return { stale: true };

    /*
     * `totalSeconds` moves with the schedule, because the schedule is what it
     * was derived from when the session was created — see `beginExamSession`.
     * Leaving it behind desynchronised the two: the resume screen reads the
     * stored total, so an attempt whose schedule now ended at 30 minutes still
     * advertised 43 minutes remaining.
     */
    const totalSeconds = totalScheduledSeconds(next);

    await db
      .update(examSessions)
      .set({ moduleSchedule: next, totalSeconds, lastSeenAt: new Date() })
      .where(and(eq(examSessions.userId, userId), eq(examSessions.examId, examId)));

    return { ok: true, schedule: next, totalSeconds };
  } catch (err) {
    void captureException(err, { tags: { action: rateKey }, extra: { examId } });
    return { error: 'Əməliyyat alınmadı. Yenidən cəhd edin.' };
  }
}

/**
 * Hand back the rest of the current section and open the next one now.
 *
 * The player used to tell a candidate who had finished a section to wait for
 * the clock, because the schedule was fixed for the life of the session. That
 * is faithful to an exam hall and wrong for a practice product — and it made
 * the analytics page's pace rating meaningless, since every attempt then ran
 * for exactly the scheduled time.
 *
 * The schedule stays the single source of truth. This rewrites it once, on the
 * server, and every derived thing — which module is open, what the content gate
 * in `getSessionQuestions` will release, what a second tab computes — follows
 * from the stored value without any of them changing.
 *
 * `expectedModuleIndex` is what the candidate believed they were finishing. A
 * double click, or a click that raced the clock running out on its own, arrives
 * with a stale index and is refused rather than silently closing whichever
 * section happens to be open by then — which would skip a section outright.
 */
export async function finishCurrentModule(examId: string, expectedModuleIndex: number) {
  return rescheduleSession(examId, 'finish-module', (schedule, elapsed) => {
    const position = locateInSchedule(schedule, elapsed);
    if (position.phase !== 'module') return null;
    if (position.moduleIndex !== expectedModuleIndex) return null;
    return finishModuleEarly(schedule, position.moduleIndex, elapsed);
  });
}

/**
 * End the running break and start the next section now.
 *
 * Same bargain as finishing a section early: the rest of the break is given up
 * rather than moved onto the section that follows, so a candidate who skips it
 * gains no working time for doing so. `expectedAfterModuleIndex` names the
 * break being skipped — the module it FOLLOWS — so a click that lands after the
 * break has already ended cannot fall through and close the next section.
 */
export async function skipCurrentBreak(examId: string, expectedAfterModuleIndex: number) {
  return rescheduleSession(examId, 'skip-break', (schedule, elapsed) => {
    const position = locateInSchedule(schedule, elapsed);
    if (position.phase !== 'break') return null;
    if (position.afterModuleIndex !== expectedAfterModuleIndex) return null;
    return endBreakEarly(schedule, position.afterModuleIndex, elapsed);
  });
}

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
    if (!(await hasExamAccess(userId, examId))) return { error: 'Not purchased' };

    // Clamp every field before it is stored, exactly as grading does with a
    // submission: this is client-supplied data written straight to a document.
    const answers: SessionAnswer[] = draft.answers
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
    const hasBase = !!base && !Number.isNaN(base.getTime());

    /*
     * The guard reads the draft's own timestamp back out of the JSONB.
     *
     * `progress->>'updatedAt'` is the ISO string written by the previous save;
     * casting both sides to timestamptz compares instants rather than text, so
     * a differently-formatted-but-equal timestamp still matches. With no base,
     * the client started from a session holding no draft and may only create
     * the first one — `progress IS NULL` says exactly that.
     */
    const guard = hasBase
      ? sql`(${examSessions.progress}->>'updatedAt')::timestamptz = ${base!.toISOString()}::timestamptz`
      : sql`${examSessions.progress} IS NULL`;

    const written = await db
      .update(examSessions)
      .set({
        progress: { answers, flagged, currentIdx, updatedAt: now.toISOString() },
        lastSeenAt: now,
      })
      .where(and(liveSession(userId, examId), guard))
      .returning({ id: examSessions.id });

    if (written.length === 1) return { ok: true, updatedAt: now.toISOString() };

    // Nothing matched for one of two reasons, and they are not the same: the
    // attempt is gone (submitted, restarted, expired), or this draft is stale.
    const [exists] = await db
      .select({ id: examSessions.id })
      .from(examSessions)
      .where(liveSession(userId, examId))
      .limit(1);
    if (!exists) return { error: 'Session tapılmadı.' };

    return { stale: true };
  } catch (err) {
    void captureException(err, { tags: { action: 'saveSessionProgress' } });
    return { error: 'Server xətası baş verdi.' };
  }
}
