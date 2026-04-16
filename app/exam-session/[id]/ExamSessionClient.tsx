'use client';

import 'katex/dist/katex.min.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import katex from 'katex';
import { saveExamResult } from '@/lib/actions/results';
import {
  Timer, Flag, ChevronLeft, ChevronRight,
  CheckCircle2, AlertCircle, Grid3X3, BookOpen, Pencil,
} from 'lucide-react';
import type { PublicExam } from '@/lib/db/exams';
import type { QuestionData } from '@/lib/actions/questions';

interface Props {
  exam: PublicExam;
  questions: QuestionData[];
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Render text with inline $...$ and block $$...$$ LaTeX
function MathText({ text, block = false }: { text: string; block?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const rendered = text
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
        try { return katex.renderToString(expr, { displayMode: true, throwOnError: false }); }
        catch { return _; }
      })
      .replace(/\$([^$\n]+?)\$/g, (_, expr) => {
        try { return katex.renderToString(expr, { displayMode: false, throwOnError: false }); }
        catch { return _; }
      });
    ref.current.innerHTML = rendered;
  }, [text]);
  return <div ref={ref} className={block ? 'leading-relaxed' : 'inline leading-normal'} />;
}

export default function ExamSessionClient({ exam, questions }: Props) {
  const router = useRouter();
  const startedAtRef = useRef(new Date());
  const [elapsed, setElapsed] = useState(0);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Map<string, number>>(new Map());
  const [openAnswers, setOpenAnswers] = useState<Map<string, string>>(new Map());
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [showGrid, setShowGrid] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const totalSeconds = exam.durationMinutes * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);

  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (remaining === 0 && !submitting) handleSubmit();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const calculateScore = useCallback(() => {
    const mcq = questions.filter(q => q.type === 'mcq');
    if (mcq.length === 0) return 0;
    const correct = mcq.filter(q => answers.get(q.id) === q.correctIndex).length;
    return Math.round((correct / mcq.length) * 100);
  }, [questions, answers]);

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setShowConfirm(false);
    setSubmitError('');
    try {
      const score = calculateScore();
      const result = await saveExamResult({
        examId: exam.id,
        startedAt: startedAtRef.current.toISOString(),
        durationSeconds: Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000),
        score,
      });
      if ('error' in result) throw new Error(result.error);
      router.push(`/analytics/${exam.id}`);
    } catch {
      setSubmitError('Nəticə göndərilmədi. Yenidən cəhd edin.');
      setSubmitting(false);
    }
  }, [exam.id, router, calculateScore]);

  const current = questions[currentIdx] ?? null;
  const currentModule = current ? exam.modules[current.moduleIndex] : null;
  const answeredCount = answers.size;
  const hasNoQuestions = questions.length === 0;

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
    setCurrentIdx(Math.max(0, Math.min(questions.length - 1, idx)));
    setShowGrid(false);
  }

  // Group questions by module for the grid
  const questionsByModule = exam.modules.map((mod, modIdx) => ({
    mod, modIdx,
    qs: questions.filter(q => q.moduleIndex === modIdx),
  }));

  return (
    <div className="text-on-surface select-none bg-surface min-h-screen">

      {/* ── Top bar ── */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-sm h-16 flex items-center justify-between px-6 border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg editorial-gradient flex items-center justify-center">
              <span className="text-white text-xs font-black">TC</span>
            </div>
            <span className="text-base font-extrabold tracking-tight text-primary font-headline group-hover:text-secondary transition-colors hidden sm:block">Test Centre</span>
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">İmtahan Rejimi</span>
            <span className="text-sm font-bold text-primary leading-tight">{exam.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!hasNoQuestions && (
            <button
              onClick={() => setShowGrid(g => !g)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${showGrid ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
            >
              <Grid3X3 size={15} />
              <span className="hidden sm:inline">{answeredCount}/{questions.length}</span>
            </button>
          )}
          <div className={`flex items-center gap-2 px-4 py-2 border rounded-full shadow-sm transition-colors ${remaining < 300 ? 'bg-red-50 border-red-200' : 'bg-surface-container-lowest border-primary/10'}`}>
            <Timer className={remaining < 300 ? 'text-red-500' : 'text-primary'} size={16} />
            <span className={`font-headline font-bold tabular-nums text-sm ${remaining < 300 ? 'text-red-600' : 'text-primary'}`}>
              {formatTime(remaining)}
            </span>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="editorial-gradient hover:opacity-90 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md disabled:opacity-60"
          >
            {submitting ? 'Göndərilir...' : 'Bitir'}
          </button>
        </div>
      </header>

      {/* ── Question grid overlay ── */}
      {showGrid && (
        <div className="fixed inset-0 z-40 bg-black/30 pt-16" onClick={() => setShowGrid(false)}>
          <div className="absolute right-0 top-16 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-outline-variant/20">
              <p className="font-bold text-primary text-sm">Sual navigasiyası</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {answeredCount}/{questions.length} cavablandı
                {flagged.size > 0 && ` · ${flagged.size} işarəli`}
              </p>
            </div>
            <div className="p-4 space-y-5">
              {questionsByModule.map(({ mod, modIdx, qs }) => (
                <div key={modIdx}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">{mod.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {qs.map(q => {
                      const globalIdx = questions.indexOf(q);
                      const isAnswered = answers.has(q.id);
                      const isFlagged = flagged.has(q.id);
                      const isCurrent = globalIdx === currentIdx;
                      return (
                        <button
                          key={q.id}
                          onClick={() => goTo(globalIdx)}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                            isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''
                          } ${
                            isAnswered
                              ? isFlagged ? 'bg-amber-400 text-white' : 'bg-secondary text-white'
                              : isFlagged ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-surface-container text-on-surface-variant border border-outline-variant/40'
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
            <div className="p-4 border-t border-outline-variant/10 flex gap-3 text-xs text-on-surface-variant">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-secondary inline-block" /> Cavablandı</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> İşarəli</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-surface-container border border-outline-variant/40 inline-block" /> Cavabsız</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm dialog ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <CheckCircle2 className="text-secondary mx-auto mb-4" size={40} />
            <h3 className="text-xl font-bold text-primary font-headline text-center mb-2">İmtahanı bitirmək istəyirsiniz?</h3>
            <div className="text-sm text-on-surface-variant text-center mb-2">
              <p><span className="font-bold text-primary">{answeredCount}</span> / {questions.length} sual cavablandı.</p>
              {questions.length - answeredCount > 0 && (
                <p className="text-amber-600 font-medium mt-1">{questions.length - answeredCount} sual cavabsız qalır.</p>
              )}
            </div>
            <p className="text-xs text-on-surface-variant text-center mb-6">Bu əməliyyat geri qaytarıla bilməz.</p>
            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                <AlertCircle size={16} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-700">{submitError}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 rounded-xl border border-outline-variant font-bold text-on-surface-variant hover:bg-surface-container text-sm">
                Davam et
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 rounded-xl editorial-gradient text-white font-bold hover:opacity-90 text-sm disabled:opacity-60">
                {submitting ? 'Göndərilir...' : 'Bitir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── No questions state ── */}
      {hasNoQuestions ? (
        <main className="pt-16 min-h-screen flex items-center justify-center">
          <div className="text-center max-w-sm px-6">
            <BookOpen className="text-outline mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-primary font-headline mb-2">Suallar hələ əlavə edilməyib</h2>
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Bu imtahan üçün sual bankı hazırlanır. Tezliklə əlçatan olacaq.
            </p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 editorial-gradient text-white rounded-xl font-bold text-sm hover:opacity-90">
              Panelə qayıt
            </Link>
          </div>
        </main>
      ) : (
        /* ── Main exam layout ── */
        <main className="pt-16 h-screen flex overflow-hidden">

          {/* Left panel — passage or module overview */}
          <section className="w-[45%] border-r border-slate-100 bg-surface flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-surface-container-low shrink-0">
              <div>
                <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                  {currentModule?.name ?? 'Modul'}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant">
                Sual {currentIdx + 1} / {questions.length}
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
                /* No passage — show module info + mini progress */
                <div>
                  <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 mb-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-2">Cari Modul</p>
                    <p className="font-bold text-primary text-base">{currentModule?.name}</p>
                    {currentModule?.instructions && (
                      <p className="text-xs text-on-surface-variant mt-2 leading-relaxed">{currentModule.instructions}</p>
                    )}
                  </div>
                  <div className="bg-white rounded-2xl border border-outline-variant/40 p-4 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-3">Bu Modulun Sualları</p>
                    <div className="flex flex-wrap gap-1.5">
                      {questions
                        .filter(q => q.moduleIndex === current?.moduleIndex)
                        .map(q => {
                          const idx = questions.indexOf(q);
                          const isAnswered = answers.has(q.id);
                          const isFlagged = flagged.has(q.id);
                          const isCurrent = idx === currentIdx;
                          return (
                            <button
                              key={q.id}
                              onClick={() => goTo(idx)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${isCurrent ? 'ring-2 ring-primary ring-offset-1' : ''} ${
                                isAnswered ? isFlagged ? 'bg-amber-400 text-white' : 'bg-secondary text-white'
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

          {/* Right panel — question */}
          <section className="flex-1 bg-white flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto px-10 py-8 no-scrollbar pb-24">
              <div className="max-w-2xl">

                {/* Question number + flag */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0">
                      {currentIdx + 1}
                    </span>
                    <span className="text-on-surface-variant text-sm font-medium">
                      {current?.type === 'open' ? 'Açıq tapşırıq' : 'Çoxseçimli'}
                    </span>
                  </div>
                  {current && (
                    <button
                      onClick={() => toggleFlag(current.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        flagged.has(current.id)
                          ? 'bg-amber-100 text-amber-700 border border-amber-300'
                          : 'text-on-surface-variant hover:bg-surface-container border border-transparent'
                      }`}
                    >
                      <Flag size={13} /> {flagged.has(current.id) ? 'İşarəli' : 'İşarələ'}
                    </button>
                  )}
                </div>

                {/* Stem */}
                {current && (
                  <div className="text-base font-medium leading-relaxed text-on-surface mb-7">
                    <MathText text={current.stem} block />
                  </div>
                )}

                {/* MCQ options */}
                {current?.type === 'mcq' && (
                  <div className="space-y-2.5">
                    {current.options.map((opt, i) => {
                      const selected = answers.get(current.id) === i;
                      return (
                        <button
                          key={i}
                          onClick={() => selectAnswer(current.id, i)}
                          className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left group ${
                            selected
                              ? 'border-secondary bg-secondary/5'
                              : 'border-transparent bg-surface-container-low hover:bg-surface-container-high hover:border-outline-variant/40'
                          }`}
                        >
                          <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black mt-0.5 transition-colors ${
                            selected ? 'bg-secondary text-white' : 'bg-white border-2 border-outline-variant text-on-surface-variant group-hover:border-secondary/50'
                          }`}>
                            {OPTION_LABELS[i]}
                          </span>
                          <div className="text-sm leading-relaxed text-on-surface flex-1 pt-0.5">
                            <MathText text={opt} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Open question */}
                {current?.type === 'open' && (
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                      <p className="text-xs text-amber-800 font-medium flex items-center gap-2">
                        <Pencil size={13} /> Bu açıq tapşırıqdır. Cavabınız aşağıda qeyd kimi saxlanılır; avtomatik qiymətləndirilmir.
                      </p>
                    </div>
                    <textarea
                      rows={8}
                      value={openAnswers.get(current.id) ?? ''}
                      onChange={e => setOpenAnswers(prev => new Map(prev).set(current.id, e.target.value))}
                      placeholder="Cavabınızı burada yazın (qeyd üçün)..."
                      className="w-full rounded-xl border border-outline-variant px-4 py-3 text-sm text-on-surface bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Navigation footer */}
            <footer className="absolute bottom-0 w-full h-20 bg-surface-container-low border-t border-slate-200 px-8 flex items-center justify-between shrink-0">
              <button
                onClick={() => goTo(currentIdx - 1)}
                disabled={currentIdx === 0}
                className="flex items-center gap-2 text-primary font-bold hover:bg-white px-4 py-2 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} /> Əvvəlki
              </button>
              <span className="text-xs text-on-surface-variant font-medium tabular-nums">
                {formatTime(elapsed)} keçdi
              </span>
              <button
                onClick={() => currentIdx === questions.length - 1 ? setShowConfirm(true) : goTo(currentIdx + 1)}
                className="flex items-center gap-2 editorial-gradient text-white font-bold px-6 py-2 rounded-xl hover:opacity-90 shadow-lg transition-all"
              >
                {currentIdx === questions.length - 1 ? 'Bitir' : 'Növbəti'} <ChevronRight size={20} />
              </button>
            </footer>
          </section>
        </main>
      )}
    </div>
  );
}
