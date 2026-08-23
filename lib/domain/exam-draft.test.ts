import { describe, expect, it } from 'vitest';
import {
  chooseDraftSource,
  draftFromProgress,
  mergeDrafts,
  buildDraftAnswers,
  decodeMatching,
  emptyDraft,
  type Draft,
  type DraftProgress,
} from './exam-draft';

const questions = [
  { id: 'q1', type: 'mcq' },
  { id: 'q2', type: 'open' },
  { id: 'q3', type: 'matching' },
  { id: 'q4', type: 'writing' },
];

const progress = (over: Partial<DraftProgress> = {}): DraftProgress => ({
  answers: [], flagged: [], currentIdx: 0, updatedAt: '2026-08-21T10:00:00.000Z', ...over,
});

describe('chooseDraftSource', () => {
  /*
   * The local copy records which server draft it descends from. Equal stamps
   * mean it is that draft plus anything saved but not yet mirrored — so taking
   * the server copy would discard exactly the work crash recovery exists for.
   */
  it('prefers local when it descends from the stored draft', () => {
    expect(chooseDraftSource('2026-08-21T10:00:00.000Z', '2026-08-21T10:00:00.000Z', true)).toBe('local');
  });

  it('prefers the server when another device has written since', () => {
    expect(chooseDraftSource('2026-08-21T10:00:00.000Z', '2026-08-21T10:05:00.000Z', true)).toBe('server');
  });

  it('prefers the server when this device never mirrored', () => {
    expect(chooseDraftSource(null, '2026-08-21T10:00:00.000Z', true)).toBe('server');
    expect(chooseDraftSource(undefined, '2026-08-21T10:00:00.000Z', true)).toBe('server');
  });

  it('keeps local when the server holds nothing', () => {
    expect(chooseDraftSource(null, null, false)).toBe('local');
    expect(chooseDraftSource('2026-08-21T10:00:00.000Z', '2026-08-21T10:05:00.000Z', false)).toBe('local');
  });
});

describe('draftFromProgress', () => {
  it('routes each answer by its question type', () => {
    const d = draftFromProgress(progress({
      answers: [
        { questionId: 'q1', userAnswer: 2, userAnswerText: '', timeSeconds: 0 },
        { questionId: 'q2', userAnswer: -1, userAnswerText: 'photosynthesis', timeSeconds: 0 },
        { questionId: 'q3', userAnswer: -1, userAnswerText: '[1,0,2]', timeSeconds: 0 },
        { questionId: 'q4', userAnswer: -1, userAnswerText: 'An essay.', timeSeconds: 0 },
      ],
      flagged: ['q2'],
    }), questions);

    expect(d.answers.get('q1')).toBe(2);
    expect(d.openAnswers.get('q2')).toBe('photosynthesis');
    expect(d.matchingAnswers.get('q3')).toEqual([1, 0, 2]);
    expect(d.openAnswers.get('q4')).toBe('An essay.');
    expect(d.flagged.has('q2')).toBe(true);
  });

  it('drops a corrupt matching entry without losing the rest', () => {
    const d = draftFromProgress(progress({
      answers: [
        { questionId: 'q3', userAnswer: -1, userAnswerText: '{oops', timeSeconds: 0 },
        { questionId: 'q1', userAnswer: 1, userAnswerText: '', timeSeconds: 0 },
      ],
    }), questions);
    expect(d.matchingAnswers.has('q3')).toBe(false);
    expect(d.answers.get('q1')).toBe(1);
  });

  it('ignores an unanswered choice', () => {
    const d = draftFromProgress(progress({
      answers: [{ questionId: 'q1', userAnswer: -1, userAnswerText: '', timeSeconds: 4 }],
    }), questions);
    expect(d.answers.has('q1')).toBe(false);
  });

  it('returns an empty draft for no progress', () => {
    expect(draftFromProgress(null, questions).answers.size).toBe(0);
  });
});

