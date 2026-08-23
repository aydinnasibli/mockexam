/**
 * What the candidate may reach, and whether they may still write.
 *
 * The player used to derive this from ONE branch: `allowedRange` was the open
 * module's screens when `phase === 'module'`, and `null` — meaning unrestricted
 * — for everything else. Break and finished both fall into "everything else",
 * so the clamp that per-module timing exists to enforce quietly disappeared at
 * exactly the two moments it matters most:
 *
 *   • During a break the whole paper became navigable and editable. A candidate
 *     could walk back into a section whose clock had expired and change their
 *     answers. Nothing stopped them but `BreakScreen`'s z-index — the rule was
 *     enforced by a CSS stacking order rather than by the model.
 *
 *   • After the schedule finished, the same hole opened with nothing over it at
 *     all. That is normally invisible because auto-submit fires immediately —
 *     but when a submit FAILS (a dropped connection, a rate limit) the player
 *     stays mounted at `remaining === 0` with the clamp gone and every module's
 *     content now released by the server, because `isModuleOpen` is satisfied
 *     for every module once elapsed is past all of them. A transient network
 *     error turned "time is up" into an unclocked, fully open, editable paper.
 *
 * So scope is TOTAL here: every phase returns an explicit answer, and "no
 * schedule at all" is the only case that means unrestricted.
 *
 * Pure: no React, no I/O.
 */

import type { SchedulePosition } from './exam-timing';
import { moduleScreenRange, type Screen } from './exam-blocks';

export type NavScope =
  /** A module's clock is running: navigation is clamped to its screens, edits allowed. */
  | { kind: 'module'; range: [number, number] }
  /**
   * A break is running, or the paper is spent. Nothing may be navigated to and
   * nothing may be changed — the candidate stays exactly where they were.
   */
  | { kind: 'frozen'; reason: 'break' | 'finished' }
  /** A session predating per-module timing. Every module stays reachable, as before. */
  | { kind: 'open' };

/**
 * Resolve the candidate's reach.
 *
 * `position` is null for a legacy session with no stored schedule; that is the
 * only route to `open`.
 */
export function navScope(
  position: SchedulePosition | null,
  screens: readonly Screen[],
): NavScope {
  if (!position) return { kind: 'open' };

  if (position.phase === 'module') {
    const range = moduleScreenRange(screens, position.moduleIndex);
    // A module with no screens cannot be entered; freeze rather than fall
    // through to unrestricted, which is the bug this function exists to close.
    return range ? { kind: 'module', range } : { kind: 'frozen', reason: 'finished' };
  }

  return { kind: 'frozen', reason: position.phase === 'break' ? 'break' : 'finished' };
}

/** May the candidate change an answer right now? */
export function canEdit(scope: NavScope): boolean {
  return scope.kind !== 'frozen';
}

/** The screen range navigation is clamped to, or null when it is unbounded. */
export function scopeRange(scope: NavScope): [number, number] | null {
  return scope.kind === 'module' ? scope.range : null;
}

/**
 * Is the paper finished — spent clock, or a schedule with nothing left?
 *
 * Distinct from `canEdit`: a break also blocks editing, but the paper is not
 * over and content already released stays readable. This is the state that must
 * additionally stop the server handing over anything new.
 */
export function isPaperFinished(position: SchedulePosition | null): boolean {
  return position?.phase === 'finished';
}
