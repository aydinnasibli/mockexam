'use client';

import 'katex/dist/katex.min.css';
import { useState } from 'react';
import Link from 'next/link';
import { renderMath } from '@/lib/render-math';
import {
  CheckCircle2, XCircle, MinusCircle, Clock, ChevronDown,
  ArrowLeft, RotateCcw, BarChart2, FileText,
} from 'lucide-react';
import type { PublicExam } from '@/lib/db/exams';
import type { QuestionData } from '@/lib/actions/questions';
import type { ResultDetail } from '@/lib/db/results';

interface Props {
  exam: PublicExam;
  questions: QuestionData[];
  result: ResultDetail;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function MathText({ text }: { text: string }) {
  return <div dangerouslySetInnerHTML={{ __html: renderMath(text) }} className="leading-relaxed" />;
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
  const scoreColor = score >= 80 ? 'text-ok' : score >= 60 ? 'text-warn' : 'text-error';

  function togglePassage(qId: string) {
    setExpandedPassages(prev => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId); else next.add(qId);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-surface-2">

      {/* Header */}
      <div className="bg-ink px-6 py-8 relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto">
          <Link
            href={`/dashboard/analytics/${exam.id}`}
            className="inline-flex items-center gap-1.5 text-bg/50 hover:text-bg text-xs font-semibold mb-5 transition-colors"
          >
            <ArrowLeft size={14} /> Analitikaya qayıt
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="tag-ink text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide bg-bg/10 text-bg/70 border-0">
                  {exam.tag}
                </span>
                <span className="text-bg/40 text-xs">·</span>
                <span className="text-bg/50 text-xs font-semibold">Cəhd #{result.attemptNumber}</span>
              </div>
              <h1 className="font-display text-xl font-bold text-bg">{exam.title}</h1>
              <p className="text-bg/40 text-sm mt-1.5">
                {new Date(result.completedAt).toLocaleDateString('az-AZ', { day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}{Math.floor(result.durationSeconds / 60)}:{String(result.durationSeconds % 60).padStart(2, '0')} dəq
              </p>
            </div>
            <div className="bg-bg/10 border border-bg/20 rounded-2xl px-6 py-4 text-center">
              <p className={`font-display text-3xl font-bold ${scoreColor}`}>{score}%</p>
              <p className="eyebrow text-bg/50 mt-1">Ümumi bal</p>
            </div>
          </div>

          {/* Module score pills */}
          {result.moduleScores.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {result.moduleScores.map(ms => {
                const c = ms.scorePercent >= 80
                  ? 'bg-ok/20 text-ok/80 border-ok/30'
                  : ms.scorePercent >= 60
                  ? 'bg-warn/20 text-warn/80 border-warn/30'
                  : 'bg-error/20 text-error/80 border-error/30';
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
          <Link
            href={`/dashboard/analytics/${exam.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-rule rounded-xl text-sm font-medium text-ink-soft hover:bg-surface-2 transition-colors"
          >
            <BarChart2 size={14} /> Analitika
          </Link>
          <Link
            href={`/exam-session/${exam.id}`}
            className="flex items-center gap-2 px-4 py-2 bg-ink text-bg rounded-xl text-sm font-medium hover:bg-ink/90 transition-colors"
          >
            <RotateCcw size={14} /> Yenidən cəhd et
          </Link>
        </div>

        {!hasAnswers ? (
          <div className="bg-surface rounded-2xl border border-rule p-10 text-center">
            <p className="font-display text-base font-bold text-ink mb-2">Ətraflı cavab məlumatı yoxdur</p>
            <p className="text-sm text-ink-soft">Bu cəhd üçün sual-cavab məlumatı saxlanılmayıb (köhnə nəticə).</p>
          </div>
        ) : (
          <>
            {/* Module tabs */}
            {exam.modules.length > 1 && (
              <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
                {moduleGroups.map(({ mod, modIdx, moduleScore }) => (
                  <button
                    key={modIdx}
                    onClick={() => setActiveModule(modIdx)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                      activeModule === modIdx
                        ? 'bg-ink text-bg'
                        : 'bg-surface border border-rule text-ink-soft hover:bg-surface-2'
                    }`}
                  >
                    {mod.name}
                    {moduleScore && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activeModule === modIdx ? 'bg-bg/20 text-bg' : 'bg-surface-2 text-ink-mute'
                      }`}>
                        {moduleScore.scorePercent}%
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Questions */}
            <div className="space-y-4">
              {moduleGroups[activeModule]?.qs.map((q) => {
                const answer = answerMap.get(q.id);
                const globalIdx = questions.indexOf(q);
                const userChoice = answer?.userAnswer ?? -1;
                const isWriting = q.type === 'writing';
                const isUnanswered = !isWriting && userChoice === -1 && !answer?.userAnswerText;
                const isCorrect = answer?.isCorrect ?? false;
                const timeSecs = answer?.timeSeconds ?? 0;
                const hasPassage = !!q.passage;
                const passageExpanded = expandedPassages.has(q.id);

                const cardBorder = isWriting
                  ? 'border-purple-200'
                  : isUnanswered
                  ? 'border-rule'
                  : isCorrect
                  ? 'border-green-200'
                  : 'border-red-200';

                const headerBg = isWriting
                  ? 'bg-purple-50 border-purple-100'
                  : isUnanswered
                  ? 'bg-surface-2 border-rule'
                  : isCorrect
                  ? 'bg-green-50 border-green-100'
                  : 'bg-red-50 border-red-100';

                return (
                  <div key={q.id} className={`bg-surface rounded-2xl border overflow-hidden ${cardBorder}`}>
                    {/* Question header */}
                    <div className={`px-5 py-3 flex items-center justify-between border-b ${headerBg}`}>
                      <div className="flex items-center gap-3">
                        {isWriting
                          ? <FileText size={16} className="text-purple-600" />
                          : isUnanswered
                          ? <MinusCircle size={16} className="text-ink-mute" />
                          : isCorrect
                          ? <CheckCircle2 size={16} className="text-ok" />
                          : <XCircle size={16} className="text-error" />
                        }
                        <span className="text-xs font-medium text-ink-soft">
                          Sual {globalIdx + 1}
                          {q.type === 'open' && ' (Açıq)'}
                          {q.type === 'matching' && ' (Uyğunlaşdırma)'}
                          {q.type === 'writing' && ' (Yazı)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {timeSecs > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-ink-mute font-medium">
                            <Clock size={11} /> {formatTime(timeSecs)}
                          </span>
                        )}
                        {hasPassage && (
                          <button
                            onClick={() => togglePassage(q.id)}
                            className="flex items-center gap-1 text-[10px] font-medium text-ink-soft hover:text-ink transition-colors"
                          >
                            Mətn
                            <ChevronDown size={11} className={`transition-transform ${passageExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      {/* Passage (collapsible) */}
                      {hasPassage && passageExpanded && (
                        <div className="mb-4 p-4 bg-surface-2 rounded-xl border border-rule text-sm text-ink-soft leading-relaxed max-h-48 overflow-y-auto">
                          <MathText text={q.passage} />
                        </div>
                      )}

                      {/* Stem */}
                      <div className="text-sm font-medium text-ink leading-relaxed mb-4">
                        <MathText text={q.stem} />
                      </div>

                      {/* MCQ options */}
                      {q.type === 'mcq' && (
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, i) => {
                            const isUserChoice = userChoice === i;
                            const isCorrectOption = q.correctIndex === i;
                            let cls = 'border-rule bg-surface-2 text-ink-soft';
                            if (isCorrectOption) cls = 'border-green-400 bg-green-50 text-green-800';
                            else if (isUserChoice && !isCorrectOption) cls = 'border-red-400 bg-red-50 text-red-800';
                            return (
                              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 ${cls}`}>
                                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isCorrectOption
                                    ? 'bg-green-500 text-white'
                                    : isUserChoice
                                    ? 'bg-red-500 text-white'
                                    : 'bg-surface border border-rule text-ink-mute'
                                }`}>
                                  {OPTION_LABELS[i]}
                                </span>
                                <div className="text-sm flex-1 pt-0.5">
                                  <MathText text={opt} />
                                </div>
                                {isCorrectOption && <CheckCircle2 size={15} className="text-ok shrink-0 mt-0.5" />}
                                {isUserChoice && !isCorrectOption && <XCircle size={15} className="text-error shrink-0 mt-0.5" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Matching review */}
                      {q.type === 'matching' && q.matchItems && q.matchItems.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {(() => {
                            let userMatches: number[] = [];
                            try {
                              if (answer?.userAnswerText) userMatches = JSON.parse(answer.userAnswerText);
                            } catch { /* ignore */ }
                            return q.matchItems!.map((item, idx) => {
                              const userPick = userMatches[idx] ?? -1;
                              const correctPick = q.correctMatching?.[idx] ?? -1;
                              const itemCorrect = userPick === correctPick;
                              const cls = userPick === -1
                                ? 'border-rule bg-surface-2'
                                : itemCorrect
                                ? 'border-green-400 bg-green-50'
                                : 'border-red-400 bg-red-50';
                              return (
                                <div key={idx} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 ${cls}`}>
                                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    itemCorrect
                                      ? 'bg-green-500 text-white'
                                      : userPick === -1
                                      ? 'bg-surface border border-rule text-ink-mute'
                                      : 'bg-red-500 text-white'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 text-sm">
                                    <p className="font-medium text-ink mb-1"><MathText text={item} /></p>
                                    {userPick >= 0 && !itemCorrect && (
                                      <p className="text-error text-xs">Sizin: {OPTION_LABELS[userPick]}. {q.options[userPick]}</p>
                                    )}
                                    <p className="text-ok text-xs font-medium">Doğru: {OPTION_LABELS[correctPick]}. {q.options[correctPick]}</p>
                                  </div>
                                  {itemCorrect
                                    ? <CheckCircle2 size={15} className="text-ok shrink-0 mt-0.5" />
                                    : <XCircle size={15} className="text-error shrink-0 mt-0.5" />
                                  }
                                </div>
                              );
                            });
                          })()}
                        </div>
                      )}

                      {/* Writing: student essay + AI feedback */}
                      {q.type === 'writing' && (() => {
                        const writingAnswer = answer;
                        const essay = writingAnswer?.userAnswerText ?? '';
                        const bandScore = writingAnswer?.writingScore;
                        const wordCount = writingAnswer?.writingWordCount;
                        const criteria = writingAnswer?.writingCriteria ?? [];
                        const aiFeedback = writingAnswer?.aiFeedback;
                        const bandColor = bandScore !== undefined
                          ? bandScore >= 7 ? 'text-ok' : bandScore >= 5 ? 'text-warn' : 'text-error'
                          : 'text-ink-mute';
                        return (
                          <div className="space-y-3 mb-4">
                            {essay ? (
                              <div className="p-4 bg-surface-2 border border-rule rounded-xl">
                                <p className="eyebrow text-ink-mute mb-2 flex items-center gap-1.5">
                                  <FileText size={11} /> Sizin cavabınız {wordCount ? `· ${wordCount} söz` : ''}
                                </p>
                                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">{essay}</p>
                              </div>
                            ) : (
                              <div className="p-4 bg-surface-2 border border-rule rounded-xl">
                                <p className="text-sm text-ink-mute italic">Cavab verilməyib.</p>
                              </div>
                            )}

                            {/* AI band score */}
                            {bandScore !== undefined && (
                              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="eyebrow text-purple-700">AI Qiymətləndirməsi</p>
                                  <span className={`font-display text-2xl font-bold ${bandColor}`}>
                                    {bandScore.toFixed(1)} <span className="text-sm font-medium text-ink-mute">/ 9</span>
                                  </span>
                                </div>

                                {criteria.length > 0 && (
                                  <div className="space-y-2 mb-3">
                                    {criteria.map((c, ci) => (
                                      <div key={ci} className="flex items-start gap-2">
                                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                          c.score >= 7 ? 'bg-green-100 text-green-700' : c.score >= 5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                                        }`}>
                                          {c.score}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-xs font-medium text-ink">{c.criterion}</p>
                                          <p className="text-xs text-ink-soft leading-relaxed">{c.comment}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {aiFeedback && (
                                  <p className="text-xs text-purple-900 leading-relaxed border-t border-purple-200 pt-3">{aiFeedback}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Image display */}
                      {q.imageUrl && (
                        <div className="mb-4">
                          <img src={q.imageUrl} alt="Sual diaqramı" className="w-full max-w-md rounded-xl border border-rule" loading="lazy" />
                        </div>
                      )}

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <p className="eyebrow text-blue-600 mb-1">İzahat</p>
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
