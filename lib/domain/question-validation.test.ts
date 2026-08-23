import { describe, expect, it } from 'vitest';
import { validateQuestion } from './question-validation';

describe('validateQuestion', () => {
  it('accepts a well-formed mcq', () => {
    expect(validateQuestion({
      type: 'mcq', stem: 'What?', options: ['a', 'b'], correctIndex: 1,
    })).toBeNull();
  });

  it('rejects a blank stem on everything but writing', () => {
    expect(validateQuestion({ type: 'mcq', stem: '   ', options: ['a', 'b'], correctIndex: 0 })).toMatch(/stem/);
    // A writing task carries its prompt in passage/rubric.
    expect(validateQuestion({ type: 'writing', stem: '' })).toBeNull();
  });

  it('rejects an mcq whose correctIndex is outside the options', () => {
    expect(validateQuestion({ type: 'mcq', stem: 'q', options: ['a', 'b'], correctIndex: 2 })).toMatch(/correctIndex/);
    expect(validateQuestion({ type: 'mcq', stem: 'q', options: ['a', 'b'] })).toMatch(/correctIndex/);
  });

  /*
   * The case the admin form used to write straight to the database: worth one
   * mark, earns zero forever, still counts in the denominator.
   */
  it('rejects an open question with no accepted answers', () => {
    expect(validateQuestion({ type: 'open', stem: 'q', openAnswers: [] })).toMatch(/openAnswers/);
    expect(validateQuestion({ type: 'open', stem: 'q', openAnswers: ['  '] })).toMatch(/openAnswers/);
    expect(validateQuestion({ type: 'open', stem: 'q', openAnswers: ['42'] })).toBeNull();
  });

  it('requires one correctMatching entry per matchItem', () => {
    const base = { type: 'matching', stem: 'q', options: ['x', 'y'], matchItems: ['1', '2', '3'] };
    // Short key: the third dropdown renders but can never earn its mark.
    expect(validateQuestion({ ...base, correctMatching: [0, 1] })).toMatch(/correctMatching/);
    expect(validateQuestion({ ...base, correctMatching: [0, 1, 0] })).toBeNull();
  });

  it('rejects a correctMatching value outside the options', () => {
    const base = { type: 'matching', stem: 'q', options: ['x', 'y'], matchItems: ['1'] };
    expect(validateQuestion({ ...base, correctMatching: [5] })).toMatch(/kənardadır/);
    expect(validateQuestion({ ...base, correctMatching: [-1] })).toMatch(/kənardadır/);
  });

  it('rejects an inverted word range, ignoring unset zeros', () => {
    expect(validateQuestion({ type: 'writing', minWords: 300, maxWords: 200 })).toMatch(/minWords/);
    expect(validateQuestion({ type: 'writing', minWords: 200, maxWords: 0 })).toBeNull();
  });

  it('prefixes the message with the label the importer passes', () => {
    expect(validateQuestion({ type: 'open', stem: 'q' }, 'Sual #3')).toMatch(/^Sual #3: /);
  });
});
