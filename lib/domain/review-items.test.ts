import { describe, it, expect } from 'vitest';
import {
  buildReviewItems,
  inferQuestionType,
  type ReviewAnswer,
  type ReviewQuestion,
} from './review-items';

const answer = (over: Partial<ReviewAnswer> = {}): ReviewAnswer => ({
  questionId: 'q1',
  moduleIndex: 0,
  userAnswer: 0,
  userAnswerText: '',
  marks: 1,
  earnedMarks: 1,
  correctIndex: 0,
  isCorrect: true,
  timeSeconds: 10,
  qStem: 'Snapshotted stem',
  qOptions: ['A', 'B'],
  qPassage: '',
  questionMissing: false,
  ...over,
});

const question = (over: Partial<ReviewQuestion> = {}): ReviewQuestion => ({
  id: 'q1',
  moduleIndex: 0,
  type: 'mcq',
  stem: 'Live stem',
  options: ['A', 'B'],
  passage: '',
  explanation: 'Because.',
  ...over,
});

describe('buildReviewItems', () => {
  it('is driven by the answers, not the live bank', () => {
    // A question added to the bank AFTER this attempt was sat must not appear —
    // the candidate was never shown it.
    const items = buildReviewItems([answer()], [question(), question({ id: 'q2' })]);
    expect(items).toHaveLength(1);
    expect(items[0].key).toBe('q1');
  });

  it('prefers the snapshot over the live question', () => {
    // The bank was edited after the attempt; the review must show what was ASKED.
    const items = buildReviewItems(
      [answer({ qStem: 'As it was asked', qOptions: ['X', 'Y'] })],
      [question({ stem: 'Edited since', options: ['P', 'Q'] })],
    );
    expect(items[0].stem).toBe('As it was asked');
    expect(items[0].options).toEqual(['X', 'Y']);
  });

  it('takes correctIndex from the answer row, never from the edited bank', () => {
    const items = buildReviewItems(
      [answer({ correctIndex: 1 })],
      [question()],   // live key says 0
    );
    expect(items[0].correctIndex).toBe(1);
  });

  it('enriches with the live explanation when the question survives', () => {
    const items = buildReviewItems([answer()], [question({ explanation: 'Because.' })]);
    expect(items[0].explanation).toBe('Because.');
    expect(items[0].questionMissing).toBe(false);
  });

  it('still renders a full MCQ review when the question is GONE', () => {
    // This is the case that used to black out the entire breakdown.
    const items = buildReviewItems([answer()], []);
    const [item] = items;
    expect(item.questionMissing).toBe(true);
    expect(item.unavailable).toBe(false);
    expect(item.stem).toBe('Snapshotted stem');
    expect(item.options).toEqual(['A', 'B']);
    expect(item.correctIndex).toBe(0);
    expect(item.answer.isCorrect).toBe(true);
    // Only the enrichment is lost.
    expect(item.explanation).toBe('');
  });

  it('survives a re-import that replaced every question id', () => {
    const items = buildReviewItems(
      [answer({ questionId: 'old1' }), answer({ questionId: 'old2', qStem: 'Second' })],
      [question({ id: 'new1' }), question({ id: 'new2' })],
    );
    expect(items.every(i => i.questionMissing)).toBe(true);
    expect(items.every(i => !i.unavailable)).toBe(true);
    expect(items.map(i => i.stem)).toEqual(['Snapshotted stem', 'Second']);
  });

  it('reports unavailable only for a pre-snapshot row whose question is gone', () => {
    const items = buildReviewItems(
      [answer({ qStem: '', qOptions: [], questionId: 'legacy' })],
      [],
    );
    expect(items[0].unavailable).toBe(true);
  });

  it('a writing answer is renderable from the essay alone', () => {
    const items = buildReviewItems(
      [answer({ qStem: '', qOptions: [], userAnswerText: 'My essay', writingScore: 6.5 })],
      [],
    );
    expect(items[0].type).toBe('writing');
    expect(items[0].unavailable).toBe(false);
  });

  it('carries a passage forward within a module and resets between them', () => {
    const items = buildReviewItems(
      [
        answer({ questionId: 'a', moduleIndex: 0, qPassage: 'Reading text' }),
        answer({ questionId: 'b', moduleIndex: 0, qPassage: '' }),
        answer({ questionId: 'c', moduleIndex: 1, qPassage: '' }),
      ],
      [],
    );
    expect(items[0].passage).toBe('Reading text');
    expect(items[1].passage).toBe('Reading text');   // carried forward
    expect(items[2].passage).toBe('');               // new module
  });

  it('gives every item a stable, unique key even with no question id', () => {
    const items = buildReviewItems(
      [answer({ questionId: '' }), answer({ questionId: '' })],
      [],
    );
    expect(new Set(items.map(i => i.key)).size).toBe(2);
  });
});

describe('inferQuestionType', () => {
  it('detects writing from a pending essay', () => {
    expect(inferQuestionType(answer({ writingPending: true }))).toBe('writing');
  });

  it('detects writing from a graded band', () => {
    expect(inferQuestionType(answer({ writingScore: 0 }))).toBe('writing');
  });

  it('detects matching from per-item marks', () => {
    expect(inferQuestionType(answer({ marks: 4 }))).toBe('matching');
  });

  it('detects mcq from a scorable option list', () => {
    expect(inferQuestionType(answer())).toBe('mcq');
  });

  it('falls back to open when there are no options', () => {
    expect(inferQuestionType(answer({ qOptions: [], correctIndex: -1 }))).toBe('open');
  });

  it('is only a fallback — a live question always wins', () => {
    const items = buildReviewItems(
      [answer({ marks: 4 })],           // would infer 'matching'
      [question({ type: 'mcq' })],
    );
    expect(items[0].type).toBe('mcq');
  });
});
