import { describe, expect, it } from 'vitest';
import { gradeAnswers, normalizeOpenAnswer, type GradableQuestion } from './grading';

/** A 4-question MCQ exam; the correct option is always index 1. */
const mcqExam: GradableQuestion[] = [
  { id: 'q1', moduleIndex: 0, type: 'mcq', correctIndex: 1 },
  { id: 'q2', moduleIndex: 0, type: 'mcq', correctIndex: 1 },
  { id: 'q3', moduleIndex: 1, type: 'mcq', correctIndex: 1 },
  { id: 'q4', moduleIndex: 1, type: 'mcq', correctIndex: 1 },
];

const scoreOf = (records: { isCorrect: boolean }[]) =>
  (records.filter(r => r.isCorrect).length / records.length) * 100;

describe('gradeAnswers — score integrity', () => {
  it('grades one record per question in the exam, not per submitted answer', () => {
    const records = gradeAnswers(mcqExam, [
      { questionId: 'q1', userAnswer: 1, timeSeconds: 5 },
    ]);
    expect(records).toHaveLength(4);
  });

  it('does NOT let a partial submission inflate the score', () => {
    // The attack: submit only the single question you know you got right.
    const records = gradeAnswers(mcqExam, [
      { questionId: 'q1', userAnswer: 1, timeSeconds: 5 },
    ]);
    // 1 of 4 correct — not 100%.
    expect(scoreOf(records)).toBe(25);
  });

  it('does NOT let duplicated answers inflate the score', () => {
    // The attack: repeat one correct answer to pad the numerator.
    const records = gradeAnswers(mcqExam, [
      { questionId: 'q1', userAnswer: 1, timeSeconds: 1 },
      { questionId: 'q1', userAnswer: 1, timeSeconds: 1 },
      { questionId: 'q1', userAnswer: 1, timeSeconds: 1 },
      { questionId: 'q1', userAnswer: 1, timeSeconds: 1 },
    ]);
    expect(records).toHaveLength(4);
    expect(scoreOf(records)).toBe(25);
  });

  it('ignores answers for questions that are not in the exam', () => {
    const records = gradeAnswers(mcqExam, [
      { questionId: 'not-a-real-question', userAnswer: 1, timeSeconds: 1 },
      { questionId: 'q1', userAnswer: 1, timeSeconds: 1 },
    ]);
    expect(records).toHaveLength(4);
    expect(records.map(r => r.questionId)).toEqual(['q1', 'q2', 'q3', 'q4']);
  });

  it('records unsubmitted questions as unanswered and incorrect', () => {
    const [, q2] = gradeAnswers(mcqExam, [{ questionId: 'q1', userAnswer: 1, timeSeconds: 1 }]);
    expect(q2.userAnswer).toBe(-1);
    expect(q2.isCorrect).toBe(false);
    expect(q2.userAnswerText).toBe('');
  });

  it('takes moduleIndex from the question, never from the client', () => {
    const records = gradeAnswers(mcqExam, [
      // A client trying to move a question into another module.
      { questionId: 'q3', userAnswer: 1, timeSeconds: 1, ...({ moduleIndex: 0 } as object) },
    ]);
    expect(records.find(r => r.questionId === 'q3')!.moduleIndex).toBe(1);
  });

  it('takes correctIndex from the question, never from the client', () => {
    const records = gradeAnswers(mcqExam, [
      { questionId: 'q1', userAnswer: 0, timeSeconds: 1, ...({ correctIndex: 0 } as object) },
    ]);
    const q1 = records.find(r => r.questionId === 'q1')!;
    expect(q1.correctIndex).toBe(1);
    expect(q1.isCorrect).toBe(false);
  });

  it('scores a full correct submission as 100%', () => {
    const records = gradeAnswers(mcqExam, mcqExam.map(q => ({
      questionId: q.id, userAnswer: 1, timeSeconds: 3,
    })));
    expect(scoreOf(records)).toBe(100);
  });
});

