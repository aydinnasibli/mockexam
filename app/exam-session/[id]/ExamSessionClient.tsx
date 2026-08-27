'use client';

import 'katex/dist/katex.min.css';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import posthog from 'posthog-js';
import { motion } from 'framer-motion';
import { saveExamResult } from '@/lib/actions/results';
import {
  beginExamSession,
  finishCurrentModule,
  skipCurrentBreak,
  peekExamSession,
  restartExamSession,
  saveSessionProgress,
  getSessionClock,
  type SessionProgress,
} from '@/lib/actions/session';
import { getModuleQuestionContent } from '@/lib/actions/questions';
import {
  Timer,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Grid3X3,
  BookOpen,
  FileText,
  Highlighter,
  Sigma,
  Calculator as CalculatorIcon,
  Trash2,
  FastForward,
} from 'lucide-react';
import BriefingScreen from './BriefingScreen';
import ResumeScreen from './ResumeScreen';
import SubmitConfirmDialog from './SubmitConfirmDialog';
import FinishModuleDialog from './FinishModuleDialog';
import QuestionGrid from './QuestionGrid';
import StrictAudioPlayer from './StrictAudioPlayer';
import QuestionCard from './QuestionCard';
import BreakScreen from './BreakScreen';
import ReferenceSheet from './ReferenceSheet';
import Calculator from './Calculator';
import HighlightablePassage from './HighlightablePassage';
import {
  clearPersistedSession,
  loadSavedSession,
  parseHighlights,
  parseMatchingAnswers,
  persistSession,
} from '@/lib/domain/exam-session-storage';
import { countAnswered, isQuestionAnswered } from '@/lib/domain/answered';
import {
  billableQuestionIds,
  billingKey,
  applyInterval,
} from '@/lib/domain/exam-billing';
import {
  buildDraftAnswers,
  chooseDraftSource,
  draftFromProgress,
  fillGaps,
  unionFlags,
} from '@/lib/domain/exam-draft';
import {
  buildScreens,
  indexQuestionsToScreens,
} from '@/lib/domain/exam-blocks';
import {
  navScope,
  canEdit,
  scopeRange,
  isPaperFinished,
} from '@/lib/domain/exam-navigation';
import { locateInSchedule } from '@/lib/domain/exam-timing';
import {
  highlightsForPassage,
  removeHighlight,
  setHighlightNote,
  type Highlight,
  type TextPos,
} from '@/lib/domain/passage-highlights';
import type { ModuleWindow as IModuleWindow } from '@/lib/db/schema';
import type { PublicExam } from '@/lib/db/exams';
import type {
  SessionQuestion,
  SessionQuestionContent,
  SessionQuestionMeta,
} from '@/lib/actions/questions';
import Button from '@/components/ui/Button';
import SkipLink from '@/components/ui/SkipLink';

interface Props {
  exam: PublicExam;
  /**
   * The paper's skeleton. Content arrives per module from
   * `getModuleQuestionContent` as each section's clock opens — see
   * `SessionQuestionMeta`.
   */
  questionMeta: SessionQuestionMeta[];
}

/**
 * What a question looks like before its module has been released. Rendering a
 * blank card for an unopened section is correct: navigation cannot reach it,
 * and the grid only needs to know the question exists.
 */
const EMPTY_CONTENT: Omit<SessionQuestionContent, 'id'> = {
  passage: '', stem: '', options: [], matchItems: [],
  audioUrl: '', imageUrl: '', rubric: '',
};

/** How long to wait before retrying a module whose content failed to load. */
const CONTENT_RETRY_MS = 3_000;

