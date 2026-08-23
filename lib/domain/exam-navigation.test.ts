import { describe, expect, it } from 'vitest';
import { navScope, canEdit, scopeRange, isPaperFinished } from './exam-navigation';
import { buildScreens } from './exam-blocks';
import type { SchedulePosition } from './exam-timing';

const qs = [
  { id: 'a', moduleIndex: 0 }, { id: 'b', moduleIndex: 0 },
  { id: 'c', moduleIndex: 1 }, { id: 'd', moduleIndex: 1 },
];
const screens = buildScreens(qs, ['single', 'single']);

describe('navScope', () => {
  it('clamps to the open module while its clock runs', () => {
    const pos: SchedulePosition = { phase: 'module', moduleIndex: 1, remaining: 300 };
    expect(navScope(pos, screens)).toEqual({ kind: 'module', range: [2, 3] });
  });

  /*
   * The break hole: navigation used to become unrestricted here, so a candidate
   * could re-enter a module whose clock had expired and edit it. Only
   * BreakScreen's z-index stood in the way.
   */
  it('freezes during a break', () => {
    const pos: SchedulePosition = { phase: 'break', afterModuleIndex: 0, nextModuleIndex: 1, remaining: 120 };
    expect(navScope(pos, screens)).toEqual({ kind: 'frozen', reason: 'break' });
    expect(canEdit(navScope(pos, screens))).toBe(false);
  });

  /*
   * The worse hole: normally invisible because auto-submit fires, but a FAILED
   * submit leaves the player here with the whole paper open and editable.
   */
  it('freezes once the paper is spent', () => {
    const pos: SchedulePosition = { phase: 'finished' };
    expect(navScope(pos, screens)).toEqual({ kind: 'frozen', reason: 'finished' });
    expect(canEdit(navScope(pos, screens))).toBe(false);
    expect(scopeRange(navScope(pos, screens))).toBeNull();
  });

  it('leaves a legacy session with no schedule unrestricted', () => {
    expect(navScope(null, screens)).toEqual({ kind: 'open' });
    expect(canEdit(navScope(null, screens))).toBe(true);
    expect(scopeRange(navScope(null, screens))).toBeNull();
  });

  /* A module with no screens must freeze, never fall through to unrestricted. */
  it('freezes rather than opening up when the module has no screens', () => {
    const pos: SchedulePosition = { phase: 'module', moduleIndex: 9, remaining: 60 };
    expect(navScope(pos, screens)).toEqual({ kind: 'frozen', reason: 'finished' });
  });

  it('allows editing only while a module is running', () => {
    expect(canEdit({ kind: 'module', range: [0, 1] })).toBe(true);
    expect(canEdit({ kind: 'open' })).toBe(true);
    expect(canEdit({ kind: 'frozen', reason: 'break' })).toBe(false);
  });
});

describe('isPaperFinished', () => {
  it('is true only for a spent schedule', () => {
    expect(isPaperFinished({ phase: 'finished' })).toBe(true);
    expect(isPaperFinished({ phase: 'break', afterModuleIndex: 0, nextModuleIndex: 1, remaining: 5 })).toBe(false);
    expect(isPaperFinished({ phase: 'module', moduleIndex: 0, remaining: 5 })).toBe(false);
    expect(isPaperFinished(null)).toBe(false);
  });
});
