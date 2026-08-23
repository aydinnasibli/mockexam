// Exam-authentic score conversions — client-safe (no server imports).
//
// The platform stores a normalised percentage per attempt (good for cross-exam
// averages), but each exam is REPORTED the way it is really graded:
//   • IELTS  → band 0–9 (half-bands) per section + overall band
//   • SAT    → scaled 200–800 per section, 400–1600 total
//   • others → percentage (unchanged)
//
// IELTS band tables below are the widely published Cambridge/British Council
// raw→band conversions for a 40-question section. SAT uses a linear raw→scaled
// approximation (the official per-form equating curves are not public); swap in
// an official table here if you have one.

/** Round to the nearest half-band, IELTS-style (x.25 rounds up to x.5). */
export function roundHalfBand(x: number): number {
  return Math.round(x * 2) / 2;
}

type BandRow = [minRaw: number, band: number];

// Highest threshold first; first row whose minRaw <= raw wins.
const IELTS_LISTENING: BandRow[] = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6],
  [18, 5.5], [16, 5], [13, 4.5], [10, 4], [6, 3.5], [4, 3], [3, 2.5], [2, 2], [1, 1], [0, 0],
];

const IELTS_ACADEMIC_READING: BandRow[] = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6],
  [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [3, 2], [1, 1], [0, 0],
];

function rawToBand(table: BandRow[], raw: number): number {
  for (const [minRaw, band] of table) {
    if (raw >= minRaw) return band;
  }
  return 0;
}

/**
 * Put a section's marks on the 40-mark scale the band tables assume.
 *
 * Cambridge publishes raw→band for a 40-question section and nothing else, but
 * an authored section is not always exactly 40 marks — especially now that
 * matching is marked per item, which turned one shipped IELTS reading section
 * into 53 marks. Feeding 53 into a 40-row table would hand a mediocre candidate
 * Band 9; feeding a 30-mark section in unscaled would cap a perfect one at 7.
 *
 * Scaling proportionally keeps the band meaningful at any section length. It is
 * an approximation — the real tables are equated per paper — so a section
 * authored to exactly 40 marks is still the accurate case, and this is the
 * safety net rather than a licence to ignore the length.
 */
export function scaleRawTo40(correct: number, total: number): number {
  if (!Number.isFinite(correct) || correct <= 0) return 0;
  if (!Number.isFinite(total) || total <= 0) return 0;
  // Clamp before scaling — a raw above the total would otherwise walk straight
  // off the end of the band table and report a score no paper can produce.
  const capped = Math.min(correct, total);
  if (total === 40) return capped;
  return Math.round((capped / total) * 40);
}

export function ieltsListeningBand(correct: number, total = 40): number {
  return rawToBand(IELTS_LISTENING, scaleRawTo40(correct, total));
}

export function ieltsReadingBand(correct: number, total = 40): number {
  return rawToBand(IELTS_ACADEMIC_READING, scaleRawTo40(correct, total));
}

/** One graded writing task, tagged with the task type declared on the question. */
export interface WritingTaskBand {
  /** 'task1' | 'task2' | 'integrated' | … — from the question, NOT submission order. */
  taskType?: string;
  band: number;
  /** Which module's section this essay belongs to. See `computeAuthenticScores`. */
  moduleIndex?: number;
}

/**
 * Writing section band. Task 2 counts double in the official IELTS scheme, so
 * the tasks are identified by their declared `taskType` rather than by array
 * position — otherwise the order answers happen to arrive in would change the
 * band. When the tasks aren't labelled task1/task2 (e.g. a single general
 * prompt, or a TOEFL-style pair), fall back to a plain mean instead of guessing.
 */
export function ieltsWritingBand(tasks: WritingTaskBand[]): number | null {
  const valid = tasks.filter(t => typeof t.band === 'number');
  if (valid.length === 0) return null;
  if (valid.length === 1) return roundHalfBand(valid[0].band);

  const t1 = valid.find(t => t.taskType === 'task1');
  const t2 = valid.find(t => t.taskType === 'task2');
  if (t1 && t2) return roundHalfBand((t1.band + 2 * t2.band) / 3);

  return roundHalfBand(valid.reduce((s, t) => s + t.band, 0) / valid.length);
}

/** Band for one IELTS section by module type, or null if it isn't a graded section. */
export function ieltsSectionBand(
  moduleType: string,
  correct: number,
  total = 40,
  writingTasks?: WritingTaskBand[],
): number | null {
  if (moduleType === 'listening') return ieltsListeningBand(correct, total);
  if (moduleType === 'reading')   return ieltsReadingBand(correct, total);
  if (moduleType === 'writing')   return ieltsWritingBand(writingTasks ?? []);
  return null;
}

