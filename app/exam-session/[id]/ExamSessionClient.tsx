'use client';

import 'katex/dist/katex.min.css';
import posthog from 'posthog-js';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { saveExamResult } from '@/lib/actions/results';
import { beginExamSession, peekExamSession } from '@/lib/actions/session';
import { markAudioPlayed, checkAudioPlayed } from '@/lib/actions/audio';
import {
  Timer, Flag, ChevronLeft, ChevronRight,
  CheckCircle2, Grid3X3, BookOpen, Pencil, FileText, X,
  Play, Volume2, ArrowRight, Headphones, TriangleAlert, ListChecks, Layers,
} from 'lucide-react';
import { renderMath } from '@/lib/render-math';
import PassageText from '@/components/ui/PassageText';
import type { PublicExam } from '@/lib/db/exams';
import type { SessionQuestion } from '@/lib/actions/questions';

interface Props {
  exam: PublicExam;
  questions: SessionQuestion[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Icon standing in for a module's discipline on the briefing screens. */
function moduleIcon(type: string) {
  switch (type) {
    case 'listening':                   return Headphones;
    case 'writing': case 'analytical':  return Pencil;
    case 'reading': case 'rw':
    case 'verbal':                      return BookOpen;
    case 'grammar':                     return ListChecks;
    default:                            return Layers;
  }
}

function MathText({ text, block = false }: { text: string; block?: boolean }) {
  // Inline uses <span> so it stays valid inside <p> (a <div> child of <p> is
  // invalid HTML and triggers a hydration error).
  if (block) {
    return <div dangerouslySetInnerHTML={{ __html: renderMath(text) }} className="leading-relaxed" />;
  }
  return <span dangerouslySetInnerHTML={{ __html: renderMath(text) }} className="inline leading-normal" />;
}

// ── localStorage helpers ──────────────────────────────────────────────────────

interface SavedSession {
  answers: [string, number][];
  openAnswers: [string, string][];
  matchingAnswers?: [string, string][];
  flagged: string[];
  currentIdx: number;
  /** Modules whose briefing card has already been shown, so a reload doesn't repeat it. */
  seenModules?: number[];
}

function storageKey(examId: string) {
  return `tc-exam-${examId}`;
}

function loadSavedSession(examId: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(storageKey(examId));
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

function persistSession(examId: string, data: SavedSession) {
  try {
    localStorage.setItem(storageKey(examId), JSON.stringify(data));
  } catch {
    // ignore quota / private-browsing errors
  }
}

function clearPersistedSession(examId: string) {
  try {
    localStorage.removeItem(storageKey(examId));
  } catch {
    // ignore
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExamSessionClient({ exam, questions }: Props) {
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
  // 'briefing'  — pre-exam briefing; the clock has NOT started yet
  // 'running'  — questions are on screen and the clock is ticking
  const [phase, setPhase]               = useState<'loading' | 'briefing' | 'running'>('loading');
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
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [showPassage, setShowPassage] = useState(false);
  // Modules already briefed. `moduleIntro` holds the module whose card is on
  // screen right now — the questions behind it stay mounted but covered.
  const [seenModules, setSeenModules] = useState<Set<number>>(new Set());
  const [moduleIntro, setModuleIntro] = useState<{ to: number; from: number | null } | null>(null);

  const totalSeconds = exam.durationMinutes * 60;
  const remaining    = Math.max(0, totalSeconds - elapsed);

  // Restores answers/flags/position saved by a previous visit, and reports the
  // module the student is resuming into so its briefing is not replayed.
  const restoreSavedAnswers = useCallback((): number => {
    const saved = loadSavedSession(exam.id);
    let resumeIdx = 0;
    if (saved) {
      if (saved.answers?.length)     setAnswers(new Map(saved.answers));
      if (saved.openAnswers?.length) setOpenAnswers(new Map(saved.openAnswers));
      if (saved.matchingAnswers?.length) setMatchingAnswers(new Map(saved.matchingAnswers.map(([k, v]) => [k, JSON.parse(v)])));
      if (saved.flagged?.length)     setFlagged(new Set(saved.flagged));
      if (
        typeof saved.currentIdx === 'number' &&
        saved.currentIdx >= 0 &&
        saved.currentIdx < questions.length
      ) {
        resumeIdx = saved.currentIdx;
        setCurrentIdx(resumeIdx);
        currentIdxRef.current = resumeIdx;
      }
    }
    const landingModule = questions[resumeIdx]?.moduleIndex ?? 0;
    // Everything up to and including the landing module counts as briefed: the
    // pre-exam screen already covered the first one, and modules the student has
    // been through were briefed on the way in.
    setSeenModules(new Set([
      ...(saved?.seenModules ?? []),
      ...Array.from({ length: landingModule + 1 }, (_, i) => i),
    ]));
    return resumeIdx;
  }, [exam.id, questions]);

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
      // Reload mid-exam — resume straight into the running clock.
      startedAtRef.current  = new Date(peek.startedAt);
      qEnterTimeRef.current = Date.now();
      setElapsed(peek.elapsed);
      restoreSavedAnswers();
      setSessionReady(true);
      setPhase('running');
    }
    void init();
  }, [exam.id, router, restoreSavedAnswers]);

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
    setElapsed(result.elapsed);
    setSeenModules(new Set([questions[0]?.moduleIndex ?? 0]));
    setSessionReady(true);
    setPhase('running');
    setStarting(false);
  }, [exam.id, questions, starting]);