/** How often the countdown re-anchors to the server's own elapsed count. */
const CLOCK_RESYNC_MS = 60_000;
/** Seconds of divergence tolerated before the display is snapped — below this it is latency. */
const CLOCK_DRIFT_TOLERANCE = 2;
/** Quiet period after the last change before the draft is mirrored to the server. */
const PROGRESS_DEBOUNCE_MS = 4_000;
/** Longest a change may sit unmirrored, however continuously the candidate types. */
const PROGRESS_MAX_WAIT_MS = 30_000;
/** How many times auto-submit retries a failing submission before asking the candidate. */
const MAX_AUTO_SUBMIT_ATTEMPTS = 5;

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExamSessionClient({ exam, questionMeta }: Props) {
  const router = useRouter();
  const startedAtRef  = useRef<Date | null>(null);
  const currentIdxRef = useRef(0);
  const qEnterTimeRef = useRef<number>(0);
  const qTimeSecsRef  = useRef<Map<string, number>>(new Map());
  // Scroll containers — navigating must land at the top of the new question
  // rather than inheriting how far the previous one was scrolled.
  const questionScrollRef = useRef<HTMLDivElement>(null);
  const passageScrollRef  = useRef<HTMLDivElement>(null);

  // 'loading'  — asking the server whether a clock is already running
  // 'briefing' — pre-exam briefing; the clock has NOT started yet
  // 'resume'   — a clock IS already running; continue it or start over
  // 'running'  — questions are on screen and the clock is ticking
  // 'expired'  — left unattended too long; the mirrored draft is being finalised
  const [phase, setPhase]               = useState<'loading' | 'briefing' | 'resume' | 'running' | 'expired'>('loading');
  const [restarting, setRestarting]     = useState(false);
  const [starting, setStarting]         = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [elapsed, setElapsed]           = useState(0);
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [answers, setAnswers]           = useState<Map<string, number>>(new Map());
  const [openAnswers, setOpenAnswers]   = useState<Map<string, string>>(new Map());
  const [matchingAnswers, setMatchingAnswers] = useState<Map<string, number[]>>(new Map());
  const [flagged, setFlagged]           = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [showFinishModule, setShowFinishModule] = useState(false);
  const [finishingModule, setFinishingModule]   = useState(false);
  const [skippingBreak, setSkippingBreak]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  const [highlights, setHighlights]   = useState<Highlight[]>([]);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  /**
   * The module timing windows fixed when this attempt started, or null for a
   * session created before per-module timing shipped — see `SessionInfo`.
   * `null` keeps the old single-countdown behaviour rather than dropping
   * deadlines onto an attempt that is already running.
   */
  const [schedule, setSchedule] = useState<IModuleWindow[] | null>(null);

  /*
   * ── Question content, released one module at a time ───────────────────────
   *
   * The page ships only the paper's skeleton (`questionMeta`); passages, stems
   * and options are fetched per module from a server action that checks the
   * session's own schedule before handing anything over. Shipping the whole
   * paper up front meant per-module timing clamped navigation while the text of
   * every unopened section sat in the payload for anyone with devtools.
   *
   * `contentById` accumulates and is never evicted — a module the candidate has
   * already been through stays readable, which is what the clock allows anyway.
   */
  const [contentById, setContentById] = useState<Map<string, SessionQuestionContent>>(new Map());
  const [loadedModules, setLoadedModules] = useState<Set<number>>(new Set());
  /** Bumped to re-run the fetch after a failure; see the retry effect below. */
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [retryPending, setRetryPending] = useState(false);
  const loadingModuleRef = useRef<number | null>(null);

  /** The skeleton with whatever content has been released merged over it. */
  const questions: SessionQuestion[] = useMemo(
    () => questionMeta.map(m => ({ ...m, ...EMPTY_CONTENT, ...contentById.get(m.id) })),
    [questionMeta, contentById],
  );

  // Read by event handlers that are `useCallback`ed with no deps, so that
  // memoised children keep their identity across the once-a-second clock tick.
  const questionsRef = useRef<SessionQuestion[]>(questions);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  /** Ids of the questions on the screen currently displayed. See `recordCurrentQuestionTime`. */
  const screenQuestionIdsRef = useRef<string[]>([]);

  /*
   * Whether writing is allowed, in a ref rather than closed over.
   *
   * The answer handlers are memoised with no dependencies so `QuestionCard`
   * keeps its identity across the once-a-second clock tick; reading the flag
   * from a ref keeps that property while still letting a break or a spent
   * clock stop edits dead.
   */
  const editableRef = useRef(true);

  /*
   * The draft this window's next write is based on. The server only accepts a
   * write that still matches it, so a tab left open on an old draft cannot
   * overwrite work done since — on another device, or in another tab.
   */
  const [progressBase, setProgressBase] = useState<string | null>(null);
  const [draftConflict, setDraftConflict] = useState(false);

  /*
   * The clock is derived from the last server sync, not counted up tick by tick.
   *
   * `setInterval(… s + 1 …)` loses time on two counts: browsers throttle timers
   * in a background tab to about one firing a minute, and every firing is late
   * by the amount of work on the main thread. A student who switched tabs for
   * ten minutes came back to a clock that had advanced by ten *seconds* — free
   * exam time, and an auto-submit that never fired on schedule. Anchoring to
   * `Date.now()` against the server's own elapsed count means a tick can be
   * skipped without any time being lost, and the value re-converges the moment
   * the tab is foregrounded again.
   */
  const syncedAtRef    = useRef(0);   // Date.now() when the server reading was taken
  const elapsedBaseRef = useRef(0);   // server-reported elapsed seconds at that moment

  /** Records a server clock reading and shows it immediately. */
  const syncClock = useCallback((serverElapsed: number) => {
    elapsedBaseRef.current = Math.max(0, serverElapsed);
    syncedAtRef.current = Date.now();
    setElapsed(Math.max(0, serverElapsed));
  }, []);

  // The server stores the allowance when the session is created, so an exam
  // edited mid-attempt cannot change the clock the submission is judged against.
  const [serverTotalSeconds, setServerTotalSeconds] = useState<number | null>(null);
  const totalSeconds = serverTotalSeconds ?? exam.durationMinutes * 60;
  const remaining    = Math.max(0, totalSeconds - elapsed);

  /**
   * Restore a draft, preferring the one the SERVER holds.
   *
   * localStorage is fast and survives a crashed tab, but it is tied to one
   * browser on one machine — so it could not survive a cleared cache or a
   * change of device, which is precisely when a candidate most needs their work
   * back. The server mirror (`saveSessionProgress`) is authoritative when it
   * exists; the local draft fills in when it does not, and always supplies the
   * highlights, which are never sent to the server.
   */
  const restoreDraft = useCallback((serverProgress: SessionProgress | null) => {
    const saved = loadSavedSession(exam.id);

    // Highlights are study scaffolding, kept local by design.
    const savedHighlights = parseHighlights(saved?.highlights);
    if (savedHighlights.length) setHighlights(savedHighlights);

    /*
     * Adopt the stored draft's stamp whenever one exists — even if it carries
     * no answers yet. Leaving it null would make this window's first write
     * claim to be creating the first draft, which the server correctly refuses,
     * and the tab would report a conflict that isn't one.
     */
    setProgressBase(serverProgress?.updatedAt ?? null);

    /*
     * Per-question times live ONLY in the server mirror — localStorage has
     * never carried them — so they are adopted whichever draft wins below.
     * Preferring the local answers must not silently reset the timings the
     * review page reports.
     */
    if (serverProgress) {
      const times = new Map<string, number>();
      for (const a of serverProgress.answers) {
        if (a.timeSeconds > 0) times.set(a.questionId, a.timeSeconds);
      }
      if (times.size) qTimeSecsRef.current = times;
    }

    /*
     * Which draft is fresher? See `chooseDraftSource` — it compares LINEAGE,
     * not clocks, because one stamp comes from a browser and the other from a
     * server. Taking the server copy unconditionally used to throw away answers
     * saved locally but not yet mirrored, which is the work crash recovery
     * exists to keep.
     */
    const source = chooseDraftSource(
      saved?.mirroredAt,
      serverProgress?.updatedAt,
      (serverProgress?.answers.length ?? 0) > 0,
    );

    if (source === 'server' && serverProgress) {
      const restored = draftFromProgress(serverProgress, questionMeta);
      if (restored.answers.size)         setAnswers(restored.answers);
      if (restored.openAnswers.size)     setOpenAnswers(restored.openAnswers);
      if (restored.matchingAnswers.size) setMatchingAnswers(restored.matchingAnswers);
      if (restored.flagged.size)         setFlagged(restored.flagged);

      const idx = serverProgress.currentIdx;
      if (Number.isInteger(idx) && idx >= 0 && idx < questionMeta.length) {
        setCurrentIdx(idx);
        currentIdxRef.current = idx;
      }
      return;
    }

    if (!saved) return;
    if (saved.answers?.length)     setAnswers(new Map(saved.answers));
    if (saved.openAnswers?.length) setOpenAnswers(new Map(saved.openAnswers));
    if (saved.matchingAnswers?.length) setMatchingAnswers(new Map(parseMatchingAnswers(saved.matchingAnswers)));
    if (saved.flagged?.length)     setFlagged(new Set(saved.flagged));
    if (
      typeof saved.currentIdx === 'number' &&
      saved.currentIdx >= 0 &&
      saved.currentIdx < questionMeta.length
    ) {
      setCurrentIdx(saved.currentIdx);
      currentIdxRef.current = saved.currentIdx;
    }
  }, [exam.id, questionMeta]);

  // ── Init: does a clock already exist? Never starts one — that is `startExam`.
  useEffect(() => {
    async function init() {
      const peek = await peekExamSession(exam.id);
      if ('error' in peek) {
        router.push('/dashboard');
        return;
      }
      if (!peek.exists) {
        // No clock yet: show the briefing. A stale draft from an expired session
        // must not leak into a fresh attempt.
        clearPersistedSession(exam.id);
        setPhase('briefing');
        return;
      }
      /*
       * A clock is already running. Offer the choice rather than rejoining
       * silently: an abandoned attempt used to be inescapable, because arriving
       * resumed a spent clock and auto-submitted an empty paper on the spot.
       * `sessionReady` goes up so the countdown on that screen is live — the
       * clock genuinely does keep running, and the screen says so.
       */
      startedAtRef.current  = new Date(peek.startedAt);
      qEnterTimeRef.current = Date.now();
      setServerTotalSeconds(peek.totalSeconds);
      setSchedule(peek.moduleSchedule);
      syncClock(peek.elapsed);
      restoreDraft(peek.progress);
      setSessionReady(true);

      /*
       * Left unattended past the idle limit: the attempt is closed out rather
       * than resumed. The draft restored a line above is exactly what gets
       * graded, so walking away — or a machine dying — costs the candidate the
       * time that passed, never the work they had already done.
       *
       * Unless there is nothing to grade. An attempt with no mirrored answers
       * has no work to preserve, and finalising it would file a 0% for a paper
       * the candidate may never have written on — strictly worse than the
       * restart they can reach today. Sessions predating the draft mirror are
       * all in exactly this position, so they get a clean start instead.
       */
      const hasRecordedWork = (peek.progress?.answers.length ?? 0) > 0;
      if (peek.stale && !hasRecordedWork) {
        await restartExamSession(exam.id);
        clearPersistedSession(exam.id);
        setSessionReady(false);
        setSchedule(null);
        setServerTotalSeconds(null);
        setPhase('briefing');
        return;
      }
      setPhase(peek.stale ? 'expired' : 'resume');
    }
    /*
     * `init` must never reject unhandled. It is the only thing that moves the
     * player off 'loading', so anything thrown inside it — a corrupt local
     * draft, a transport failure — used to leave the candidate on a spinner
     * with no way forward. Falling back to the briefing is recoverable; hanging
     * is not.
     */
    void init().catch(err => {
      // Client component: posthog-js directly, per lib/infra/observability.ts,
      // which is server-only by design.
      posthog.captureException(err, { context: 'examSessionInit', examId: exam.id });
      clearPersistedSession(exam.id);
      setPhase('briefing');
    });
  }, [exam.id, router, restoreDraft, syncClock]);

  /** Rejoin the running attempt exactly where it was left. */
  const continueExam = useCallback(() => {
    qEnterTimeRef.current = Date.now();  // don't bill the resume screen to a question
    setPhase('running');
  }, []);

  /**
   * Throw the attempt away and go back to the briefing.
   *
   * The server session is deleted first: the local draft is worthless without
   * it, and clearing localStorage while the session survived would leave the
   * candidate on a running clock with their answers gone — strictly worse than
   * either outcome.
   */
  const restartExam = useCallback(async () => {
    if (restarting) return;
    setRestarting(true);
    const result = await restartExamSession(exam.id);
    if ('error' in result) {
      toast.error('Yenidən başlatmaq alınmadı. Bir azdan cəhd edin.');
      setRestarting(false);
      return;
    }
    clearPersistedSession(exam.id);
    startedAtRef.current = null;
    setSessionReady(false);
    setSchedule(null);
    setServerTotalSeconds(null);
    setAnswers(new Map());
    setOpenAnswers(new Map());
    setMatchingAnswers(new Map());
    setFlagged(new Set());
    setHighlights([]);
    // A new attempt re-earns its content through the schedule, so nothing that
    // the abandoned one had released may carry over.
    setContentById(new Map());
    setLoadedModules(new Set());
    loadingModuleRef.current = null;
    setRetryPending(false);
    setProgressBase(null);
    setDraftConflict(false);
    setCurrentIdx(0);
    currentIdxRef.current = 0;
    qTimeSecsRef.current = new Map();
    syncClock(0);
    setRestarting(false);
    setPhase('briefing');
  }, [exam.id, restarting, syncClock]);

  // ── Start: the button on the briefing screen is what starts the clock ──────
  const startExam = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    const result = await beginExamSession(exam.id);
    if ('error' in result) {
      toast.error('İmtahan başladıla bilmədi. Yenidən cəhd edin.');
      setStarting(false);
      return;
    }
    startedAtRef.current  = new Date(result.startedAt);
    qEnterTimeRef.current = Date.now();
    setServerTotalSeconds(result.totalSeconds);
    setSchedule(result.moduleSchedule);
    syncClock(result.elapsed);
    setSessionReady(true);
    setPhase('running');
    setStarting(false);
  }, [exam.id, starting, syncClock]);

  // ── Timer — only after server session is confirmed ────────────────────────
  useEffect(() => {
    if (!sessionReady) return;
    const tick = () => setElapsed(
      elapsedBaseRef.current + Math.floor((Date.now() - syncedAtRef.current) / 1000),
    );
    const id = setInterval(tick, 1000);
    // A throttled background tab can be many minutes behind; recompute the
    // moment it is looked at again rather than waiting for the next firing.
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [sessionReady]);

  // ── Persist answers to localStorage after every change ───────────────────
  useEffect(() => {
    if (!sessionReady) return;
    persistSession(exam.id, {
      answers:         [...answers.entries()],
      openAnswers:     [...openAnswers.entries()],
      matchingAnswers: [...matchingAnswers.entries()].map(([k, v]) => [k, JSON.stringify(v)]),
      flagged:         [...flagged],
      currentIdx,
      mirroredAt: progressBase,
      highlights,
    });
  }, [answers, openAnswers, matchingAnswers, flagged, currentIdx, highlights, progressBase, sessionReady, exam.id]);

  /*
   * ── Re-sync the clock with the server ─────────────────────────────────────
   *
   * The countdown is anchored to ONE server reading taken when the attempt was
   * joined, and everything after it was measured with the local `Date.now()`.
   * That closed the background-throttling hole but left the browser's own clock
   * trusted for the whole sitting: winding the system clock back handed the
   * candidate as much extra time as they liked, and honest drift was never
   * corrected either. Re-reading the server's elapsed count on a timer, and
   * whenever the tab is brought back, keeps the anchor honest.
   *
   * Only a real divergence is corrected — a second either way is round-trip
   * latency, and snapping the display for that would just make it twitch.
   */
  useEffect(() => {
    if (!sessionReady || phase !== 'running' || submitted) return;
    let cancelled = false;

    async function resync() {
      // `getSessionClock`, not `peekExamSession`: this runs every minute and on
      // every tab focus, and it only needs two integers — peeking would drag
      // the entire mirrored draft, essays included, across the wire each time.
      const clock = await getSessionClock(exam.id);
      if (cancelled || 'error' in clock) return;
      const shown = elapsedBaseRef.current + Math.floor((Date.now() - syncedAtRef.current) / 1000);
      if (Math.abs(clock.elapsed - shown) >= CLOCK_DRIFT_TOLERANCE) syncClock(clock.elapsed);
    }

    const id = setInterval(() => void resync(), CLOCK_RESYNC_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void resync(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [sessionReady, phase, submitted, exam.id, syncClock]);

  /*
   * ── Mirror the draft to the server ────────────────────────────────────────
   *
   * localStorage above survives a reload; it does not survive a cleared cache,
   * a dead machine or signing in from somewhere else — and the clock keeps
   * running through all three. This is the copy that makes an attempt
   * recoverable anywhere, so it is written on a debounce as answers change and
   * flushed the moment the tab is hidden.
   */
  const draftAnswers = useCallback(
    () => buildDraftAnswers(
      questionMeta,
      { answers, openAnswers, matchingAnswers, flagged },
      qTimeSecsRef.current,
    ),
    [questionMeta, answers, openAnswers, matchingAnswers, flagged],
  );

  /**
   * Take on answers from another window WITHOUT displacing this one's.
   *
   * Used when a write is rejected as stale. The alternative — stopping and
   * telling the candidate to reload — loses the answers this window had not
   * mirrored yet, which is the exact failure the mirror exists to prevent.
   * `mergeDrafts` fills only the gaps, so each window keeps its own edits and
   * both survive; the union is written back on the next debounce.
   */
  const adoptServerAnswers = useCallback((incoming: SessionProgress | null) => {
    if (!incoming || incoming.answers.length === 0) return;
    const other = draftFromProgress(incoming, questionMeta);

    setAnswers(prev => fillGaps(prev, other.answers));
    setOpenAnswers(prev => fillGaps(prev, other.openAnswers));
    setMatchingAnswers(prev => fillGaps(prev, other.matchingAnswers));
    setFlagged(prev => unionFlags(prev, other.flagged));
  }, [questionMeta]);

  /*
   * ── The draft write scheduler ─────────────────────────────────────────────
   *
   * Two faults lived in what used to be a bare `setTimeout` here.
   *
   * There was no SINGLE-FLIGHT guard. The debounce and the visibility flush
   * both read `progressBase` from their closure, so if one was in flight when
   * the other fired, the second write carried the pre-flush stamp, the server
   * correctly rejected it as stale, and the client ran the merge path — telling
   * a candidate with one tab open that their exam was "open in another window"
   * and dragging the whole draft back over the wire to prove it. Queuing a
   * trailing write instead of issuing a doomed one removes the race entirely.
   *
   * And there was no MAX WAIT. The debounce restarted on every change, and a
   * change is every keystroke — so an essay typed steadily for ten minutes
   * never reached the server at all. localStorage still held it, but the server
   * mirror exists precisely for what localStorage cannot survive, and a long
   * essay is the work most worth protecting.
   */
  const writeInFlightRef = useRef(false);
  const writeQueuedRef   = useRef(false);
  const firstDirtyAtRef  = useRef<number | null>(null);

  const saveDraftRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    saveDraftRef.current = () => {
      // A write is already out. Mark the draft dirty and let that write's
      // completion issue the follow-up with a stamp that is actually current.
      if (writeInFlightRef.current) { writeQueuedRef.current = true; return; }
      writeInFlightRef.current = true;

      void (async () => {
        try {
          const result = await saveSessionProgress(
            exam.id,
            { answers: draftAnswers(), flagged: [...flagged], currentIdx: currentIdxRef.current },
            progressBase,
          );

          if ('ok' in result) {
            setProgressBase(result.updatedAt);
            firstDirtyAtRef.current = null;
            return;
          }
          if (!('stale' in result)) return;

          /*
           * Another window genuinely wrote first. Merge rather than surrender:
           * re-read the stored draft, take whatever this window is missing,
           * adopt its stamp, and let the next write send the union. Both sets
           * of answers survive.
           */
          const peek = await peekExamSession(exam.id);
          if ('error' in peek || !peek.exists) return;
          adoptServerAnswers(peek.progress);
          setProgressBase(peek.progress?.updatedAt ?? null);
          setDraftConflict(true);
        } finally {
          writeInFlightRef.current = false;
          if (writeQueuedRef.current) {
            writeQueuedRef.current = false;
            saveDraftRef.current?.();
          }
        }
      })();
    };
  }, [exam.id, draftAnswers, flagged, progressBase, adoptServerAnswers]);

  useEffect(() => {
    if (!sessionReady || phase !== 'running' || submitted) return;

    // Debounce, but never past the max wait: continuous typing resets the quiet
    // period forever, so the deadline is measured from the FIRST unmirrored
    // change rather than the most recent one.
    if (firstDirtyAtRef.current === null) firstDirtyAtRef.current = Date.now();
    const waited = Date.now() - firstDirtyAtRef.current;
    const delay = Math.max(0, Math.min(PROGRESS_DEBOUNCE_MS, PROGRESS_MAX_WAIT_MS - waited));

    const id = setTimeout(() => saveDraftRef.current?.(), delay);
    return () => clearTimeout(id);
  }, [sessionReady, phase, submitted, answers, openAnswers, matchingAnswers, flagged, currentIdx]);

  useEffect(() => {
    if (!sessionReady || phase !== 'running') return;
    const flush = () => { if (document.visibilityState === 'hidden') saveDraftRef.current?.(); };
    document.addEventListener('visibilitychange', flush);
    return () => document.removeEventListener('visibilitychange', flush);
  }, [sessionReady, phase]);

  /*
   * Warn before a reload, a tab close or a back-navigation while the clock is
   * running.
   *
   * The draft survives all three, so this is not about losing answers — it is
   * about the things that do NOT come back: the clock keeps running while the
   * candidate is away, and a listening track already claimed is gone. Browsers
   * ignore custom text and show their own wording; setting `returnValue` is
   * still what triggers the prompt.
   *
   * Not registered once the paper is submitted or being finalised, where
   * leaving costs nothing.
   */
  useEffect(() => {
    if (phase !== 'running' || submitted) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [phase, submitted]);

  // Told once. Mirroring continues — this is information, not a failure.
  useEffect(() => {
    if (!draftConflict) return;
    toast.info('Bu imtahan başqa pəncərədə də açıqdır. Cavablar birləşdirildi.', { duration: 8_000 });
  }, [draftConflict]);

  // ── Core actions ──────────────────────────────────────────────────────────

  /**
   * Close the open billing interval and charge it to whatever was on screen.
   *
   * Two faults are closed here. The interval used to be billed to
   * `questions[currentIdx]` alone, so on a blocked screen — where the footer
   * always lands on the block's first question — an IELTS listening part
   * charged all ten questions' time to question one and reported the other nine
   * at zero. And it only ever fired from `goTo` and `handleSubmit`, so when the
   * SCHEDULE moved the candidate on (a module expiring, a ten-minute SAT break)
   * nothing closed the interval: the tail of the old module plus the entire
   * break landed on the first question of the next one.
   *
   * `screenQuestionIdsRef` is empty whenever nothing is billable — a break, a
   * finished paper, a module whose text is still loading — so those intervals
   * are discarded rather than charged to anyone. Splitting evenly across a
   * block is an approximation, but an honest one: the candidate genuinely had
   * all ten questions in front of them for the whole interval.
   */
  const recordCurrentQuestionTime = useCallback(() => {
    const secs = (Date.now() - qEnterTimeRef.current) / 1000;
    qEnterTimeRef.current = Date.now();
    applyInterval(qTimeSecsRef.current, secs, screenQuestionIdsRef.current);
  }, []);

  const handleSubmit = useCallback(async () => {
    recordCurrentQuestionTime();
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const answerInputs = questions.map(q => {
        let userAnswerText = openAnswers.get(q.id) || '';
        // For matching questions, encode the answers as JSON in userAnswerText
        if (q.type === 'matching' && matchingAnswers.has(q.id)) {
          userAnswerText = JSON.stringify(matchingAnswers.get(q.id));
        }
        return {
          questionId:  q.id,
          moduleIndex: q.moduleIndex,
          userAnswer:  answers.get(q.id) ?? -1,
          userAnswerText,
          timeSeconds: Math.round(qTimeSecsRef.current.get(q.id) ?? 0),
        };
      });
      const sessionStart = startedAtRef.current ?? new Date();
      const result = await saveExamResult({
        examId:          exam.id,
        startedAt:       sessionStart.toISOString(),
        durationSeconds: Math.floor((Date.now() - sessionStart.getTime()) / 1000),
        answers:         answerInputs,
      });
      if ('error' in result) throw new Error(result.error);
      clearPersistedSession(exam.id);
      setSubmitted(true);
      toast.success('İmtahan tamamlandı! Nəticələr hazırlanır...');
      router.push(`/dashboard/analytics/${exam.id}/${result.attemptNumber}/review`);
    } catch {
      toast.error('Nəticə göndərilmədi. Yenidən cəhd edin.');
      setSubmitting(false);
    }
  }, [exam, router, answers, openAnswers, matchingAnswers, questions, recordCurrentQuestionTime]);

  /*
   * ── Finalising an attempt ─────────────────────────────────────────────────
   *
   * One path for both endings: the clock running out mid-exam, and an attempt
   * closed after sitting idle past the limit. They differ only in what triggers
   * them, and keeping two effects meant two failure behaviours — the expired
   * one latched after a single try, so if that try failed the candidate was
   * left on a spinner for ever with nothing retrying and no way out.
   *
   * The retry is bounded with backoff. A latch was the original fix for a real
   * bug (`handleSubmit` clears `submitting` on failure, which immediately
   * re-satisfied the condition and produced a submit/fail/submit loop), but
   * firing exactly once meant one dropped request stranded the attempt unsaved.
   * The paper is frozen throughout either way — `navScope` returns `finished`
   * the moment the clock is spent — so nothing here is what protects answers.
   */
  const submitAttemptsRef = useRef(0);
  const [autoSubmitExhausted, setAutoSubmitExhausted] = useState(false);

  const shouldFinalize =
    sessionReady && !submitting && !submitted
    && ((phase === 'running' && remaining <= 0) || phase === 'expired');

  useEffect(() => {
    if (!shouldFinalize) return;
    if (submitAttemptsRef.current >= MAX_AUTO_SUBMIT_ATTEMPTS) {
      setAutoSubmitExhausted(true);
      return;
    }
    // A tick before the first go, so a draft just restored into state has
    // landed: `handleSubmit` reads the answer maps from its closure, and
    // submitting too early would file an empty paper. Then 2s, 4s, 8s… capped,
    // so a flaky connection gets time to recover without hammering.
    const delay = submitAttemptsRef.current === 0
      ? 50
      : Math.min(30_000, 2_000 * 2 ** (submitAttemptsRef.current - 1));

    const id = setTimeout(() => {
      submitAttemptsRef.current += 1;
      void handleSubmit();
    }, delay);
    return () => clearTimeout(id);
  }, [shouldFinalize, handleSubmit]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const hasNoQuestions = questions.length === 0;

  /*
   * Screens, not questions.
   *
   * A blocked module puts a whole task on one screen — an IELTS listening part,
   * a matching-headings task — because the material is continuous and the
   * recording never waits. Question NUMBERING stays flat across the paper; only
   * what shares a screen changes. See lib/domain/exam-blocks.ts.
   */
  const screens = useMemo(
    () => buildScreens(questions, exam.modules.map(m => m.layout)),
    [questions, exam.modules],
  );
  const screenOfQuestion = useMemo(() => indexQuestionsToScreens(screens), [screens]);

  /*
   * Where the candidate stands on the server's schedule.
   *
   * Everything below — which module is open, how much time is on the clock,
   * whether a break is running — is derived from elapsed seconds against the
   * windows stored when the attempt began. Nothing is advanced by the client,
   * so a reload or a second tab computes the identical phase.
   *
   * A session with no stored schedule is one that started before per-module
   * timing existed; it keeps the old behaviour of one clock over the whole
   * paper, with every module open.
   */
  const position = useMemo(
    () => (schedule ? locateInSchedule(schedule, elapsed) : null),
    [schedule, elapsed],
  );
  const activeModule = position?.phase === 'module' ? position.moduleIndex : null;
  const onBreak      = position?.phase === 'break' ? position : null;

  /*
   * What the candidate may reach and whether they may still write.
   *
   * TOTAL over every phase — see `navScope`. This used to be "the open module's
   * screens, or null meaning unrestricted", and break and finished both landed
   * in the null branch: during a break the whole paper became navigable and
   * editable (held back only by BreakScreen's z-index), and after the clock
   * expired the same hole opened with nothing over it whenever a submit failed.
   */
  const scope = useMemo(() => navScope(position, screens), [position, screens]);
  const allowedRange = scopeRange(scope);
  const editable = canEdit(scope);
  const paperFinished = isPaperFinished(position);

  /*
   * The question actually on screen.
   *
   * `currentIdx` is where the candidate navigated; this is where the SCHEDULE
   * says they are. When a module's clock expires the open window moves on, and
   * the view follows by derivation rather than by an effect writing state back
   * — no cascading render, and no way for the two to disagree even for a frame.
   */
  const shownIdx = useMemo(() => {
    if (!allowedRange) return currentIdx;
    const sc = screenOfQuestion[currentIdx] ?? 0;
    if (sc >= allowedRange[0] && sc <= allowedRange[1]) return currentIdx;
    return screens[allowedRange[0]]?.questionIndices[0] ?? currentIdx;
  }, [allowedRange, currentIdx, screenOfQuestion, screens]);

  const currentScreenIdx = screenOfQuestion[shownIdx] ?? 0;
  const currentScreen    = screens[currentScreenIdx] ?? null;

  const current          = questions[shownIdx] ?? null;

  const currentModule = current ? exam.modules[current.moduleIndex] : null;

  /*
   * ── Release the open module's content ─────────────────────────────────────
   *
   * The module the candidate may actually read: the one whose clock is running
   * under a schedule, or simply the one they are looking at on a legacy session
   * that has none. The server decides whether to hand it over — this only asks.
   */
  const moduleToLoad = activeModule ?? current?.moduleIndex ?? null;

  useEffect(() => {
    if (!sessionReady || moduleToLoad === null) return;
    // Once the paper is spent, nothing further is released — the server
    // enforces this too, since `isModuleOpen` alone is satisfied for every
    // module after the clock passes them all.
    if (paperFinished) return;
    if (loadedModules.has(moduleToLoad)) return;
    if (loadingModuleRef.current === moduleToLoad) return;

    loadingModuleRef.current = moduleToLoad;

    /*
     * Deliberately NOT abandoned on cleanup. An in-flight request is what the
     * `loadingModuleRef` guard makes later effect runs stand down for, so
     * discarding its result would leave the module neither loaded nor loading
     * and nothing scheduled to try again — a spinner that never resolves. The
     * result is good whichever run asked for it, and both setters are
     * idempotent, so it is always applied.
     */
    void (async () => {
      const result = await getModuleQuestionContent(exam.id, moduleToLoad);
      loadingModuleRef.current = null;

      if ('error' in result) {
        // Hand the retry to the effect below rather than starting a timer from
        // inside this async body: a timer created here is created AFTER cleanup
        // may already have run, so nothing can ever cancel it.
        setRetryPending(true);
        return;
      }

      setContentById(prev => {
        const next = new Map(prev);
        for (const c of result) next.set(c.id, c);
        return next;
      });
      setLoadedModules(prev => new Set(prev).add(moduleToLoad));
    })();
  }, [sessionReady, moduleToLoad, loadedModules, loadAttempt, paperFinished, exam.id]);

  /*
   * The retry timer, owned by an effect that creates it synchronously.
   *
   * A candidate cannot answer a section they cannot read, so a failed load is
   * retried rather than given up on; `getModuleQuestionContent` is rate limited,
   * which is what bounds a genuinely broken server. Keeping the timer here — in
   * an effect body rather than in an async continuation — is what makes it
   * cancellable: unmounting, or the candidate moving on to a module that does
   * load, clears it instead of leaving it to fire into nothing.
   */
  useEffect(() => {
    if (!retryPending) return;
    const id = setTimeout(() => {
      setRetryPending(false);
      setLoadAttempt(n => n + 1);
    }, CONTENT_RETRY_MS);
    return () => clearTimeout(id);
  }, [retryPending]);

  useEffect(() => { editableRef.current = editable; }, [editable]);

  /** True while the open module's text is still on its way. */
  const contentLoading = moduleToLoad !== null && !loadedModules.has(moduleToLoad);

  /*
   * The one place a billing interval is opened or closed.
   *
   * Whatever the candidate is actually being timed on — a screen, or nothing at
   * all during a break — is derived here, and any CHANGE to it banks the
   * interval that just ended against the previous target before starting a new
   * one. That covers navigation, a module clock expiring, entering and leaving
   * a break, and the paper finishing, without any of those needing to remember
   * to call it.
   *
   * It works for navigation too, and better than the explicit call `goTo` used
   * to make: this runs after the render, when `screenQuestionIdsRef` still
   * holds the screen being LEFT, and it does nothing at all when navigation
   * stays within one blocked screen — where the same questions really are still
   * in front of the candidate and the interval should simply continue.
   */
  const billingTargetRef = useRef<string>('');
  useEffect(() => {
    const ids = billableQuestionIds({
      running: phase === 'running',
      onBreak: !!onBreak,
      contentLoading,
      screenQuestionIds: (currentScreen?.questionIndices ?? [])
        .map(i => questionMeta[i]?.id)
        .filter((id): id is string => !!id),
    });

    const key = billingKey(ids);
    if (key === billingTargetRef.current) return;

    recordCurrentQuestionTime();          // charges the PREVIOUS target
    screenQuestionIdsRef.current = ids;   // …then the new one takes over
    billingTargetRef.current = key;
  }, [phase, onBreak, contentLoading, currentScreen, questionMeta, recordCurrentQuestionTime]);

  /*
   * The clock the candidate is actually racing.
   *
   * Under a schedule this is the CURRENT MODULE's remaining time, not the
   * paper's. Showing one total was what let an IELTS candidate spend ninety
   * minutes on Reading and a SAT candidate carry unused Module 1 time forward.
   */
  const moduleRemaining = position?.phase === 'module' ? position.remaining : null;
  const displayRemaining = moduleRemaining ?? remaining;

  /*
   * The recording for the section on screen.
   *
   * Anchored to the module whose CLOCK is running, not to the question in view:
   * navigating to a question outside the listening module used to swap the
   * <audio src> and stop playback while the server had already recorded the
   * track as played, destroying a single-play recording with one stray click.
   *
   * Two further faults are closed here. The old fallback to
   * `current?.moduleIndex` meant that when a listening module's clock expired
   * into a break, the same src stayed mounted and the recording played on —
   * audibly — behind the break screen for the whole break; under a schedule the
   * player now unmounts with the module, which stops the sound. And taking the
   * first `audioUrl` anywhere in the module meant a section whose parts each
   * carry their own recording could only ever play part one; the current
   * SCREEN's block now chooses, falling back to the module's first. A single
   * continuous recording resolves to the identical URL from every screen, so it
   * is never remounted mid-play.
   */
  const audioModuleIndex = schedule ? activeModule : (current?.moduleIndex ?? null);
  const moduleAudioUrl = useMemo(() => {
    if (audioModuleIndex === null) return null;
    if (currentScreen?.moduleIndex === audioModuleIndex) {
      const onScreen = currentScreen.questionIndices
        .map(i => questions[i])
        .find(q => q?.audioUrl)?.audioUrl;
      if (onScreen) return onScreen;
    }
    return questions.find(q => q.moduleIndex === audioModuleIndex && q.audioUrl)?.audioUrl ?? null;
  }, [audioModuleIndex, currentScreen, questions]);

  // Reading passages are authored once, on the first question of their group.
  // Carry the most recent passage forward within the same module so every
  // question of the group shows its text.
  const currentPassage = useMemo(() => {
    if (!current) return '';
    // On a blocked screen the text is authored on the block's FIRST question,
    // so search from there rather than from wherever the candidate is reading.
    const anchorIdx = currentScreen?.questionIndices[0] ?? shownIdx;
    const anchor = questions[anchorIdx] ?? current;
    if (anchor.passage) return anchor.passage;
    for (let i = anchorIdx - 1; i >= 0; i--) {
      const q = questions[i];
      if (q.moduleIndex !== anchor.moduleIndex) break;
      if (q.passage) return q.passage;
    }
    return '';
  }, [current, shownIdx, currentScreen, questions]);

  /**
   * How many questions hang off the text currently on screen, and which one of
   * them this is.
   *
   * The bank stores passage groups two different ways: some exams author the
   * text once on the first question and leave the rest blank (carried forward
   * by `currentPassage`), others repeat the identical text on every question of
   * the group. Grouping therefore keys on the text CHANGING, which handles both
   * — keying on "has a passage" would score every question of a repeated-text
   * group as its own group of one.
   */
  const passageGroups = useMemo(() => {
    const out: Array<{ position: number; size: number } | null> = new Array(questions.length).fill(null);
    let start = -1;
    let lastModule = -1;
    let lastPassage = '';

    function closeGroup(endExclusive: number) {
      if (start < 0) return;
      const size = endExclusive - start;
      for (let i = start; i < endExclusive; i++) out[i] = { position: i - start + 1, size };
      start = -1;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (q.moduleIndex !== lastModule) {
        closeGroup(i);
        lastModule  = q.moduleIndex;
        lastPassage = '';
      }
      // A new group starts only where the text CHANGES. Keying on "has a
      // passage" scored every question of a repeated-text group as its own
      // group of one, so the counter never appeared.
      if (q.passage && q.passage !== lastPassage) {
        closeGroup(i);
        lastPassage = q.passage;
        start = i;
      }
      if (!lastPassage) closeGroup(i);
    }
    closeGroup(questions.length);
    return out;
  }, [questions]);

  const passageGroup = passageGroups[shownIdx] ?? null;

  /*
   * Is there anything to put BESIDE the questions?
   *
   * No longer counts audio: the player moved out of the side panel into its own
   * full-width bar, so a listening part with no passage now gets the whole
   * width for its block of ten questions rather than a half-empty companion
   * pane — which is what that block of ten actually needs.
   */
  /*
   * A blocked screen carries several questions, and several diagrams. The side
   * panel can only hold one, so on those screens every question renders its own
   * inline and the panel keeps to the passage.
   */
  const inlineImages = (currentScreen?.questionIndices.length ?? 1) > 1;
  const panelImageUrl = inlineImages ? null : (current?.imageUrl || null);

  const hasSidePanel = !!(currentPassage || panelImageUrl);

  /** One shared definition of answeredness — see `lib/domain/answered.ts`. */
  const answerState = useMemo(
    () => ({ answers, openAnswers, matchingAnswers }),
    [answers, openAnswers, matchingAnswers],
  );
  const answeredCount = countAnswered(questions, answerState);

  const questionsByModule = exam.modules.map((mod, modIdx) => ({
    mod, modIdx,
    qs: questions.filter(q => q.moduleIndex === modIdx),
  }));

  /*
   * Position of each question in the flat list. Both navigation grids render a
   * button per question and previously called `questions.indexOf(q)` inside the
   * loop, which is a full scan per button — quadratic in the question count, on
   * every keystroke in an essay, for a 100+ question paper.
   */
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((q, i) => map.set(q.id, i));
    return map;
  }, [questions]);

  /*
   * ── Announce a section change the clock made ──────────────────────────────
   *
   * Where two modules meet with no break — IELTS Listening into Reading — the
   * schedule moves the candidate across silently. The old player showed a
   * hand-over card, but that was dismissible and blocking, which is unfair once
   * a module clock is running behind it. A toast says the same thing without
   * costing anyone time.
   *
   * Writing to a ref, not to state, so this synchronises with an external
   * system (the toaster) rather than cascading a render.
   */
  const announcedModuleRef = useRef<number | null>(null);
  useEffect(() => {
    if (phase !== 'running' || activeModule === null) return;
    if (announcedModuleRef.current === activeModule) return;
    const previous = announcedModuleRef.current;
    announcedModuleRef.current = activeModule;
    // Nothing to announce on the first module of the attempt.
    if (previous === null) return;
    const name = exam.modules[activeModule]?.name;
    if (name) toast.info(`${name} bölməsi başladı.`);
  }, [activeModule, phase, exam.modules]);

  /*
   * The handlers below are `useCallback`ed for one reason: `QuestionCard` and
   * `HighlightablePassage` are memoised, and a fresh closure on every render
   * would defeat both — the exam clock re-renders this component once a second
   * for the whole sitting.
   */
  const selectAnswer = useCallback((questionId: string, optionIdx: number) => {
    if (!editableRef.current) return;
    setAnswers(prev => new Map(prev).set(questionId, optionIdx));
  }, []);

  /*
   * ── Highlights ──
   * Keyed by the passage TEXT rather than by question id: a passage is shared
   * by a whole group of questions, and keying on the question would scatter one
   * reader's marks across a dozen keys that all render the same words. The key
   * is a cheap stable digest of the text, so an edited passage simply drops its
   * old marks instead of anchoring them into changed prose.
   */
  const passageKey = useMemo(() => {
    if (!currentPassage) return '';
    let h = 0;
    for (let i = 0; i < currentPassage.length; i++) {
      h = (Math.imul(31, h) + currentPassage.charCodeAt(i)) | 0;
    }
    return `p${h}:${currentPassage.length}`;
  }, [currentPassage]);

  const createHighlight = useCallback((start: TextPos, end: TextPos) => {
    const id = `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    setHighlights(prev => [...prev, { id, passageKey, start, end, note: '' }]);
    setActiveHighlight(id);
  }, [passageKey]);

  function deleteHighlight(id: string) {
    setHighlights(prev => removeHighlight(prev, id));
    setActiveHighlight(cur => (cur === id ? null : cur));
  }

  function updateNote(id: string, note: string) {
    setHighlights(prev => setHighlightNote(prev, id, note));
  }

  const openHighlight = useCallback((id: string) => setActiveHighlight(id), []);

  const setOpenAnswer = useCallback((questionId: string, value: string) => {
    if (!editableRef.current) return;
    setOpenAnswers(prev => new Map(prev).set(questionId, value));
  }, []);

  const setMatchingAnswer = useCallback((questionId: string, itemIdx: number, optionIdx: number) => {
    if (!editableRef.current) return;
    setMatchingAnswers(prev => {
      const next = new Map(prev);
      const q = questionsRef.current.find(x => x.id === questionId);
      const size = q?.matchItems?.length ?? 0;
      const arr = [...(next.get(questionId) ?? new Array<number>(size).fill(-1))];
      arr[itemIdx] = optionIdx;
      next.set(questionId, arr);
      return next;
    });
  }, []);

  const toggleFlag = useCallback((questionId: string) => {
    if (!editableRef.current) return;
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
      return next;
    });
  }, []);

  /**
   * Move to a question by its flat index.
   *
   * Clamped to the module whose clock is running. A mock exam must not let a
   * candidate into a section that has not opened or back into one whose time is
   * spent, and on a listening section leaving the module at all used to destroy
   * the single-play recording. `allowedRange` is null only for a legacy session
   * with no stored schedule, where every module stays reachable as before.
   */
  function goTo(idx: number) {
    // Frozen means frozen: a break or a spent clock pins the candidate where
    // they are rather than letting them wander a paper they can no longer sit.
    if (scope.kind === 'frozen') return;
    let newIdx = Math.max(0, Math.min(questions.length - 1, idx));

    if (allowedRange) {
      const targetScreen = screenOfQuestion[newIdx] ?? 0;
      const [first, last] = allowedRange;
      if (targetScreen < first || targetScreen > last) {
        const clampedScreen = screens[targetScreen < first ? first : last];
        newIdx = clampedScreen?.questionIndices[0] ?? newIdx;
      }
    }
    currentIdxRef.current = newIdx;
    setCurrentIdx(newIdx);
    setShowGrid(false);
    // Collapse the mobile passage panel here rather than in an effect on
    // currentIdx — navigation is the only thing that should reset it, and an
    // effect would fire an extra render pass every time (react-hooks/set-state-in-effect).
    setShowPassage(false);

    questionScrollRef.current?.scrollTo({ top: 0 });
    // Only rewind the passage when a NEW text starts — otherwise every question
    // in a group would throw away where the student had read up to.
    if ((passageGroups[newIdx]?.position ?? 1) === 1) passageScrollRef.current?.scrollTo({ top: 0 });
  }

  /**
   * Step one SCREEN forward or back, staying inside the open module.
   *
   * The footer arrows move by screen rather than by question: on a blocked
   * listening part, "next" means the next part, not the next gap in the form
   * the candidate is already looking at.
   */
  function goToScreen(delta: number) {
    const target = currentScreenIdx + delta;
    const bounded = allowedRange
      ? Math.max(allowedRange[0], Math.min(allowedRange[1], target))
      : Math.max(0, Math.min(screens.length - 1, target));
    const first = screens[bounded]?.questionIndices[0];
    if (typeof first === 'number' && bounded !== currentScreenIdx) goTo(first);
  }

  const atFirstScreen = allowedRange ? currentScreenIdx <= allowedRange[0] : currentScreenIdx <= 0;
  const atLastScreen  = allowedRange ? currentScreenIdx >= allowedRange[1] : currentScreenIdx >= screens.length - 1;

  /*
   * Position within the module, and whether this screen holds a whole task.
   *
   * Both feed the footer label. With blocks on, "Növbəti" moved ten questions
   * at once while still reading as "next question" — and on the last screen of
   * a module it simply greyed out with no explanation, which is indistinguishable
   * from a broken button. The candidate needs to be told that a section ends on
   * its clock, not on running out of screens.
   */
  const moduleScreenCount = allowedRange ? allowedRange[1] - allowedRange[0] + 1 : screens.length;
  const moduleScreenPos   = allowedRange ? currentScreenIdx - allowedRange[0] + 1 : currentScreenIdx + 1;
  const isBlockScreen     = (currentScreen?.questionIndices.length ?? 1) > 1;
  const isFinalModule     = activeModule !== null
    && !screens.some(sc => sc.moduleIndex > activeModule);

  /*
   * ── Finishing a section early ─────────────────────────────────────────────
   *
   * The counts and the clock for the section the candidate is actually sitting,
   * used by the confirmation so they can see what they are giving up before
   * they give it up.
   */
  const moduleQuestions = useMemo(
    () => (activeModule === null ? [] : questions.filter(q => q.moduleIndex === activeModule)),
    [questions, activeModule],
  );
  const moduleAnsweredCount = useMemo(
    () => countAnswered(moduleQuestions, answerState),
    [moduleQuestions, answerState],
  );
  const nextModuleName = useMemo(() => {
    if (activeModule === null) return '';
    const nextIdx = screens.find(sc => sc.moduleIndex > activeModule)?.moduleIndex;
    return nextIdx === undefined ? '' : (exam.modules[nextIdx]?.name ?? '');
  }, [screens, activeModule, exam.modules]);

  /*
   * Hand the rest of the section back.
   *
   * The server rewrites the stored schedule and returns it; adopting that
   * return value rather than computing a new one here keeps the client a reader
   * of the server's timing, which is the property the whole scheduling model
   * rests on. A `stale` reply means the clock beat the click — the section had
   * already closed on its own — and needs no message, because the derived state
   * has already moved the candidate on.
   */
  /*
   * Adopt a rewritten schedule from the server.
   *
   * Both, together: `totalSeconds` is derived from the schedule, and the header
   * clock reads the total while the phase reads the windows. Adopting one
   * without the other makes them disagree for a frame. A `stale` reply needs no
   * message — the clock beat the click, and the derived state has already moved
   * the candidate to wherever they now belong.
   */
  const adoptSchedule = useCallback(
    (res: { schedule: IModuleWindow[]; totalSeconds: number } | { stale: true } | { error: string }) => {
      if ('schedule' in res) {
        setSchedule(res.schedule);
        setServerTotalSeconds(res.totalSeconds);
      } else if ('error' in res) {
        toast.error(res.error);
      }
    },
    [],
  );

  const handleFinishModule = useCallback(async () => {
    if (activeModule === null || finishingModule) return;
    setFinishingModule(true);
    try {
      adoptSchedule(await finishCurrentModule(exam.id, activeModule));
    } finally {
      setFinishingModule(false);
      setShowFinishModule(false);
    }
  }, [activeModule, finishingModule, exam.id, adoptSchedule]);

  /*
   * Skip the rest of the break.
   *
   * The overlay closes because the SERVER moved the schedule on and `position`
   * now reports a module — never because a local flag dismissed it. Keeping
   * that direction is what stops a skipped break putting the candidate on a
   * different clock from the one grading them.
   */
  const handleSkipBreak = useCallback(async () => {
    if (!onBreak || skippingBreak) return;
    setSkippingBreak(true);
    try {
      adoptSchedule(await skipCurrentBreak(exam.id, onBreak.afterModuleIndex));
    } finally {
      setSkippingBreak(false);
    }
  }, [onBreak, skippingBreak, exam.id, adoptSchedule]);

  /*
   * Escape closes the dismissible overlays — the question navigator, the submit
   * confirmation and the finish-section confirmation. Both were mouse-only: a keyboard user who opened the
   * navigator mid-exam had no way back to the paper except tabbing to the close
   * button. The module hand-over card is deliberately excluded; it is an
   * acknowledgement, not something to dismiss by reflex.
   */
  useEffect(() => {
    if (!showGrid && !showConfirm && !showFinishModule) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setShowGrid(false);
      setShowConfirm(false);
      // Cancelling is always safe here; the section is only closed once the
      // server has accepted it, and `finishingModule` gates a second attempt.
      setShowFinishModule(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showGrid, showConfirm, showFinishModule]);

  /*
   * This is an early return, so it renders none of the player's chrome — which
   * means it has to carry its own failure state. Without one, a finalisation
   * that cannot reach the server would spin here indefinitely behind a retry
   * the candidate could neither see nor trigger.
   */
  if (phase === 'expired') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-bg px-6 text-ink">
        {autoSubmitExhausted ? (
          <div className="w-full max-w-md rounded-card border border-error bg-[rgba(162,58,46,0.08)] p-5 text-center">
            <p className="font-display m-0 mb-2 text-lg font-medium text-ink">Nəticə göndərilə bilmədi</p>
            <p className="m-0 mb-5 text-sm leading-relaxed">
              Cavablarınız saxlanılıb, lakin serverə göndərilmədi.
              İnternet bağlantınızı yoxlayıb yenidən cəhd edin.
            </p>
            <Button
              size="none"
              className="justify-center gap-2 px-6 py-3 text-sm"
              onClick={() => {
                submitAttemptsRef.current = 0;
                setAutoSubmitExhausted(false);
              }}
            >
              Yenidən göndər
            </Button>
          </div>
        ) : (
          <>
            <span className="h-11 w-11 animate-spin rounded-full border-[3px] border-rule border-t-ink" />
            <div className="max-w-md text-center">
              <p className="font-display mb-2 text-lg font-medium text-ink">Cəhd bağlanır</p>
              <p className="m-0 text-sm leading-relaxed">
                Bu imtahana 10 dəqiqədən çox ara verildiyi üçün cəhd tamamlanır.
                Verdiyiniz cavablar saxlanılıb və qiymətləndirilir.
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  // A clock is already running: continue it, or throw the attempt away.
  if (phase === 'resume') {
    return (
      <ResumeScreen
        exam={exam}
        remaining={remaining}
        answeredCount={answeredCount}
        totalQuestions={questions.length}
        restarting={restarting}
        onContinue={continueExam}
        onRestart={() => void restartExam()}
      />
    );
  }

  // Until the student presses "Başla" there is no clock and no session, so the
  // briefing is its own screen rather than a branch inside the player.
  if (phase !== 'running') {
    return (
      <BriefingScreen
        exam={exam}
        questions={questions}
        questionsByModule={questionsByModule}
        loading={phase === 'loading'}
        starting={starting}
        hasNoQuestions={hasNoQuestions}
        onStart={startExam}
      />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // `data-ph-mask` blanks every string inside this subtree in PostHog session
    // replays (see the maskTextSelector in instrumentation-client.ts). The whole
    // exam session is the boundary rather than individual question nodes:
    // paid question banks, passages and student answers all live in here, and a
    // per-element list would silently miss whatever gets added next.
    // `select-none` used to sit here as a light anti-copy measure. It is gone:
    // a candidate could not select passage text, which made highlighting
    // impossible and diverged from computer-delivered IELTS and Bluebook, both
    // of which ship a highlighter. It never stopped copying anyway — screenshots
    // and devtools were always available.
    <div data-ph-mask className="min-h-screen bg-bg text-ink">
      {/*
        First focusable element in the DOM, as in every other shell. The exam
        header puts the brand, the navigator, the clock, the calculator, the
        formula sheet and Bitir ahead of the question — a keyboard user re-tabbed
        all of it on every screen change, under a running clock.
      */}
      <SkipLink />

      {/*
        ── Auto-submit gave up ──
        The clock is spent and the paper is frozen either way, but the answers
        are still only on this machine. Say so plainly and leave a way through:
        the header's Bitir button retries by hand.
      */}
      {autoSubmitExhausted && !submitted && (
        <div className="fixed inset-x-0 top-14 z-60 px-4 md:top-16" role="alert">
          <div className="mx-auto max-w-2xl rounded-card border border-error bg-[rgba(162,58,46,0.08)] px-4 py-3">
            <p className="m-0 text-sm font-medium text-ink">
              Vaxt bitdi, lakin nəticə göndərilə bilmədi.
            </p>
            <p className="m-0 mt-1 text-sm leading-relaxed">
              Cavablarınız saxlanılıb. İnternet bağlantınızı yoxlayın və yuxarıdakı
              «Bitir» düyməsi ilə yenidən göndərin.
            </p>
          </div>
        </div>
      )}

      {/* ── Submitting overlay — instant feedback while the result saves + results page loads ── */}
      {submitting && (
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-5 px-6 bg-bg">
          <span
            className="w-11 h-11 rounded-full animate-spin border-[3px] border-rule border-t-ink" />
          <div className="text-center">
            <p className="font-display text-lg font-medium text-ink mb-1">İmtahan tamamlandı</p>
            <p className="text-sm">Nəticələr hazırlanır…</p>
          </div>
        </div>
      )}


      {/*
        ── Scheduled break ──
        Its own window in the session schedule, so the countdown here is the
        BREAK's and none of it comes out of the next module's time. Skippable
        only through the server: `onSkip` rewrites the stored schedule and this
        overlay then closes because `position` reports a module again, never
        because a local flag dismissed it — so a candidate who skips is still on
        exactly the clock the server grades them against.
      */}
      {onBreak && (() => {
        const finished = exam.modules[onBreak.afterModuleIndex];
        const next     = exam.modules[onBreak.nextModuleIndex];
        if (!next) return null;
        return (
          <BreakScreen
            finishedModuleName={finished?.name ?? 'Bölmə'}
            nextModuleName={next.name}
            nextModuleType={next.type}
            nextModuleQuestionCount={questions.filter(q => q.moduleIndex === onBreak.nextModuleIndex).length}
            nextModuleMinutes={next.durationMinutes}
            remaining={onBreak.remaining}
            onSkip={schedule ? handleSkipBreak : undefined}
            skipping={skippingBreak}
          />
        );
      })()}

      {/*
        Both tools are closed by a break rather than left hanging over or under
        it: `onBreak` gates them, so the formula sheet cannot be stranded behind
        the overlay and the calculator cannot float on top of it.
      */}
      {showReference && !onBreak && <ReferenceSheet onClose={() => setShowReference(false)} />}

      {/*
        Kept mounted while open across question navigation, so a candidate does
        not lose a half-typed calculation by moving to the next question.
      */}
      {showCalculator && !onBreak && currentModule?.type === 'math' && (
        <Calculator onClose={() => setShowCalculator(false)} />
      )}

      {/* ── Top bar ── */}
      <header className="bg-bg/88 backdrop-blur-md fixed top-0 w-full z-50 border-b border-rule">
        <div className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            {/*
              Not a link while the exam is running.
              
              One click on the brand mark walked out of a timed sitting. Most of
              the damage is recoverable — the clock is server-side and the draft
              is mirrored — but a listening module's audio claim is already
              spent, so leaving mid-part destroys the recording permanently. The
              way out is the Bitir button, which asks first.
            */}
            {phase === 'running' ? (
              <span className="flex items-center gap-2 shrink-0">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className="font-display text-lg font-normal text-ink hidden sm:block">
                  Test<span>centre</span>
                </span>
              </span>
            ) : (
              <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
                <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className="font-display text-lg font-normal text-ink hidden sm:block">
                  Test<span>centre</span>
                </span>
              </Link>
            )}
            <div className="h-5 w-px shrink-0 hidden sm:block bg-rule"  />
            <div className="flex flex-col min-w-0">
              <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute hidden sm:block">İmtahan Rejimi</span>
              <span className="text-sm font-medium text-ink leading-tight max-w-30 md:max-w-50 truncate">
                {exam.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {!hasNoQuestions && (
              <button
                onClick={() => setShowGrid(g => !g)}
                aria-expanded={showGrid}
                aria-label={`Sual siyahısı — ${questions.length} sualdan ${shownIdx + 1}-cidəsiniz, ${answeredCount}-i cavablandırılıb`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-sm font-medium transition-colors ${
                  showGrid ? 'bg-surface-2' : 'hover:bg-surface-2'
                }`}
              >
                {/*
                  Shows the CURRENT question, matching the counter in the question
                  pane. It used to show the answered count against the same total,
                  so two different numbers sat over the same "/45" and read as a
                  contradiction. The answered count now lives inside the panel this
                  button opens, where it is labelled.
                */}
                <Grid3X3 size={15} />
                <span className="font-mono tabular-nums text-xs">{shownIdx + 1}/{questions.length}</span>
              </button>
            )}
            {/*
              The countdown updates every second, so it must NOT be a live
              region — that would make a screen reader announce it 60× a minute.
              It is labelled for on-demand reading; the low-time warning below
              is what gets announced, once, when it crosses the threshold.
            */}
            <div
              role="timer"
              aria-label="Qalan vaxt"
              /* The urgent tint is `rgba(162,58,46,.08)` verbatim, not `bg-error/8`:
                 --color-error is #8C3A2B (140,58,43), a different red, so a token
                 swap here would silently restyle the last five minutes of an exam. */
              className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 border rounded-full transition-colors ${
                displayRemaining < 300
                  ? 'animate-pulse border-error bg-[rgba(162,58,46,0.08)]'
                  : 'border-rule bg-surface'
              }`}
            >
              <Timer
                size={14}
                aria-hidden="true"
                className={displayRemaining < 300 ? 'text-error' : 'text-ink-soft'}
              />
              <span className={`font-mono tabular-nums text-xs md:text-sm ${
                displayRemaining < 300 ? 'text-error' : 'text-ink'
              }`}>
                {sessionReady ? formatTime(displayRemaining) : '--:--'}
              </span>
            </div>
            <span role="status" aria-live="assertive" className="sr-only">
              {sessionReady && displayRemaining > 0 && displayRemaining < 300
                ? (moduleRemaining !== null
                    ? 'Diqqət: bu bölmənin bitməsinə 5 dəqiqədən az vaxt qalıb.'
                    : 'Diqqət: 5 dəqiqədən az vaxt qalıb.')
                : ''}
            </span>

            {/*
              The formula sheet is on screen for the whole Math section of a real
              Digital SAT, so withholding it here would test memorisation the
              real exam does not.
            */}
            {currentModule?.type === 'math' && (
              <>
                <button
                  onClick={() => setShowCalculator(v => !v)}
                  aria-label="Kalkulyator"
                  aria-pressed={showCalculator}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors md:px-4 md:py-2 md:text-sm ${
                    showCalculator ? 'border-ink bg-ink text-bg' : 'border-rule bg-surface text-ink hover:bg-surface-2'
                  }`}
                >
                  <CalculatorIcon size={14} aria-hidden="true" />
                  <span className="hidden sm:inline">Kalkulyator</span>
                </button>
                <button
                  onClick={() => setShowReference(true)}
                  aria-label="Düstur vərəqi"
                  className="flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-surface-2 md:px-4 md:py-2 md:text-sm"
                >
                  <Sigma size={14} aria-hidden="true" />
                  <span className="hidden sm:inline">Düstur</span>
                </button>
              </>
            )}
            <Button size="none" className="gap-2.5 px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm disabled:opacity-60"
              onClick={() => setShowConfirm(true)}
              disabled={submitting || !sessionReady}
            >
              {submitting ? '...' : 'Bitir'}
            </Button>
          </div>
        </div>

        {!hasNoQuestions && (
          <div className="h-0.5 w-full bg-rule-soft">
            <div
              // A computed percentage cannot be a utility class; the colour can.
              className="h-full bg-ink transition-[width] duration-500 ease-out"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      {showGrid && (
        <QuestionGrid
          questionsByModule={questionsByModule}
          indexById={indexById}
          answerState={answerState}
          flagged={flagged}
          currentIdx={shownIdx}
          openModuleIndex={activeModule}
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          onGoTo={goTo}
          onClose={() => setShowGrid(false)}
        />
      )}

      {showFinishModule && activeModule !== null && (
        <FinishModuleDialog
          moduleName={exam.modules[activeModule]?.name ?? 'Bölmə'}
          nextModuleName={nextModuleName}
          answeredCount={moduleAnsweredCount}
          totalQuestions={moduleQuestions.length}
          remainingLabel={formatTime(Math.max(0, Math.round(position?.phase === 'module' ? position.remaining : 0)))}
          busy={finishingModule}
          onCancel={() => setShowFinishModule(false)}
          onConfirm={handleFinishModule}
        />
      )}

      {showConfirm && (
        <SubmitConfirmDialog
          answeredCount={answeredCount}
          totalQuestions={questions.length}
          submitting={submitting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleSubmit}
        />
      )}

      {/* ── No questions state ── */}
      {hasNoQuestions ? (
        <main id="content" className="pt-14 md:pt-16 min-h-screen flex items-center justify-center">
          <div className="text-center max-w-sm px-6">
            <BookOpen className="mx-auto mb-4 text-ink-mute"  size={48} />
            <h2 className="font-display font-medium text-xl leading-tight tracking-tight text-ink mb-2">Suallar hələ əlavə edilməyib</h2>
            <p className="text-sm mb-6 leading-relaxed">
              Bu imtahan üçün sual bankı hazırlanır. Tezliklə əlçatan olacaq.
            </p>
            <Button href="/dashboard">
              Panelə qayıt
            </Button>
          </div>
        </main>
      ) : (
        // `id="content"` is the SkipLink target every other shell provides.
        <main id="content" className="pt-14 md:pt-16 h-dvh flex flex-col overflow-hidden">

          {/*
            ── Listening audio ──
            ONE player for the whole session, mounted here rather than inside
            the passage and question panes. Those rendered a StrictAudioPlayer
            each, so two <audio> elements carrying the same track existed at
            once against a single server-side played-once flag. Anchored to the
            module whose clock is running (see `moduleAudioUrl`), so navigating
            between questions — or between screens of a blocked part — cannot
            swap the src and cut off a recording that only plays once.
          */}
          {moduleAudioUrl && (
            <div className="shrink-0 border-b border-rule bg-surface-2 px-4 py-3 md:px-6">
              <div className="mx-auto flex max-w-3xl flex-col gap-2">
                <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute">
                  Audio / Dinləmə
                </p>
                <StrictAudioPlayer
                  src={moduleAudioUrl}
                  examId={exam.id}
                  secondsLeftInModule={moduleRemaining}
                />
              </div>
            </div>
          )}

          <div className="flex min-h-0 flex-1 flex-col md:flex-row overflow-hidden">

          {/*
            ── Left panel — passage / diagram / audio (desktop only) ──
            Only rendered when there is actually something to put beside the
            question. Grammar-style items have no companion material, and the
            split view left a permanently empty half-screen next to them.
          */}
          <section
            className={`border-r border-rule bg-surface ${hasSidePanel ? 'hidden md:flex' : 'hidden'} md:w-[45%] flex-col overflow-hidden`}>
            <div className="px-6 py-3 flex justify-between items-center shrink-0 border-b border-rule bg-surface-2">
              <div className="flex items-center gap-2">
                <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute">{currentModule?.name ?? 'Modul'}</span>
                {exam.modules.length > 1 && current && (
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-surface-3 text-ink-soft">
                    {current.moduleIndex + 1}/{exam.modules.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {currentPassage && (
                  <span
                    className="flex items-center gap-1.5 text-xs text-ink-mute"
                    title="Mətni seçərək işarələyin, sonra üzərinə toxunub qeyd əlavə edin"
                  >
                    <Highlighter size={13} aria-hidden="true" />
                    <span className="hidden lg:inline">Seçib işarələyin</span>
                    {highlightsForPassage(highlights, passageKey).length > 0 && (
                      <span className="font-mono tabular-nums">
                        {highlightsForPassage(highlights, passageKey).length}
                      </span>
                    )}
                  </span>
                )}
                <span className="font-mono text-sm tabular-nums">
                  {shownIdx + 1} / {questions.length}
                </span>
              </div>
            </div>

            <div ref={passageScrollRef} className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
              {currentPassage || panelImageUrl ? (
                <article className="max-w-2xl">
                  {/*
                    How many questions this text carries. Without it a student
                    reading a passage has no idea whether it serves one question
                    or six, so they can't budget the read.
                  */}
                  {passageGroup && passageGroup.size > 1 && (
                    <div
                      className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-rule">
                      <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute">Bu mətnə aid {passageGroup.size} sual</span>
                      <span className="font-mono tabular-nums text-xs">
                        {passageGroup.position} / {passageGroup.size}
                      </span>
                    </div>
                  )}
                  {panelImageUrl && (
                    <div className="mb-6">
                      <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute mb-3">📊 Diaqram / Şəkil</p>
                      {/*
                        Diagrams have no fixed aspect ratio. width/height are
                        required props but are inert here: once `sizes` is set
                        with viewport units, next/image builds its srcset from
                        `sizes`, and the rendered size comes from the CSS below.
                        (Next's own recommendation for unknown dimensions is the
                        `fill` prop, but that needs a positioned parent and a
                        fixed container height, which a variable-ratio diagram
                        inside flowing exam content doesn't have.)
                      */}
                      <Image
                        src={panelImageUrl}
                        alt="Sual diaqramı"
                        width={0}
                        height={0}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="w-full h-auto rounded-xl shadow-sm border border-rule" />
                    </div>
                  )}
                  {currentPassage && (
                    <div className="passage-body text-ink max-w-none">
                      <HighlightablePassage
                        text={currentPassage}
                        passageKey={passageKey}
                        highlights={highlights}
                        onCreate={createHighlight}
                        onOpenHighlight={openHighlight}
                        activeId={activeHighlight}
                      />
                    </div>
                  )}
                </article>
              ) : (
                <div>
                  <div className="rounded-card border border-rule bg-surface mb-6 p-7">
                    <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute mb-2">Cari Modul</p>
                    <p className="font-medium text-ink">{currentModule?.name}</p>
                    {currentModule?.instructions && (
                      <p className="text-sm mt-2 leading-relaxed">
                        {currentModule.instructions}
                      </p>
                    )}
                  </div>
                  <div className="rounded-card border border-rule bg-surface p-7">
                    <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute mb-3">Bu Modulun Sualları</p>
                    <div className="flex flex-wrap gap-2">
                      {questions
                        .filter(q => q.moduleIndex === current?.moduleIndex)
                        .map(q => {
                          const idx        = indexById.get(q.id) ?? 0;
                          const isAnswered = isQuestionAnswered(q, answerState);
                          const isFlagged  = flagged.has(q.id);
                          const isCurrent  = idx === shownIdx;
                          return (
                            <button
                              key={q.id}
                              onClick={() => goTo(idx)}
                              className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                                isCurrent ? 'ring-2 ring-offset-1' : ''
                              } ${
                                isAnswered
                                  ? isFlagged ? 'bg-warn text-bg' : 'bg-ink text-bg'
                                  : isFlagged ? 'bg-warn/10 text-warn' : 'bg-surface-2 text-ink-soft'
                              }`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/*
              ── Notes on a highlight ──
              Computer-delivered IELTS attaches a note to a highlight rather
              than offering a free-floating notepad, and that is the more useful
              shape: the note is anchored to the words that prompted it. Stored
              with the session in localStorage — study scaffolding, never graded,
              so it never goes to the server.
            */}
            {activeHighlight && (() => {
              const h = highlights.find(x => x.id === activeHighlight);
              if (!h) return null;
              return (
                <div className="shrink-0 border-t border-rule bg-surface-2 px-6 py-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute">
                      Qeyd
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteHighlight(h.id)}
                        aria-label="İşarələməni sil"
                        className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-surface-3"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => setActiveHighlight(null)}
                        aria-label="Qeydi bağla"
                        className="rounded-lg px-2 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-surface-3"
                      >
                        Bağla
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={2}
                    value={h.note}
                    onChange={e => updateNote(h.id, e.target.value)}
                    placeholder="Bu hissə haqqında qeyd yazın..."
                    aria-label="İşarələnmiş mətn üçün qeyd"
                    className="w-full resize-none rounded-btn border border-rule bg-surface px-3 py-2 font-sans text-sm text-ink outline-none transition-[border-color] duration-200 placeholder:text-ink-mute focus:border-ink"
                  />
                </div>
              );
            })()}
          </section>

          {/* ── Right panel — question ── */}
          <section className="flex-1 flex flex-col overflow-hidden bg-surface">

            {/* Mobile: tab switcher between passage and question */}
            {currentPassage && (
              <div className="md:hidden shrink-0 border-b border-rule bg-surface-2">
                <div className="flex">
                  <button
                    onClick={() => setShowPassage(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                      !showPassage ? 'border-ink text-ink' : 'border-transparent text-ink-soft'
                    }`}
                  >
                    <CheckCircle2 size={13} /> Sual
                  </button>
                  <button
                    onClick={() => setShowPassage(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                      showPassage ? 'border-ink text-ink' : 'border-transparent text-ink-soft'
                    }`}
                  >
                    <FileText size={13} /> Mətn
                  </button>
                </div>
                {showPassage && (
                  <div className="overflow-y-auto px-4 py-4 max-h-[50vh] border-t border-rule">
                    <div className="passage-body text-ink max-w-none">
                      <HighlightablePassage
                        text={currentPassage}
                        passageKey={passageKey}
                        highlights={highlights}
                        onCreate={createHighlight}
                        onOpenHighlight={openHighlight}
                        activeId={activeHighlight}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable question area */}
            {/*
              Single-column mode centres the question in the viewport. A short
              grammar item pinned to the top of a full-height empty pane looks
              stranded. `flex` + `m-auto` on the child rather than
              `justify-center`: auto margins still let a long question scroll
              from its top, where centred justification would clip it.
            */}
            <div
              ref={questionScrollRef}
              className={`flex-1 overflow-y-auto px-4 py-5 md:px-10 md:py-8 no-scrollbar ${
                hasSidePanel ? '' : 'flex flex-col'
              } ${
                currentPassage && showPassage ? 'hidden md:block' : ''
              }`}
            >
              {/*
                Keyed on the question id, so React remounts the block and the
                enter animation replays on every navigation. Changing question
                used to be a silent text substitution with no visible event.
              */}
              {/*
                In single-column mode the bottom padding biases the auto-margin
                centring upward, so the question sits above the true centre —
                which reads as balanced rather than low. Padding rather than
                margin, so a long question still scrolls from its own top.
              */}
              <motion.div
                key={currentScreen
                  ? `${currentScreen.moduleIndex}:${currentScreen.blockId}:${currentScreen.questionIndices[0]}`
                  : shownIdx}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`max-w-2xl ${hasSidePanel ? '' : 'm-auto w-full pb-56'}`}
              >

                {/* Mobile: module label */}
                {currentModule && (
                  <div className="flex items-center gap-2 mb-3 md:hidden">
                    <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute">{currentModule.name}</span>
                    {exam.modules.length > 1 && (
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-surface-2 text-ink-soft">
                        {(current?.moduleIndex ?? 0) + 1}/{exam.modules.length}
                      </span>
                    )}
                  </div>
                )}

                {/*
                  Block header. On a blocked screen the candidate is looking at
                  a whole task, and the first thing they need to know is which
                  question numbers it covers — the recording announces its parts
                  by number ("questions 11 to 15"), so the screen has to agree.
                */}
                {currentScreen && currentScreen.questionIndices.length > 1 && (
                  <div className="mb-5 flex items-center justify-between gap-3 border-b border-rule pb-4">
                    <span className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute">
                      Suallar {currentScreen.questionIndices[0] + 1}–
                      {currentScreen.questionIndices[currentScreen.questionIndices.length - 1] + 1}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-ink-mute">
                      {currentScreen.questionIndices.length} sual
                    </span>
                  </div>
                )}

                {/* Position within a shared-text group — only meaningful one question at a time. */}
                {currentScreen?.questionIndices.length === 1 && passageGroup && passageGroup.size > 1 && (
                  <div className="mb-4">
                    <span
                      className="shrink-0 font-mono text-xs px-2 py-0.5 rounded-full bg-surface-2 text-ink-soft"
                      title={`Bu mətnə aid ${passageGroup.size} sualdan ${passageGroup.position}-cisi`}
                    >
                      Mətn {passageGroup.position}/{passageGroup.size}
                    </span>
                  </div>
                )}

                {/*
                  The open module's text is still in flight. Questions are drawn
                  from content fetched per module, so a blank card here would
                  read as a broken exam rather than as a slow one.
                */}
                {contentLoading && (
                  <div className="flex flex-col items-center gap-3 py-16" role="status" aria-live="polite">
                    <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-rule border-t-ink" />
                    <p className="m-0 text-sm text-ink-mute">Bölmə yüklənir…</p>
                  </div>
                )}

                <div className={contentLoading ? 'hidden' : 'space-y-7'}>
                  {(currentScreen?.questionIndices ?? []).map(qi => {
                    const q = questions[qi];
                    if (!q) return null;
                    return (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        number={qi + 1}
                        answer={answers.get(q.id)}
                        openAnswer={openAnswers.get(q.id) ?? ''}
                        matchingAnswer={matchingAnswers.get(q.id)}
                        flagged={flagged.has(q.id)}
                        onSelect={selectAnswer}
                        onOpenChange={setOpenAnswer}
                        onMatchingChange={setMatchingAnswer}
                        onToggleFlag={toggleFlag}
                        separated={inlineImages}
                        inlineImage={inlineImages}
                      />
                    );
                  })}
                </div>
              </motion.div>
            </div>

            {/*
              ── Footer navigation ──
              Steps by SCREEN, not by question: on a blocked listening part
              "next" means the next part, not the next gap in the form already
              on screen. The end of the last screen only offers Finish when the
              whole paper is reachable — under a schedule the exam ends when the
              clock says so, not when the candidate runs out of screens in the
              module that happens to be open.
            */}
            <footer className="shrink-0 h-16 px-4 md:px-8 flex items-center justify-between border-t border-rule bg-surface-2">
              <button
                onClick={() => goToScreen(-1)}
                disabled={atFirstScreen}
                aria-label={isBlockScreen ? 'Əvvəlki hissə' : 'Əvvəlki sual'}
                className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium text-ink">
                <ChevronLeft size={18} aria-hidden="true" />
                <span className="hidden sm:inline">Əvvəlki</span>
              </button>
              <div className="flex flex-col items-center gap-0.5">
                {moduleScreenCount > 1 && (
                  <span className="font-mono tabular-nums text-xs text-ink">
                    {isBlockScreen ? 'Hissə' : 'Ekran'} {moduleScreenPos} / {moduleScreenCount}
                  </span>
                )}
                <span className="font-mono tabular-nums text-xs text-ink-mute">
                  {sessionReady ? formatTime(elapsed) : '--:--'} keçdi
                </span>
              </div>

              {atLastScreen && !schedule ? (
                <Button size="none" className="gap-1.5 rounded-xl px-4 py-2 text-sm md:gap-2 md:px-6"
                  onClick={() => setShowConfirm(true)}
                  aria-label="İmtahanı bitir"
                >
                  <span className="hidden sm:inline">Bitir</span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Button>
              ) : atLastScreen && isFinalModule ? (
                /*
                  The last section, with time still on its clock. There is no
                  next section to open, so the only move left is the submit in
                  the header — say that rather than showing a second button
                  competing with it.
                */
                <span className="max-w-[45%] text-right text-xs leading-tight text-ink-mute">
                  Son bölmə. Cavablarınızı yoxlayın.
                </span>
              ) : atLastScreen ? (
                /*
                  End of the section's screens with time to spare.

                  This used to read "the section opens when its clock closes",
                  which is what a real exam hall does and the wrong answer for a
                  practice product: a candidate who had finished sat watching a
                  countdown with nothing to do, and the analytics page's pace
                  rating was meaningless because every attempt then ran for
                  exactly the scheduled time. The confirmation spells out that
                  the remaining minutes are forfeited rather than carried over.
                */
                <Button size="none" className="gap-1.5 rounded-xl px-4 py-2 text-sm md:gap-2 md:px-6"
                  onClick={() => setShowFinishModule(true)}
                  aria-label="Bölməni bitir və növbəti bölməyə keç"
                >
                  {/*
                    Label stays visible at every width, and the icon is
                    FastForward rather than ChevronRight, because the button it
                    replaces on the last screen sits in the same corner as
                    "Növbəti". Both hidden behind `sm:` and both carrying a
                    chevron, the two were pixel-identical below 640px — an
                    irreversible action wearing the costume of the one a
                    candidate has already tapped a dozen times.
                  */}
                  <span className="whitespace-nowrap">Bölməni bitir</span>
                  <FastForward size={17} aria-hidden="true" />
                </Button>
              ) : (
                <Button size="none" className="gap-1.5 rounded-xl px-4 py-2 text-sm md:gap-2 md:px-6"
                  onClick={() => goToScreen(1)}
                  aria-label={isBlockScreen ? 'Növbəti hissə' : 'Növbəti sual'}
                >
                  <span className="hidden sm:inline">{isBlockScreen ? 'Növbəti hissə' : 'Növbəti'}</span>
                  <ChevronRight size={18} aria-hidden="true" />
                </Button>
              )}
            </footer>
          </section>
          </div>
        </main>
      )}
    </div>
  );
}
