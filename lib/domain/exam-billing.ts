/**
 * How long the candidate spent on each question.
 *
 * The player used to answer this inline, in two places, and got it wrong twice.
 * It billed the whole interval to `questions[currentIdx]` — so on a blocked
 * screen, where navigation always lands on the block's first question, an IELTS
 * listening part charged all ten questions' time to question one and reported
 * the other nine at zero. And it only closed an interval when the candidate
 * navigated or submitted, so when the SCHEDULE moved them on — a module clock
 * expiring, a ten-minute SAT break — nothing closed it, and the tail of the old
 * module plus the entire break landed on the first question of the next one.
 *
 * Both faults are shape errors, not arithmetic ones: the unit being timed is a
 * SCREEN, and it can stop being billable without anyone clicking anything.
 *
 * Pure: no React, no clock, no I/O. The player supplies the interval.
 */

/** What the candidate is being timed on, if anything. */
export interface BillingContext {
  /** False on the briefing, resume and submitting screens. */
  running: boolean;
  /** True while a scheduled break is on screen. */
  onBreak: boolean;
  /** True while the open module's text is still being fetched. */
  contentLoading: boolean;
  /** Question ids on the screen currently displayed, in order. */
  screenQuestionIds: readonly string[];
}

/**
 * The questions an interval ending now should be charged to — empty when
 * nothing should be.
 *
 * A break is not study time and must reach no question at all; neither is the
 * wait for a section's text to arrive, which the candidate cannot read during.
 * Returning an empty list is how those intervals get discarded rather than
 * quietly attributed to whatever happens to be on screen afterwards.
 */
export function billableQuestionIds(ctx: BillingContext): string[] {
  if (!ctx.running || ctx.onBreak || ctx.contentLoading) return [];
  return [...ctx.screenQuestionIds];
}

/**
 * A stable identity for the current billing target.
 *
 * The player banks an interval whenever this CHANGES, which is what makes a
 * schedule-driven module change close the previous interval without any code
 * at the boundary remembering to. It also means navigation within one blocked
 * screen changes nothing — correctly, because the same questions really are
 * still in front of the candidate and the interval should simply continue.
 */
export function billingKey(ids: readonly string[]): string {
  return ids.join(',');
}

/**
 * Split an interval across the questions that were on screen for it.
 *
 * Evenly, which is an approximation and an honest one: on a blocked screen the
 * candidate genuinely had all ten questions in front of them for the whole
 * interval, and there is no signal saying which one they were reading.
 *
 * Returns an empty map for a non-positive interval or no questions, so the
 * caller can apply it unconditionally.
 */
export function splitInterval(
  seconds: number,
  ids: readonly string[],
): Map<string, number> {
  const out = new Map<string, number>();
  if (!Number.isFinite(seconds) || seconds <= 0 || ids.length === 0) return out;

  const share = seconds / ids.length;
  for (const id of ids) out.set(id, share);
  return out;
}

/** Add a split onto a running per-question tally, in place. */
export function applyInterval(
  tally: Map<string, number>,
  seconds: number,
  ids: readonly string[],
): void {
  for (const [id, share] of splitInterval(seconds, ids)) {
    tally.set(id, (tally.get(id) ?? 0) + share);
  }
}
