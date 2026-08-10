'use client';

import 'katex/dist/katex.min.css';
import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { renderMath } from '@/lib/render-math';
import PassageText from '@/components/ui/PassageText';
import { reevaluatePendingWriting } from '@/lib/actions/results';
import { formatOverallScore, formatModuleScore } from '@/lib/scoring';
import {
  CheckCircle2, XCircle, MinusCircle, Clock, ChevronDown,
  ArrowLeft, RotateCcw, BarChart2, FileText, Pencil,
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
  // <span> keeps it valid inside <p> (e.g. matching items) — a <div> child of a
  // <p> is invalid HTML and causes a hydration error.
  return <span dangerouslySetInnerHTML={{ __html: renderMath(text) }} className="leading-relaxed" />;
}

function formatTime(secs: number) {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}d ${secs % 60}s`;
}

const AZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr',
];

/**
 * Deterministic az-AZ date, built by hand rather than via
 * `toLocaleDateString('az-AZ')`.
 *
 * That call resolves differently on either side of the render boundary: Node's
 * ICU build falls back to "2026 M07 12" while browsers produce "12 iyul 2026".
 * In a client component that is a hydration mismatch, and React responded by
 * throwing away the whole review tree and re-rendering it on every page load.
 *
 * UTC parts, not local ones — the server runs in UTC and the visitor does not,
 * so local parts would reintroduce the same mismatch for any attempt finished
 * late in the day. It also keeps this date consistent with the analytics pages,
 * which format on the server.
 */
function formatAzDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${AZ_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export default function ReviewClient({ exam, questions, result }: Props) {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState(0);
  const [expandedPassages, setExpandedPassages] = useState<Set<string>>(new Set());
  const [recheckPending, startRecheck] = useTransition();

  const answerMap = new Map(result.answers.map(a => [a.questionId, a]));
  const hasAnswers = result.answers.length > 0;
  const hasPendingWriting = result.answers.some(a => a.writingPending);

  // Silent auto-grade of pending essays when the results page opens. If the AI
  // is unavailable the essay stays pending (the admin panel re-runs it); we do
  // not surface an error to the student.
  function recheckWriting() {
    startRecheck(async () => {
      const res = await reevaluatePendingWriting(exam.id, result.attemptNumber);
      if ('error' in res) return;
      if (res.graded > 0) {
        toast.success('Esseniz qiymətləndirildi.');
        router.refresh();
      } else if (res.pending === 0) {
        router.refresh();
      }
    });
  }

  // Grade any still-pending essays automatically when the results page opens.
  const autoGraded = useRef(false);
  useEffect(() => {
    if (!hasPendingWriting || autoGraded.current) return;
    // Set the guard INSIDE the deferred call, not before it — otherwise Strict
    // Mode's mount→cleanup→mount cycle sets the guard on the first run and the
    // second run skips, so grading never fires.
    const t = setTimeout(() => {
      if (autoGraded.current) return;
      autoGraded.current = true;
      recheckWriting();
    }, 50);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingWriting]);

  const moduleGroups = exam.modules.map((mod, modIdx) => ({
    mod,
    modIdx,
    qs: questions.filter(q => q.moduleIndex === modIdx),
    moduleScore: result.moduleScores.find(m => m.moduleIndex === modIdx),
  }));

  // Passages are authored once, on the first question of their group — carry
  // the most recent passage forward within the module (matches the exam player).
  const passageByQuestion = useMemo(() => {
    const map = new Map<string, string>();
    let lastPassage = '';
    let lastModule = -1;
    for (const q of questions) {
      if (q.moduleIndex !== lastModule) {
        lastModule = q.moduleIndex;
        lastPassage = '';
      }
      if (q.passage) lastPassage = q.passage;
      if (lastPassage) map.set(q.id, lastPassage);
    }
    return map;
  }, [questions]);

  const score = result.score;
  const scoreColor = score >= 80 ? 'text-ok' : score >= 60 ? 'text-warn' : 'text-error';
  const overall = formatOverallScore(result);
  const overallLabel = result.examType === 'ielts' ? 'Ümumi bal (band)'
    : result.examType === 'sat' ? 'Ümumi bal'
    : 'Ümumi bal';

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
                {formatAzDate(result.completedAt)}
                {' · '}{Math.floor(result.durationSeconds / 60)}:{String(result.durationSeconds % 60).padStart(2, '0')} dəq
              </p>
            </div>
            {/*
              The score card sits on the dark header, where the semantic score
              colours (a deep green / amber / red tuned for light surfaces) were
              effectively invisible. It gets its own light panel instead, so the
              same tokens land on the background they were designed for.
            */}
            <div className="bg-bg border border-bg/20 rounded-2xl px-6 py-4 text-center shadow-sm">
              <p className={`font-display text-3xl font-bold ${scoreColor}`}>
                {overall.value}
                {overall.unit !== '%'
                  ? <span className="text-base font-medium text-ink-mute ml-1">{overall.unit}</span>
                  : <span>%</span>}
              </p>
              <p className="eyebrow text-ink-mute mt-1">{overallLabel}</p>
            </div>
          </div>

          {/* SAT scaled section scores */}
          {result.examType === 'sat' && typeof result.rwScaled === 'number' && (
            <div className="flex flex-wrap gap-2 mt-5">
              <span className="text-xs font-bold px-3 py-1 rounded-full border bg-bg/10 text-bg/80 border-bg/20">
                Reading & Writing: {result.rwScaled}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full border bg-bg/10 text-bg/80 border-bg/20">
                Math: {result.mathScaled}
              </span>
            </div>
          )}

          {/* Module score pills */}
          {result.moduleScores.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {result.moduleScores.map(ms => {
                // Light pills on the dark header. Tinting the dark score colours
                // against a dark background produced text that could not be read
                // at all — these are the same light-surface pairs the attempt
                // list and analytics page already use.
                const c = ms.pending
                  ? 'bg-bg/15 text-bg/70 border-bg/25'
                  : ms.scorePercent >= 80
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : ms.scorePercent >= 60
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-red-100 text-red-800 border-red-200';
                return (
                  <span key={ms.moduleIndex} className={`text-xs font-bold px-3 py-1 rounded-full border ${c}`}>
                    {ms.moduleName}: {formatModuleScore(result.examType, ms)}
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

        {/* Writing still being graded (auto — no manual action for the student) */}
        {hasPendingWriting && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-4">
            <RotateCcw size={16} className={`shrink-0 text-purple-600 ${recheckPending ? 'animate-spin' : ''}`} />
            <div>
              <p className="text-sm font-semibold text-purple-900">Esseniz yoxlanılır</p>
              <p className="text-xs text-purple-700">Yazı hissəsi süni intellekt tərəfindən qiymətləndirilir. Ümumi bal hazır olduqda avtomatik yenilənəcək — bu səhifəni bir azdan yeniləyin.</p>
            </div>
          </div>
        )}

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
                        {moduleScore.pending
                          ? '…'
                          : result.examType === 'ielts' && typeof moduleScore.band === 'number'
                          ? moduleScore.band.toFixed(1)
                          : `${moduleScore.scorePercent}%`}
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
                const questionPassage = passageByQuestion.get(q.id) ?? '';
                const hasPassage = !!questionPassage;
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
                        <div className="passage-body mb-4 p-4 bg-surface-2 rounded-xl border border-rule text-sm text-ink-soft max-h-48 overflow-y-auto">
                          <PassageText text={questionPassage} />
                        </div>
                      )}

                      {/* Stem — `whitespace-pre-line` so authored paragraph
                          breaks survive (renderMath emits no <br>). */}
                      <div className="text-sm font-medium text-ink leading-relaxed mb-4 whitespace-pre-line">
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

                      {/*
                        Open-answer review. Previously an open question rendered
                        only its explanation, so the student could see neither
                        what they typed nor what would have been accepted —
                        leaving no way to tell a wrong answer from a typo.
                      */}
                      {q.type === 'open' && (() => {
                        const typed    = (answer?.userAnswerText ?? '').trim();
                        const accepted = (q.openAnswers ?? []).filter(a => a.trim());
                        return (
                          <div className="space-y-2 mb-4">
                            <div className={`px-4 py-3 rounded-xl border-2 ${
                              !typed ? 'border-rule bg-surface-2'
                                : isCorrect ? 'border-green-400 bg-green-50'
                                : 'border-red-400 bg-red-50'
                            }`}>
                              <p className="eyebrow text-ink-mute mb-1.5 flex items-center gap-1.5">
                                <Pencil size={11} /> Sizin cavabınız
                              </p>
                              {typed ? (
                                <p className={`text-sm font-medium m-0 whitespace-pre-wrap ${
                                  isCorrect ? 'text-green-800' : 'text-red-800'
                                }`}>
                                  {typed}
                                </p>
                              ) : (
                                <p className="text-sm text-ink-mute m-0">Cavab verilməyib.</p>
                              )}
                            </div>

                            {accepted.length > 0 && (
                              <div className="px-4 py-3 rounded-xl border-2 border-green-400 bg-green-50">
                                <p className="eyebrow text-ink-mute mb-1.5 flex items-center gap-1.5">
                                  <CheckCircle2 size={11} className="text-ok" />
                                  {accepted.length > 1 ? 'Qəbul edilən cavablar' : 'Doğru cavab'}
                                </p>
                                <p className="text-sm font-medium text-green-800 m-0">
                                  {accepted.join('  ·  ')}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}

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
                                <p className="text-sm text-ink-mute">Cavab verilməyib.</p>
                              </div>
                            )}

                            {/* Essay awaiting grading (auto) */}
                            {essay && writingAnswer?.writingPending && (
                              <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                <div className="flex items-center gap-2">
                                  <RotateCcw size={14} className={`text-purple-600 ${recheckPending ? 'animate-spin' : ''}`} />
                                  <p className="text-sm font-medium text-purple-900">Esseniz yoxlanılır…</p>
                                </div>
                                {aiFeedback && <p className="text-xs text-purple-800 leading-relaxed mt-2">{aiFeedback}</p>}
                              </div>
                            )}

                            {/* AI band score */}
                            {!writingAnswer?.writingPending && bandScore !== undefined && (
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
                          <Image
                            src={q.imageUrl}
                            alt="Sual diaqramı"
                            width={0}
                            height={0}
                            sizes="(max-width: 768px) 100vw, 28rem"
                            className="w-full max-w-md h-auto rounded-xl border border-rule"
                          />
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
