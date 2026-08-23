/**
 * Grouping questions into SCREENS.
 *
 * The player used to equate "screen" with "question": `questions[currentIdx]`,
 * one at a time, next/previous. For a section whose material is continuous that
 * is not a stricter test, it is a different and unanswerable one. IELTS
 * Listening runs a single unpausable recording through four parts and never
 * waits; the real test therefore shows the whole part at once, and the recorded
 * pause — "you now have thirty seconds to look at questions 1 to 10" — only
 * means anything if ten questions are on screen to look at. A form-completion
 * task with six numbered gaps IS one form: split across six screens, the
 * surrounding text that tells you a gap wants a time, a price or a surname is
 * gone.
 *
 * So a screen is one-or-more questions, decided by the module's `layout` and
 * the questions' `blockId`. Question NUMBERING stays flat and one-based across
 * the whole paper, because that is what the candidate, the navigator grid and
 * the answer key all count in.
 *
 * Pure: no React, no I/O, unit-testable on plain objects.
 */

export interface BlockableQuestion {
  id: string;
  moduleIndex: number;
  blockId?: string;
}

export interface Screen {
  moduleIndex: number;
  /** '' when this screen is a single question that belongs to no block. */
  blockId: string;
  /** Flat 0-based indices of the questions on this screen, in order. */
  questionIndices: number[];
}

/** `layouts[moduleIndex]` — anything that isn't 'block' means one per screen. */
export type ModuleLayouts = readonly (string | undefined)[];

/**
 * Split the flat question list into screens.
 *
 * Only CONSECUTIVE questions are grouped. A blockId that reappears later in the
 * module opens a second screen rather than teleporting questions backwards into
 * the first — authored order stays the order the candidate sees, which is the
 * behaviour an author can predict from the JSON alone.
 */
export function buildScreens(
  questions: readonly BlockableQuestion[],
  layouts: ModuleLayouts,
): Screen[] {
  const screens: Screen[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const blockId = (q.blockId ?? '').trim();
    const grouped = layouts[q.moduleIndex] === 'block' && blockId !== '';

    const prev = screens[screens.length - 1];
    if (
      grouped &&
      prev &&
      prev.blockId === blockId &&
      prev.moduleIndex === q.moduleIndex &&
      prev.questionIndices[prev.questionIndices.length - 1] === i - 1
    ) {
      prev.questionIndices.push(i);
      continue;
    }

    screens.push({
      moduleIndex: q.moduleIndex,
      blockId: grouped ? blockId : '',
      questionIndices: [i],
    });
  }

  return screens;
}

/** `screenOfQuestion[flatIndex]` → index into the screen list. */
export function indexQuestionsToScreens(screens: readonly Screen[]): number[] {
  const out: number[] = [];
  screens.forEach((s, si) => {
    for (const qi of s.questionIndices) out[qi] = si;
  });
  return out;
}

/** First screen belonging to a module, or -1 when the module has no questions. */
export function firstScreenOfModule(screens: readonly Screen[], moduleIndex: number): number {
  return screens.findIndex(s => s.moduleIndex === moduleIndex);
}

/**
 * Screens of one module, as [firstScreen, lastScreen] inclusive, or null.
 *
 * Navigation is clamped to this range while a module's clock is running: a mock
 * exam must not let a candidate wander into a section that has not opened or
 * back into one whose time is spent — and on a listening section, leaving the
 * module at all used to unmount the audio element and destroy a single-play
 * recording outright.
 */
export function moduleScreenRange(
  screens: readonly Screen[],
  moduleIndex: number,
): [number, number] | null {
  const first = firstScreenOfModule(screens, moduleIndex);
  if (first < 0) return null;
  let last = first;
  while (last + 1 < screens.length && screens[last + 1].moduleIndex === moduleIndex) last++;
  return [first, last];
}