describe('mergeDrafts', () => {
  const local: Draft = {
    answers: new Map([['q1', 1]]),
    openAnswers: new Map([['q2', 'local text']]),
    matchingAnswers: new Map(),
    flagged: new Set(['q1']),
  };

  const incoming: Draft = {
    answers: new Map([['q1', 3], ['q5', 0]]),
    openAnswers: new Map([['q2', 'server text'], ['q4', 'server essay']]),
    matchingAnswers: new Map([['q3', [0, 1]]]),
    flagged: new Set(['q2']),
  };

  /*
   * The conflict path this replaces told the candidate to reload, which took
   * the server copy and discarded whatever this window had not mirrored.
   */
  it('keeps this window’s answer where both hold one', () => {
    const m = mergeDrafts(local, incoming);
    expect(m.answers.get('q1')).toBe(1);
    expect(m.openAnswers.get('q2')).toBe('local text');
  });

  it('takes the other window’s answers for gaps', () => {
    const m = mergeDrafts(local, incoming);
    expect(m.answers.get('q5')).toBe(0);
    expect(m.openAnswers.get('q4')).toBe('server essay');
    expect(m.matchingAnswers.get('q3')).toEqual([0, 1]);
  });

  it('unions the flags — losing one is worse than carrying one', () => {
    const m = mergeDrafts(local, incoming);
    expect([...m.flagged].sort()).toEqual(['q1', 'q2']);
  });

  it('never empties either side', () => {
    const m = mergeDrafts(local, incoming);
    // q1 (local) + q5 (incoming); q2 (local, kept) + q4 (incoming).
    expect(m.answers.size).toBe(2);
    expect(m.openAnswers.size).toBe(2);
    expect(m.matchingAnswers.size).toBe(1);
  });

  it('does not mutate its inputs', () => {
    mergeDrafts(local, incoming);
    expect(local.answers.size).toBe(1);
    expect(local.flagged.size).toBe(1);
  });

  it('merging with an empty draft changes nothing', () => {
    const m = mergeDrafts(local, emptyDraft());
    expect(m.answers.get('q1')).toBe(1);
    expect(m.openAnswers.get('q2')).toBe('local text');
  });
});

describe('buildDraftAnswers', () => {
  it('encodes matching as JSON and leaves other text alone', () => {
    const draft: Draft = {
      answers: new Map([['q1', 2]]),
      openAnswers: new Map([['q2', 'answer']]),
      matchingAnswers: new Map([['q3', [1, 0]]]),
      flagged: new Set(),
    };
    const rows = buildDraftAnswers(questions, draft, new Map());
    expect(rows.find(r => r.questionId === 'q3')?.userAnswerText).toBe('[1,0]');
    expect(rows.find(r => r.questionId === 'q2')?.userAnswerText).toBe('answer');
    expect(rows.find(r => r.questionId === 'q1')?.userAnswer).toBe(2);
  });

  it('omits untouched questions', () => {
    const rows = buildDraftAnswers(questions, emptyDraft(), new Map());
    expect(rows).toEqual([]);
  });

  /* A question with only time spent is still worth mirroring. */
  it('keeps a question that has time but no answer', () => {
    const rows = buildDraftAnswers(questions, emptyDraft(), new Map([['q1', 42]]));
    expect(rows).toEqual([{ questionId: 'q1', userAnswer: -1, userAnswerText: '', timeSeconds: 42 }]);
  });

  it('rounds fractional times from an even block split', () => {
    const rows = buildDraftAnswers(questions, emptyDraft(), new Map([['q1', 10.4]]));
    expect(rows[0].timeSeconds).toBe(10);
  });
});

describe('decodeMatching', () => {
  it('accepts an array of numbers', () => {
    expect(decodeMatching('[0,1,2]')).toEqual([0, 1, 2]);
  });

  it('rejects anything else', () => {
    expect(decodeMatching('nope')).toBeNull();
    expect(decodeMatching('{"a":1}')).toBeNull();
    expect(decodeMatching('["a"]')).toBeNull();
  });
});
