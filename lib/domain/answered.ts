/**
 * "Has this question been answered?" — one definition, three call sites.
 *
 * The progress bar, the header counter, the navigator grid and the module
 * mini-grid all ask it, and each used to answer it inline. They agreed on the
 * simple types and disagreed on `matching`: every one of them treated
 * `matchingAnswers.has(id)` as answered, which becomes true the moment the
 * candidate touches the FIRST of six dropdowns — because the map entry is
 * created pre-filled with -1 for every item. A six-item matching-headings task
 * counted as done with one heading placed, and the grid showed it green while
 * five marks were still on the table.
 *
 * Pure and client-safe, so the player and its children cannot drift apart again.
 */

export interface AnswerState {
  answers: ReadonlyMap<string, number>;
  openAnswers: ReadonlyMap<string, string>;
  matchingAnswers: ReadonlyMap<string, number[]>;
}

/** The question fields answeredness depends on. */
export interface AnswerableQuestion {
  id: string;
  type: string;
}

export function isQuestionAnswered(q: AnswerableQuestion, state: AnswerState): boolean {
  switch (q.type) {
    case 'mcq':
      return state.answers.has(q.id);
    case 'open':
    case 'writing':
      return !!state.openAnswers.get(q.id)?.trim();
    case 'matching': {
      // Every item, not merely the first. The array is sized and filled with -1
      // when the candidate touches any one dropdown, so its mere existence says
      // nothing about how much of the task is done.
      const arr = state.matchingAnswers.get(q.id);
      return !!arr && arr.length > 0 && arr.every(v => v >= 0);
    }
    default:
      return false;
  }
}

/** How many of `questions` are answered. */
export function countAnswered(
  questions: readonly AnswerableQuestion[],
  state: AnswerState,
): number {
  return questions.reduce((n, q) => n + (isQuestionAnswered(q, state) ? 1 : 0), 0);
}