describe('gradeAnswers — answer types', () => {
  it('marks an unanswered MCQ incorrect even when -1 matches nothing', () => {
    const [r] = gradeAnswers(
      [{ id: 'q1', moduleIndex: 0, type: 'mcq', correctIndex: -1 }],
      [{ questionId: 'q1', userAnswer: -1, timeSeconds: 0 }],
    );
    expect(r.isCorrect).toBe(false);
  });

  it('accepts open answers ignoring case, spacing and decimal comma', () => {
    const q: GradableQuestion[] = [
      { id: 'q1', moduleIndex: 0, type: 'open', openAnswers: ['3.5', 'three point five'] },
    ];
    for (const text of ['3.5', '3,5', ' 3 . 5 ', 'Three Point Five']) {
      expect(gradeAnswers(q, [{ questionId: 'q1', userAnswerText: text, timeSeconds: 1 }])[0].isCorrect)
        .toBe(true);
    }
    expect(gradeAnswers(q, [{ questionId: 'q1', userAnswerText: '3.6', timeSeconds: 1 }])[0].isCorrect)
      .toBe(false);
  });

  it('grades matching questions only on an exact ordered match', () => {
    const q: GradableQuestion[] = [
      { id: 'q1', moduleIndex: 0, type: 'matching', correctMatching: [1, 0, 2] },
    ];
    const grade = (text: string) =>
      gradeAnswers(q, [{ questionId: 'q1', userAnswerText: text, timeSeconds: 1 }])[0].isCorrect;

    expect(grade('[1,0,2]')).toBe(true);
    expect(grade('[1,2,0]')).toBe(false);
    expect(grade('[1,0]')).toBe(false);
    expect(grade('not json')).toBe(false);
    expect(grade('{"a":1}')).toBe(false);
  });

  it('marks a written essay pending, and a blank one a genuine zero', () => {
    const q: GradableQuestion[] = [{ id: 'w1', moduleIndex: 0, type: 'writing' }];

    const written = gradeAnswers(q, [{ questionId: 'w1', userAnswerText: 'An essay.', timeSeconds: 60 }])[0];
    expect(written.writingPending).toBe(true);
    expect(written.writingScore).toBeUndefined();

    const blank = gradeAnswers(q, [{ questionId: 'w1', userAnswerText: '   ', timeSeconds: 1 }])[0];
    expect(blank.writingPending).toBe(false);
    expect(blank.writingScore).toBe(0);

    const missing = gradeAnswers(q, [])[0];
    expect(missing.writingPending).toBe(false);
    expect(missing.writingScore).toBe(0);
  });
});

describe('gradeAnswers — hostile input', () => {
  it('clamps and sanitises timeSeconds', () => {
    const q: GradableQuestion[] = [{ id: 'q1', moduleIndex: 0, type: 'mcq', correctIndex: 0 }];
    const time = (v: unknown) =>
      gradeAnswers(q, [{ questionId: 'q1', userAnswer: 0, timeSeconds: v as number }])[0].timeSeconds;

    expect(time(-50)).toBe(0);
    expect(time(12.6)).toBe(13);
    // Finite but absurd values are clamped to the cap...
    expect(time(10 ** 12)).toBe(24 * 60 * 60);
    // ...while non-finite / non-numeric values are rejected outright as 0,
    // rather than being recorded as a full day of thinking time.
    expect(time(NaN)).toBe(0);
    expect(time(Infinity)).toBe(0);
    expect(time(-Infinity)).toBe(0);
    expect(time('abc')).toBe(0);
  });

  it('truncates oversized answer text', () => {
    const q: GradableQuestion[] = [{ id: 'q1', moduleIndex: 0, type: 'writing' }];
    const huge = 'x'.repeat(50_000);
    expect(gradeAnswers(q, [{ questionId: 'q1', userAnswerText: huge, timeSeconds: 1 }])[0]
      .userAnswerText).toHaveLength(20_000);
  });

  it('coerces a non-integer or non-numeric userAnswer safely', () => {
    const q: GradableQuestion[] = [{ id: 'q1', moduleIndex: 0, type: 'mcq', correctIndex: 1 }];
    const answer = (v: unknown) =>
      gradeAnswers(q, [{ questionId: 'q1', userAnswer: v as number, timeSeconds: 1 }])[0];

    expect(answer(1.9).userAnswer).toBe(1);
    expect(answer(NaN).userAnswer).toBe(-1);
    expect(answer('1').userAnswer).toBe(-1);
    expect(answer(undefined).userAnswer).toBe(-1);
  });

  it('handles an empty submission without throwing', () => {
    const records = gradeAnswers(mcqExam, []);
    expect(records).toHaveLength(4);
    expect(scoreOf(records)).toBe(0);
  });
});

