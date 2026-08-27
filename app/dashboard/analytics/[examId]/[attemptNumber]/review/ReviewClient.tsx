'use client';

import 'katex/dist/katex.min.css';
import { useState, useMemo, useTransition, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import MathText from '@/components/ui/MathText';
import PassageText from '@/components/ui/PassageText';
import { reevaluatePendingWriting } from '@/lib/actions/results';
import { formatOverallScore, formatModuleScore } from '@/lib/domain/scoring';
import { buildReviewItems } from '@/lib/domain/review-items';
import { formatAzDate } from '@/lib/shared/az-date';
import {
  CheckCircle2, XCircle, MinusCircle, Clock, ChevronDown,
  ArrowLeft, RotateCcw, BarChart2, FileText, Pencil, TriangleAlert,
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


function formatTime(secs: number) {
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}d ${secs % 60}s`;
}


export default function ReviewClient({ exam, questions, result }: Props) {
  const router = useRouter();
  const [activeModule, setActiveModule] = useState(0);
  const [expandedPassages, setExpandedPassages] = useState<Set<string>>(new Set());
  const [recheckPending, startRecheck] = useTransition();

  /*
   * The attempt drives the review; the live bank only enriches it.
   *
   * This used to iterate the live questions and look each answer up by id — a
   * join that a re-import or a deletion breaks, at which point every question
   * rendered as unanswered and wrong beneath the score the candidate had
   * actually earned, so the page blacked the whole breakdown out instead.
   *
   * `saveExamResult` snapshots what was asked onto each answer row, so the
   * breakdown no longer depends on the join: a missing question costs its
   * explanation, not the review. See `lib/domain/review-items.ts`.
   */
  const items = useMemo(
    () => buildReviewItems(result.answers, questions),
    [result.answers, questions],
  );
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
    qs: items.filter(it => it.moduleIndex === modIdx),
    moduleScore: result.moduleScores.find(m => m.moduleIndex === modIdx),
  }));

  /*
   * Flat, one-based numbering across the whole paper — the number the candidate
   * saw while sitting it. Taken from the answer order rather than from
   * `questions.indexOf`, which was a full scan per card and, once the bank had
   * moved on, returned -1 and printed "Sual 0".
   */
  const numberByKey = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it, i) => map.set(it.key, i + 1));
    return map;
  }, [items]);

  const score = result.score;
  const scoreColor = score >= 80 ? 'text-ok' : score >= 60 ? 'text-warn' : 'text-error';
  const overall = formatOverallScore(result);
  /*
   * A section still with the writing grader is left OUT of the overall figure
   * rather than counted as zero, so what is shown is a mean of the sections
   * already marked. Saying so beats presenting a partial band as a final one —
   * an essay that never grades leaves it partial permanently.
   */
  /*
   * `təxmini` is not hedging — the band tables and the SAT scaled curve are
   * both conversions this platform approximates (see `formatOverallScore`), and
   * a figure printed in the exam's own units reads as that exam's real result
   * unless it says otherwise.
   */
  const overallLabel = (result.examType === 'ielts' ? 'Ümumi bal (band)' : 'Ümumi bal')
    + (overall.approximate ? ' — təxmini' : '')
    + (overall.provisional ? ' — ilkin' : '');

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
                <span className="rounded-full bg-bg/10 px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase text-bg/70">
                  {exam.tag}
                </span>
                <span className="text-bg/55 text-xs">·</span>
                <span className="text-bg/50 text-xs font-semibold">Cəhd #{result.attemptNumber}</span>
              </div>
              <h1 className="font-display text-xl font-bold text-bg">{exam.title}</h1>
              <p className="text-bg/55 text-sm mt-1.5">
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
              <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute mt-1">{overallLabel}</p>
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
                  ? 'bg-correct/10 text-correct border-correct/25'
                  : ms.scorePercent >= 60
                  ? 'bg-warn/10 text-warn border-warn/25'
                  : 'bg-error/10 text-error border-error/25';
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
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rule bg-surface-2 px-5 py-4">
            <RotateCcw size={16} className={`shrink-0 text-ink-soft ${recheckPending ? 'animate-spin' : ''}`} />
            <div>
              <p className="text-sm font-semibold text-ink">Esseniz yoxlanılır</p>
              <p className="text-sm text-ink-soft">Yazı hissəsi süni intellekt tərəfindən qiymətləndirilir. Ümumi bal hazır olduqda avtomatik yenilənəcək — bu səhifəni bir azdan yeniləyin.</p>
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
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
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
                const answer = q.answer;
                const questionNo = numberByKey.get(q.key) ?? 0;
                const userChoice = answer.userAnswer;
                const isWriting = q.type === 'writing';
                const isUnanswered = !isWriting && userChoice === -1 && !answer.userAnswerText;
                const isCorrect = answer.isCorrect;
                const timeSecs = answer.timeSeconds;
                const questionPassage = q.passage;
                const hasPassage = !!questionPassage;
                const passageExpanded = expandedPassages.has(q.key);

                const cardBorder = isWriting
                  ? 'border-rule'
                  : isUnanswered
                  ? 'border-rule'
                  : isCorrect
                  ? 'border-correct/25'
                  : 'border-error/25';

                /*
                  Tints are DERIVED from the semantic tokens rather than picked
                  from Tailwind's palette, so they cannot drift away from the
                  ✓/✗ marks sitting on top of them. The page previously mixed
                  the two: `text-ok` (#2F5C3E) on the icon and `bg-green-50`
                  behind it, which are different greens.
                */
                const headerBg = isWriting
                  ? 'bg-accent-soft border-rule'
                  : isUnanswered
                  ? 'bg-surface-2 border-rule'
                  : isCorrect
                  ? 'bg-correct/8 border-correct/20'
                  : 'bg-error/8 border-error/20';

                return (
                  <div key={q.key} className={`bg-surface rounded-2xl border overflow-hidden ${cardBorder}`}>
                    {/* Question header */}
                    <div className={`px-5 py-3 flex items-center justify-between border-b ${headerBg}`}>
                      <div className="flex items-center gap-3">
                        {isWriting
                          ? <FileText size={16} className="text-ink-soft" />
                          : isUnanswered
                          ? <MinusCircle size={16} className="text-ink-mute" />
                          : isCorrect
                          ? <CheckCircle2 size={16} className="text-ok" />
                          : <XCircle size={16} className="text-error" />
                        }
                        <span className="text-xs font-medium text-ink-soft">
                          Sual {questionNo}
                          {q.type === 'open' && ' (Açıq)'}
                          {q.type === 'matching' && ' (Uyğunlaşdırma)'}
                          {q.type === 'writing' && ' (Yazı)'}
                        </span>
                        {/*
                          Partial credit, shown only where it can occur. A
                          matching task is marked per item, so a candidate who
                          placed three of four correctly earns 3 — the tick/cross
                          alone would report that as a flat wrong answer.
                        */}
                        {answer.marks > 1 && (
                          <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs tabular-nums text-ink-soft">
                            {answer.earnedMarks} / {answer.marks} bal
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {timeSecs > 0 && (
                          <span className="flex items-center gap-1 text-xs text-ink-mute font-medium">
                            <Clock size={11} /> {formatTime(timeSecs)}
                          </span>
                        )}
                        {hasPassage && (
                          <button
                            onClick={() => togglePassage(q.key)}
                            className="flex items-center gap-1 text-xs font-medium text-ink-soft hover:text-ink transition-colors"
                          >
                            Mətn
                            <ChevronDown size={11} className={`transition-transform ${passageExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      {/*
                        Nothing renderable survives for this one.

                        Only reachable for an attempt filed BEFORE the answer
                        snapshot shipped whose question has since been deleted
                        or re-imported. Everything filed since carries its own
                        stem and options, so it renders from the attempt alone.
                        Scoped to the single question rather than blacking out
                        the whole breakdown, which is what used to happen.
                      */}
                      {q.unavailable ? (
                        <div className="flex items-start gap-2.5 rounded-xl border border-warn bg-warn/8 px-4 py-3">
                          <TriangleAlert size={15} className="mt-0.5 shrink-0 text-warn" />
                          <p className="m-0 text-sm leading-relaxed text-ink">
                            Bu sual imtahan bankından silinib və cəhdiniz onun mətnini
                            saxlamayıb, ona görə burada göstərilə bilmir. Cavabınız və balınız
                            isə yuxarıdakı nəticəyə daxildir.
                          </p>
                        </div>
                      ) : (
                      <>
                      {/* Passage (collapsible) */}
                      {hasPassage && passageExpanded && (
                        <div className="passage-body mb-4 p-4 bg-surface-2 rounded-xl border border-rule text-ink-soft max-h-48 overflow-y-auto">
                          <PassageText text={questionPassage} />
                        </div>
                      )}

                      {/* Stem — `whitespace-pre-line` so authored paragraph
                          breaks survive (renderMath emits no <br>). */}
                      <div className="text-sm font-medium text-ink leading-relaxed mb-4 whitespace-pre-line">
                        <MathText text={q.stem} className="leading-relaxed" />
                      </div>

                      {/* MCQ options */}
                      {q.type === 'mcq' && (
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt, i) => {
                            const isUserChoice = userChoice === i;
                            const isCorrectOption = q.correctIndex === i;

                            /*
                              Semantic tokens, not Tailwind's palette. The badge
                              used to be `bg-green-500 text-white`, which is
                              2.28:1 — a WCAG 1.4.3 failure that the project's
                              own `--color-correct` (7.7:1 against `bg`) fixes
                              outright. Same story for the red at 3.76:1.
                            */
                            let cls = 'border-rule bg-surface-2 text-ink-soft';
                            if (isCorrectOption) cls = 'border-correct bg-correct/8 text-ink';
                            else if (isUserChoice && !isCorrectOption) cls = 'border-error bg-error/8 text-ink';

                            /*
                              The tick, the cross and the colour were the ONLY
                              things saying which option was right and which the
                              candidate picked — and every icon here is
                              `aria-hidden`, so a screen reader read four
                              indistinguishable options (WCAG 1.4.1, Use of
                              Colour). This is that information as text.
                            */
                            const marker = isCorrectOption && isUserChoice
                              ? 'Sizin cavabınız — düzgün'
                              : isCorrectOption
                              ? 'Düzgün cavab'
                              : isUserChoice
                              ? 'Sizin cavabınız — yanlış'
                              : null;

                            return (
                              <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 ${cls}`}>
                                <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isCorrectOption
                                    ? 'bg-correct text-bg'
                                    : isUserChoice
                                    ? 'bg-error text-bg'
                                    : 'bg-surface border border-rule text-ink-mute'
                                }`}>
                                  {OPTION_LABELS[i]}
                                </span>
                                <div className="text-sm flex-1 pt-0.5">
                                  {marker && <span className="sr-only">{marker}. </span>}
                                  <MathText text={opt} className="leading-relaxed" />
                                </div>
                                {isCorrectOption && <CheckCircle2 size={15} className="text-correct shrink-0 mt-0.5" />}
                                {isUserChoice && !isCorrectOption && <XCircle size={15} className="text-error shrink-0 mt-0.5" />}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Matching review */}
                      {q.type === 'matching' && q.matchItems.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {(() => {
                            let userMatches: number[] = [];
                            try {
                              if (answer.userAnswerText) userMatches = JSON.parse(answer.userAnswerText);
                            } catch { /* ignore */ }
                            return q.matchItems.map((item, idx) => {
                              const userPick = userMatches[idx] ?? -1;
                              const correctPick = q.correctMatching[idx] ?? -1;
                              const itemCorrect = userPick === correctPick;
                              const cls = userPick === -1
                                ? 'border-rule bg-surface-2'
                                : itemCorrect
                                ? 'border-correct bg-correct/8'
                                : 'border-error bg-error/8';
                              return (
                                <div key={idx} className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 ${cls}`}>
                                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    itemCorrect
                                      ? 'bg-correct text-bg'
                                      : userPick === -1
                                      ? 'bg-surface border border-rule text-ink-mute'
                                      : 'bg-error text-bg'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 text-sm">
                                    <p className="font-medium text-ink mb-1"><MathText text={item} className="leading-relaxed" /></p>
                                    {userPick >= 0 && !itemCorrect && (
                                      <p className="text-error text-sm">Sizin: {OPTION_LABELS[userPick]}. {q.options[userPick]}</p>
                                    )}
                                    <p className="text-ok text-sm font-medium">Doğru: {OPTION_LABELS[correctPick]}. {q.options[correctPick]}</p>
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
                        const typed    = answer.userAnswerText.trim();
                        const accepted = q.openAnswers.filter(a => a.trim());
                        return (
                          <div className="space-y-2 mb-4">
                            <div className={`px-4 py-3 rounded-xl border-2 ${
                              !typed ? 'border-rule bg-surface-2'
                                : isCorrect ? 'border-correct bg-correct/8'
                                : 'border-error bg-error/8'
                            }`}>
                              <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute mb-1.5 flex items-center gap-1.5">
                                <Pencil size={11} /> Sizin cavabınız
                              </p>
                              {typed ? (
                                <p className={`text-sm font-medium m-0 whitespace-pre-wrap ${
                                  isCorrect ? 'text-ink' : 'text-ink'
                                }`}>
                                  {typed}
                                </p>
                              ) : (
                                <p className="text-sm text-ink-mute m-0">Cavab verilməyib.</p>
                              )}
                            </div>

                            {accepted.length > 0 && (
                              <div className="px-4 py-3 rounded-xl border-2 border-correct bg-correct/8">
                                <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute mb-1.5 flex items-center gap-1.5">
                                  <CheckCircle2 size={11} className="text-ok" />
                                  {accepted.length > 1 ? 'Qəbul edilən cavablar' : 'Doğru cavab'}
                                </p>
                                <p className="text-sm font-medium text-ink m-0">
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
                        const essay = writingAnswer.userAnswerText;
                        const bandScore = writingAnswer.writingScore;
                        const wordCount = writingAnswer.writingWordCount;
                        const criteria = writingAnswer.writingCriteria ?? [];
                        const aiFeedback = writingAnswer.aiFeedback;
                        const bandColor = bandScore !== undefined
                          ? bandScore >= 7 ? 'text-ok' : bandScore >= 5 ? 'text-warn' : 'text-error'
                          : 'text-ink-mute';
                        return (
                          <div className="space-y-3 mb-4">
                            {essay ? (
                              <div className="p-4 bg-surface-2 border border-rule rounded-xl">
                                <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute mb-2 flex items-center gap-1.5">
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
                            {essay && writingAnswer.writingPending && (
                              <div className="p-4 bg-surface-2 border border-rule rounded-xl">
                                <div className="flex items-center gap-2">
                                  <RotateCcw size={14} className={`text-ink-soft ${recheckPending ? 'animate-spin' : ''}`} />
                                  <p className="text-sm font-medium text-ink">Esseniz yoxlanılır…</p>
                                </div>
                                {aiFeedback && <p className="text-sm text-ink leading-relaxed mt-2">{aiFeedback}</p>}
                              </div>
                            )}

                            {/* AI band score */}
                            {!writingAnswer.writingPending && bandScore !== undefined && (
                              <div className="p-4 bg-surface-2 border border-rule rounded-xl">
                                <div className="flex items-center justify-between mb-3">
                                  {/* One colour only. This carried `text-ink-mute` as well —
                                      inherited from the shared label class string — and rendered
                                      purple purely because Tailwind emits `text-ink-soft` later
                                      in the stylesheet than `text-ink-mute`. Correct by accident
                                      is not correct: reordering the theme would have silently
                                      turned this label grey. */}
                                  <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-soft">AI Qiymətləndirməsi</p>
                                  <span className={`font-display text-2xl font-bold ${bandColor}`}>
                                    {bandScore.toFixed(1)} <span className="text-sm font-medium text-ink-mute">/ 9</span>
                                  </span>
                                </div>

                                {criteria.length > 0 && (
                                  <div className="space-y-2 mb-3">
                                    {criteria.map((c, ci) => (
                                      <div key={ci} className="flex items-start gap-2">
                                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                          c.score >= 7 ? 'bg-correct/10 text-correct' : c.score >= 5 ? 'bg-warn/10 text-warn' : 'bg-error/10 text-error'
                                        }`}>
                                          {c.score}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-ink">{c.criterion}</p>
                                          <p className="text-sm text-ink-soft leading-relaxed">{c.comment}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {aiFeedback && (
                                  <p className="text-sm text-ink leading-relaxed border-t border-rule pt-3">{aiFeedback}</p>
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
                        <div className="mt-3 p-3 bg-surface-2 border border-rule rounded-xl">
                          {/* This one was actually broken: `text-ink-mute` is emitted AFTER
                              `text-ink-soft`, so it won, and the heading rendered grey inside a
                              blue card whose border and body text are both blue. */}
                          <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-soft mb-1">İzahat</p>
                          <div className="text-xs text-ink leading-relaxed">
                            <MathText text={q.explanation} className="leading-relaxed" />
                          </div>
                        </div>
                      )}

                      {/*
                        The question has since left the bank, so the extras that
                        are NOT snapshotted — the explanation, the accepted open
                        answers, the matching key — cannot be shown. What was
                        asked and how it was marked come from the attempt and
                        are above, unaffected. Said plainly so a missing
                        explanation does not read as an empty one.
                      */}
                      {q.questionMissing && (
                        <p className="m-0 mt-3 text-xs leading-relaxed text-ink-mute">
                          Bu sual imtahan bankında dəyişdirilib və ya silinib — izahat və
                          cavab açarı əlçatan deyil. Yuxarıdakı sual mətni və cavabınız
                          cəhdinizdən olduğu kimi saxlanılıb.
                        </p>
                      )}
                      </>
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
