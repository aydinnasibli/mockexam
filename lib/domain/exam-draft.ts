/**
 * The candidate's in-progress answers, as data rather than as React state.
 *
 * Every rule about whose copy of a draft wins, and how two copies combine,
 * lives here. It used to live inside the player — a 1,800-line component with
 * fourteen effects and no way to test any of it — and that is precisely where
 * the two worst draft bugs hid: a whole-document overwrite that let a
 * backgrounded tab erase newer work, and a conflict path that told the
 * candidate to reload, which threw away everything not yet mirrored.
 *
 * Pure: no React, no I/O. The player holds the state; this decides what it
 * should contain.
 */

/** One answer as it crosses the wire to and from the session mirror. */
export interface DraftAnswer {
  questionId: string;
  userAnswer: number;
  userAnswerText: string;
  timeSeconds: number;
}

export interface DraftProgress {
  answers: DraftAnswer[];
  flagged: string[];
  currentIdx: number;
  /** Server stamp of this draft, or null when none has been stored. */
  updatedAt: string | null;
}

/** The player's four answer collections, in plain form. */
export interface Draft {
  answers: Map<string, number>;
  openAnswers: Map<string, string>;
  matchingAnswers: Map<string, number[]>;
  flagged: Set<string>;
}

/** Minimal question shape: only the type matters for decoding. */
export interface DraftQuestion {
  id: string;
  type: string;
}

export function emptyDraft(): Draft {
  return {
    answers: new Map(),
    openAnswers: new Map(),
    matchingAnswers: new Map(),
    flagged: new Set(),
  };
}

/** Matching answers travel as a JSON array of option indices in the text field. */
export function decodeMatching(raw: string): number[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) return parsed;
  } catch {
    // fall through — a corrupt entry costs one question, never the restore
  }
  return null;
}

/**
 * Which stored copy of the draft to trust.
 *
 * Not a clock comparison — the local stamp comes from a browser and the server
 * stamp from a server, and those disagree by unknown amounts. Instead the local
 * draft records WHICH server draft it descends from. Equal stamps mean the
 * local copy is that same draft plus anything saved since but not yet mirrored,
 * so it is at least as fresh. Different stamps mean another device wrote, and
 * its copy is the one that knows something this device does not.
 */
export function chooseDraftSource(
  localMirroredAt: string | null | undefined,
  serverUpdatedAt: string | null | undefined,
  serverHasAnswers: boolean,
): 'local' | 'server' {
  if (!serverHasAnswers) return 'local';
  if (localMirroredAt != null && serverUpdatedAt != null && localMirroredAt === serverUpdatedAt) {
    return 'local';
  }
  return 'server';
}

/** Decode a mirrored draft into the player's collections. */
export function draftFromProgress(
  progress: DraftProgress | null,
  questions: readonly DraftQuestion[],
): Draft {
  const draft = emptyDraft();
  if (!progress) return draft;

  const typeById = new Map(questions.map(q => [q.id, q.type]));

  for (const a of progress.answers) {
    if (a.userAnswer >= 0) draft.answers.set(a.questionId, a.userAnswer);
    if (!a.userAnswerText) continue;

    if (typeById.get(a.questionId) === 'matching') {
      const decoded = decodeMatching(a.userAnswerText);
      if (decoded) draft.matchingAnswers.set(a.questionId, decoded);
    } else {
      draft.openAnswers.set(a.questionId, a.userAnswerText);
    }
  }

  for (const id of progress.flagged) draft.flagged.add(id);
  return draft;
}

/**
 * Fill only the keys `base` does not have. `base` wins every collision.
 *
 * The per-collection primitive behind `mergeDrafts`, exposed because the player
 * holds its four collections as separate React state and can only ever see one
 * `prev` at a time.
 */
export function fillGaps<K, V>(base: ReadonlyMap<K, V>, incoming: ReadonlyMap<K, V>): Map<K, V> {
  const out = new Map(base);
  for (const [k, v] of incoming) if (!out.has(k)) out.set(k, v);
  return out;
}

/** Union, because losing a "come back to this" flag is worse than keeping a spent one. */
export function unionFlags(base: ReadonlySet<string>, incoming: ReadonlySet<string>): Set<string> {
  return new Set([...base, ...incoming]);
}

/**
 * Combine two drafts, keeping everything.
 *
 * `base` wins any question both hold — it is this window's own work, and the
 * candidate is looking at it. `incoming` supplies only what `base` has no
 * answer for at all. Neither side is ever emptied, which is the whole point:
 * the conflict this resolves used to be settled by discarding one side.
 *
 * Flags are a union. A flag means "come back to this", and losing one is worse
 * than carrying one the candidate has already dealt with.
 */
export function mergeDrafts(base: Draft, incoming: Draft): Draft {
  return {
    answers:         fillGaps(base.answers, incoming.answers),
    openAnswers:     fillGaps(base.openAnswers, incoming.openAnswers),
    matchingAnswers: fillGaps(base.matchingAnswers, incoming.matchingAnswers),
    flagged:         unionFlags(base.flagged, incoming.flagged),
  };
}

/**
 * The answer rows to mirror.
 *
 * Untouched questions are omitted: the question bank is the denominator at
 * submit time, so an absent row costs nothing and keeps the stored draft to the
 * size of the work actually done.
 */
export function buildDraftAnswers(
  questions: readonly DraftQuestion[],
  draft: Draft,
  timeSeconds: ReadonlyMap<string, number>,
): DraftAnswer[] {
  const out: DraftAnswer[] = [];

  for (const q of questions) {
    const choice = draft.answers.get(q.id);
    const text = q.type === 'matching'
      ? (draft.matchingAnswers.has(q.id) ? JSON.stringify(draft.matchingAnswers.get(q.id)) : '')
      : (draft.openAnswers.get(q.id) ?? '');
    const seconds = Math.round(timeSeconds.get(q.id) ?? 0);

    if (choice === undefined && !text && seconds === 0) continue;

    out.push({
      questionId: q.id,
      userAnswer: choice ?? -1,
      userAnswerText: text,
      timeSeconds: seconds,
    });
  }

  return out;
}
