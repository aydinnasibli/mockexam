// Pure grading logic — no database, no auth, no server imports, so it can be
// unit tested directly. `lib/actions/results.ts` supplies the question
// documents and the submitted payload; everything authoritative is decided here.

/** Hard caps on client-supplied answer fields, applied before anything is stored. */
export const MAX_ANSWER_TEXT_CHARS = 20_000;
export const MAX_QUESTION_SECONDS  = 24 * 60 * 60;

/** The question fields grading depends on, as stored in the database. */
export interface GradableQuestion {
  id: string;
  moduleIndex: number;
  type: string;
  correctIndex?: number;
  openAnswers?: string[];
  correctMatching?: number[];
}

/** The parts of a submitted answer the server actually trusts. */
export interface SubmittedAnswer {
  questionId: string;
  userAnswer?: number;
  userAnswerText?: string;
  timeSeconds?: number;
}

export interface GradedAnswer {
  questionId: string;
  moduleIndex: number;
  userAnswer: number;
  userAnswerText: string;
  correctIndex: number;
  isCorrect: boolean;
  timeSeconds: number;
  writingPending?: boolean;
  writingScore?: number;
  writingWordCount?: number;
}

/**
 * Normalisation for open-ended answers: ignore whitespace and case, and treat a
 * decimal comma as a decimal point (Azerbaijani convention).
 */
export function normalizeOpenAnswer(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase().replace(/,/g, '.');
}

/**
 * Build one graded record per question IN THE EXAM — never one per submitted
 * answer.
 *
 * This is what makes a stored score trustworthy. The caller passes the full
 * question set from the database, so:
 *   • omitting the questions you got wrong cannot shrink the denominator,
 *   • repeating a correct question cannot inflate the numerator,
 *   • an unknown questionId is ignored entirely,
 *   • `moduleIndex` and `correctIndex` always come from the question document,
 *     never from the request body.
 *
 * Questions with no submitted answer are recorded as unanswered and incorrect.
 */
export function gradeAnswers(
  questions: GradableQuestion[],
  answers: SubmittedAnswer[],
): GradedAnswer[] {
  // First occurrence wins, so a payload that repeats a question counts once.
  const submitted = new Map<string, SubmittedAnswer>();
  for (const a of answers) {
    if (a && typeof a.questionId === 'string' && !submitted.has(a.questionId)) {
      submitted.set(a.questionId, a);
    }
  }

  return questions.map(q => {
    const a = submitted.get(q.id);
    const correctIndex = q.correctIndex ?? -1;

    const userAnswer = typeof a?.userAnswer === 'number' && Number.isFinite(a.userAnswer)
      ? Math.trunc(a.userAnswer)
      : -1;
    const userAnswerText = typeof a?.userAnswerText === 'string'
      ? a.userAnswerText.slice(0, MAX_ANSWER_TEXT_CHARS)
      : '';

    let isCorrect = false;
    if (q.type === 'mcq') {
      isCorrect = userAnswer !== -1 && userAnswer === correctIndex;
    } else if (q.type === 'open') {
      if (userAnswerText && q.openAnswers?.length) {
        const normalized = normalizeOpenAnswer(userAnswerText);
        isCorrect = q.openAnswers.some(ans => normalizeOpenAnswer(String(ans)) === normalized);
      }
    } else if (q.type === 'matching') {
      // userAnswerText is a JSON array string e.g. "[1,0,2,0,1]"
      if (userAnswerText && q.correctMatching?.length) {
        try {
          const userMatches: unknown = JSON.parse(userAnswerText);
          isCorrect = Array.isArray(userMatches)
            && q.correctMatching.length === userMatches.length
            && q.correctMatching.every((correct, idx) => correct === userMatches[idx]);
        } catch {
          isCorrect = false;
        }
      }
    }
    // writing: isCorrect stays false — graded by AI separately.

    const rawSeconds = typeof a?.timeSeconds === 'number' && Number.isFinite(a.timeSeconds)
      ? a.timeSeconds
      : 0;

    return {
      questionId:  q.id,
      moduleIndex: q.moduleIndex,
      userAnswer,
      userAnswerText,
      correctIndex,
      isCorrect,
      timeSeconds: Math.min(MAX_QUESTION_SECONDS, Math.max(0, Math.round(rawSeconds))),
      // Writing answers with an essay start "pending" until graded on the
      // results page; a blank essay is a genuine 0 and is never pending.
      ...(q.type === 'writing'
        ? userAnswerText.trim()
          ? { writingPending: true }
          : { writingPending: false, writingScore: 0, writingWordCount: 0 }
        : {}),
    };
  });
}
