'use client';

import 'katex/dist/katex.min.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveExamResult } from '@/lib/actions/results';
import { beginExamSession } from '@/lib/actions/session';
import {
  Timer, Flag, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Grid3X3, BookOpen, Pencil, FileText, X,
} from 'lucide-react';
import { renderMath } from '@/lib/render-math';
import type { PublicExam } from '@/lib/db/exams';
import type { SessionQuestion } from '@/lib/actions/questions';

interface Props {
  exam: PublicExam;
  questions: SessionQuestion[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

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
  const [flagged, setFlagged]           = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [showPassage, setShowPassage]   = useState(false);

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
      answers:     [...answers.entries()],
      openAnswers: [...openAnswers.entries()],
      flagged:     [...flagged],
      currentIdx,
    });
  }, [answers, openAnswers, flagged, currentIdx, sessionReady, exam.id]);

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
    setSubmitError('');
    try {
      const answerInputs = questions.map(q => ({
        questionId:  q.id,
        moduleIndex: q.moduleIndex,
        userAnswer:  answers.get(q.id) ?? -1,
        timeSeconds: Math.round(qTimeSecsRef.current.get(q.id) ?? 0),
      }));
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
      router.push(`/dashboard/analytics/${exam.id}/${result.attemptNumber}/review`);
    } catch {
      setSubmitError('Nəticə göndərilmədi. Yenidən cəhd edin.');
      setSubmitting(false);
    }
  }, [exam, router, answers, questions, recordCurrentQuestionTime]);

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
  const answeredCount  = answers.size;
  const hasNoQuestions = questions.length === 0;

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
    <div className="text-on-surface select-none bg-surface min-h-screen">

      {/* ── Top bar ── */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-sm border-b border-outline-variant/10">
        <div className="h-14 md:h-16 flex items-center justify-between px-3 md:px-6">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
              <div className="w-7 h-7 rounded-lg editorial-gradient flex items-center justify-center">
                <span className="text-white text-xs font-black">TC</span>
              </div>
              <span className="text-base font-extrabold tracking-tight text-primary font-headline group-hover:text-secondary transition-colors hidden sm:block">
                Test Centre
              </span>
            </Link>
            <div className="h-6 w-px bg-slate-200 shrink-0 hidden sm:block" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant hidden sm:block">
                İmtahan Rejimi
              </span>
              <span className="text-xs md:text-sm font-bold text-primary leading-tight max-w-[120px] md:max-w-[200px] truncate">
                {exam.title}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {!hasNoQuestions && (
              <button
                onClick={() => setShowGrid(g => !g)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 rounded-xl text-sm font-bold transition-colors ${
                  showGrid ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <Grid3X3 size={15} />
                <span className="font-mono text-xs">{answeredCount}/{questions.length}</span>
              </button>
            )}
            <div className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 border rounded-full shadow-sm transition-all ${
              remaining < 300 ? 'bg-red-50 border-red-200 animate-pulse'
              : remaining < 600 ? 'bg-amber-50 border-amber-200'
              : 'bg-surface-container-lowest border-primary/10'
            }`}>
              <Timer
                size={14}
                className={remaining < 300 ? 'text-red-500' : remaining < 600 ? 'text-amber-600' : 'text-primary'}
              />
              <span className={`font-headline font-bold tabular-nums text-xs md:text-sm ${
                remaining < 300 ? 'text-red-600' : remaining < 600 ? 'text-amber-700' : 'text-primary'
              }`}>
                {sessionReady ? formatTime(remaining) : '--:--'}
              </span>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={submitting || !sessionReady}
              className="editorial-gradient hover:opacity-90 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl text-xs md:text-sm font-bold shadow-md disabled:opacity-60"
            >
              {submitting ? '...' : 'Bitir'}
            </button>
          </div>
        </div>

        {!hasNoQuestions && (
          <div className="h-0.5 w-full bg-outline-variant/20">
            <div
              className="h-full bg-secondary transition-all duration-500 ease-out"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* ── Question grid overlay ── */}
      {showGrid && (
        <div
          className="fixed inset-0 z-40 bg-black/30 pt-14 md:pt-16"
          onClick={() => setShowGrid(false)}
        >
          <div
            className="absolute right-0 top-14 md:top-16 bottom-0 w-full max-w-xs bg-white shadow-2xl overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between">
              <div>
                <p className="font-bold text-primary text-sm">Sual navigasiyası</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {answeredCount}/{questions.length} cavablandı
                  {flagged.size > 0 && ` · ${flagged.size} işarəli`}
                </p>
              </div>
              <button
                onClick={() => setShowGrid(false)}
                className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-5">
              {questionsByModule.map(({ mod, modIdx, qs }) => (
                <div key={modIdx}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                    {mod.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {qs.map(q => {
                      const globalIdx  = questions.indexOf(q);
                      const isAnswered = answers.has(q.id);
                      const isFlagged  = flagged.has(q.id);
                      const isCurrent  = globalIdx === currentIdx;
                      return (
                        <button
                          key={q.id}
                          onClick={() => goTo(globalIdx)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''} ${
                            isAnswered
                              ? isFlagged ? 'bg-amber-400 text-white' : 'bg-secondary text-white'
                              : isFlagged ? 'bg-amber-100 text-amber-700 border border-amber-300'
                              : 'bg-surface-container text-on-surface-variant border border-outline-variant/40'
                          }`}
                        >
                          {globalIdx + 1}
                        </button>
                      );
                    })}
                    {qs.length === 0 && (
                      <p className="text-xs text-on-surface-variant italic">Bu modulda sual yoxdur</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-outline-variant/10 flex flex-wrap gap-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-secondary inline-block" /> Cavablandı
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-amber-400 inline-block" /> İşarəli
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-surface-container border border-outline-variant/40 inline-block" /> Cavabsız
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm submit dialog ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8 max-w-sm w-full">
            <CheckCircle2 className="text-secondary mx-auto mb-4" size={40} />
            <h3 className="text-xl font-bold text-primary font-headline text-center mb-2">
              İmtahanı bitirmək istəyirsiniz?
            </h3>
            <div className="text-sm text-on-surface-variant text-center mb-2">
              <p>
                <span className="font-bold text-primary">{answeredCount}</span> / {questions.length} sual cavablandı.
              </p>
              {questions.length - answeredCount > 0 && (
                <p className="text-amber-600 font-medium mt-1">
                  {questions.length - answeredCount} sual cavabsız qalır.
                </p>
              )}
            </div>
            <p className="text-xs text-on-surface-variant text-center mb-6">
              Bu əməliyyat geri qaytarıla bilməz.
            </p>
            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{submitError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container text-sm"
              >
                Davam et
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl editorial-gradient text-white font-bold hover:opacity-90 text-sm disabled:opacity-60"
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
            <BookOpen className="text-outline mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-primary font-headline mb-2">
              Suallar hələ əlavə edilməyib
            </h2>
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Bu imtahan üçün sual bankı hazırlanır. Tezliklə əlçatan olacaq.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 editorial-gradient text-white rounded-xl font-bold text-sm hover:opacity-90"
            >
              Panelə qayıt
            </Link>
          </div>
        </main>
      ) : (
        <main className="pt-14 md:pt-16 h-[100dvh] flex flex-col md:flex-row overflow-hidden">

          {/* ── Left panel — passage or module overview (desktop only) ── */}
          <section className="hidden md:flex md:w-[45%] border-r border-slate-100 bg-surface flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-surface-container-low shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                  {currentModule?.name ?? 'Modul'}
                </span>
                {exam.modules.length > 1 && current && (
                  <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {current.moduleIndex + 1}/{exam.modules.length}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-on-surface-variant tabular-nums">
                {currentIdx + 1} / {questions.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-8 no-scrollbar">
              {current?.passage ? (
                <article className="max-w-2xl">
                  <div className="text-on-surface/90 leading-loose text-[15px] prose prose-sm max-w-none">
                    <MathText text={current.passage} block />
                  </div>
                </article>
              ) : (
                <div>
                  <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 mb-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">
                      Cari Modul
                    </p>
                    <p className="font-bold text-primary text-base">{currentModule?.name}</p>
                    {currentModule?.instructions && (
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">
                        {currentModule.instructions}
                      </p>
                    )}
                  </div>
                  <div className="bg-white rounded-2xl border border-outline-variant/40 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">
                      Bu Modulun Sualları
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {questions
                        .filter(q => q.moduleIndex === current?.moduleIndex)
                        .map(q => {
                          const idx        = questions.indexOf(q);
                          const isAnswered = answers.has(q.id);
                          const isFlagged  = flagged.has(q.id);
                          const isCurrent  = idx === currentIdx;
                          return (
                            <button
                              key={q.id}
                              onClick={() => goTo(idx)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''} ${
                                isAnswered
                                  ? isFlagged ? 'bg-amber-400 text-white' : 'bg-secondary text-white'
                                  : isFlagged ? 'bg-amber-100 text-amber-700' : 'bg-surface-container text-on-surface-variant'
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
          </section>

          {/* ── Right panel — question ── */}
          <section className="flex-1 bg-white flex flex-col overflow-hidden">

            {/* Mobile: tab switcher between passage and question */}
            {current?.passage && (
              <div className="md:hidden shrink-0 border-b border-slate-100 bg-surface-container-low">
                <div className="flex">
                  <button
                    onClick={() => setShowPassage(false)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                      !showPassage ? 'border-primary text-primary bg-white' : 'border-transparent text-on-surface-variant'
                    }`}
                  >
                    <CheckCircle2 size={13} /> Sual
                  </button>
                  <button
                    onClick={() => setShowPassage(true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                      showPassage ? 'border-primary text-primary bg-white' : 'border-transparent text-on-surface-variant'
                    }`}
                  >
                    <FileText size={13} /> Mətn
                  </button>
                </div>
                {showPassage && (
                  <div className="flex-1 overflow-y-auto px-4 py-4 max-h-[50vh] border-t border-slate-100">
                    <div className="text-on-surface/90 leading-loose text-sm prose prose-sm max-w-none">
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
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {currentModule.name}
                    </span>
                    {exam.modules.length > 1 && (
                      <span className="text-[9px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                        {(current?.moduleIndex ?? 0) + 1}/{exam.modules.length}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mb-4 md:mb-5">
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="bg-primary text-white w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center font-bold text-xs md:text-sm shrink-0">
                      {currentIdx + 1}
                    </span>
                    <span className="text-on-surface-variant text-xs md:text-sm font-medium">
                      {current?.type === 'open' ? 'Açıq tapşırıq' : 'Çoxseçimli'}
                    </span>
                  </div>
                  {current && (
                    <button
                      onClick={() => toggleFlag(current.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        flagged.has(current.id)
                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : 'text-on-surface-variant hover:bg-surface-container border border-transparent'
                      }`}
                    >
                      <Flag size={12} /> {flagged.has(current.id) ? 'İşarəli' : 'İşarələ'}
                    </button>
                  )}
                </div>

                {current && (
                  <div className="text-sm md:text-base font-medium leading-relaxed text-on-surface mb-5 md:mb-7">
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
                          className={`w-full flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl border-2 transition-all text-left group ${
                            selected
                              ? 'border-secondary bg-secondary/5 shadow-sm'
                              : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container hover:border-secondary/40 hover:shadow-sm'
                          }`}
                        >
                          <span className={`shrink-0 w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-xs font-black mt-0.5 transition-all ${
                            selected
                              ? 'bg-secondary text-white scale-110'
                              : 'bg-white border-2 border-outline-variant text-on-surface-variant group-hover:border-secondary/50'
                          }`}>
                            {OPTION_LABELS[i]}
                          </span>
                          <div className="text-sm leading-relaxed text-on-surface flex-1 pt-0.5">
                            <MathText text={opt} />
                          </div>
                          {selected && <CheckCircle2 size={15} className="text-secondary shrink-0 mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {current?.type === 'open' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-800 font-medium flex items-center gap-2">
                        <Pencil size={13} />
                        Bu açıq tapşırıqdır. Cavabınız aşağıda qeyd kimi saxlanılır; avtomatik qiymətləndirilmir.
                      </p>
                    </div>
                    <textarea
                      rows={6}
                      value={openAnswers.get(current.id) ?? ''}
                      onChange={e => setOpenAnswers(prev => new Map(prev).set(current.id, e.target.value))}
                      placeholder="Cavabınızı burada yazın (qeyd üçün)..."
                      className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Footer navigation ── */}
            <footer className="shrink-0 h-16 bg-surface-container-low border-t border-slate-200 px-4 md:px-8 flex items-center justify-between">
              <button
                onClick={() => goTo(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="flex items-center gap-1.5 md:gap-2 text-primary font-bold hover:bg-white px-3 py-2 md:px-4 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed text-sm"
              >
                <ChevronLeft size={18} />
                <span className="hidden sm:inline">Əvvəlki</span>
              </button>
              <span className="text-xs text-on-surface-variant font-medium tabular-nums">
                {sessionReady ? formatTime(elapsed) : '--:--'} keçdi
              </span>
              <button
                onClick={() => currentIdx === questions.length - 1 ? setShowConfirm(true) : goTo(currentIdx + 1)}
                className="flex items-center gap-1.5 md:gap-2 editorial-gradient text-white font-bold px-4 py-2 md:px-6 rounded-xl hover:opacity-90 shadow-lg transition-all text-sm"
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
