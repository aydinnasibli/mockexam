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
      .toEqual({ value: '6.5', unit: 'Band' });
    expect(formatOverallScore({ examType: 'sat', score: 72, totalScaled: 1210 }))
      .toEqual({ value: '1210', unit: '/ 1600' });
    expect(formatOverallScore({ examType: 'general_english', score: 72 }))
      .toEqual({ value: '72', unit: '%' });
  });

  it('falls back to a percentage for older results with no band stored', () => {
    expect(formatOverallScore({ examType: 'ielts', score: 72 }))
      .toEqual({ value: '72', unit: '%' });
  });

  it('shows a pending IELTS writing section as being checked', () => {
    expect(formatModuleScore('ielts', { scorePercent: 0, pending: true })).toBe('yoxlanılır…');
    expect(formatModuleScore('ielts', { scorePercent: 80, band: 7 })).toBe('Band 7.0');
    expect(formatModuleScore('sat', { scorePercent: 80 })).toBe('80%');
  });
});
