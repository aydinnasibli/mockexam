import { describe, expect, it } from 'vitest';
import {
  roundHalfBand,
  ieltsListeningBand,
  ieltsReadingBand,
  ieltsWritingBand,
  ieltsOverallBand,
  ieltsSectionBand,
  satSectionScaled,
  computeAuthenticScores,
  formatOverallScore,
  formatModuleScore,
  overallPercent,
  pickBestAttempt,
  scaleRawTo40,
} from './scoring';

describe('roundHalfBand', () => {
  it('rounds to the nearest half band, with x.25 going up (IELTS rule)', () => {
    expect(roundHalfBand(6.25)).toBe(6.5);
    expect(roundHalfBand(6.24)).toBe(6);
    expect(roundHalfBand(6.75)).toBe(7);
    expect(roundHalfBand(6.83)).toBe(7);
    expect(roundHalfBand(6.5)).toBe(6.5);
  });
});

describe('IELTS raw → band tables', () => {
  it('converts listening raw scores using the published thresholds', () => {
    expect(ieltsListeningBand(40)).toBe(9);
    expect(ieltsListeningBand(39)).toBe(9);
    expect(ieltsListeningBand(38)).toBe(8.5);
    expect(ieltsListeningBand(30)).toBe(7);
    expect(ieltsListeningBand(23)).toBe(6);
    expect(ieltsListeningBand(0)).toBe(0);
  });

  it('converts academic reading raw scores', () => {
    // The worked example documented in docs/scoring.md
    expect(ieltsReadingBand(27)).toBe(6.5);
    expect(ieltsReadingBand(40)).toBe(9);
    expect(ieltsReadingBand(30)).toBe(7);
    expect(ieltsReadingBand(0)).toBe(0);
  });

  it('never returns a band for a section type it does not grade', () => {
    expect(ieltsSectionBand('speaking', 30)).toBeNull();
    expect(ieltsSectionBand('math', 30)).toBeNull();
  });
});

describe('ieltsWritingBand', () => {
  it('weights Task 2 double', () => {
    // (6 + 2*7) / 3 = 6.67 → 6.5
    expect(ieltsWritingBand([
      { taskType: 'task1', band: 6 },
      { taskType: 'task2', band: 7 },
    ])).toBe(6.5);
  });

  it('is independent of the order the tasks arrive in', () => {
    const inOrder = ieltsWritingBand([
      { taskType: 'task1', band: 5 },
      { taskType: 'task2', band: 8 },
    ]);
    const reversed = ieltsWritingBand([
      { taskType: 'task2', band: 8 },
      { taskType: 'task1', band: 5 },
    ]);
    expect(inOrder).toBe(reversed);
    // (5 + 2*8) / 3 = 7 — NOT the 6 you'd get by weighting the wrong task.
    expect(inOrder).toBe(7);
  });

  it('falls back to a plain mean when tasks are not labelled task1/task2', () => {
    expect(ieltsWritingBand([{ band: 6 }, { band: 7 }])).toBe(6.5);
    expect(ieltsWritingBand([
      { taskType: 'integrated', band: 6 },
      { taskType: 'independent', band: 8 },
    ])).toBe(7);
  });

  it('returns the single band when only one task is graded', () => {
    expect(ieltsWritingBand([{ taskType: 'task2', band: 6.5 }])).toBe(6.5);
  });

  it('returns null when nothing is graded', () => {
    expect(ieltsWritingBand([])).toBeNull();
  });
});

describe('ieltsOverallBand', () => {
  it('averages the section bands and rounds half-up', () => {
    // The worked example documented in docs/scoring.md: 6.5 + 6.5 + 7.5 → 6.83 → 7.0
    expect(ieltsOverallBand([6.5, 6.5, 7.5])).toBe(7);
  });

  it('returns null when no section is graded', () => {
    expect(ieltsOverallBand([])).toBeNull();
  });
});

