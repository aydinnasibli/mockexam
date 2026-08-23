/**
 * Crash recovery for an in-progress exam.
 *
 * A student's answers live in React state, which a reload, a crashed tab or a
 * flat battery would otherwise take with it — mid-exam, with the server clock
 * still running. This mirrors that state into localStorage after every change
 * so the session can be restored exactly where it left off.
 *
 * This is the FAST layer, not the durable one. It is tied to one browser on one
 * machine, so it cannot survive a cleared cache or a change of device;
 * `saveSessionProgress` mirrors the same draft to the session document for
 * that. Highlights are the exception and live only here — they are study
 * scaffolding, never graded, and never leave the candidate's browser.
 *
 * Extracted from ExamSessionClient so it can be tested without mounting the
 * player: this is the one piece of that component whose failure silently loses
 * a student's work, and it had no tests at all.
 *
 * Every function here is defensive by design. Storage can be unavailable
 * (private browsing), full (quota), or hold data written by an older version of
 * the app. None of those may throw into a running exam — the worst acceptable
 * outcome is that recovery is skipped, never that the page dies.
 */

import { isValidHighlight, type Highlight } from './passage-highlights';

export interface SavedSession {
  answers: [string, number][];
  openAnswers: [string, string][];
  /** Persisted as a JSON string per question; see parseMatchingAnswers. */
  matchingAnswers?: [string, string][];
  flagged: string[];
  currentIdx: number;
  /**
   * The server `updatedAt` this device last mirrored successfully, or null if
   * it never has.
   *
   * It is what lets a restore tell "this local draft is the server's draft plus
   * changes not yet mirrored" from "the server has moved on somewhere else",
   * WITHOUT comparing a browser clock against a server clock. Equal stamps mean
   * the same lineage, so local is at least as fresh and wins; different stamps
   * mean another device wrote, so the server wins.
   */
  mirroredAt?: string | null;
  /** Passage highlights and their notes. Study scaffolding — never graded. */
  highlights?: Highlight[];
}

/**
 * Keep only the highlights that survive validation.
 *
 * Highlights are the one part of the saved session written by a feature that
 * post-dates most stored sessions, so a restore will routinely meet the field
 * missing entirely, and may meet records written by an older shape of it. A bad
 * record costs one highlight, never the restore — and never the exam.
 */
export function parseHighlights(raw: unknown): Highlight[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidHighlight);
}

export function storageKey(examId: string): string {
  return `tc-exam-${examId}`;
}

export function loadSavedSession(examId: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(storageKey(examId));
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}

/**
 * One question's matching answer, as stored: a JSON array of option indices.
 *
 * Returns null for anything that isn't one. A corrupt entry must never take the
 * whole restore — and with it the running exam — down, so the cost of bad data
 * is that one question re-answering as unanswered.
 */
export function parseMatchingJson(raw: string): number[] | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) return parsed;
  } catch {
    // fall through
  }
  return null;
}

/** The same, for a whole saved map. Bad rows are dropped. */
export function parseMatchingAnswers(saved: [string, string][]): Array<[string, number[]]> {
  const out: Array<[string, number[]]> = [];
  for (const [id, raw] of saved) {
    const parsed = parseMatchingJson(raw);
    if (parsed) out.push([id, parsed]);
  }
  return out;
}

export function persistSession(examId: string, data: SavedSession): void {
  try {
    localStorage.setItem(storageKey(examId), JSON.stringify(data));
  } catch {
    // ignore quota / private-browsing errors
  }
}

export function clearPersistedSession(examId: string): void {
  try {
    localStorage.removeItem(storageKey(examId));
  } catch {
    // ignore
  }
}
