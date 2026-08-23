'use client';

import { memo } from 'react';
import Image from 'next/image';
import { CheckCircle2, Flag, Grid3X3, Pencil } from 'lucide-react';
import MathText from '@/components/ui/MathText';
import { MAX_ANSWER_TEXT_CHARS } from '@/lib/domain/grading';
import type { SessionQuestion } from '@/lib/actions/questions';

/**
 * One question, rendered wherever it appears.
 *
 * Extracted from the player because a screen is no longer one question: a
 * blocked module (IELTS listening parts, IELTS reading tasks) puts a whole task
 * on screen at once, so this markup has to repeat. It carries no navigation and
 * no clock — the player owns both — which is what makes it safe to render N of
 * them on one screen.
 */

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export interface QuestionCardProps {
  question: SessionQuestion;
  /** One-based number as the candidate and the answer key count it. */
  number: number;
  answer: number | undefined;
  openAnswer: string;
  matchingAnswer: number[] | undefined;
  flagged: boolean;
  onSelect: (questionId: string, optionIdx: number) => void;
  onOpenChange: (questionId: string, value: string) => void;
  onMatchingChange: (questionId: string, itemIdx: number, optionIdx: number) => void;
  onToggleFlag: (questionId: string) => void;
  /** Set on a blocked screen so each question is visually separated. */
  separated?: boolean;
  /**
   * Render this question's diagram here rather than in the side panel.
   *
   * The panel can only show ONE image — the question the candidate navigated to
   * — so on a blocked screen every other question's diagram simply vanished on
   * desktop, because this block was `md:hidden`. IELTS listening map and
   * diagram-labelling tasks are exactly that shape: blocked, and image-bearing
   * on more than the first question.
   */
  inlineImage?: boolean;
}

function typeLabel(type: string): string {
  if (type === 'open') return 'Açıq tapşırıq';
  if (type === 'matching') return 'Uyğunlaşdırma';
  if (type === 'writing') return 'Yazı tapşırığı';
  return 'Çoxseçimli';
}