describe('satSectionScaled', () => {
  it('maps raw scores onto the 200–800 scale, rounded to 10', () => {
    // Worked examples documented in docs/scoring.md
    expect(satSectionScaled(36, 54)).toBe(600);
    expect(satSectionScaled(30, 44)).toBe(610);
  });

  it('clamps to the 200–800 range', () => {
    expect(satSectionScaled(0, 54)).toBe(200);
    expect(satSectionScaled(54, 54)).toBe(800);
    expect(satSectionScaled(99, 54)).toBe(800);
    expect(satSectionScaled(-5, 54)).toBe(200);
  });

  it('returns the floor when the section has no questions', () => {
    expect(satSectionScaled(0, 0)).toBe(200);
  });
});

describe('computeAuthenticScores', () => {
  const ieltsModules = [
    { type: 'listening' },
    { type: 'reading' },
    { type: 'writing' },
  ];

  it('produces per-section bands and an overall band for IELTS', () => {
    const result = computeAuthenticScores({
      examType: 'ielts',
      modules: ieltsModules,
      moduleScores: [
        { moduleIndex: 0, correct: 30, total: 40 },  // listening → 7
        { moduleIndex: 1, correct: 27, total: 40 },  // reading   → 6.5
        { moduleIndex: 2, correct: 0,  total: 2 },   // writing
      ],
      writingTasks: [
        { taskType: 'task1', band: 7 },
        { taskType: 'task2', band: 7.5 },           // (7 + 15)/3 = 7.33 → 7.5
      ],
    });

    expect(result.moduleBands[0]).toBe(7);
    expect(result.moduleBands[1]).toBe(6.5);
    expect(result.moduleBands[2]).toBe(7.5);
    // mean(7, 6.5, 7.5) = 7.0
    expect(result.overallBand).toBe(7);
  });

  it('excludes a pending writing section from the overall band', () => {
    const result = computeAuthenticScores({
      examType: 'ielts',
      modules: ieltsModules,
      moduleScores: [
        { moduleIndex: 0, correct: 30, total: 40 },            // 7
        { moduleIndex: 1, correct: 27, total: 40 },            // 6.5
        { moduleIndex: 2, correct: 0, total: 2, pending: true },
      ],
      writingTasks: [],
    });

    expect(result.moduleBands[2]).toBeUndefined();
    // mean(7, 6.5) = 6.75 → 7 — writing does not drag it to 0
    expect(result.overallBand).toBe(7);
  });

  it('aggregates SAT modules by section type into scaled scores', () => {
    const result = computeAuthenticScores({
      examType: 'sat',
      modules: [{ type: 'rw' }, { type: 'rw' }, { type: 'math' }, { type: 'math' }],
      moduleScores: [
        { moduleIndex: 0, correct: 18, total: 27 },
        { moduleIndex: 1, correct: 18, total: 27 },  // rw   → 36/54 → 600
        { moduleIndex: 2, correct: 15, total: 22 },
        { moduleIndex: 3, correct: 15, total: 22 },  // math → 30/44 → 610
      ],
    });

    expect(result.rwScaled).toBe(600);
    expect(result.mathScaled).toBe(610);
    expect(result.totalScaled).toBe(1210);
  });

  it('returns only module bands for exam types with no authentic scale', () => {
    const result = computeAuthenticScores({
      examType: 'general_english',
      modules: [{ type: 'grammar' }],
      moduleScores: [{ moduleIndex: 0, correct: 10, total: 20 }],
    });

    expect(result.overallBand).toBeUndefined();
    expect(result.totalScaled).toBeUndefined();
    expect(result.moduleBands).toEqual({});
  });
});

