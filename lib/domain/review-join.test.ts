import { describe, expect, it } from 'vitest';
import { resolvedAnswerCount, isReviewStale } from './review-join';

const q = (id: string) => ({ id });
const a = (questionId: string) => ({ questionId });

describe('resolvedAnswerCount', () => {
  it('counts answers that still match the bank', () => {
    expect(resolvedAnswerCount([a('1'), a('2'), a('gone')], [q('1'), q('2')])).toBe(2);
  });
});

describe('isReviewStale', () => {
  /*
   * The real case: a re-import replaced every question id at once, so 13 of 16
   * IELTS attempts joined to nothing and rendered every question as unanswered
   * beneath the band the candidate had actually earned.
   */
  it('flags an attempt whose answers all point at replaced questions', () => {
    expect(isReviewStale([a('old1'), a('old2')], [q('new1'), q('new2')])).toBe(true);
  });

  it('does not flag a sound join', () => {
    expect(isReviewStale([a('1'), a('2')], [q('1'), q('2')])).toBe(false);
  });

  /* Strict by design: a partially edited bank still reviews usefully. */
  it('does not flag a partial mismatch', () => {
    expect(isReviewStale([a('1'), a('gone')], [q('1'), q('2')])).toBe(false);
  });

  it('flags an attempt whose bank is gone entirely', () => {
    expect(isReviewStale([a('1')], [])).toBe(true);
  });

  it('is not stale when nothing was answered', () => {
    expect(isReviewStale([], [q('1')])).toBe(false);
    expect(isReviewStale([], [])).toBe(false);
  });
});
