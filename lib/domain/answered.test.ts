import { describe, expect, it } from 'vitest';
import { isQuestionAnswered, countAnswered, type AnswerState } from './answered';

const empty: AnswerState = {
  answers: new Map(),
  openAnswers: new Map(),
  matchingAnswers: new Map(),
};

const state = (partial: Partial<AnswerState>): AnswerState => ({ ...empty, ...partial });

describe('isQuestionAnswered', () => {
  it('counts an mcq once an option is chosen', () => {
    expect(isQuestionAnswered({ id: 'a', type: 'mcq' }, empty)).toBe(false);
    expect(isQuestionAnswered({ id: 'a', type: 'mcq' }, state({ answers: new Map([['a', 0]]) }))).toBe(true);
  });

  it('ignores whitespace in open and writing answers', () => {
    const blank = state({ openAnswers: new Map([['a', '   ']]) });
    expect(isQuestionAnswered({ id: 'a', type: 'open' }, blank)).toBe(false);
    expect(isQuestionAnswered({ id: 'a', type: 'writing' }, blank)).toBe(false);
    const real = state({ openAnswers: new Map([['a', 'yes']]) });
    expect(isQuestionAnswered({ id: 'a', type: 'open' }, real)).toBe(true);
  });

  /*
   * The bug this file exists for: touching one dropdown creates the array, so
   * mere presence meant "answered" for a six-mark task with one mark placed.
   */
  it('requires every matching item, not just the first', () => {
    const partial = state({ matchingAnswers: new Map([['a', [2, -1, -1]]]) });
    expect(isQuestionAnswered({ id: 'a', type: 'matching' }, partial)).toBe(false);

    const complete = state({ matchingAnswers: new Map([['a', [2, 0, 1]]]) });
    expect(isQuestionAnswered({ id: 'a', type: 'matching' }, complete)).toBe(true);
  });

  it('treats an empty matching array as unanswered', () => {
    const none = state({ matchingAnswers: new Map([['a', []]]) });
    expect(isQuestionAnswered({ id: 'a', type: 'matching' }, none)).toBe(false);
  });

  it('counts across a list', () => {
    const s = state({
      answers: new Map([['a', 1]]),
      matchingAnswers: new Map([['c', [0, -1]]]),
    });
    expect(countAnswered(
      [{ id: 'a', type: 'mcq' }, { id: 'b', type: 'mcq' }, { id: 'c', type: 'matching' }],
      s,
    )).toBe(1);
  });
});
