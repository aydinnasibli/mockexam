/**
 * Crash recovery for an in-progress exam.
 *
 * A student's answers live in React state, which a reload, a crashed tab or a
 * flat battery would otherwise take with it — mid-exam, with the server clock
 * still running. This mirrors that state into localStorage after every change
 * so the session can be restored exactly where it left off.
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

export interface SavedSession {
  answers: [string, number][];
  openAnswers: [string, string][];
  /** Persisted as a JSON string per question; see parseMatchingAnswers. */
  matchingAnswers?: [string, string][];
  flagged: string[];
  currentIdx: number;
  /** Modules whose briefing card has already been shown, so a reload doesn't repeat it. */
  seenModules?: number[];
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
 * Matching answers are persisted as a JSON string per question. A corrupt entry
 * must not take the whole restore — and with it the running exam — down, so
 * each one is parsed defensively and a bad row is simply dropped.
 */
export function parseMatchingAnswers(saved: [string, string][]): Array<[string, number[]]> {
  const out: Array<[string, number[]]> = [];
  for (const [id, raw] of saved) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(n => typeof n === 'number')) {
        out.push([id, parsed]);
      }
    } catch {
      // Drop this question's saved matching; it re-answers as unanswered.
    }
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