describe('display formatters', () => {
  it('shows IELTS as a band, SAT as a scaled total, everything else as a percentage', () => {
    expect(formatOverallScore({ examType: 'ielts', score: 72, overallBand: 6.5 }))
      .toEqual({ value: '6.5', unit: 'Band', provisional: false, approximate: true });
    expect(formatOverallScore({ examType: 'sat', score: 72, totalScaled: 1210 }))
      .toEqual({ value: '1210', unit: '/ 1600', provisional: false, approximate: true });
    expect(formatOverallScore({ examType: 'general_english', score: 72 }))
      .toEqual({ value: '72', unit: '%', provisional: false, approximate: false });
  });

  it('falls back to a percentage for older results with no band stored', () => {
    expect(formatOverallScore({ examType: 'ielts', score: 72 }))
      .toEqual({ value: '72', unit: '%', provisional: false, approximate: false });
  });

  /*
   * The band tables and the SAT scaled curve are both conversions this platform
   * approximates, so a figure printed in the exam's own units has to say so.
   * A percentage is a plain count of marks earned and never carries the caveat —
   * including for an IELTS attempt that fell back to one, which is the case the
   * flag would most easily get wrong.
   */
  it('flags converted units as approximate and raw percentages as exact', () => {
    expect(formatOverallScore({ examType: 'ielts', score: 72, overallBand: 6.5 }).approximate).toBe(true);
    expect(formatOverallScore({ examType: 'sat', score: 72, totalScaled: 1210 }).approximate).toBe(true);
    expect(formatOverallScore({ examType: 'general_english', score: 72 }).approximate).toBe(false);
    // IELTS with no stored band falls back to the percentage — an exact figure.
    expect(formatOverallScore({ examType: 'ielts', score: 72 }).approximate).toBe(false);
    expect(formatOverallScore({ examType: 'sat', score: 72 }).approximate).toBe(false);
  });

  it('shows a pending IELTS writing section as being checked', () => {
    expect(formatModuleScore('ielts', { scorePercent: 0, pending: true })).toBe('yoxlanılır…');
    expect(formatModuleScore('ielts', { scorePercent: 80, band: 7 })).toBe('Band 7.0');
    expect(formatModuleScore('sat', { scorePercent: 80 })).toBe('80%');
  });
});

describe('scaleRawTo40', () => {
  it('passes a 40-mark section through untouched', () => {
    expect(scaleRawTo40(33, 40)).toBe(33);
    expect(scaleRawTo40(0, 40)).toBe(0);
  });

  /*
   * The case this exists for: per-item matching turned a shipped IELTS reading
   * section into 53 marks. Unscaled, 40 of 53 would read as Band 9.
   */
  it('scales a longer section down onto the 40-mark table', () => {
    expect(scaleRawTo40(53, 53)).toBe(40);
    expect(scaleRawTo40(40, 53)).toBe(30);
    expect(ieltsReadingBand(40, 53)).toBe(7);      // not 9
    expect(ieltsReadingBand(53, 53)).toBe(9);
  });

  it('scales a shorter section up so a perfect paper still reaches Band 9', () => {
    expect(scaleRawTo40(20, 20)).toBe(40);
    expect(ieltsListeningBand(20, 20)).toBe(9);
    expect(ieltsListeningBand(10, 20)).toBe(ieltsListeningBand(20, 40));
  });

  it('never exceeds the total or goes negative', () => {
    expect(scaleRawTo40(99, 40)).toBe(40);
    expect(scaleRawTo40(-5, 40)).toBe(0);
  });

  it('returns 0 for a degenerate total rather than dividing by zero', () => {
    expect(scaleRawTo40(5, 0)).toBe(0);
    expect(scaleRawTo40(5, Number.NaN)).toBe(0);
  });
});

describe('overallPercent', () => {
  it('averages the sections rather than the two aggregates', () => {
    // IELTS shape: two objective sections and a writing section. Under the old
    // "objective vs writing" mean, writing carried half the paper.
    expect(overallPercent([
      { scorePercent: 90, total: 40 },
      { scorePercent: 90, total: 40 },
      { scorePercent: 60, total: 2 },
    ])).toBe(80);
  });

  it('skips modules with no marks instead of averaging in a zero', () => {
    expect(overallPercent([
      { scorePercent: 80, total: 40 },
      { scorePercent: 0,  total: 0 },   // empty bank — never shown to the candidate
    ])).toBe(80);
  });

  it('excludes a module still awaiting the writing grader', () => {
    expect(overallPercent([
      { scorePercent: 70, total: 40 },
      { scorePercent: 0,  total: 2, pending: true },
    ])).toBe(70);
  });

  it('returns 0 when nothing is countable', () => {
    expect(overallPercent([])).toBe(0);
    expect(overallPercent([{ scorePercent: 0, total: 0 }])).toBe(0);
  });
});

