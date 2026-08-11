import type { PublicExam } from '@/lib/db/exams';

/**
 * The proportional structure diagram, shared by the catalog register and the
 * exam detail timeline: one block per module whose `flex` is its real duration,
 * breaks as pale blocks, and repeated modules sharing a fill so the legend
 * stays short (SAT reads as R&W / Math / Fasilə rather than four unrelated
 * blocks).
 *
 * Fills are in the order the design assigns them: ink, then the two secondary
 * greys. `figureClass` is the colour of the minute figure printed inside the
 * block — the fourth fill is pale enough that its figure flips to ink.
 */
const BAND_FILLS = [
  { fill: 'bg-[#1A1A1A]', figureClass: 'text-bg' },
  { fill: 'bg-[#55554F]', figureClass: 'text-bg' },
  { fill: 'bg-[#8A8A82]', figureClass: 'text-bg' },
  { fill: 'bg-[#C8C5BC]', figureClass: 'text-ink' },
];

/** Breaks carry no colour meaning; `--color-line-2`. */
export const BREAK_FILL = 'bg-[#E0DDD4]';

/**
 * Trailing module numbering: "Reading & Writing I" and "Reading & Writing II"
 * are one band. The leading separator is required so a name merely ending in
 * roman-numeral letters ("Motiv") is never truncated.
 */
const MODULE_SUFFIX = /[\s—–-]+(?:modul|module|hissə|part|bölmə|section)?[\s#]*(?:\d+|[IVX]+)$/i;

export function bandName(name: string): string {
  const trimmed = name.trim().replace(MODULE_SUFFIX, '').trim();
  return trimmed || name.trim();
}

export interface StructureBlock {
  kind: 'module' | 'break';
  minutes: number;
  /** Band label, or "Fasilə" for a break. */
  label: string;
  fill: string;
  figureClass: string;
}

export interface StructureBand {
  label: string;
  fill: string;
}

export interface Structure {
  blocks: StructureBlock[];
  bands: StructureBand[];
  hasBreak: boolean;
  /** Total minutes drawn, breaks included. */
  total: number;
}

export function structureOf(exam: PublicExam): Structure {
  const bands = new Map<string, StructureBand & { figureClass: string }>();
  const blocks: StructureBlock[] = [];

  for (const m of exam.modules) {
    const label = m.name.trim() ? bandName(m.name) : m.type.toUpperCase();
    const key = label.toLocaleLowerCase('az');

    let band = bands.get(key);
    if (!band) {
      const tone = BAND_FILLS[bands.size % BAND_FILLS.length];
      band = { label, fill: tone.fill, figureClass: tone.figureClass };
      bands.set(key, band);
    }

    if (m.durationMinutes > 0) {
      blocks.push({
        kind: 'module',
        minutes: m.durationMinutes,
        label,
        fill: band.fill,
        figureClass: band.figureClass,
      });
    }
    if (m.breakAfterMinutes > 0) {
      blocks.push({
        kind: 'break',
        minutes: m.breakAfterMinutes,
        label: 'Fasilə',
        fill: BREAK_FILL,
        figureClass: 'text-ink-mute',
      });
    }
  }

  return {
    blocks,
    bands: Array.from(bands.values(), (b) => ({ label: b.label, fill: b.fill })),
    hasBreak: blocks.some((b) => b.kind === 'break'),
    total: blocks.reduce((sum, b) => sum + b.minutes, 0),
  };
}

/** Published maxima, quoted as the "maksimum bal" figure. */
export const SCORE_SCALE: Record<string, string> = {
  sat:   '1600',
  dim:   '700',
  ielts: '9.0',
  toefl: '120',
  gre:   '340',
};

/** Long type labels do not fit a code column or an 84px headline. */
const SHORT_LABEL: Record<string, string> = { general_english: 'CEFR' };

export function shortTypeLabel(type: string, fallback: string): string {
  return SHORT_LABEL[type] ?? fallback;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * `SAT—01`-style code for an exam, numbered per type across the catalog in
 * database order so the same exam always carries the same code.
 */
export function examCodes(exams: PublicExam[], label: (type: string) => string): Map<string, string> {
  const codes = new Map<string, string>();
  const perType = new Map<string, number>();
  for (const exam of exams) {
    const n = (perType.get(exam.type) ?? 0) + 1;
    perType.set(exam.type, n);
    codes.set(exam.id, `${label(exam.type)}—${pad2(n)}`);
  }
  return codes;
}