/** Overall IELTS band = mean of the available section bands, rounded to a half. */
export function ieltsOverallBand(sectionBands: number[]): number | null {
  const bands = sectionBands.filter(b => typeof b === 'number');
  if (bands.length === 0) return null;
  return roundHalfBand(bands.reduce((a, b) => a + b, 0) / bands.length);
}

/** Digital SAT section scaled score (200–800), linear approximation, rounded to 10. */
export function satSectionScaled(correct: number, maxRaw: number): number {
  if (maxRaw <= 0) return 200;
  const ratio = Math.max(0, Math.min(1, correct / maxRaw));
  const scaled = 200 + Math.round((ratio * 600) / 10) * 10;
  return Math.max(200, Math.min(800, scaled));
}

export type ExamKind = 'ielts' | 'sat' | string;

// ── Save-time computers ──────────────────────────────────────────────────────
// Called once when an attempt is scored (results.ts) and stored on the result,
// so every display surface can read them without loading the exam definition.

export interface AuthenticScores {
  overallBand?: number;   // IELTS overall band
  totalScaled?: number;   // SAT total 400–1600
  rwScaled?: number;      // SAT Reading & Writing 200–800
  mathScaled?: number;    // SAT Math 200–800
  /** IELTS per-section band keyed by moduleIndex (writing omitted while pending). */
  moduleBands: Record<number, number>;
}

export function computeAuthenticScores(params: {
  examType: ExamKind;
  modules: { type: string }[];
  moduleScores: { moduleIndex: number; correct: number; total: number; pending?: boolean }[];
  /**
   * Graded essays, tagged with the module they belong to.
   *
   * `moduleIndex` matters: this used to be one flat list handed to every
   * writing module in turn, so a paper with two writing sections gave both the
   * identical band computed from all essays in the attempt. No bank ships that
   * shape today, and the failure would have been silent when one did.
   */
  writingTasks?: WritingTaskBand[];
}): AuthenticScores {
  const { examType, modules, moduleScores, writingTasks = [] } = params;
  const moduleBands: Record<number, number> = {};

  if (examType === 'ielts') {
    const bandsForOverall: number[] = [];
    for (const ms of moduleScores) {
      /*
       * A section with no marks is one the candidate never sat.
       *
       * `buildModuleSchedule` skips a module whose bank is empty, so it is
       * never opened and never shown — but `buildModuleScores` still emits a
       * row for it, with `total: 0`. Feeding that to the band table returns
       * Band 0 rather than null (the tables bottom out at `[0, 0]`), and a
       * zero for a section nobody sat then dragged the mean: a candidate who
       * scored Band 7 on Listening, on a paper whose Reading was declared but
       * never authored, was reported Band 3.5.
       *
       * `overallPercent` applies exactly this filter for the percentage; the
       * band path needs it for the same reason.
       */
      if (ms.total <= 0) continue;

      const type = modules[ms.moduleIndex]?.type ?? '';
      let band: number | null = null;
      if (type === 'writing') {
        // Only this module's essays. Tasks with no moduleIndex are from an
        // older result and belong to whichever writing module is being scored —
        // there was only ever one when they were written.
        const mine = writingTasks.filter(
          t => t.moduleIndex === undefined || t.moduleIndex === ms.moduleIndex,
        );
        if (!ms.pending) band = ieltsWritingBand(mine);
      } else {
        band = ieltsSectionBand(type, ms.correct, ms.total);
      }
      if (band !== null) {
        moduleBands[ms.moduleIndex] = band;
        bandsForOverall.push(band);
      }
    }
    const overall = ieltsOverallBand(bandsForOverall);
    return { overallBand: overall ?? undefined, moduleBands };
  }

  if (examType === 'sat') {
    const agg = (kind: string) => moduleScores.reduce(
      (acc, ms) => (modules[ms.moduleIndex]?.type === kind
        ? { correct: acc.correct + ms.correct, total: acc.total + ms.total }
        : acc),
      { correct: 0, total: 0 },
    );
    const rw = agg('rw');
    const math = agg('math');

    /*
     * A section with no marks is REPORTED AS ABSENT, not as its floor.
     *
     * `satSectionScaled(0, 0)` returns 200 — correct as a floor for a section
     * that was sat and scored nothing, wrong as a stand-in for one that does
     * not exist. A paper with an authored Reading & Writing and no Math bank
     * was reporting 760 + 200 = 960, which reads as a real SAT total and is
     * not one. Omitting the field lets `formatOverallScore` fall back to the
     * percentage instead of inventing a score.
     */
    const rwScaled   = rw.total   > 0 ? satSectionScaled(rw.correct, rw.total)     : undefined;
    const mathScaled = math.total > 0 ? satSectionScaled(math.correct, math.total) : undefined;
    const totalScaled = rwScaled !== undefined && mathScaled !== undefined
      ? rwScaled + mathScaled
      : undefined;

    return { rwScaled, mathScaled, totalScaled, moduleBands };
  }

  return { moduleBands };
}

