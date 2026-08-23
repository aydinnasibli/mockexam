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
  /**
   * How many marks this question is worth, and how many were earned.
   *
   * Everything is worth 1 except `matching`, which is worth one mark PER ITEM —
   * the way every exam we mock actually marks it. Grading a six-item
   * matching-headings task as a single all-or-nothing mark meant a candidate
   * who placed five of six correctly scored zero for the task, and it squeezed
   * an IELTS reading section's 53 real marks into 40 question documents fed to
   * a band table calibrated for 40.
   *
   * `isCorrect` is kept as "earned everything", so the review page and the
   * per-question analytics read exactly as before.
   */
  marks: number;
  earnedMarks: number;
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

    let marks = 1;
    let earnedMarks = 0;
    if (q.type === 'mcq') {
      earnedMarks = userAnswer !== -1 && userAnswer === correctIndex ? 1 : 0;
    } else if (q.type === 'open') {
      if (userAnswerText && q.openAnswers?.length) {
        const normalized = normalizeOpenAnswer(userAnswerText);
        earnedMarks = q.openAnswers.some(ans => normalizeOpenAnswer(String(ans)) === normalized) ? 1 : 0;
      }
    } else if (q.type === 'matching') {
      /*
       * One mark per item. userAnswerText is a JSON array e.g. "[1,0,2,0,1]".
       *
       * `?? 1` only catches null/undefined, so an EMPTY `correctMatching` gave
       * `marks = 0` — and a question worth nothing contributes 0/0, vanishing
       * from its section's denominator without a trace. `validateQuestion` now
       * blocks that shape on both write paths, but rows stored before it are
       * never revalidated, so the floor stays. One unearnable mark is the safe
       * failure: the question is visibly wrong rather than invisibly absent.
       */
      marks = q.correctMatching?.length || 1;
      if (userAnswerText && q.correctMatching?.length) {
        try {
          const userMatches: unknown = JSON.parse(userAnswerText);
          if (Array.isArray(userMatches)) {
            earnedMarks = q.correctMatching.reduce(
              (sum, correct, idx) => sum + (correct === userMatches[idx] ? 1 : 0),
              0,
            );
          }
        } catch {
          earnedMarks = 0;
        }
      }
    }
    // writing: earns nothing here — graded by AI separately.

    const isCorrect = q.type !== 'writing' && marks > 0 && earnedMarks === marks;

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
      marks,
      earnedMarks,
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