function QuestionCard({
  question: q, number, answer, openAnswer, matchingAnswer, flagged,
  onSelect, onOpenChange, onMatchingChange, onToggleFlag,
  separated = false, inlineImage = false,
}: QuestionCardProps) {
  return (
    <div
      id={`q-${q.id}`}
      className={separated ? 'border-t border-rule pt-6 first:border-t-0 first:pt-0' : ''}
      // Scroll target when the navigator jumps to a question inside a block.
      style={{ scrollMarginTop: '1rem' }}
    >
      <div className="mb-4 flex items-center justify-between gap-2 md:mb-5">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink text-xs font-medium text-bg md:h-8 md:w-8 md:text-sm">
            {number}
          </span>
          <span className="truncate text-xs md:text-sm">{typeLabel(q.type)}</span>
        </div>
        <button
          onClick={() => onToggleFlag(q.id)}
          aria-pressed={flagged}
          aria-label={`${number}-ci sualı sonra baxmaq üçün işarələ`}
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            flagged ? 'border-warn bg-warn/10 text-warn' : 'border-transparent bg-transparent text-ink-soft'
          }`}
        >
          <Flag size={12} /> {flagged ? 'İşarəli' : 'İşarələ'}
        </button>
      </div>

      {/*
        `whitespace-pre-line` lets a stem carry real paragraph breaks. renderMath
        escapes its input and emits no <br>, so authored newlines used to
        collapse — running trailing notes ("NB There are more headings than
        paragraphs…") straight on from the instruction they qualify.
      */}
      <div className="mb-5 text-sm leading-relaxed whitespace-pre-line text-ink md:mb-7 md:text-base">
        <MathText text={q.stem} block />
      </div>

      {q.type === 'mcq' && (
        <div className="space-y-2 md:space-y-2.5">
          {q.options.map((opt, i) => {
            const selected = answer === i;
            return (
              <button
                key={i}
                onClick={() => onSelect(q.id, i)}
                className={`flex w-full items-start gap-3 rounded-xl border-[1.5px] p-3 text-left transition-all md:gap-4 md:p-4 ${
                  selected ? 'border-ink bg-ink/4' : 'border-rule bg-surface'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-all md:h-7 md:w-7 ${
                    selected ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-soft'
                  }`}
                >
                  {OPTION_LABELS[i]}
                </span>
                <div className="flex-1 pt-0.5 text-sm leading-relaxed text-ink">
                  <MathText text={opt} />
                </div>
                {selected && <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ink" />}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'open' && (
        <div className="space-y-3">
          <textarea
            rows={2}
            value={openAnswer}
            onChange={e => onOpenChange(q.id, e.target.value)}
            // The server truncates at this length before storing. Enforcing it
            // here means the candidate is stopped at the limit rather than
            // finding out afterwards that the tail of their answer was cut.
            maxLength={MAX_ANSWER_TEXT_CHARS}
            placeholder="Cavabınızı burada yazın..."
            aria-label={`${number}-ci sualın cavabı`}
            className="w-full resize-none rounded-btn border border-rule bg-surface bg-none px-4 py-3.5 font-sans text-base text-ink outline-none transition-[border-color] duration-200 placeholder:text-ink-mute focus:border-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1"
          />
        </div>
      )}

      {q.type === 'matching' && q.matchItems && q.matchItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl border border-rule bg-surface-2 p-3">
            <Grid3X3 size={13} className="shrink-0" />
            <p className="text-sm leading-relaxed">Hər element üçün uyğun cavabı seçin.</p>
          </div>
          <div className="space-y-2.5">
            {q.matchItems.map((item, itemIdx) => {
              const selectedValue = matchingAnswer?.[itemIdx] ?? -1;
              return (
                <div key={itemIdx} className="flex items-start gap-3 rounded-xl border border-rule bg-surface-2 p-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-ink-soft">
                    {itemIdx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 text-sm leading-relaxed text-ink">
                      <MathText text={item} />
                    </p>
                    <select
                      value={selectedValue}
                      onChange={e => onMatchingChange(q.id, itemIdx, parseInt(e.target.value))}
                      className={`w-full rounded-btn border bg-surface bg-none px-4 py-3.5 font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 ${
                        selectedValue >= 0 ? 'border-ink' : 'border-rule'
                      }`}
                    >
                      <option value={-1}>— Seçin —</option>
                      {q.options.map((opt, optIdx) => (
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

      {q.type === 'writing' && (() => {
        const words = openAnswer.trim() ? openAnswer.trim().split(/\s+/).length : 0;
        const minW = q.minWords ?? 0;
        const maxW = q.maxWords ?? 0;
        const belowMin = minW > 0 && words < minW;
        const aboveMax = maxW > 0 && words > maxW;
        return (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-rule bg-surface-2 p-3">
              <Pencil size={13} className="mt-0.5 shrink-0" />
              <p className="text-sm leading-relaxed">
                Bu yazı tapşırığıdır. Cavabınız tamamlandıqdan sonra AI tərəfindən qiymətləndiriləcəkdir.
                {minW > 0 && ` Minimum: ${minW} söz.`}
                {maxW > 0 && ` Maksimum: ${maxW} söz.`}
              </p>
            </div>
            {q.rubric && (
              <div className="rounded-xl border border-rule bg-surface-2 p-3">
                <p className="font-sans text-xs leading-normal font-medium tracking-[0.08em] uppercase text-ink-mute mb-1">
                  Qiymətləndirmə meyarları
                </p>
                <p className="text-sm leading-relaxed">{q.rubric}</p>
              </div>
            )}
            <textarea
              rows={10}
              value={openAnswer}
              onChange={e => onOpenChange(q.id, e.target.value)}
              maxLength={MAX_ANSWER_TEXT_CHARS}
              placeholder="Cavabınızı burada yazın..."
              aria-label={`${number}-ci tapşırığın cavabı`}
              className="w-full resize-y rounded-btn border border-rule bg-surface bg-none px-4 py-3.5 font-sans text-base leading-relaxed text-ink outline-none transition-[border-color] duration-200 placeholder:text-ink-mute focus:border-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1"
            />
            <div
              className={`flex items-center justify-between px-1 text-xs font-medium ${
                belowMin ? 'text-warn' : aboveMax ? 'text-error' : 'text-ink-mute'
              }`}
            >
              <span>
                {words} söz
                {openAnswer.length > MAX_ANSWER_TEXT_CHARS * 0.9 && (
                  <span className="ml-2 text-error">
                    {MAX_ANSWER_TEXT_CHARS - openAnswer.length} simvol qalıb
                  </span>
                )}
              </span>
              {minW > 0 && maxW > 0 && <span>{minW}–{maxW} söz tövsiyə olunur</span>}
              {minW > 0 && maxW === 0 && <span>Minimum {minW} söz</span>}
            </div>
          </div>
        );
      })()}

      {q.imageUrl && (
        <div className={inlineImage ? 'mt-4' : 'mt-4 md:hidden'}>
          <Image
            src={q.imageUrl}
            alt="Sual diaqramı"
            width={0}
            height={0}
            sizes="100vw"
            className="h-auto w-full rounded-xl border border-rule shadow-sm"
          />
        </div>
      )}
    </div>
  );
}

/*
 * Memoised because the exam clock re-renders the player once a second for the
 * whole sitting. Without this every option list, every `MathText` run and every
 * KaTeX render was rebuilt on each tick — under the candidate's cursor, while
 * they were typing an essay. The player hands down stable callbacks so the
 * comparison actually holds.
 */
export default memo(QuestionCard);
