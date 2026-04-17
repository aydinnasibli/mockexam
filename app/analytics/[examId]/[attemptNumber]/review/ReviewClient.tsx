'use client';

import 'katex/dist/katex.min.css';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import katex from 'katex';
import {
  CheckCircle2, XCircle, MinusCircle, Clock, ChevronDown,
  ArrowLeft, RotateCcw, BarChart2,
} from 'lucide-react';
import type { PublicExam } from '@/lib/db/exams';
import type { QuestionData } from '@/lib/actions/questions';
import type { ResultDetail } from '@/lib/db/results';

interface Props {
  exam: PublicExam;
  questions: QuestionData[];
  result: ResultDetail;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function MathText({ text }: { text: string }) {
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
  return <div ref={ref} className="leading-relaxed" />;
}

function formatTime(secs: number) {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}d ${secs % 60}s`;
}

export default function ReviewClient({ exam, questions, result }: Props) {
  const [activeModule, setActiveModule] = useState(0);
  const [expandedPassages, setExpandedPassages] = useState<Set<string>>(new Set());

  const answerMap = new Map(result.answers.map(a => [a.questionId, a]));
  const hasAnswers = result.answers.length > 0;

  const moduleGroups = exam.modules.map((mod, modIdx) => ({
    mod,
    modIdx,
    qs: questions.filter(q => q.moduleIndex === modIdx),
    moduleScore: result.moduleScores.find(m => m.moduleIndex === modIdx),
  }));

  const score = result.score;
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-500';
  const scoreBg    = score >= 80 ? 'bg-green-50 border-green-200' : score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200';

  function togglePassage(qId: string) {
    setExpandedPassages(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">

      {/* Header */}
      <div className="editorial-gradient px-6 py-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/8 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <Link href={`/analytics/${exam.id}`} className="inline-flex items-center gap-1.5 text-white/60 hover:text-white text-xs font-semibold mb-4 transition-colors">
            <ArrowLeft size={14} /> Analitikaya qayıt
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">{exam.tag} · Cəhd #{result.attemptNumber}</p>
              <h1 className="text-xl font-extrabold text-white font-headline">{exam.title}</h1>
              <p className="text-white/50 text-sm mt-1">
                {new Date(result.completedAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}{Math.floor(result.durationSeconds / 60)}:{String(result.durationSeconds % 60).padStart(2, '0')} dəq
              </p>
            </div>
            <div className={`rounded-2xl border px-6 py-3 text-center ${scoreBg} bg-white/90`}>
              <p className={`text-3xl font-black ${scoreColor}`}>{score}%</p>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mt-0.5">Ümumi bal</p>
            </div>
          </div>

          {/* Module score pills */}
          {result.moduleScores.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {result.moduleScores.map(ms => {
                const c = ms.scorePercent >= 80 ? 'bg-green-500/20 text-green-100 border-green-400/30'
                        : ms.scorePercent >= 60 ? 'bg-amber-500/20 text-amber-100 border-amber-400/30'
                        : 'bg-red-500/20 text-red-100 border-red-400/30';
                return (
                  <span key={ms.moduleIndex} className={`text-xs font-bold px-3 py-1 rounded-full border ${c}`}>
                    {ms.moduleName}: {ms.correct}/{ms.total} ({ms.scorePercent}%)
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <Link href={`/analytics/${exam.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/40 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors shadow-sm">
            <BarChart2 size={14} /> Analitika
          </Link>
          <Link href={`/exam-session/${exam.id}`}
            className="flex items-center gap-2 px-4 py-2 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">
            <RotateCcw size={14} /> Yenidən cəhd et
          </Link>
        </div>

        {!hasAnswers ? (
          <div className="bg-white rounded-2xl border border-outline-variant/40 p-10 text-center shadow-sm">
            <p className="text-base font-bold text-primary mb-2">Ətraflı cavab məlumatı yoxdur</p>
            <p className="text-sm text-on-surface-variant">Bu cəhd üçün sual-cavab məlumatı saxlanılmayıb (köhnə nəticə).</p>
          </div>
        ) : (
          <>
            {/* Module tabs */}
            {exam.modules.length > 1 && (
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {moduleGroups.map(({ mod, modIdx, moduleScore }) => (
                  <button key={modIdx} onClick={() => setActiveModule(modIdx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
                      activeModule === modIdx ? 'bg-primary text-white shadow-sm' : 'bg-white border border-outline-variant/40 text-on-surface-variant hover:bg-surface-container'
                    }`}>
                    {mod.name}
                    {moduleScore && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeModule === modIdx ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                        {moduleScore.scorePercent}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Questions */}
            <div className="space-y-4">
              {moduleGroups[activeModule]?.qs.map((q, qIdx) => {
                const answer = answerMap.get(q.id);
                const globalIdx = questions.indexOf(q);
                const userChoice = answer?.userAnswer ?? -1;
                const isUnanswered = userChoice === -1;
                const isCorrect = answer?.isCorrect ?? false;
                const timeSecs = answer?.timeSeconds ?? 0;
                const hasPassage = !!q.passage;
                const passageExpanded = expandedPassages.has(q.id);

                return (
                  <div key={q.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    isUnanswered ? 'border-outline-variant/40' : isCorrect ? 'border-green-200' : 'border-red-200'
                  }`}>
                    {/* Question header */}
                    <div className={`px-5 py-3 flex items-center justify-between border-b ${
                      isUnanswered ? 'bg-surface-container/50 border-outline-variant/20'
                      : isCorrect  ? 'bg-green-50 border-green-100'
                      : 'bg-red-50 border-red-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        {isUnanswered ? <MinusCircle size={16} className="text-on-surface-variant" />
                          : isCorrect ? <CheckCircle2 size={16} className="text-green-600" />
                          : <XCircle size={16} className="text-red-500" />
                        }
                        <span className="text-xs font-bold text-on-surface-variant">
                          Sual {globalIdx + 1}
                          {q.type === 'open' && ' (Açıq)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {timeSecs > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-on-surface-variant font-medium">
                            <Clock size={11} /> {formatTime(timeSecs)}
                          </span>
                        )}
                        {hasPassage && (
                          <button onClick={() => togglePassage(q.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-secondary hover:underline">
                            Mətn {passageExpanded ? '↑' : '↓'}
                            <ChevronDown size={11} className={`transition-transform ${passageExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      {/* Passage (collapsible) */}
                      {hasPassage && passageExpanded && (
                        <div className="mb-4 p-4 bg-surface-container-low rounded-xl border border-outline-variant/20 text-sm text-on-surface/80 leading-relaxed max-h-48 overflow-y-auto">
                          <MathText text={q.passage} />
                        </div>
                      )}

                      {/* Stem */}
                      <div className="text-sm font-medium text-on-surface leading-relaxed mb-4">
                        <MathText text={q.stem} />
                      </div>

                      {/* MCQ options */}
                      {q.type === 'mcq' && (
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, i) => {
                            const isUserChoice = userChoice === i;
                            const isCorrectOption = q.correctIndex === i;
                            let cls = 'border-outline-variant/30 bg-surface-container-low text-on-surface-variant';
                            if (isCorrectOption) cls = 'border-green-400 bg-green-50 text-green-800';
                            else if (isUserChoice && !isCorrectOption) cls = 'border-red-400 bg-red-50 text-red-800';
                            return (
                              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 ${cls}`}>
                                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                                  isCorrectOption ? 'bg-green-500 text-white' : isUserChoice ? 'bg-red-500 text-white' : 'bg-white border-2 border-outline-variant text-on-surface-variant'
                                }`}>
                                  {OPTION_LABELS[i]}
                                </span>
                                <div className="text-sm flex-1 pt-0.5">
                                  <MathText text={opt} />
                                </div>
                                {isCorrectOption && <CheckCircle2 size={15} className="text-green-600 shrink-0 mt-0.5" />}
                                {isUserChoice && !isCorrectOption && <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">İzahat</p>
                          <div className="text-xs text-blue-900 leading-relaxed">
                            <MathText text={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