describe('computeAuthenticScores — sections the candidate never sat', () => {
  /*
   * `buildModuleSchedule` skips a module with an empty bank, so it is never
   * opened, never shown, and must never be scored.
   */
  it('keeps an unauthored IELTS section out of the overall band', () => {
    const r = computeAuthenticScores({
      examType: 'ielts',
      modules: [{ type: 'listening' }, { type: 'reading' }],
      moduleScores: [
        { moduleIndex: 0, correct: 30, total: 40 },  // Band 7
        { moduleIndex: 1, correct: 0,  total: 0  },  // declared, never authored
      ],
    });
    expect(r.overallBand).toBe(7);          // not 3.5
    expect(r.moduleBands[1]).toBeUndefined();
  });

  it('still scores a section that was sat and answered nothing', () => {
    const r = computeAuthenticScores({
      examType: 'ielts',
      modules: [{ type: 'listening' }, { type: 'reading' }],
      moduleScores: [
        { moduleIndex: 0, correct: 30, total: 40 },
        { moduleIndex: 1, correct: 0,  total: 40 },  // sat, scored zero
      ],
    });
    expect(r.moduleBands[1]).toBe(0);
    expect(r.overallBand).toBe(3.5);
  });

  it('omits SAT scaled scores for a section with no bank', () => {
    const r = computeAuthenticScores({
      examType: 'sat',
      modules: [{ type: 'rw' }, { type: 'math' }],
      moduleScores: [
        { moduleIndex: 0, correct: 51, total: 54 },
        { moduleIndex: 1, correct: 0,  total: 0  },
      ],
    });
    expect(r.mathScaled).toBeUndefined();
    expect(r.totalScaled).toBeUndefined();   // not 960
    expect(r.rwScaled).toBeGreaterThan(200);
  });

  it('reports a total when both SAT sections exist', () => {
    const r = computeAuthenticScores({
      examType: 'sat',
      modules: [{ type: 'rw' }, { type: 'math' }],
      moduleScores: [
        { moduleIndex: 0, correct: 54, total: 54 },
        { moduleIndex: 1, correct: 44, total: 44 },
      ],
    });
    expect(r.totalScaled).toBe(1600);
  });

  /* A floored section that was genuinely sat still reports 200. */
  it('keeps the 200 floor for a section that was sat', () => {
    const r = computeAuthenticScores({
      examType: 'sat',
      modules: [{ type: 'rw' }, { type: 'math' }],
      moduleScores: [
        { moduleIndex: 0, correct: 54, total: 54 },
        { moduleIndex: 1, correct: 0,  total: 44 },
      ],
    });
    expect(r.mathScaled).toBe(200);
    expect(r.totalScaled).toBe(1000);
  });
});

describe('pickBestAttempt', () => {
  /*
   * The percentage and the band need not agree, and the page shows the band —
   * so the band is what "best" has to mean for an IELTS paper.
   */
  it('ranks IELTS by band, not by percentage', () => {
    const results = [
      { examType: 'ielts', score: 82, overallBand: 6.5 },
      { examType: 'ielts', score: 78, overallBand: 7.5 },
    ];
    expect(pickBestAttempt(results, 'ielts')?.overallBand).toBe(7.5);
  });

  it('ranks SAT by the scaled total', () => {
    const results = [
      { examType: 'sat', score: 90, totalScaled: 1400 },
      { examType: 'sat', score: 88, totalScaled: 1480 },
    ];
    expect(pickBestAttempt(results, 'sat')?.totalScaled).toBe(1480);
  });

  it('falls back to percentage when an attempt lacks the unit', () => {
    // One essay still pending, so that attempt has no band yet.
    const results = [
      { examType: 'ielts', score: 82, overallBand: 6.5 },
      { examType: 'ielts', score: 90 },
    ];
    expect(pickBestAttempt(results, 'ielts')?.score).toBe(90);
  });

  it('uses percentage for exams with no authentic unit', () => {
    const results = [{ score: 40 }, { score: 71 }];
    expect(pickBestAttempt(results, 'general_english')?.score).toBe(71);
  });

  it('returns null for no attempts', () => {
    expect(pickBestAttempt([], 'ielts')).toBeNull();
  });
});