// ── Display formatters ───────────────────────────────────────────────────────

export interface AttemptScoreFields {
  examType?: string;
  score: number;          // normalised percentage (fallback + cross-exam average)
  overallBand?: number;
  totalScaled?: number;
  /** Only `pending` is read — see `provisional` on the return of `formatOverallScore`. */
  moduleScores?: readonly { pending?: boolean }[];
}

/**
 * Headline score for one attempt, in the exam's real units.
 *
 * `provisional` is set when a section is still with the writing grader. Those
 * sections are excluded from the overall band rather than counted as zero,
 * which is right — but it means the number is a mean of the sections that HAVE
 * been marked, and presenting that as a finished IELTS overall band overstates
 * it. An essay that never grades leaves the figure provisional indefinitely, so
 * the flag is not merely a loading state.
 *
 * `approximate` is set whenever the figure is a CONVERSION rather than a count.
 * Both conversions in this file are documented approximations — `satSectionScaled`
 * is a linear stand-in because the official per-form equating curves are not
 * public, and `scaleRawTo40` rescales a section of any length onto a band table
 * published for exactly 40 marks. Both are reasonable and both are honest in
 * the source; neither caveat reached the student, who saw `1340 / 1600` or
 * `Band 7.0` rendered exactly like a real result. A percentage is a plain count
 * of marks earned, so it is never flagged.
 */
export function formatOverallScore(
  r: AttemptScoreFields,
): { value: string; unit: string; provisional: boolean; approximate: boolean } {
  const provisional = !!r.moduleScores?.some(m => m.pending);

  if (r.examType === 'ielts' && typeof r.overallBand === 'number') {
    return { value: r.overallBand.toFixed(1), unit: 'Band', provisional, approximate: true };
  }
  if (r.examType === 'sat' && typeof r.totalScaled === 'number') {
    return { value: String(r.totalScaled), unit: '/ 1600', provisional, approximate: true };
  }
  return { value: String(r.score), unit: '%', provisional, approximate: false };
}

/** One module/section score line, in the exam's real units. */
export function formatModuleScore(
  examType: string | undefined,
  ms: { scorePercent: number; band?: number; pending?: boolean },
): string {
  if (examType === 'ielts') {
    if (ms.pending) return 'yoxlanılır…';
    if (typeof ms.band === 'number') return `Band ${ms.band.toFixed(1)}`;
  }
  return `${ms.scorePercent}%`;
}

/**
 * The attempt's headline percentage: the mean of its SECTION percentages.
 *
 * This replaces an unweighted mean of two aggregates — "all objective questions"
 * against "all essays" — which handed writing half the paper. On an IELTS mock
 * that is 80 objective marks weighed against 2 essays, so a single essay moved
 * the overall score about twenty times as much as a reading question did. Every
 * exam this platform mocks reports equal sections instead, so that is what is
 * averaged here.
 *
 * A module is counted when it has marks of its own and is finished:
 *   • `total <= 0` — no questions in the bank; averaging its 0% would drag the
 *     score down for a section the candidate was never shown.
 *   • `pending`    — writing still with the grader; it joins once scored, rather
 *     than counting as 0 in the meantime.
 */
export function overallPercent(
  moduleScores: readonly { scorePercent: number; total: number; pending?: boolean }[],
): number {
  const counted = moduleScores.filter(m => m.total > 0 && !m.pending);
  if (counted.length === 0) return 0;
  const sum = counted.reduce((acc, m) => acc + m.scorePercent, 0);
  return Math.round(sum / counted.length);
}

/**
 * The attempt to present as the candidate's best, ranked in the unit it will be
 * SHOWN in.
 *
 * The analytics page picked the maximum by `score` — the normalised percentage
 * — and then rendered that attempt through `formatOverallScore`, which prints a
 * band for IELTS and a scaled total for SAT. Those orderings do not have to
 * agree: the band tables are non-linear, and the percentage and the band weight
 * writing differently, so "Ən yaxşı" could show a band that was not the highest
 * band the candidate had achieved.
 *
 * Ranking falls back to the percentage unless EVERY attempt carries the exam's
 * own unit — a half-converted list would otherwise compare a band against a
 * percentage and pick nonsense.
 */
export function pickBestAttempt<T extends AttemptScoreFields>(
  results: readonly T[],
  examType: string | undefined,
): T | null {
  if (results.length === 0) return null;

  const rank: (r: AttemptScoreFields) => number =
    examType === 'ielts' && results.every(r => typeof r.overallBand === 'number')
      ? r => r.overallBand as number
      : examType === 'sat' && results.every(r => typeof r.totalScaled === 'number')
        ? r => r.totalScaled as number
        : r => r.score;

  return results.reduce((a, b) => (rank(b) > rank(a) ? b : a));
}
