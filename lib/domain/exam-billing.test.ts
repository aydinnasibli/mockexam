import { describe, expect, it } from 'vitest';
import {
  billableQuestionIds,
  billingKey,
  splitInterval,
  applyInterval,
} from './exam-billing';

const ctx = (over: Partial<Parameters<typeof billableQuestionIds>[0]> = {}) => ({
  running: true, onBreak: false, contentLoading: false, screenQuestionIds: ['q1'], ...over,
});

describe('billableQuestionIds', () => {
  it('bills the screen on view', () => {
    expect(billableQuestionIds(ctx({ screenQuestionIds: ['a', 'b'] }))).toEqual(['a', 'b']);
  });

  /*
   * The break used to be billed to a question: nothing closed the interval when
   * the schedule moved the candidate on, so ten minutes of SAT break landed on
   * the first question of the next module.
   */
  it('bills a break to nobody', () => {
    expect(billableQuestionIds(ctx({ onBreak: true }))).toEqual([]);
  });

  it('bills the wait for a section to load to nobody', () => {
    expect(billableQuestionIds(ctx({ contentLoading: true }))).toEqual([]);
  });

  it('bills nothing outside the running phase', () => {
    expect(billableQuestionIds(ctx({ running: false }))).toEqual([]);
  });
});

describe('billingKey', () => {
  it('is stable while the same screen is shown', () => {
    expect(billingKey(['a', 'b'])).toBe(billingKey(['a', 'b']));
  });

  it('changes when the screen changes', () => {
    expect(billingKey(['a', 'b'])).not.toBe(billingKey(['c']));
  });

  /* Entering a break must register as a change, so the interval gets banked. */
  it('distinguishes billable from not', () => {
    expect(billingKey(['a'])).not.toBe(billingKey([]));
  });
});

describe('splitInterval', () => {
  it('splits evenly across a blocked screen', () => {
    const split = splitInterval(30, ['a', 'b', 'c']);
    expect(split.get('a')).toBe(10);
    expect(split.get('c')).toBe(10);
  });

  it('gives a single question the whole interval', () => {
    expect(splitInterval(12, ['a']).get('a')).toBe(12);
  });

  it('discards an interval with no target', () => {
    expect(splitInterval(30, []).size).toBe(0);
  });

  it('ignores a non-positive or non-finite interval', () => {
    expect(splitInterval(0, ['a']).size).toBe(0);
    expect(splitInterval(-5, ['a']).size).toBe(0);
    expect(splitInterval(Number.NaN, ['a']).size).toBe(0);
  });
});

describe('applyInterval', () => {
  it('accumulates across several visits to the same screen', () => {
    const tally = new Map<string, number>();
    applyInterval(tally, 20, ['a', 'b']);
    applyInterval(tally, 10, ['a', 'b']);
    expect(tally.get('a')).toBe(15);
    expect(tally.get('b')).toBe(15);
  });

  /*
   * The whole point of the rewrite: ten questions on one screen each carry the
   * time, instead of question one carrying all of it and nine reporting zero.
   */
  it('leaves no question of a block at zero', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `q${i}`);
    const tally = new Map<string, number>();
    applyInterval(tally, 600, ids);
    expect([...tally.values()].every(v => v === 60)).toBe(true);
    expect(tally.size).toBe(10);
  });

  it('is a no-op for an unbillable interval', () => {
    const tally = new Map<string, number>([['a', 5]]);
    applyInterval(tally, 30, []);
    expect(tally.get('a')).toBe(5);
    expect(tally.size).toBe(1);
  });
});