describe('normalizeOpenAnswer', () => {
  it('strips whitespace, lowercases, and maps comma to point', () => {
    expect(normalizeOpenAnswer(' Ab C ')).toBe('abc');
    expect(normalizeOpenAnswer('3,5')).toBe('3.5');
  });
});

/*
 * Per-item marking. A matching question is worth one mark PER ITEM, because
 * that is how every exam this platform mocks marks it. Under the previous
 * all-or-nothing rule a candidate who placed five of six headings correctly
 * scored zero for the task.
 */
describe('gradeAnswers — matching is marked per item', () => {
  const matching = {
    id: 'm1', moduleIndex: 0, type: 'matching',
    correctMatching: [1, 2, 0, 3],
  };

  it('awards one mark per correct item', () => {
    const [g] = gradeAnswers([matching], [
      { questionId: 'm1', userAnswerText: JSON.stringify([1, 2, 0, 9]) },
    ]);
    expect(g.marks).toBe(4);
    expect(g.earnedMarks).toBe(3);
    expect(g.isCorrect).toBe(false);   // not everything, so not "correct"
  });

  it('marks the question correct only when every item is right', () => {
    const [g] = gradeAnswers([matching], [
      { questionId: 'm1', userAnswerText: JSON.stringify([1, 2, 0, 3]) },
    ]);
    expect(g.earnedMarks).toBe(4);
    expect(g.isCorrect).toBe(true);
  });

  it('gives a short answer array credit for the items it does contain', () => {
    const [g] = gradeAnswers([matching], [
      { questionId: 'm1', userAnswerText: JSON.stringify([1, 2]) },
    ]);
    expect(g.marks).toBe(4);
    expect(g.earnedMarks).toBe(2);
  });

  it('earns nothing for an unanswered or corrupt matching question', () => {
    const [unanswered] = gradeAnswers([matching], []);
    expect(unanswered).toMatchObject({ marks: 4, earnedMarks: 0, isCorrect: false });

    const [corrupt] = gradeAnswers([matching], [{ questionId: 'm1', userAnswerText: 'not json' }]);
    expect(corrupt).toMatchObject({ marks: 4, earnedMarks: 0, isCorrect: false });
  });

  it('keeps every other type at a single mark', () => {
    const graded = gradeAnswers(
      [
        { id: 'q1', moduleIndex: 0, type: 'mcq', correctIndex: 2 },
        { id: 'q2', moduleIndex: 0, type: 'open', openAnswers: ['2pm'] },
        { id: 'q3', moduleIndex: 0, type: 'writing' },
      ],
      [
        { questionId: 'q1', userAnswer: 2 },
        { questionId: 'q2', userAnswerText: '2 PM' },
        { questionId: 'q3', userAnswerText: 'an essay' },
      ],
    );
    expect(graded.map(g => [g.marks, g.earnedMarks])).toEqual([[1, 1], [1, 1], [1, 0]]);
    // Writing is graded by the AI later, so it is never "correct" here.
    expect(graded[2].isCorrect).toBe(false);
  });
});

describe('matching with no answer key', () => {
  /*
   * `?? 1` let an empty key produce marks: 0, and a 0-mark question disappears
   * from the denominator entirely instead of showing up as unearned.
   */
  it('is worth one unearnable mark, not zero', () => {
    const [graded] = gradeAnswers(
      [{ id: 'q1', moduleIndex: 0, type: 'matching', correctMatching: [] }],
      [{ questionId: 'q1', userAnswerText: '[0,1]' }],
    );
    expect(graded.marks).toBe(1);
    expect(graded.earnedMarks).toBe(0);
    expect(graded.isCorrect).toBe(false);
  });

  it('still marks per item when the key is present', () => {
    const [graded] = gradeAnswers(
      [{ id: 'q1', moduleIndex: 0, type: 'matching', correctMatching: [0, 1, 2] }],
      [{ questionId: 'q1', userAnswerText: '[0,1,9]' }],
    );
    expect(graded.marks).toBe(3);
    expect(graded.earnedMarks).toBe(2);
  });
});