describe('formatOverallScore — provisional results', () => {
  /*
   * A pending section is excluded from the band rather than scored as zero, so
   * the figure is a mean of what HAS been marked. Presenting that as a finished
   * overall band overstates it — and an essay that never grades leaves it that
   * way for good.
   */
  it('flags a band computed while a section is still with the grader', () => {
    expect(formatOverallScore({
      examType: 'ielts',
      score: 78,
      overallBand: 7,
      moduleScores: [{ }, { pending: true }],
    }).provisional).toBe(true);
  });

  it('is not provisional once every section is marked', () => {
    expect(formatOverallScore({
      examType: 'ielts',
      score: 78,
      overallBand: 7,
      moduleScores: [{ }, { pending: false }],
    }).provisional).toBe(false);
  });
});

describe('computeAuthenticScores — writing tasks are per module', () => {
  const modules = [{ type: 'writing' }, { type: 'writing' }];
  const moduleScores = [
    { moduleIndex: 0, correct: 0, total: 1 },
    { moduleIndex: 1, correct: 0, total: 1 },
  ];

  /*
   * One flat list used to be handed to every writing module in turn, so both
   * sections reported the same band computed from all essays in the attempt.
   */
  it('scores each writing module from its own essays', () => {
    const r = computeAuthenticScores({
      examType: 'ielts',
      modules,
      moduleScores,
      writingTasks: [
        { band: 8, moduleIndex: 0 },
        { band: 5, moduleIndex: 1 },
      ],
    });
    expect(r.moduleBands[0]).toBe(8);
    expect(r.moduleBands[1]).toBe(5);
  });

  /* Older results carry no moduleIndex; they had only one writing module. */
  it('still scores untagged essays against the writing module', () => {
    const r = computeAuthenticScores({
      examType: 'ielts',
      modules: [{ type: 'reading' }, { type: 'writing' }],
      moduleScores: [
        { moduleIndex: 0, correct: 30, total: 40 },
        { moduleIndex: 1, correct: 0, total: 2 },
      ],
      writingTasks: [{ band: 6.5 }],
    });
    expect(r.moduleBands[1]).toBe(6.5);
  });
});

/*
 * General Training grades Reading on its own, stricter table.
 *
 * Every IELTS paper used to convert on the Academic table, which over-reported
 * the band for every General Training candidate — and the catalog ships
 * `ielts-general-1`, so this was live. The variant now comes from an explicit
 * field on the exam rather than being inferred from its title.
 */
describe('IELTS General Training reading', () => {
  it('needs more correct answers than Academic for the same band', () => {
    // The mid-range is where the gap bites: 23 correct is a Band 6 on Academic
    // and only a Band 5 on General Training.
    expect(ieltsReadingBand(23, 40, 'academic')).toBe(6);
    expect(ieltsReadingBand(23, 40, 'general')).toBe(5);

    expect(ieltsReadingBand(30, 40, 'academic')).toBe(7);
    expect(ieltsReadingBand(30, 40, 'general')).toBe(6);
  });

  it('never reports a HIGHER band than Academic at any raw score', () => {
    for (let raw = 0; raw <= 40; raw++) {
      expect(ieltsReadingBand(raw, 40, 'general'))
        .toBeLessThanOrEqual(ieltsReadingBand(raw, 40, 'academic'));
    }
  });

  it('defaults to Academic when no variant is given', () => {
    expect(ieltsReadingBand(23, 40)).toBe(ieltsReadingBand(23, 40, 'academic'));
  });

  it('awards 9 only for a perfect paper', () => {
    expect(ieltsReadingBand(40, 40, 'general')).toBe(9);
    expect(ieltsReadingBand(39, 40, 'general')).toBe(8.5);
  });

  it('leaves Listening untouched — one paper serves both editions', () => {
    expect(ieltsSectionBand('listening', 30, 40, undefined, 'general'))
      .toBe(ieltsSectionBand('listening', 30, 40, undefined, 'academic'));
  });

  it('flows through computeAuthenticScores from the exam variant', () => {
    const params = {
      examType: 'ielts',
      modules: [{ type: 'reading' }],
      moduleScores: [{ moduleIndex: 0, correct: 30, total: 40 }],
    };
    expect(computeAuthenticScores({ ...params, variant: 'academic' }).moduleBands[0]).toBe(7);
    expect(computeAuthenticScores({ ...params, variant: 'general' }).moduleBands[0]).toBe(6);
  });
});
