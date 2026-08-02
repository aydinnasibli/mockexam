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

export function ieltsListeningBand(correct: number): number {
  return rawToBand(IELTS_LISTENING, correct);
}

export function ieltsReadingBand(correct: number): number {
  return rawToBand(IELTS_ACADEMIC_READING, correct);
}

/** One graded writing task, tagged with the task type declared on the question. */
export interface WritingTaskBand {
  /** 'task1' | 'task2' | 'integrated' | … — from the question, NOT submission order. */
  taskType?: string;
  band: number;
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
  writingTasks?: WritingTaskBand[],
): number | null {
  if (moduleType === 'listening') return ieltsListeningBand(correct);
  if (moduleType === 'reading')   return ieltsReadingBand(correct);
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
  writingTasks?: WritingTaskBand[];
}): AuthenticScores {
  const { examType, modules, moduleScores, writingTasks = [] } = params;
  const moduleBands: Record<number, number> = {};

  if (examType === 'ielts') {
    const bandsForOverall: number[] = [];
    for (const ms of moduleScores) {
      const type = modules[ms.moduleIndex]?.type ?? '';
      let band: number | null = null;
      if (type === 'writing') {
        if (!ms.pending) band = ieltsWritingBand(writingTasks);
      } else {
        band = ieltsSectionBand(type, ms.correct);
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
    const rwScaled = satSectionScaled(rw.correct, rw.total);
    const mathScaled = satSectionScaled(math.correct, math.total);
    return { rwScaled, mathScaled, totalScaled: rwScaled + mathScaled, moduleBands };
  }

  return { moduleBands };
}

// ── Display formatters ───────────────────────────────────────────────────────

export interface AttemptScoreFields {
  examType?: string;
  score: number;          // normalised percentage (fallback + cross-exam average)
  overallBand?: number;
  totalScaled?: number;
}

/** Headline score for one attempt, in the exam's real units. */
export function formatOverallScore(r: AttemptScoreFields): { value: string; unit: string } {
  if (r.examType === 'ielts' && typeof r.overallBand === 'number') {
    return { value: r.overallBand.toFixed(1), unit: 'Band' };
  }
  if (r.examType === 'sat' && typeof r.totalScaled === 'number') {
    return { value: String(r.totalScaled), unit: '/ 1600' };
  }
  return { value: String(r.score), unit: '%' };
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
