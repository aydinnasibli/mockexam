/**
 * Can this attempt still be reviewed question by question?
 *
 * A stored result records its answers by question id, and the review page joins
 * them back onto the LIVE question bank to show what was asked. That join is
 * only sound while the bank still contains those questions — and it does not
 * survive a re-import. `importExamFromJson` deletes the exam's questions and
 * inserts fresh documents, which mints new ObjectIds, so every result recorded
 * before the re-import points at ids that no longer exist.
 *
 * The failure was silent and actively misleading rather than merely empty. The
 * review renders the live bank and looks up each question's answer; a missed
 * lookup reads as `userAnswer: -1`, `isCorrect: false`, so EVERY question
 * displayed as unanswered and wrong — beneath a header still showing the band
 * the candidate actually earned. Telling them the per-question breakdown is
 * unavailable is worth far more than showing them a fabricated one.
 *
 * Pure, so the rule is testable and has one definition.
 */

export interface JoinableAnswer {
  questionId: string;
}

export interface JoinableQuestion {
  id: string;
}

/** How many of the attempt's answers still match a question in the bank. */
export function resolvedAnswerCount(
  answers: readonly JoinableAnswer[],
  questions: readonly JoinableQuestion[],
): number {
  const live = new Set(questions.map(q => q.id));
  return answers.reduce((n, a) => n + (live.has(a.questionId) ? 1 : 0), 0);
}

/**
 * True when the attempt cannot be joined to the bank at all.
 *
 * Deliberately strict — it fires only when NOTHING resolves. A bank that has
 * been partially edited still shows the surviving questions correctly, and
 * hiding an entire review because one question was replaced would cost the
 * candidate more than it protects them from. Total failure is the unambiguous
 * case, and the one that actually happens: a re-import replaces every id at
 * once.
 */
export function isReviewStale(
  answers: readonly JoinableAnswer[],
  questions: readonly JoinableQuestion[],
): boolean {
  if (answers.length === 0) return false;   // nothing was answered; not a join failure
  if (questions.length === 0) return true;  // the bank is gone entirely
  return resolvedAnswerCount(answers, questions) === 0;
}
