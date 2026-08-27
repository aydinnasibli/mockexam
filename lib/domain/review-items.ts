/**
 * What to show for each answer on the review page.
 *
 * The review used to iterate the LIVE question bank and look each answer up by
 * id. That join is only sound while the bank still holds those questions, and a
 * re-import or a deletion breaks it — so the page used to detect the total
 * failure and black the whole per-question breakdown out. It had to,
 * because a missed lookup read as `userAnswer: -1, isCorrect: false`, and every
 * question rendered as unanswered and wrong beneath the band the candidate had
 * actually earned.
 *
 * `saveExamResult` snapshots what was asked onto each answer row (`qStem`,
 * `qOptions`, `qPassage`) precisely so that join is no longer load-bearing —
 * but nothing read those columns. This is what reads them.
 *
 * The attempt is the source of truth, and the live bank is an OPTIONAL
 * enrichment:
 *
 *   from the answer row  — what was asked, what was chosen, what was correct,
 *                          the marks, the timing, the essay and its feedback
 *   from the live bank   — the answer KEY extras that are not snapshotted:
 *                          the explanation, the accepted open answers, the
 *                          matching items and their key, the diagram
 *
 * So a question that has been re-imported, edited or deleted still yields a
 * complete multiple-choice review; only the explanation goes missing. An item
 * is reported unavailable solely when there is nothing renderable at all, which
 * for anything filed since the snapshot shipped cannot happen.
 *
 * Pure: no React, no I/O, so the rule has one definition and is testable.
 */

export interface ReviewAnswer {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;
  userAnswerText: string;
  marks: number;
  earnedMarks: number;
  correctIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
  writingScore?: number;
  writingWordCount?: number;
  writingCriteria?: { criterion: string; score: number; comment: string }[];
  aiFeedback?: string;
  writingPending?: boolean;
  qStem: string;
  qOptions: string[];
  qPassage: string;
  questionMissing: boolean;
}

/** The live-bank fields worth merging in when the question still exists. */
export interface ReviewQuestion {
  id: string;
  moduleIndex: number;
  type: string;
  stem: string;
  options: string[];
  passage: string;
  openAnswers?: string[];
  matchItems?: string[];
  correctMatching?: number[];
  explanation: string;
  imageUrl?: string;
}

export interface ReviewItem {
  /** Stable React key. The question id when there is one, else the row's slot. */
  key: string;
  moduleIndex: number;
  type: string;
  stem: string;
  options: string[];
  passage: string;
  /** From the ANSWER row — what this attempt was actually marked against. */
  correctIndex: number;
  openAnswers: string[];
  matchItems: string[];
  correctMatching: number[];
  explanation: string;
  imageUrl: string;
  answer: ReviewAnswer;
  /** The live question is gone; the answer key extras above are unavailable. */
  questionMissing: boolean;
  /** Nothing renderable survives — pre-snapshot rows whose question is gone. */
  unavailable: boolean;
}

/**
 * Best guess at a question's type from the answer row alone.
 *
 * Only reached when the live question is gone, since `type` is not snapshotted.
 * Ordered most-specific first: the writing signals are unambiguous, per-item
 * marks only ever occur on `matching`, and a scorable option list only ever
 * occurs on `mcq`.
 */
export function inferQuestionType(a: ReviewAnswer): string {
  if (a.writingPending || a.writingScore != null || (a.writingCriteria?.length ?? 0) > 0) return 'writing';
  if (a.marks > 1) return 'matching';
  if (a.qOptions.length > 0 && a.correctIndex >= 0) return 'mcq';
  return 'open';
}

/**
 * Merge an attempt's answers with whatever survives of the question bank.
 *
 * `answers` decides the list, its order and its numbering — it is the record of
 * the paper that was actually sat. A live question that has no answer row was
 * never presented to this candidate (it was added later) and is deliberately
 * absent.
 */
export function buildReviewItems(
  answers: readonly ReviewAnswer[],
  questions: readonly ReviewQuestion[],
): ReviewItem[] {
  const byId = new Map(questions.map(q => [q.id, q]));

  /*
   * Passages are authored once, on the first question of their group, and left
   * blank on the rest — so the text is carried forward within a module, exactly
   * as the player does it. Reset at each module boundary.
   */
  let lastModule = -1;
  let lastPassage = '';

  return answers.map((answer, i) => {
    const live = answer.questionId ? byId.get(answer.questionId) : undefined;
    const questionMissing = !live;

    const stem = answer.qStem || live?.stem || '';
    const options = answer.qOptions.length > 0 ? answer.qOptions : (live?.options ?? []);
    const ownPassage = answer.qPassage || live?.passage || '';

    if (answer.moduleIndex !== lastModule) {
      lastModule = answer.moduleIndex;
      lastPassage = '';
    }
    if (ownPassage) lastPassage = ownPassage;

    const type = live?.type ?? inferQuestionType(answer);

    return {
      key: answer.questionId || `slot-${answer.moduleIndex}-${i}`,
      moduleIndex: answer.moduleIndex,
      type,
      stem,
      options,
      passage: lastPassage,
      // Never the live question's: an edited key must not restate what this
      // attempt was marked against.
      correctIndex: answer.correctIndex,
      openAnswers: live?.openAnswers ?? [],
      matchItems: live?.matchItems ?? [],
      correctMatching: live?.correctMatching ?? [],
      explanation: live?.explanation ?? '',
      imageUrl: live?.imageUrl ?? '',
      answer,
      questionMissing,
      // A writing answer is renderable from the essay alone.
      unavailable: !stem && options.length === 0 && type !== 'writing',
    };
  });
}
