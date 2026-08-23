/**
 * Per-module exam scheduling — the rule set that separates a mock exam from a
 * practice quiz.
 *
 * The player used to run ONE countdown equal to the sum of every module's
 * duration plus its break, with free navigation across the whole paper. Under
 * that model none of the exams we sell were being simulated: an IELTS candidate
 * could spend ninety minutes on Reading, a SAT candidate could carry unused
 * Module 1 time into Module 2, and the ten-minute SAT break was simply ten more
 * minutes of exam time because it sat inside the same clock.
 *
 * Everything here is derived from ONE number — seconds elapsed since the
 * server-recorded `startedAt` — against a schedule fixed when the session was
 * created. There is no state machine to advance, nothing for the client to
 * report, and therefore nothing for a reload, a second tab or devtools to
 * desynchronise: two clients looking at the same session always compute the
 * same phase. The schedule is stored on the session (not recomputed from the
 * exam) for the same reason `totalSeconds` already is — an admin editing an
 * exam mid-attempt must not be able to move a running candidate's deadlines.
 *
 * Deliberately pure: no I/O, no imports, unit-testable without a database.
 */

/** The module fields the schedule depends on, as stored on the exam. */
export interface SchedulableModule {
  durationMinutes: number;
  breakAfterMinutes: number;
}

/** One module's window, in seconds from session start. */
export interface ModuleWindow {
  /** Index into the exam's `modules` array — NOT the position in this list. */
  moduleIndex: number;
  /** The module's questions open here. */
  startsAt: number;
  /** The module's clock expires here; its questions lock. */
  endsAt: number;
  /** Break after this module ends here. Equal to `endsAt` when there is none. */
  breakEndsAt: number;
}

function toSeconds(minutes: number): number {
  return Number.isFinite(minutes) ? Math.max(0, Math.round(minutes * 60)) : 0;
}

/**
 * Lay the modules out on one timeline.
 *
 * `questionCounts[i]` is how many questions module `i` actually has IN THE
 * QUESTION BANK, and a module with none is skipped entirely — window and
 * duration both. This is what stops an unsupported module from stealing exam
 * time: a module the player cannot render (a Speaking section, or simply one
 * whose bank has not been authored yet) would otherwise donate its minutes to
 * the candidate's clock as free time on a section that never appears, because
 * `computeExamTotals` sums every module's duration. Skipping by real question
 * count rather than by module type covers the general case — any module whose
 * bank is empty is dead weight, whatever it is called.
 *
 * A break declared after the LAST scheduled module is trimmed: it would hold a
 * candidate on a break screen with nothing left to sit for.
 */
export function buildModuleSchedule(
  modules: readonly SchedulableModule[],
  questionCounts: readonly number[],
): ModuleWindow[] {
  const windows: ModuleWindow[] = [];
  let cursor = 0;

  for (const [i, mod] of modules.entries()) {
    if ((questionCounts[i] ?? 0) <= 0) continue;

    const startsAt = cursor;
    const endsAt = startsAt + toSeconds(mod.durationMinutes);
    const breakEndsAt = endsAt + toSeconds(mod.breakAfterMinutes);
    windows.push({ moduleIndex: i, startsAt, endsAt, breakEndsAt });
    cursor = breakEndsAt;
  }

  const last = windows[windows.length - 1];
  if (last) last.breakEndsAt = last.endsAt;

  return windows;
}

/** Total seconds the session may run, breaks included. 0 for an empty schedule. */
export function totalScheduledSeconds(schedule: readonly ModuleWindow[]): number {
  return schedule[schedule.length - 1]?.breakEndsAt ?? 0;
}

/** Where a candidate stands at `elapsed` seconds into the session. */
export type SchedulePosition =
  | { phase: 'module'; moduleIndex: number; remaining: number }
  | { phase: 'break'; afterModuleIndex: number; nextModuleIndex: number; remaining: number }
  | { phase: 'finished' };

/**
 * Resolve elapsed seconds to a phase.
 *
 * Returns `finished` for an empty schedule as well as for a spent one: an exam
 * with no questions anywhere has no module to sit in, and the caller's
 * finished-branch (submit) is the right destination for both.
 */
export function locateInSchedule(
  schedule: readonly ModuleWindow[],
  elapsed: number,
): SchedulePosition {
  const t = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;

  for (const [i, w] of schedule.entries()) {
    if (t < w.endsAt) {
      return { phase: 'module', moduleIndex: w.moduleIndex, remaining: w.endsAt - t };
    }
    if (t < w.breakEndsAt) {
      const next = schedule[i + 1];
      // A break is only reachable when a module follows it — `buildModuleSchedule`
      // trims a trailing break — but guard rather than assert, so a schedule
      // stored by an older build cannot crash a running exam.
      if (!next) return { phase: 'finished' };
      return {
        phase: 'break',
        afterModuleIndex: w.moduleIndex,
        nextModuleIndex: next.moduleIndex,
        remaining: w.breakEndsAt - t,
      };
    }
  }

  return { phase: 'finished' };
}

/** The window for one module index, or null when it isn't scheduled. */
export function windowFor(
  schedule: readonly ModuleWindow[],
  moduleIndex: number,
): ModuleWindow | null {
  return schedule.find(w => w.moduleIndex === moduleIndex) ?? null;
}

/**
 * Has this module's clock already expired?
 *
 * Navigation calls this per module: a mock exam must not let a candidate walk
 * back into a section whose time is spent, which is the behaviour every exam we
 * sell enforces and the old player allowed freely.
 */
export function isModuleClosed(
  schedule: readonly ModuleWindow[],
  moduleIndex: number,
  elapsed: number,
): boolean {
  const w = windowFor(schedule, moduleIndex);
  if (!w) return true;
  return (Number.isFinite(elapsed) ? elapsed : 0) >= w.endsAt;
}

/**
 * Has this module's clock OPENED yet?
 *
 * The counterpart to `isModuleClosed`, and the gate the server uses before it
 * will hand over a module's passages, stems and options. Navigation being
 * clamped to the open module is a client-side courtesy; this is what makes the
 * clamp mean something, because the whole paper used to be serialised into the
 * page at load and a candidate sitting in Listening could read every Reading
 * passage straight out of it.
 *
 * A module that isn't in the schedule at all (an empty bank) never opens — it
 * has no questions to hand over.
 */
export function isModuleOpen(
  schedule: readonly ModuleWindow[],
  moduleIndex: number,
  elapsed: number,
): boolean {
  const w = windowFor(schedule, moduleIndex);
  if (!w) return false;
  return (Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0) >= w.startsAt;
}
