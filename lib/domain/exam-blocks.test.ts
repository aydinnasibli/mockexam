import { describe, expect, it } from 'vitest';
import {
  buildScreens,
  indexQuestionsToScreens,
  firstScreenOfModule,
  moduleScreenRange,
} from './exam-blocks';

const q = (id: string, moduleIndex: number, blockId?: string) => ({ id, moduleIndex, blockId });

/** IELTS Listening: four parts of ten on one continuous recording. */
const listening = [
  ...Array.from({ length: 10 }, (_, i) => q(`p1-${i}`, 0, 'part-1')),
  ...Array.from({ length: 10 }, (_, i) => q(`p2-${i}`, 0, 'part-2')),
];

describe('buildScreens', () => {
  it('puts a whole block on one screen', () => {
    const screens = buildScreens(listening, ['block']);
    expect(screens).toHaveLength(2);
    expect(screens[0]).toEqual({ moduleIndex: 0, blockId: 'part-1', questionIndices: [0,1,2,3,4,5,6,7,8,9] });
    expect(screens[1].questionIndices).toHaveLength(10);
  });

  /*
   * The whole point: forty questions became forty screens, so a candidate had
   * to click Next thirty-nine times while an unpausable recording played.
   */
  it('collapses 20 listening questions from 20 screens to 2', () => {
    expect(buildScreens(listening, ['single'])).toHaveLength(20);
    expect(buildScreens(listening, ['block'])).toHaveLength(2);
  });

  it('leaves a single-layout module at one question per screen even with blockIds', () => {
    const screens = buildScreens(listening, ['single']);
    expect(screens).toHaveLength(20);
    expect(screens.every(s => s.blockId === '' && s.questionIndices.length === 1)).toBe(true);
  });

  it('gives a question with no blockId its own screen inside a block module', () => {
    const qs = [q('a', 0, 'b1'), q('b', 0, 'b1'), q('loose', 0), q('c', 0, 'b1')];
    const screens = buildScreens(qs, ['block']);
    // The trailing 'b1' is NOT pulled back into the first screen — authored
    // order is what the candidate sees.
    expect(screens.map(s => s.questionIndices)).toEqual([[0, 1], [2], [3]]);
  });

  it('treats a blank or whitespace blockId as no block', () => {
    const screens = buildScreens([q('a', 0, '   '), q('b', 0, '')], ['block']);
    expect(screens).toHaveLength(2);
    expect(screens.every(s => s.blockId === '')).toBe(true);
  });

  it('never groups across a module boundary, even on an identical blockId', () => {
    const qs = [q('a', 0, 'shared'), q('b', 1, 'shared')];
    const screens = buildScreens(qs, ['block', 'block']);
    expect(screens).toHaveLength(2);
    expect(screens.map(s => s.moduleIndex)).toEqual([0, 1]);
  });

  it('mixes layouts per module — IELTS listening blocked, writing single', () => {
    const qs = [q('l1', 0, 'part-1'), q('l2', 0, 'part-1'), q('w1', 1), q('w2', 1)];
    const screens = buildScreens(qs, ['block', 'single']);
    expect(screens.map(s => s.questionIndices)).toEqual([[0, 1], [2], [3]]);
  });

  it('handles an empty question list', () => {
    expect(buildScreens([], ['block'])).toEqual([]);
  });

  it('falls back to one-per-screen when a module has no layout entry', () => {
    expect(buildScreens([q('a', 5, 'x'), q('b', 5, 'x')], [])).toHaveLength(2);
  });
});

describe('indexQuestionsToScreens', () => {
  it('maps every question back to the screen showing it', () => {
    const screens = buildScreens(listening, ['block']);
    const map = indexQuestionsToScreens(screens);
    expect(map[0]).toBe(0);
    expect(map[9]).toBe(0);
    expect(map[10]).toBe(1);
    expect(map).toHaveLength(20);
  });
});

describe('moduleScreenRange / firstScreenOfModule', () => {
  const qs = [
    q('l1', 0, 'part-1'), q('l2', 0, 'part-1'),
    q('r1', 1, 'task-1'), q('r2', 1, 'task-1'), q('r3', 1, 'task-2'),
    q('w1', 2),
  ];
  const screens = buildScreens(qs, ['block', 'block', 'single']);

  it('bounds each module to its own screens', () => {
    expect(moduleScreenRange(screens, 0)).toEqual([0, 0]);
    expect(moduleScreenRange(screens, 1)).toEqual([1, 2]);
    expect(moduleScreenRange(screens, 2)).toEqual([3, 3]);
  });

  it('returns null for a module with no questions', () => {
    expect(moduleScreenRange(screens, 9)).toBeNull();
    expect(firstScreenOfModule(screens, 9)).toBe(-1);
  });

  it('finds the entry screen for a module', () => {
    expect(firstScreenOfModule(screens, 1)).toBe(1);
  });
});
