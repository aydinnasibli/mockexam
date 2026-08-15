'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PublicExam } from '@/lib/db/exams';
import { EXAM_TYPES, examTypeLabel, isExamType } from '@/lib/domain/exam-types';
import StructureBar from '@/components/ui/StructureBar';
import {
  BREAK_FILL,
  SCORE_SCALE,
  examCodes,
  pad2,
  shortTypeLabel,
  structureOf,
  upperLabel,
} from './structure';
import Button from '@/components/ui/Button';
import { MONO_LABEL } from '@/components/ui/type-styles';

/** A block narrower than this share of the bar has no room for its figure. */
const MIN_FIGURE_SHARE = 0.11;

/** DİM papers are divided into blocks, not sections. */
const SECTION_NOUN: Record<string, string> = { dim: 'blok' };

/**
 * Codes, program pills and tabs are set in a 112px column and a flush tab row,
 * so they take the short form of a type's name.
 */
function shortLabel(type: string): string {
  return shortTypeLabel(type, examTypeLabel(type));
}

/**
 * Ghost pills in the masthead. Types with no active exam are announced from
 * EXAM_TYPES; GMAT has no entry there (nothing can be stored under it) so it is
 * listed literally, the same way the homepage advertises it.
 */
const PLANNED_PILL_LABEL: Record<string, string> = { general_english: 'CEFR' };
const PLANNED_EXTRA = ['GMAT'];

const NUMBER_WORDS = ['Sıfır', 'Bir', 'İki', 'Üç', 'Dörd', 'Beş', 'Altı', 'Yeddi', 'Səkkiz', 'Doqquz', 'On'];


function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

interface Props {
  exams: PublicExam[];
  initialType?: string;
}

