import { describe, expect, it } from 'vitest';
import {
  buildModuleSchedule,
  locateInSchedule,
  totalScheduledSeconds,
  isModuleClosed,
  isModuleOpen,
  windowFor,
} from './exam-timing';

const mod = (durationMinutes: number, breakAfterMinutes = 0) => ({ durationMinutes, breakAfterMinutes });

/** The live Digital SAT shape: 32 / 32 (+10 break) / 35 / 35. */
const SAT = [mod(32), mod(32, 10), mod(35), mod(35)];
const SAT_COUNTS = [27, 27, 22, 22];

/** The live IELTS shape: 30 / 60 / 60, no breaks. */
const IELTS = [mod(30), mod(60), mod(60)];
const IELTS_COUNTS = [40, 40, 2];

describe('buildModuleSchedule', () => {
  it('lays modules end to end, with the break falling between them', () => {
    const s = buildModuleSchedule(SAT, SAT_COUNTS);
    expect(s).toEqual([
      { moduleIndex: 0, startsAt: 0,    endsAt: 1920, breakEndsAt: 1920 },
      { moduleIndex: 1, startsAt: 1920, endsAt: 3840, breakEndsAt: 4440 },
      { moduleIndex: 2, startsAt: 4440, endsAt: 6540, breakEndsAt: 6540 },
      { moduleIndex: 3, startsAt: 6540, endsAt: 8640, breakEndsAt: 8640 },
    ]);
  });

  it('totals 144 minutes for the SAT shape — 134 of exam plus a 10 minute break', () => {
    expect(totalScheduledSeconds(buildModuleSchedule(SAT, SAT_COUNTS))).toBe(144 * 60);
  });

  /*
   * The bug this exists to prevent: the IELTS and TOEFL presets both carry a
   * Speaking module the player cannot render. Its duration was still summed
   * into the candidate's clock, handing out 14 free minutes on a section that
   * never appeared.
   */
  it('skips a module with no questions in the bank, and does not bill its time', () => {
    const withSpeaking = [...IELTS, mod(14)];
    const s = buildModuleSchedule(withSpeaking, [...IELTS_COUNTS, 0]);
    expect(s.map(w => w.moduleIndex)).toEqual([0, 1, 2]);
    expect(totalScheduledSeconds(s)).toBe(150 * 60);
  });

  it('keeps the module index of the exam, not the position in the schedule', () => {
    const s = buildModuleSchedule([mod(10), mod(20), mod(30)], [0, 5, 5]);
    expect(s.map(w => w.moduleIndex)).toEqual([1, 2]);
    expect(s[0]).toMatchObject({ startsAt: 0, endsAt: 1200 });
  });

  it('trims a break declared after the last scheduled module', () => {
    const s = buildModuleSchedule([mod(30), mod(30, 15)], [10, 10]);
    expect(s[1].breakEndsAt).toBe(s[1].endsAt);
    expect(totalScheduledSeconds(s)).toBe(60 * 60);
  });

  it('trims the trailing break even when later modules were skipped as empty', () => {
    const s = buildModuleSchedule([mod(30), mod(30, 15), mod(20)], [10, 10, 0]);
    expect(s).toHaveLength(2);
    expect(totalScheduledSeconds(s)).toBe(60 * 60);
  });

  it('returns an empty schedule when no module has questions', () => {
    expect(buildModuleSchedule(SAT, [0, 0, 0, 0])).toEqual([]);
    expect(totalScheduledSeconds([])).toBe(0);
  });
});