  // ── Timer — only after server session is confirmed ────────────────────────
  useEffect(() => {
    if (!sessionReady) return;
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
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
      seenModules:     [...seenModules],
    });
  }, [answers, openAnswers, matchingAnswers, flagged, currentIdx, seenModules, sessionReady, exam.id]);

  // ── Core actions ──────────────────────────────────────────────────────────

  const recordCurrentQuestionTime = useCallback(() => {
    const q = questions[currentIdxRef.current];
    if (!q) return;
    const secs = (Date.now() - qEnterTimeRef.current) / 1000;
    qTimeSecsRef.current.set(q.id, (qTimeSecsRef.current.get(q.id) ?? 0) + secs);
    qEnterTimeRef.current = Date.now();
  }, [questions]);

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

  // ── Auto-submit when time runs out ────────────────────────────────────────
  useEffect(() => {
    if (remaining <= 0 && !submitting && !submitted && sessionReady) {
      const id = setTimeout(() => void handleSubmit(), 0);
      return () => clearTimeout(id);
    }
  }, [remaining, submitting, submitted, sessionReady, handleSubmit]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const current        = questions[currentIdx] ?? null;
  const currentModule  = current ? exam.modules[current.moduleIndex] : null;
  const hasNoQuestions = questions.length === 0;

  // One audio URL per module — stable across question navigation within the same module
  const moduleAudioUrl = current
    ? (questions.find(q => q.moduleIndex === current.moduleIndex && q.audioUrl)?.audioUrl ?? null)
    : null;

  // Reading passages are authored once, on the first question of their group.
  // Carry the most recent passage forward within the same module so every
  // question of the group shows its text.
  const currentPassage = useMemo(() => {
    if (!current) return '';
    if (current.passage) return current.passage;
    for (let i = currentIdx - 1; i >= 0; i--) {
      const q = questions[i];
      if (q.moduleIndex !== current.moduleIndex) break;
      if (q.passage) return q.passage;
    }
    return '';
  }, [current, currentIdx, questions]);

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

  const passageGroup = passageGroups[currentIdx] ?? null;

  // Grammar-style questions carry no text, image or audio — there is nothing to
  // put beside them, so the split view collapses to a single centred column.
  const hasSidePanel = !!(currentPassage || current?.imageUrl || moduleAudioUrl);

  // Count answered questions across all types
  const answeredCount = questions.filter(q => {
    if (q.type === 'mcq') return answers.has(q.id);
    if (q.type === 'open') return !!(openAnswers.get(q.id)?.trim());
    if (q.type === 'matching') return matchingAnswers.has(q.id);
    if (q.type === 'writing') return !!(openAnswers.get(q.id)?.trim());
    return false;
  }).length;

  const questionsByModule = exam.modules.map((mod, modIdx) => ({
    mod, modIdx,
    qs: questions.filter(q => q.moduleIndex === modIdx),
  }));

  function selectAnswer(questionId: string, optionIdx: number) {
    setAnswers(prev => new Map(prev).set(questionId, optionIdx));
  }

  function toggleFlag(questionId: string) {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId); else next.add(questionId);
      return next;
    });
  }

  function goTo(idx: number) {
    // Captured before the ref moves, so the hand-over card can name the module
    // actually being left rather than assuming linear order.
    const fromModule = questions[currentIdxRef.current]?.moduleIndex ?? null;
    recordCurrentQuestionTime();
    const newIdx = Math.max(0, Math.min(questions.length - 1, idx));
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

    // Crossing into a module for the first time: hand over with a briefing card
    // instead of silently swapping the question text. Fires once per module, so
    // paging back and forth over the boundary doesn't nag.
    const targetModule = questions[newIdx]?.moduleIndex;
    if (typeof targetModule === 'number' && !seenModules.has(targetModule)) {
      setModuleIntro({ to: targetModule, from: fromModule === targetModule ? null : fromModule });
    }
  }

  function dismissModuleIntro() {
    if (moduleIntro == null) return;
    setSeenModules(prev => new Set(prev).add(moduleIntro.to));
    setModuleIntro(null);
    qEnterTimeRef.current = Date.now(); // don't bill briefing time to the question
  }

  // ── Pre-exam: loading / briefing ──────────────────────────────────────────
  // Rendered instead of the player, because until the student presses "Başla"
  // there is no clock and no session — nothing to show a question against.
  if (phase !== 'running') {
    return (
      <div className="min-h-dvh flex flex-col" style={{ background: "var(--color-bg)", color: "var(--color-ink)" }}>
        <header className="h-14 md:h-16 px-4 md:px-8 flex items-center shrink-0" style={{ borderBottom: "1px solid var(--color-rule)" }}>
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="dot" />
            <span className="font-display text-[18px] font-normal text-ink">Test<span>centre</span></span>
          </Link>
        </header>

        {phase === 'loading' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <span
              className="w-9 h-9 rounded-full animate-spin"
              style={{ border: "3px solid var(--color-rule)", borderTopColor: "var(--color-ink)" }}
            />
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Hazırlanır…</p>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-5 py-10 md:py-14">

              <div className="flex items-center gap-2 mb-4">
                <span className="tag tag-accent">{exam.tag}</span>
                <span className="eyebrow">İmtahan brifinqi</span>
              </div>

              <h1
                className="font-display font-normal text-ink m-0 mb-3"
                style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.08, letterSpacing: '-0.02em' }}
              >
                {exam.title}
              </h1>
              <p className="text-[15px] leading-[1.6] m-0 mb-8" style={{ color: "var(--color-ink-soft)" }}>
                Başlamazdan əvvəl imtahanın quruluşunu nəzərdən keçirin. Vaxt yalnız
                aşağıdakı düyməyə basdıqdan sonra işləməyə başlayacaq.
              </p>

              {/* Headline numbers */}
              <div className="grid grid-cols-3 gap-4 border-y py-6 mb-8" style={{ borderColor: "var(--color-rule)" }}>
                <div>
                  <div className="eyebrow mb-2">Müddət</div>
                  <div className="t-num text-ink" style={{ fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1 }}>
                    {exam.durationMinutes}<span className="text-[14px] ml-1" style={{ color: "var(--color-ink-mute)" }}>dəq</span>
                  </div>
                </div>
                <div className="border-l pl-5" style={{ borderColor: "var(--color-rule)" }}>
                  <div className="eyebrow mb-2">Sual</div>
                  <div className="t-num text-ink" style={{ fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1 }}>
                    {questions.length}
                  </div>
                </div>
                <div className="border-l pl-5" style={{ borderColor: "var(--color-rule)" }}>
                  <div className="eyebrow mb-2">Bölmə</div>
                  <div className="t-num text-ink" style={{ fontSize: 'clamp(22px, 3vw, 30px)', lineHeight: 1 }}>
                    {exam.modules.length}
                  </div>
                </div>
              </div>

              {/* Module breakdown */}
              <p className="eyebrow mb-3">İmtahanın quruluşu</p>
              <ol className="list-none p-0 m-0 space-y-2 mb-8">
                {questionsByModule.map(({ mod, modIdx, qs }) => {
                  const Icon = moduleIcon(mod.type);
                  return (
                    <li
                      key={modIdx}
                      className="flex items-start gap-4 p-4 rounded-2xl"
                      style={{ background: "var(--color-surface)", border: "1px solid var(--color-rule)" }}
                    >
                      <span
                        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: "var(--color-surface-2)", color: "var(--color-ink-soft)" }}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="t-mono text-xs" style={{ color: "var(--color-ink-mute)" }}>
                            {String(modIdx + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-medium text-ink">{mod.name}</span>
                        </div>
                        <p className="text-xs mt-1 m-0" style={{ color: "var(--color-ink-mute)" }}>
                          {qs.length > 0 ? `${qs.length} sual` : 'Açıq tapşırıq'}
                          {mod.durationMinutes > 0 && ` · təxminən ${mod.durationMinutes} dəq`}
                        </p>
                        {mod.instructions && (
                          <p className="text-xs mt-2 mb-0 leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                            {mod.instructions}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Rules */}
              <div
                className="rounded-2xl p-5 mb-8"
                style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-rule)" }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <TriangleAlert size={14} style={{ color: "var(--color-warn)" }} />
                  <span className="eyebrow">Başlamazdan əvvəl</span>
                </div>
                <ul className="list-none p-0 m-0 space-y-2 text-xs leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                  <li>· Vaxt serverdə saxlanılır — səhifəni yeniləmək və ya bağlamaq sayğacı dayandırmır.</li>
                  <li>· Vaxt bitdikdə imtahan avtomatik təhvil verilir.</li>
                  <li>· Cavablarınız avtomatik yadda saxlanılır; qayıdanda qaldığınız yerdən davam edirsiniz.</li>
                  {questions.some(q => q.audioUrl) && (
                    <li>· Dinləmə audioları <span className="font-medium text-ink">yalnız bir dəfə</span> oxunur — dayandırmaq və geri sarmaq mümkün deyil.</li>
                  )}
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={startExam}
                  disabled={starting || hasNoQuestions}
                  className="btn-primary justify-center py-3.5 px-8 text-[15px] disabled:opacity-60"
                >
                  {starting ? 'Başladılır…' : 'Başla'}
                  {!starting && <ArrowRight size={17} />}
                </button>
                <Link
                  href="/dashboard"
                  className="btn-ghost justify-center py-3.5 px-6 text-[15px]"
                >
                  Panelə qayıt
                </Link>
              </div>
              {hasNoQuestions && (
                <p className="text-xs mt-3 m-0" style={{ color: "var(--color-warn)" }}>
                  Bu imtahan üçün sual bankı hələ hazırlanır.
                </p>
              )}
            </div>
          </main>
        )}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // `data-ph-mask` blanks every string inside this subtree in PostHog session
    // replays (see the maskTextSelector in instrumentation-client.ts). The whole
    // exam session is the boundary rather than individual question nodes:
    // paid question banks, passages and student answers all live in here, and a
    // per-element list would silently miss whatever gets added next.
    <div data-ph-mask className="select-none min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-ink)" }}>

      {/* ── Submitting overlay — instant feedback while the result saves + results page loads ── */}
      {submitting && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 px-6" style={{ background: "var(--color-bg)" }}>
          <span
            className="w-11 h-11 rounded-full animate-spin"
            style={{ border: "3px solid var(--color-rule)", borderTopColor: "var(--color-ink)" }}
          />
          <div className="text-center">
            <p className="font-display text-lg font-medium text-ink mb-1">İmtahan tamamlandı</p>
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>Nəticələr hazırlanır…</p>
          </div>
        </div>
      )}

      {/*
        ── Module hand-over ──
        Crossing a module boundary used to be a silent text swap, so students
        did not register that Grammar had ended and Reading had begun. The clock
        keeps running behind this card — it is an orientation beat, not a break.
      */}
      <AnimatePresence>
        {moduleIntro && (() => {
          const from     = moduleIntro.from != null ? exam.modules[moduleIntro.from] : null;
          const to       = exam.modules[moduleIntro.to];
          const toQs     = questions.filter(q => q.moduleIndex === moduleIntro.to);
          const fromQs   = moduleIntro.from != null ? questions.filter(q => q.moduleIndex === moduleIntro.from) : [];
          const fromDone = fromQs.filter(q =>
            q.type === 'mcq' ? answers.has(q.id)
              : q.type === 'matching' ? matchingAnswers.has(q.id)
              : !!(openAnswers.get(q.id)?.trim())
          ).length;
          const Icon = moduleIcon(to?.type ?? '');
          if (!to) return null;
          return (
            <motion.div
              key={moduleIntro.to}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-90 flex items-center justify-center p-5 overflow-y-auto"
              style={{ background: "var(--color-bg)" }}
              role="dialog"
              aria-modal="true"
              aria-label={`${to.name} bölməsi başlayır`}
            >
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.05, ease: 'easeOut' }}
                className="w-full max-w-lg text-center"
              >
                {from && (
                  <div className="mb-8 pb-8" style={{ borderBottom: "1px solid var(--color-rule)" }}>
                    <CheckCircle2 size={20} className="mx-auto mb-3" style={{ color: "var(--color-ok)" }} />
                    <p className="text-sm font-medium text-ink m-0">{from.name} bölməsi bitdi</p>
                    {fromQs.length > 0 && (
                      <p className="text-xs mt-1 m-0" style={{ color: "var(--color-ink-mute)" }}>
                        {fromQs.length} sualdan {fromDone}-i cavablandırıldı
                      </p>
                    )}
                  </div>
                )}

                <span
                  className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5"
                  style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}
                >
                  <Icon size={22} />
                </span>

                <p className="eyebrow mb-3">
                  Bölmə {moduleIntro.to + 1} / {exam.modules.length}
                </p>
                <h2
                  className="font-display font-normal text-ink m-0 mb-3"
                  style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', lineHeight: 1.1, letterSpacing: '-0.02em' }}
                >
                  {to.name} başlayır
                </h2>
                <p className="text-sm m-0 mb-6" style={{ color: "var(--color-ink-soft)" }}>
                  {toQs.length > 0 ? `${toQs.length} sual` : 'Açıq tapşırıq'}
                  {to.durationMinutes > 0 && ` · təxminən ${to.durationMinutes} dəq`}
                </p>

                {to.instructions && (
                  <div
                    className="rounded-2xl p-4 mb-7 text-left"
                    style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-rule)" }}
                  >
                    <p className="eyebrow mb-2">Təlimat</p>
                    <p className="text-xs leading-relaxed m-0" style={{ color: "var(--color-ink-soft)" }}>
                      {to.instructions}
                    </p>
                  </div>
                )}

                <button onClick={dismissModuleIntro} className="btn-primary justify-center py-3.5 px-8 text-[15px]">
                  Davam et <ArrowRight size={17} />
                </button>
                <p className="text-[11px] mt-4 m-0" style={{ color: "var(--color-ink-mute)" }}>
                  Vaxt işləməyə davam edir.
                </p>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ── Top bar ── */}
      <header className="fixed top-0 w-full z-50 nav-frosted" style={{ borderBottom: "1px solid var(--color-rule)" }}>
        <div className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <span className="dot" />
              <span className="font-display text-[18px] font-normal text-ink hidden sm:block">
                Test<span>centre</span>
              </span>
            </Link>
            <div className="h-5 w-px shrink-0 hidden sm:block" style={{ background: "var(--color-rule)" }} />
            <div className="flex flex-col min-w-0">
              <span className="eyebrow hidden sm:block">İmtahan Rejimi</span>
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
                aria-label={`Sual siyahısı — ${questions.length} sualdan ${currentIdx + 1}-cidəsiniz, ${answeredCount}-i cavablandırılıb`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-sm font-medium transition-colors ${
                  showGrid ? 'bg-surface-2' : 'hover:bg-surface-2'
                }`}
                style={{ color: "var(--color-ink-soft)" }}
              >
                {/*
                  Shows the CURRENT question, matching the counter in the question
                  pane. It used to show the answered count against the same total,
                  so two different numbers sat over the same "/45" and read as a
                  contradiction. The answered count now lives inside the panel this
                  button opens, where it is labelled.
                */}
                <Grid3X3 size={15} />
                <span className="t-mono tabular-nums text-xs">{currentIdx + 1}/{questions.length}</span>
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
              className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 border rounded-full transition-all ${
                remaining < 300 ? 'animate-pulse' : ''
              }`}
              style={{
                background: remaining < 300 ? "rgba(162,58,46,0.08)" : "var(--color-surface)",
                borderColor: remaining < 300 ? "var(--color-error)" : "var(--color-rule)",
              }}
            >
              <Timer
                size={14}
                aria-hidden="true"
                style={{ color: remaining < 300 ? "var(--color-error)" : "var(--color-ink-soft)" }}
              />
              <span className="t-mono tabular-nums text-xs md:text-sm" style={{
                color: remaining < 300 ? "var(--color-error)" : "var(--color-ink)",
              }}>
                {sessionReady ? formatTime(remaining) : '--:--'}
              </span>
            </div>
            <span role="status" aria-live="assertive" className="sr-only">
              {sessionReady && remaining > 0 && remaining < 300 ? 'Diqqət: 5 dəqiqədən az vaxt qalıb.' : ''}
            </span>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={submitting || !sessionReady}
              className="btn-primary px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm disabled:opacity-60"
            >
              {submitting ? '...' : 'Bitir'}
            </button>
          </div>
        </div>

        {!hasNoQuestions && (
          <div className="h-0.5 w-full" style={{ background: "var(--color-rule-soft)" }}>
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${(answeredCount / questions.length) * 100}%`, background: "var(--color-ink)" }}
            />
          </div>
        )}
      </header>

      {/* ── Question grid overlay ── */}
      {showGrid && (
        <div
          className="fixed inset-0 z-40 pt-14 md:pt-16"
          style={{ background: "rgba(26,26,26,0.2)" }}
          onClick={() => setShowGrid(false)}
        >
          <div
            className="absolute right-0 top-14 md:top-16 bottom-0 w-full max-w-xs overflow-y-auto"
            style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--color-rule)" }}>
              <div>
                <p className="text-sm font-medium text-ink">Sual navigasiyası</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--color-ink-soft)" }}>
                  {answeredCount}/{questions.length} cavablandı
                  {flagged.size > 0 && ` · ${flagged.size} işarəli`}
                </p>
              </div>
              <button
                onClick={() => setShowGrid(false)}
                aria-label="Sual siyahısını bağla"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--color-ink-soft)" }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 space-y-5">
              {questionsByModule.map(({ mod, modIdx, qs }) => (
                <div key={modIdx}>
                  <p className="eyebrow mb-2">{mod.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {qs.map(q => {
                      const globalIdx  = questions.indexOf(q);
                      const isAnswered = q.type === 'mcq' ? answers.has(q.id)
                        : (q.type === 'open' || q.type === 'writing') ? !!(openAnswers.get(q.id)?.trim())
                        : q.type === 'matching' ? matchingAnswers.has(q.id)
                        : false;
                      const isFlagged  = flagged.has(q.id);
                      const isCurrent  = globalIdx === currentIdx;
                      return (
                        <button
                          key={q.id}
                          onClick={() => goTo(globalIdx)}
                          aria-current={isCurrent ? 'true' : undefined}
                          aria-label={`Sual ${globalIdx + 1}${isAnswered ? ' — cavablandırılıb' : ' — cavablandırılmayıb'}${isFlagged ? ', işarələnib' : ''}`}
                          className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${isCurrent ? 'ring-2 ring-offset-1' : ''}`}
                          style={{
                            background: isAnswered
                              ? isFlagged ? "var(--color-warn)" : "var(--color-ink)"
                              : isFlagged ? "rgba(184,115,43,0.1)" : "var(--color-surface-2)",
                            color: isAnswered ? "var(--color-bg)"
                              : isFlagged ? "var(--color-warn)" : "var(--color-ink-soft)",
                            border: isFlagged && !isAnswered ? "1px solid var(--color-warn)" : "none",
                          }}
                        >
                          {globalIdx + 1}
                        </button>
                      );
                    })}
                    {qs.length === 0 && (
                      <p className="text-xs" style={{ color: "var(--color-ink-mute)" }}>Bu modulda sual yoxdur</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 flex flex-wrap gap-3 text-xs" style={{ borderTop: "1px solid var(--color-rule)", color: "var(--color-ink-soft)" }}>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded inline-block" style={{ background: "var(--color-ink)" }} /> Cavablandı
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded inline-block" style={{ background: "var(--color-warn)" }} /> İşarəli
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded inline-block" style={{ background: "var(--color-surface-2)" }} /> Cavabsız
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm submit dialog ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(26,26,26,0.4)" }}>
          <div className="rounded-2xl p-6 md:p-8 max-w-sm w-full text-center" style={{ background: "var(--color-surface)", boxShadow: "var(--shadow-lg)" }}>
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--color-accent-soft)" }}>
              <CheckCircle2 style={{ color: "var(--color-ink)" }} size={24} />
            </div>
            <h3 className="t-title mb-3">İmtahanı bitirirsiniz?</h3>
            <div className="text-sm mb-2" style={{ color: "var(--color-ink-soft)" }}>
              <p>
                <span className="font-medium text-ink">{answeredCount}</span> / {questions.length} sual cavablandı.
              </p>
              {questions.length - answeredCount > 0 && (
                <p className="mt-1 font-medium" style={{ color: "var(--color-warn)" }}>
                  {questions.length - answeredCount} sual cavabsız qalır.
                </p>
              )}
            </div>
            <p className="text-xs mb-6" style={{ color: "var(--color-ink-mute)" }}>
              Bu əməliyyat geri qaytarıla bilməz.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
                style={{ border: "1px solid var(--color-rule)", color: "var(--color-ink-soft)" }}
              >
                Davam et
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl text-sm font-medium btn-primary disabled:opacity-60"
              >
                {submitting ? 'Göndərilir...' : 'Bitir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── No questions state ── */}
      {hasNoQuestions ? (
        <main className="pt-14 md:pt-16 min-h-screen flex items-center justify-center">
          <div className="text-center max-w-sm px-6">
            <BookOpen className="mx-auto mb-4" style={{ color: "var(--color-ink-mute)" }} size={48} />
            <h2 className="t-title mb-2">Suallar hələ əlavə edilməyib</h2>
            <p className="text-sm mb-6 leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
              Bu imtahan üçün sual bankı hazırlanır. Tezliklə əlçatan olacaq.
            </p>
            <Link href="/dashboard" className="btn-primary">
              Panelə qayıt
            </Link>
          </div>
        </main>
      ) : (
        <main className="pt-14 md:pt-16 h-dvh flex flex-col md:flex-row overflow-hidden">

          {/*
            ── Left panel — passage / diagram / audio (desktop only) ──
            Only rendered when there is actually something to put beside the
            question. Grammar-style items have no companion material, and the
            split view left a permanently empty half-screen next to them.
          */}
          <section
            className={`${hasSidePanel ? 'hidden md:flex' : 'hidden'} md:w-[45%] flex-col overflow-hidden`}
            style={{ borderRight: "1px solid var(--color-rule)", background: "var(--color-surface)" }}
          >
            <div className="px-6 py-3 flex justify-between items-center shrink-0" style={{ borderBottom: "1px solid var(--color-rule)", background: "var(--color-surface-2)" }}>
              <div className="flex items-center gap-2">
                <span className="eyebrow">{currentModule?.name ?? 'Modul'}</span>
                {exam.modules.length > 1 && current && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-surface-3)", color: "var(--color-ink-soft)" }}>
                    {current.moduleIndex + 1}/{exam.modules.length}
                  </span>
                )}
              </div>
              <span className="t-mono tabular-nums" style={{ color: "var(--color-ink-soft)" }}>
                {currentIdx + 1} / {questions.length}
              </span>
            </div>

            {/* Audio player anchored at module level — persists across question navigation */}
            {moduleAudioUrl && (
              <div className="px-6 py-3 border-b border-slate-100 bg-surface-container-low shrink-0">
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">🎧 Audio / Dinləmə</p>
                <StrictAudioPlayer src={moduleAudioUrl} examId={exam.id} />
              </div>
            )}

            <div ref={passageScrollRef} className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
              {currentPassage || current?.imageUrl ? (
                <article className="max-w-2xl">
                  {/*
                    How many questions this text carries. Without it a student
                    reading a passage has no idea whether it serves one question
                    or six, so they can't budget the read.
                  */}
                  {passageGroup && passageGroup.size > 1 && (
                    <div
                      className="flex items-center justify-between gap-3 mb-5 pb-4"
                      style={{ borderBottom: "1px solid var(--color-rule)" }}
                    >
                      <span className="eyebrow">Bu mətnə aid {passageGroup.size} sual</span>
                      <span className="t-mono tabular-nums text-xs" style={{ color: "var(--color-ink-soft)" }}>
                        {passageGroup.position} / {passageGroup.size}
                      </span>
                    </div>
                  )}
                  {current?.imageUrl && (
                    <div className="mb-6">
                      <p className="eyebrow mb-3">📊 Diaqram / Şəkil</p>
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
                        src={current.imageUrl}
                        alt="Sual diaqramı"
                        width={0}
                        height={0}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="w-full h-auto rounded-xl shadow-sm"
                        style={{ border: "1px solid var(--color-rule)" }}
                      />
                    </div>
                  )}
                  {currentPassage && (
                    <div className="passage-body text-[15px] max-w-none" style={{ color: "var(--color-ink)" }}>
                      <PassageText text={currentPassage} />
                    </div>
                  )}
                </article>
              ) : (
                <div>
                  <div className="card-new mb-6">
                    <p className="eyebrow mb-2">Cari Modul</p>
                    <p className="font-medium text-ink">{currentModule?.name}</p>
                    {currentModule?.instructions && (
                      <p className="text-xs mt-2 leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                        {currentModule.instructions}
                      </p>
                    )}
                  </div>
                  <div className="card-new">
                    <p className="eyebrow mb-3">Bu Modulun Sualları</p>
                    <div className="flex flex-wrap gap-1.5">
                      {questions
                        .filter(q => q.moduleIndex === current?.moduleIndex)
                        .map(q => {
                          const idx        = questions.indexOf(q);
                          const isAnswered = q.type === 'mcq' ? answers.has(q.id)
                            : (q.type === 'open' || q.type === 'writing') ? !!(openAnswers.get(q.id)?.trim())
                            : q.type === 'matching' ? matchingAnswers.has(q.id)
                            : false;
                          const isFlagged  = flagged.has(q.id);
                          const isCurrent  = idx === currentIdx;
                          return (
                            <button
                              key={q.id}
                              onClick={() => goTo(idx)}
                              className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${isCurrent ? 'ring-2 ring-offset-1' : ''}`}
                              style={{
                                background: isAnswered
                                  ? isFlagged ? "var(--color-warn)" : "var(--color-ink)"
                                  : isFlagged ? "rgba(184,115,43,0.1)" : "var(--color-surface-2)",
                                color: isAnswered ? "var(--color-bg)"
                                  : isFlagged ? "var(--color-warn)" : "var(--color-ink-soft)",
                              }}
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
          </section>

          {/* ── Right panel — question ── */}
          <section className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--color-surface)" }}>

            {/* Mobile audio player */}
            {moduleAudioUrl && (
              <div className="md:hidden p-4 shrink-0 z-10" style={{ background: "var(--color-surface-2)", borderBottom: "1px solid var(--color-rule)" }}>
                <StrictAudioPlayer src={moduleAudioUrl} examId={exam.id} />
              </div>
            )}

            {/* Mobile: tab switcher between passage and question */}
            {currentPassage && (
              <div className="md:hidden shrink-0" style={{ borderBottom: "1px solid var(--color-rule)", background: "var(--color-surface-2)" }}>
                <div className="flex">
                  <button
                    onClick={() => setShowPassage(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors"
                    style={{
                      borderColor: !showPassage ? "var(--color-ink)" : "transparent",
                      color: !showPassage ? "var(--color-ink)" : "var(--color-ink-soft)",
                    }}
                  >
                    <CheckCircle2 size={13} /> Sual
                  </button>
                  <button
                    onClick={() => setShowPassage(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors"
                    style={{
                      borderColor: showPassage ? "var(--color-ink)" : "transparent",
                      color: showPassage ? "var(--color-ink)" : "var(--color-ink-soft)",
                    }}
                  >
                    <FileText size={13} /> Mətn
                  </button>
                </div>
                {showPassage && (
                  <div className="overflow-y-auto px-4 py-4 max-h-[50vh]" style={{ borderTop: "1px solid var(--color-rule)" }}>
                    <div className="passage-body text-sm max-w-none" style={{ color: "var(--color-ink)" }}>
                      <PassageText text={currentPassage} />
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
                key={current?.id ?? currentIdx}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className={`max-w-2xl ${hasSidePanel ? '' : 'm-auto w-full pb-56'}`}
              >

                {/* Mobile: module label */}
                {currentModule && (
                  <div className="flex items-center gap-2 mb-3 md:hidden">
                    <span className="eyebrow">{currentModule.name}</span>
                    {exam.modules.length > 1 && (
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "var(--color-surface-2)", color: "var(--color-ink-soft)" }}>
                        {(current?.moduleIndex ?? 0) + 1}/{exam.modules.length}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4 md:mb-5 gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-medium text-xs md:text-sm shrink-0" style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}>
                      {currentIdx + 1}
                    </span>
                    <span className="text-xs md:text-sm truncate" style={{ color: "var(--color-ink-soft)" }}>
                      {current?.type === 'open' ? 'Açıq tapşırıq'
                        : current?.type === 'matching' ? 'Uyğunlaşdırma'
                        : current?.type === 'writing' ? 'Yazı tapşırığı'
                        : 'Çoxseçimli'}
                    </span>
                    {/* Position within the shared-text group, visible from the question side too. */}
                    {passageGroup && passageGroup.size > 1 && (
                      <span
                        className="shrink-0 t-mono text-[10px] px-2 py-0.5 rounded-full"
                        style={{ background: "var(--color-surface-2)", color: "var(--color-ink-soft)" }}
                        title={`Bu mətnə aid ${passageGroup.size} sualdan ${passageGroup.position}-cisi`}
                      >
                        Mətn {passageGroup.position}/{passageGroup.size}
                      </span>
                    )}
                  </div>
                  {current && (
                    <button
                      onClick={() => toggleFlag(current.id)}
                      aria-pressed={flagged.has(current.id)}
                      aria-label="Bu sualı sonra baxmaq üçün işarələ"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
                      style={{
                        background: flagged.has(current.id) ? "rgba(184,115,43,0.1)" : "transparent",
                        color: flagged.has(current.id) ? "var(--color-warn)" : "var(--color-ink-soft)",
                        border: `1px solid ${flagged.has(current.id) ? "var(--color-warn)" : "transparent"}`,
                      }}
                    >
                      <Flag size={12} /> {flagged.has(current.id) ? 'İşarəli' : 'İşarələ'}
                    </button>
                  )}
                </div>

                {/*
                  `whitespace-pre-line` lets a stem carry real paragraph breaks.
                  renderMath escapes its input and emits no <br>, so authored
                  newlines used to collapse — running trailing notes ("NB There
                  are more headings than paragraphs…") straight on from the
                  instruction they qualify.
                */}
                {current && (
                  <div className="text-sm md:text-base leading-relaxed mb-5 md:mb-7 whitespace-pre-line" style={{ color: "var(--color-ink)" }}>
                    <MathText text={current.stem} block />
                  </div>
                )}

                {current?.type === 'mcq' && (
                  <div className="space-y-2 md:space-y-2.5">
                    {current.options.map((opt, i) => {
                      const selected = answers.get(current.id) === i;
                      return (
                        <button
                          key={i}
                          onClick={() => selectAnswer(current.id, i)}
                          className="w-full flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl transition-all text-left"
                          style={{
                            border: `1.5px solid ${selected ? "var(--color-ink)" : "var(--color-rule)"}`,
                            background: selected ? "rgba(26,26,26,0.04)" : "var(--color-surface)",
                          }}
                        >
                          <span
                            className="shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs font-medium mt-0.5 transition-all"
                            style={{
                              background: selected ? "var(--color-ink)" : "var(--color-surface-2)",
                              color: selected ? "var(--color-bg)" : "var(--color-ink-soft)",
                            }}
                          >
                            {OPTION_LABELS[i]}
                          </span>
                          <div className="text-sm leading-relaxed flex-1 pt-0.5" style={{ color: "var(--color-ink)" }}>
                            <MathText text={opt} />
                          </div>
                          {selected && <CheckCircle2 size={15} className="shrink-0 mt-0.5" style={{ color: "var(--color-ink)" }} />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {current?.type === 'open' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-rule)" }}>
                      <Pencil size={13} className="shrink-0" style={{ color: "var(--color-ink-soft)" }} />
                      <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>Bu açıq tapşırıqdır. Cavabınızı daxil edin. Cavab avtomatik qiymətləndiriləcək.</p>
                    </div>
                    <textarea
                      rows={2}
                      value={openAnswers.get(current.id) ?? ''}
                      onChange={e => setOpenAnswers(prev => new Map(prev).set(current.id, e.target.value))}
                      placeholder="Cavabınızı burada yazın..."
                      className="input-new resize-none"
                      style={{ fontFamily: "var(--font-sans)" }}
                    />
                  </div>
                )}

                {/* ── Matching question ── */}
                {current?.type === 'matching' && current.matchItems && current.matchItems.length > 0 && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl flex items-center gap-2" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-rule)" }}>
                      <Grid3X3 size={13} className="shrink-0" style={{ color: "var(--color-ink-soft)" }} />
                      <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>Hər element üçün uyğun cavabı seçin.</p>
                    </div>
                    <div className="space-y-2.5">
                      {current.matchItems.map((item, itemIdx) => {
                        const currentMatchAnswers = matchingAnswers.get(current.id) ?? [];
                        const selectedValue = currentMatchAnswers[itemIdx] ?? -1;
                        return (
                          <div key={itemIdx} className="flex items-start gap-3 p-3 rounded-xl" style={{ border: "1px solid var(--color-rule)", background: "var(--color-surface-2)" }}>
                            <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium mt-0.5" style={{ background: "var(--color-surface-3)", color: "var(--color-ink-soft)" }}>
                              {itemIdx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm mb-2 leading-relaxed" style={{ color: "var(--color-ink)" }}>
                                <MathText text={item} />
                              </p>
                              <select
                                value={selectedValue}
                                onChange={e => {
                                  const val = parseInt(e.target.value);
                                  setMatchingAnswers(prev => {
                                    const next = new Map(prev);
                                    const arr = [...(next.get(current.id) ?? new Array(current.matchItems!.length).fill(-1))];
                                    arr[itemIdx] = val;
                                    next.set(current.id, arr);
                                    return next;
                                  });
                                }}
                                className="input-new text-sm"
                                style={{ borderColor: selectedValue >= 0 ? "var(--color-ink)" : "var(--color-rule)" }}
                              >
                                <option value={-1}>— Seçin —</option>
                                {current.options.map((opt, optIdx) => (
                                  <option key={optIdx} value={optIdx}>{OPTION_LABELS[optIdx]}. {opt}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Writing question ── */}
                {current?.type === 'writing' && (() => {
                  const essay = openAnswers.get(current.id) ?? '';
                  const words = essay.trim() ? essay.trim().split(/\s+/).length : 0;
                  const minW = current.minWords ?? 0;
                  const maxW = current.maxWords ?? 0;
                  const belowMin = minW > 0 && words < minW;
                  const aboveMax = maxW > 0 && words > maxW;
                  return (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl flex items-start gap-2" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-rule)" }}>
                        <Pencil size={13} className="shrink-0 mt-0.5" style={{ color: "var(--color-ink-soft)" }} />
                        <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>
                          Bu yazı tapşırığıdır. Cavabınız tamamlandıqdan sonra AI tərəfindən qiymətləndiriləcəkdir.
                          {minW > 0 && ` Minimum: ${minW} söz.`}
                          {maxW > 0 && ` Maksimum: ${maxW} söz.`}
                        </p>
                      </div>
                      {current.rubric && (
                        <div className="p-3 rounded-xl" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-rule)" }}>
                          <p className="eyebrow mb-1">Qiymətləndirmə meyarları</p>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--color-ink-soft)" }}>{current.rubric}</p>
                        </div>
                      )}
                      <textarea
                        rows={10}
                        value={essay}
                        onChange={e => setOpenAnswers(prev => new Map(prev).set(current.id, e.target.value))}
                        placeholder="Cavabınızı burada yazın..."
                        className="input-new resize-y leading-relaxed"
                        style={{ fontFamily: "var(--font-sans)" }}
                      />
                      <div
                        className="flex items-center justify-between text-xs font-medium px-1"
                        style={{ color: belowMin ? "var(--color-warn)" : aboveMax ? "var(--color-error)" : "var(--color-ink-mute)" }}
                      >
                        <span>{words} söz</span>
                        {minW > 0 && maxW > 0 && <span>{minW}–{maxW} söz tövsiyə olunur</span>}
                        {minW > 0 && maxW === 0 && <span>Minimum {minW} söz</span>}
                      </div>
                    </div>
                  );
                })()}

                {/* ── Image for current question (mobile) ── */}
                {current?.imageUrl && (
                  <div className="mt-4 md:hidden">
                    <Image
                      src={current.imageUrl}
                      alt="Sual diaqramı"
                      width={0}
                      height={0}
                      sizes="100vw"
                      className="w-full h-auto rounded-xl shadow-sm"
                      style={{ border: "1px solid var(--color-rule)" }}
                    />
                  </div>
                )}
              </motion.div>
            </div>

            {/* ── Footer navigation ── */}
            <footer className="shrink-0 h-16 px-4 md:px-8 flex items-center justify-between" style={{ background: "var(--color-surface-2)", borderTop: "1px solid var(--color-rule)" }}>
              <button
                onClick={() => goTo(currentIdx - 1)}
                disabled={currentIdx === 0}
                aria-label="Əvvəlki sual"
                className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
                style={{ color: "var(--color-ink)" }}
              >
                <ChevronLeft size={18} aria-hidden="true" />
                <span className="hidden sm:inline">Əvvəlki</span>
              </button>
              <span className="t-mono tabular-nums text-xs" style={{ color: "var(--color-ink-soft)" }}>
                {sessionReady ? formatTime(elapsed) : '--:--'} keçdi
              </span>
              <button
                onClick={() => currentIdx === questions.length - 1 ? setShowConfirm(true) : goTo(currentIdx + 1)}
                aria-label={currentIdx === questions.length - 1 ? 'İmtahanı bitir' : 'Növbəti sual'}
                className="btn-primary flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 rounded-xl text-sm"
              >
                <span className="hidden sm:inline">
                  {currentIdx === questions.length - 1 ? 'Bitir' : 'Növbəti'}
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </footer>
          </section>
        </main>
      )}
    </div>
  );
}

function StrictAudioPlayer({ src, examId }: { src: string; examId: string }) {
  const [status, setStatus] = useState<'checking' | 'ready' | 'playing' | 'finished'>('checking');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // On mount: check (read-only) whether this audio has already been played
  useEffect(() => {
    checkAudioPlayed(examId, src).then(result => {
      if ('error' in result) {
        setStatus('ready'); // fail open so the exam is not blocked
        return;
      }
      setStatus(result.alreadyPlayed ? 'finished' : 'ready');
    });
  }, [src, examId]);

  const handlePlay = async () => {
    if (status !== 'ready' || !audioRef.current) return;

    // Must call play() synchronously inside the click handler — browsers block it
    // if called after an await (loses the user-gesture context).
    try {
      await audioRef.current.play();
      setStatus('playing');
    } catch (err) {
      const { name, message } = err instanceof Error
        ? { name: err.name, message: err.message }
        : { name: undefined, message: String(err) };
      posthog.captureException(err, { context: 'audioPlay', error_name: name, error_message: message });
      toast.error(`Audionu başlatmaq mümkün olmadı: ${message}. Zəhmət olmasa təkrar sınayın.`);
      return;
    }

    // Mark as played server-side after playback has started
    const result = await markAudioPlayed(examId, src);
    if ('error' in result) return; // fail open — audio is already playing
    if (result.alreadyPlayed) {
      // Race condition: was already played in another tab — stop it
      audioRef.current?.pause();
      setStatus('finished');
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setStatus('finished');
    setCurrentTime(duration);
  };

  const remaining = Math.max(0, duration - currentTime);
  const progress  = duration > 0 ? (currentTime / duration) * 100 : 0;

  function fmtTime(secs: number) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div className="w-full space-y-2">
      <audio
        ref={audioRef}
        src={src}
        crossOrigin="anonymous"
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* Checking state */}
      {status === 'checking' && (
        <div className="w-full py-3 rounded-xl flex items-center justify-center gap-2 text-sm" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-rule)", color: "var(--color-ink-soft)" }}>
          <span className="w-4 h-4 border-2 border-t-ink rounded-full animate-spin" style={{ borderColor: "var(--color-rule)", borderTopColor: "var(--color-ink)" }} />
          Yüklənir...
        </div>
      )}

      {/* Ready state */}
      {status === 'ready' && (
        <>
          <button
            onClick={handlePlay}
            className="btn-primary w-full justify-center py-3 rounded-xl"
          >
            <Play size={18} /> Səsi Başlat (Yalnız 1 dəfə)
          </button>
          <p className="text-[10px] text-center px-2 leading-tight font-medium" style={{ color: "var(--color-warn)" }}>
            ⚠️ Diqqət: Audio yalnız 1 dəfə dinlənilə bilər. Başlatdıqdan sonra dayandırmaq olmaz.
          </p>
        </>
      )}

      {/* Playing state */}
      {status === 'playing' && (
        <div className="w-full rounded-2xl px-4 py-3 space-y-2.5" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-rule)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "var(--color-ink)" }}>
              <Volume2 size={16} className="animate-pulse shrink-0" />
              <span>Səs oxunur...</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="t-mono tabular-nums text-base">{fmtTime(remaining)}</span>
              <span className="eyebrow">qaldı</span>
            </div>
          </div>
          <div className="score-bar">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-300 ease-linear"
              style={{ width: `${progress}%`, background: "var(--color-ink)" }}
            />
          </div>
          <div className="flex justify-between t-mono tabular-nums text-[10px]" style={{ color: "var(--color-ink-mute)" }}>
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
      )}

      {/* Finished state */}
      {status === 'finished' && (
        <div className="w-full rounded-2xl px-4 py-3 space-y-2" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-rule)" }}>
          <div className="flex items-center justify-between" style={{ color: "var(--color-ink-soft)" }}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 size={16} className="shrink-0" style={{ color: "var(--color-ok)" }} />
              <span>Audio bitdi</span>
            </div>
            {duration > 0 && <span className="t-mono text-sm">{fmtTime(duration)}</span>}
          </div>
          <div className="score-bar">
            <div className="absolute inset-0 rounded-full" style={{ background: "rgba(47,92,62,0.3)" }} />
          </div>
        </div>
      )}
    </div>
  );
}