export default function ExamsCatalog({ exams, initialType }: Props) {
  const [activeType, setActiveType] = useState<string>(initialType ?? 'all');

  // Tabs follow EXAM_TYPES order rather than database order, so the tab row,
  // the register order and the generated codes all agree with each other.
  const presentTypes = new Set(exams.map((e) => e.type));
  const types: string[] = EXAM_TYPES.map((t) => t.value).filter((t) => presentTypes.has(t));
  for (const t of presentTypes) if (!types.includes(t)) types.push(t);

  // A `?type=` landing page for a type with no exams still gets its own tab,
  // otherwise the masthead would show no active tab at all for that URL.
  const tabTypes = activeType !== 'all' && !types.includes(activeType) && isExamType(activeType)
    ? [...types, activeType]
    : types;

  /**
   * Codes are numbered per type across the *unfiltered* list, so `SAT—01`
   * names the same exam whichever tab is open.
   */
  const codes = examCodes(exams, shortLabel);

  const planned = [
    ...EXAM_TYPES.filter((t) => !presentTypes.has(t.value))
      .map((t) => PLANNED_PILL_LABEL[t.value] ?? t.label),
    ...PLANNED_EXTRA,
  ];

  /**
   * Filtering is client-side, but the URL has to follow it: `/exams?type=sat`
   * is a distinct landing page with its own title, description and canonical,
   * and until now clicking a filter left the address bar on /exams so those
   * pages were unreachable and unshareable. `history.pushState` integrates
   * with the Next router and updates the URL without a server round-trip.
   */
  function selectType(type: string) {
    setActiveType(type);
    if (typeof window === 'undefined') return;
    window.history.pushState(null, '', type === 'all' ? '/exams' : `/exams?type=${type}`);
  }

  const listed = exams
    .filter((exam) => activeType === 'all' || exam.type === activeType)
    .sort((a, b) => {
      const byType = types.indexOf(a.type) - types.indexOf(b.type);
      return byType !== 0 ? byType : (codes.get(a.id) ?? '').localeCompare(codes.get(b.id) ?? '');
    });

  // The strip describes what any purchase includes, so it falls back to the
  // whole catalog when a filter happens to match nothing.
  const summarySource = listed.length > 0 ? listed : exams;
  const maxQuestions = summarySource.reduce((max, e) => Math.max(max, e.totalQuestions), 0);

  // The scale belongs to the first program in view that publishes one, in
  // EXAM_TYPES order — so the unfiltered catalog quotes SAT's 1600 and an IELTS
  // tab quotes 9.0. "AI" rather than an invented ceiling when nothing in view
  // has a published maximum: the prediction is still included either way.
  const inView = new Set(summarySource.map((e) => e.type));
  const scaledType = EXAM_TYPES.map((t) => t.value).find((t) => inView.has(t) && SCORE_SCALE[t]);
  const scoreScale = scaledType ? SCORE_SCALE[scaledType] : 'AI';

  // The short form again: at 84px, "General English (CEFR) sınağı" would run
  // past the masthead.
  const typeLabel = activeType === 'all' ? null : shortLabel(activeType);
  const headline = listed.length === 0
    ? { lead: typeLabel ? `${typeLabel} sınağı` : 'Sınaqlar', tail: 'hazırlanır.' }
    : {
        lead: typeLabel
          ? `${numberWord(listed.length)} ${typeLabel} sınağı`
          : `${numberWord(listed.length)} sınaq`,
        tail: 'açıqdır.',
      };

  return (
    <>
      {/* ── Ink masthead ── */}
      <div className="bg-ink text-bg">
        <div className="shell pt-14 lg:pt-19">

          <div className="grid gap-10 lg:grid-cols-[1fr_400px] lg:gap-20 lg:items-end">
            <div>
              <div className={`${MONO_LABEL} mb-6 text-bg/50 lg:mb-7`}>Kataloq</div>
              <h1 className="m-0 text-display-sm font-light leading-[0.94] tracking-[-0.045em] text-bg sm:text-6xl lg:text-hero">
                {headline.lead}
                <br />
                {headline.tail}
              </h1>
            </div>

            {planned.length > 0 && (
              <div className="lg:pb-2.5">
                {/* /55 is the floor for 10px bone text on ink: /40 measured
                    3.71:1, under the 4.5:1 minimum this design already holds
                    `ink-mute` to on the bone surfaces. */}
                <div className={`${MONO_LABEL} mb-3.5 text-bg/55`}>Hazırlanır</div>
                <div className="flex flex-wrap gap-1.5">
                  {planned.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-bg/20 px-3.5 py-1.75 font-mono text-label tracking-[0.06em] text-bg/55"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tabs are flush with the band's bottom edge: the active one is
              filled with the page background so the sheet below comes forward. */}
          <div className="no-scrollbar mt-10 flex items-end overflow-x-auto lg:mt-14">
            {['all', ...tabTypes].map((type) => {
              const count = type === 'all'
                ? exams.length
                : exams.filter((e) => e.type === type).length;
              const isActive = activeType === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => selectType(type)}
                  aria-pressed={isActive}
                  className={`flex shrink-0 items-baseline gap-2.5 whitespace-nowrap px-6.5 transition-colors duration-150 ${
                    isActive
                      ? 'rounded-t-btn bg-bg pt-4 pb-3.75 text-ink'
                      : 'pt-3.5 pb-3.25 text-bg/70 hover:text-bg'
                  }`}
                >
                  <span className={`text-body ${isActive ? 'font-medium' : ''}`}>
                    {type === 'all' ? 'Hamısı' : shortLabel(type)}
                  </span>
                  {/* The inactive count sits on ink; /45 measured 4.33:1 at
                      12px, just under AA. A count the visitor is meant to read
                      before choosing a filter has to clear it. */}
                  <span className={`font-mono text-xs tabular-nums ${isActive ? 'text-ink-mute' : 'text-bg/55'}`}>
                    {pad2(count)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Register ── */}
      <div className="shell pb-24 lg:pb-32">

        {/* The register's four columns need the full 1280 container to keep
            their designed widths, so they arrive at xl; below that the row
            stacks. */}
        <div className={`${MONO_LABEL} hidden border-b border-ink pt-4 pb-3.25 text-ink-mute xl:grid xl:grid-cols-[112px_1fr_360px_156px] xl:gap-10`}>
          <span>Kod</span>
          <span>Sınaq</span>
          <span>Struktur və vaxt bölgüsü</span>
          <span className="text-right">Qiymət</span>
        </div>

        {/* The column header is desktop-only; on narrow screens the register
            still needs the rule that opens it. */}
        <div className="border-b border-ink pt-6 xl:hidden" />

        {listed.length === 0 ? (
          <div className="border-b border-ink py-24 text-center">
            <p className="m-0 mb-3 text-2xl font-normal leading-tight tracking-[-0.028em] text-ink">
              Bu proqram üzrə sınaq hazırlanır
            </p>
            <p className="m-0 mb-7 text-base text-ink-soft">
              Digər proqramların sınaqları kataloqda açıqdır.
            </p>
            <Button variant="ghost" type="button" onClick={() => selectType('all')}>
              Bütün sınaqlar
            </Button>
          </div>
        ) : (
          /*
           * The rows do NOT reveal on scroll. They are the page's primary
           * content and they replace a skeleton, so starting them at zero
           * opacity left an empty register in the frame between the skeleton
           * being torn down and the animation starting — which read as a
           * blink. The motion here lives in the timing diagrams, which draw
           * themselves inside rows that are already solid.
           */
          listed.map((exam, i) => {
            const structure = structureOf(exam);
            const examMinutes = exam.durationMinutes -
              exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
            const sectionNoun = SECTION_NOUN[exam.type] ?? 'bölmə';
            const isLast = i === listed.length - 1;

            return (
              <Link
                key={exam.id}
                href={`/exams/${exam.id}`}
                className={`group grid gap-y-5 border-b py-7 transition-colors duration-150 hover:bg-surface
                            xl:grid-cols-[112px_1fr_360px_156px] xl:items-center xl:gap-x-10 xl:gap-y-0 xl:py-9.5
                            ${isLast ? 'border-ink' : 'border-rule'}`}
              >
                {/* Code */}
                <div className="flex items-center gap-3 xl:block">
                  <span className="block font-mono text-note text-ink">{codes.get(exam.id)}</span>
                  <span className="inline-flex rounded-full bg-surface-3 px-2.5 py-1 font-mono text-caption tracking-[0.12em] uppercase text-ink xl:mt-2.5">
                    {shortLabel(exam.type)}
                  </span>
                </div>

                {/* Title + figures */}
                <div>
                  <div className="text-title leading-[1.15] font-normal tracking-[-0.028em] text-ink xl:text-heading">
                    {exam.title}
                  </div>
                  <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-mono text-subhead tabular-nums text-ink">{examMinutes}</span>
                      <span className="font-mono text-label tracking-[0.12em] uppercase text-ink-mute">dəq</span>
                    </span>
                    <span className="h-4 w-px bg-rule-strong" />
                    <span className="flex items-baseline gap-1.5">
                      <span className="font-mono text-subhead tabular-nums text-ink">{exam.totalQuestions}</span>
                      <span className="font-mono text-label tracking-[0.12em] uppercase text-ink-mute">sual</span>
                    </span>
                    <span className="h-4 w-px bg-rule-strong" />
                    <span className="font-mono text-label tracking-[0.12em] uppercase text-ink-mute">
                      {exam.modules.length} {sectionNoun}
                    </span>
                  </div>
                </div>

                {/* Structure diagram. Capped at the column width the design
                    gives it, so the stacked row does not stretch a 34px bar
                    across the whole page. */}
                <div className="max-w-90">
                  {structure.total > 0 && (
                    <StructureBar
                      blocks={structure.blocks}
                      total={structure.total}
                      heightClass="h-8.5"
                      minFigureShare={MIN_FIGURE_SHARE}
                    />
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
                    {structure.bands.map((band) => (
                      <span
                        key={band.label}
                        className="flex items-center gap-1.5 font-mono text-caption tracking-widest uppercase text-ink-mute"
                      >
                        <span className={`h-2 w-2 shrink-0 ${band.fill}`} />
                        {upperLabel(band.label)}
                      </span>
                    ))}
                    {structure.hasBreak && (
                      <span className="flex items-center gap-1.5 font-mono text-caption tracking-widest uppercase text-ink-mute">
                        <span className={`h-2 w-2 shrink-0 ${BREAK_FILL}`} />
                        Fasilə
                      </span>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center gap-4.5 xl:justify-end">
                  <span className="font-mono text-title-lg tabular-nums text-ink">
                    {exam.price > 0 ? `${exam.price} ₼` : 'Pulsuz'}
                  </span>
                  <span
                    aria-hidden
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink text-sm text-ink transition-colors duration-200 group-hover:bg-ink group-hover:text-bg"
                  >
                    <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                  </span>
                </div>
              </Link>
            );
          })
        )}

        {/* ── What every purchase includes ── */}
        <div className="grid gap-6 pt-10 lg:grid-cols-[112px_1fr] lg:gap-10 lg:pt-14">
          <div className={`${MONO_LABEL} text-ink-mute lg:pt-1.5`}>Hər sınağa</div>
          <div className="grid grid-cols-2 gap-0.5 lg:grid-cols-4">
            {[
              { figure: '11', label: 'ölçü üzrə analiz' },
              { figure: String(maxQuestions || exams.length), label: 'sual üçün izahat' },
              { figure: '∞', label: 'cəhd və baxış' },
            ].map((tile) => (
              <div key={tile.label} className="bg-surface-2 px-5 pt-5.5 pb-6 lg:px-5.5">
                <div className="mb-3 font-mono text-title-lg font-light tabular-nums text-ink">{tile.figure}</div>
                <div className="text-body text-ink">{tile.label}</div>
              </div>
            ))}
            <div className="bg-ink px-5 pt-5.5 pb-6 lg:px-5.5">
              <div className="mb-3 font-mono text-title-lg font-light tabular-nums text-bg">{scoreScale}</div>
              <div className="text-body text-bg/70">bal proqnozu</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