describe('locateInSchedule', () => {
  const sat = buildModuleSchedule(SAT, SAT_COUNTS);

  it('opens in the first module', () => {
    expect(locateInSchedule(sat, 0)).toEqual({ phase: 'module', moduleIndex: 0, remaining: 1920 });
  });

  it('rolls straight into the next module when there is no break', () => {
    expect(locateInSchedule(sat, 1920)).toEqual({ phase: 'module', moduleIndex: 1, remaining: 1920 });
  });

  it('enters the break the instant module 2 expires', () => {
    expect(locateInSchedule(sat, 3840)).toEqual({
      phase: 'break', afterModuleIndex: 1, nextModuleIndex: 2, remaining: 600,
    });
  });

  it('leaves the break exactly when it is spent', () => {
    expect(locateInSchedule(sat, 4439)).toMatchObject({ phase: 'break', remaining: 1 });
    expect(locateInSchedule(sat, 4440)).toEqual({ phase: 'module', moduleIndex: 2, remaining: 2100 });
  });

  it('finishes when the whole schedule is spent, and stays finished', () => {
    expect(locateInSchedule(sat, 8640)).toEqual({ phase: 'finished' });
    expect(locateInSchedule(sat, 99_999)).toEqual({ phase: 'finished' });
  });

  it('treats an empty schedule as finished rather than throwing', () => {
    expect(locateInSchedule([], 0)).toEqual({ phase: 'finished' });
  });

  it('clamps a negative or non-finite clock to the start instead of skipping ahead', () => {
    expect(locateInSchedule(sat, -50)).toMatchObject({ phase: 'module', moduleIndex: 0 });
    expect(locateInSchedule(sat, Number.NaN)).toMatchObject({ phase: 'module', moduleIndex: 0 });
  });

  /*
   * `buildModuleSchedule` trims a trailing break, so this shape can only reach
   * the reader from a schedule persisted by an older build. It must resolve to
   * `finished`, not crash a session that is already running.
   */
  it('resolves a hand-written trailing break to finished', () => {
    const legacy = [{ moduleIndex: 0, startsAt: 0, endsAt: 600, breakEndsAt: 900 }];
    expect(locateInSchedule(legacy, 700)).toEqual({ phase: 'finished' });
  });
});

describe('isModuleClosed / windowFor', () => {
  const ielts = buildModuleSchedule(IELTS, IELTS_COUNTS);

  it('keeps the running module open and closes the ones behind it', () => {
    // 40 minutes in: Listening (0–30) is spent, Reading (30–90) is running.
    expect(isModuleClosed(ielts, 0, 40 * 60)).toBe(true);
    expect(isModuleClosed(ielts, 1, 40 * 60)).toBe(false);
  });

  it('does not close a module that has not opened yet', () => {
    expect(isModuleClosed(ielts, 2, 40 * 60)).toBe(false);
  });

  it('closes the boundary second — a module ends AT its endsAt, not after', () => {
    expect(isModuleClosed(ielts, 0, 30 * 60 - 1)).toBe(false);
    expect(isModuleClosed(ielts, 0, 30 * 60)).toBe(true);
  });

  it('treats an unscheduled module as closed so navigation can never enter it', () => {
    expect(windowFor(ielts, 9)).toBeNull();
    expect(isModuleClosed(ielts, 9, 0)).toBe(true);
  });
});

describe('isModuleOpen', () => {
  // Two 10-minute modules with a 5-minute break between them.
  const schedule = buildModuleSchedule(
    [{ durationMinutes: 10, breakAfterMinutes: 5 }, { durationMinutes: 10, breakAfterMinutes: 0 }],
    [5, 5],
  );

  it('opens the first module immediately', () => {
    expect(isModuleOpen(schedule, 0, 0)).toBe(true);
  });

  it('keeps a later module shut until its window starts', () => {
    expect(isModuleOpen(schedule, 1, 0)).toBe(false);
    expect(isModuleOpen(schedule, 1, 60 * 14)).toBe(false);  // still on the break
    expect(isModuleOpen(schedule, 1, 60 * 15)).toBe(true);
  });

  /*
   * Open, not "currently running": once a section's time is spent the candidate
   * has already seen it, so withholding the text afterwards would only break
   * the review of work they already did.
   */
  it('stays open after its clock expires', () => {
    expect(isModuleOpen(schedule, 0, 60 * 60)).toBe(true);
    expect(isModuleClosed(schedule, 0, 60 * 60)).toBe(true);
  });

  it('never opens a module missing from the schedule', () => {
    expect(isModuleOpen(schedule, 9, 60 * 60)).toBe(false);
  });
});
