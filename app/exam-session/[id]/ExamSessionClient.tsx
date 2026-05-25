'use client';

import 'katex/dist/katex.min.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { saveExamResult } from '@/lib/actions/results';
import { beginExamSession } from '@/lib/actions/session';
import { markAudioPlayed, checkAudioPlayed } from '@/lib/actions/audio';
import {
  Timer, Flag, ChevronLeft, ChevronRight,
  CheckCircle2, Grid3X3, BookOpen, Pencil, FileText, X,
  Play, Volume2
} from 'lucide-react';
import { renderMath } from '@/lib/render-math';
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

function MathText({ text, block = false }: { text: string; block?: boolean }) {
  return (
    <div
      dangerouslySetInnerHTML={{ __html: renderMath(text) }}
      className={block ? 'leading-relaxed' : 'inline leading-normal'}
    />
  );
}

// ── localStorage helpers ──────────────────────────────────────────────────────

interface SavedSession {
  answers: [string, number][];
  openAnswers: [string, string][];
  matchingAnswers?: [string, string][];
  flagged: string[];
  currentIdx: number;
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

  const totalSeconds = exam.durationMinutes * 60;
  const remaining    = Math.max(0, totalSeconds - elapsed);

  // ── Init: get server-authoritative start time, then restore saved answers ───
  useEffect(() => {
    async function init() {
      const result = await beginExamSession(exam.id);
      if ('error' in result) {
        router.push('/dashboard');
        return;
      }
      startedAtRef.current  = new Date(result.startedAt);
      qEnterTimeRef.current = Date.now();
      setElapsed(result.elapsed);

      const saved = loadSavedSession(exam.id);
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
          setCurrentIdx(saved.currentIdx);
          currentIdxRef.current = saved.currentIdx;
        }
      }
      setSessionReady(true);
    }
    void init();
  }, [exam.id, questions.length, router]);

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
    });
  }, [answers, openAnswers, matchingAnswers, flagged, currentIdx, sessionReady, exam.id]);

  // ── Reset passage panel when moving between questions ────────────────────
  useEffect(() => {
    setShowPassage(false);
  }, [currentIdx]);

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
    recordCurrentQuestionTime();
    const newIdx = Math.max(0, Math.min(questions.length - 1, idx));
    currentIdxRef.current = newIdx;
    setCurrentIdx(newIdx);
    setShowGrid(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="select-none min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-ink)" }}>

      {/* ── Top bar ── */}
      <header className="fixed top-0 w-full z-50 nav-frosted" style={{ borderBottom: "1px solid var(--color-rule)" }}>
        <div className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <span className="dot" />
              <span className="font-display text-[18px] font-normal text-ink hidden sm:block">
                Test<em className="not-italic">centre</em>
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-sm font-medium transition-colors ${
                  showGrid ? 'bg-surface-2' : 'hover:bg-surface-2'
                }`}
                style={{ color: "var(--color-ink-soft)" }}
              >
                <Grid3X3 size={15} />
                <span className="t-mono text-xs">{answeredCount}/{questions.length}</span>
              </button>
            )}
            <div className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 border rounded-full transition-all ${
              remaining < 300 ? 'animate-pulse'
              : ''
            }`} style={{
              background: remaining < 300 ? "rgba(162,58,46,0.08)" : "var(--color-surface)",
              borderColor: remaining < 300 ? "var(--color-error)" : "var(--color-rule)",
            }}>
              <Timer
                size={14}
                style={{ color: remaining < 300 ? "var(--color-error)" : "var(--color-ink-soft)" }}
              />
              <span className="t-mono tabular-nums text-xs md:text-sm" style={{
                color: remaining < 300 ? "var(--color-error)" : "var(--color-ink)",
              }}>
                {sessionReady ? formatTime(remaining) : '--:--'}
              </span>
            </div>
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
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: "var(--color-ink-soft)" }}
              >
                <X size={16} />
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
                      <p className="text-xs italic" style={{ color: "var(--color-ink-mute)" }}>Bu modulda sual yoxdur</p>
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

          {/* ── Left panel — passage or module overview (desktop only) ── */}
          <section className="hidden md:flex md:w-[45%] flex-col overflow-hidden" style={{ borderRight: "1px solid var(--color-rule)", background: "var(--color-surface)" }}>
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

            <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
              {current?.passage || current?.imageUrl ? (
                <article className="max-w-2xl">
                  {current?.imageUrl && (
                    <div className="mb-6">
                      <p className="eyebrow mb-3">📊 Diaqram / Şəkil</p>
                      <img
                        src={current.imageUrl}
                        alt="Sual diaqramı"
                        className="w-full rounded-xl shadow-sm"
                        style={{ border: "1px solid var(--color-rule)" }}
                        loading="lazy"
                      />
                    </div>
                  )}
                  {current?.passage && (
                    <div className="leading-loose text-[15px] prose prose-sm max-w-none" style={{ color: "var(--color-ink)" }}>
                      <MathText text={current.passage} block />
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
            {current?.passage && (
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
                    <div className="leading-loose text-sm prose prose-sm max-w-none" style={{ color: "var(--color-ink)" }}>
                      <MathText text={current.passage} block />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scrollable question area */}
            <div className={`flex-1 overflow-y-auto px-4 py-5 md:px-10 md:py-8 no-scrollbar ${
              current?.passage && showPassage ? 'hidden md:block' : 'block'
            }`}>
              <div className="max-w-2xl">

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

                <div className="flex items-center justify-between mb-4 md:mb-5">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-medium text-xs md:text-sm shrink-0" style={{ background: "var(--color-ink)", color: "var(--color-bg)" }}>
                      {currentIdx + 1}
                    </span>
                    <span className="text-xs md:text-sm" style={{ color: "var(--color-ink-soft)" }}>
                      {current?.type === 'open' ? 'Açıq tapşırıq'
                        : current?.type === 'matching' ? 'Uyğunlaşdırma'
                        : current?.type === 'writing' ? 'Yazı tapşırığı'
                        : 'Çoxseçimli'}
                    </span>
                  </div>
                  {current && (
                    <button
                      onClick={() => toggleFlag(current.id)}
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

                {current && (
                  <div className="text-sm md:text-base leading-relaxed mb-5 md:mb-7" style={{ color: "var(--color-ink)" }}>
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
                    <img
                      src={current.imageUrl}
                      alt="Sual diaqramı"
                      className="w-full rounded-xl shadow-sm"
                      style={{ border: "1px solid var(--color-rule)" }}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer navigation ── */}
            <footer className="shrink-0 h-16 px-4 md:px-8 flex items-center justify-between" style={{ background: "var(--color-surface-2)", borderTop: "1px solid var(--color-rule)" }}>
              <button
                onClick={() => goTo(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="flex items-center gap-1.5 md:gap-2 px-3 py-2 md:px-4 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium"
                style={{ color: "var(--color-ink)" }}
              >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">Əvvəlki</span>
              </button>
              <span className="t-mono tabular-nums text-xs" style={{ color: "var(--color-ink-soft)" }}>
                {sessionReady ? formatTime(elapsed) : '--:--'} keçdi
              </span>
              <button
                onClick={() => currentIdx === questions.length - 1 ? setShowConfirm(true) : goTo(currentIdx + 1)}
                className="btn-primary flex items-center gap-1.5 md:gap-2 px-4 py-2 md:px-6 rounded-xl text-sm"
              >
                <span className="hidden sm:inline">
                  {currentIdx === questions.length - 1 ? 'Bitir' : 'Növbəti'}
                </span>
                <ChevronRight size={18} />
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
    } catch (err: any) {
      console.error('Audio play failed:', err?.name, err?.message, err);
      toast.error(`Audionu başlatmaq mümkün olmadı: ${err?.message ?? err}. Zəhmət olmasa təkrar sınayın.`);
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
