import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersistedSession,
  loadSavedSession,
  parseMatchingAnswers,
  persistSession,
  storageKey,
  type SavedSession,
} from './exam-session-storage';

/**
 * This module is the crash-recovery path for a timed exam: if it throws, a
 * student loses their answers mid-session. Every test here is about it failing
 * safely rather than about it succeeding.
 */

function makeStorage(): Storage & { _data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    _data: data,
    get length() { return data.size; },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    removeItem: (k: string) => { data.delete(k); },
    clear: () => data.clear(),
  } as Storage & { _data: Map<string, string> };
}

const SAMPLE: SavedSession = {
  answers: [['q1', 2], ['q2', 0]],
  openAnswers: [['q3', 'mitochondria']],
  matchingAnswers: [['q4', '[1,0,2]']],
  flagged: ['q2'],
  currentIdx: 3,
};

/*
 * What `loadSavedSession` returns for SAMPLE.
 *
 * It validates and normalises rather than casting, so absent optional fields
 * come back as their empty form instead of `undefined`. Callers get one shape
 * whatever was on disk.
 */
const SAMPLE_LOADED: SavedSession = {
  ...SAMPLE,
  mirroredAt: null,
  highlights: [],
};

beforeEach(() => {
  vi.stubGlobal('localStorage', makeStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('storageKey', () => {
  it('namespaces per exam so two exams cannot overwrite each other', () => {
    expect(storageKey('sat-1')).toBe('tc-exam-sat-1');
    expect(storageKey('sat-1')).not.toBe(storageKey('sat-2'));
  });
});

describe('persist / load round-trip', () => {
  it('restores what was saved, in canonical shape', () => {
    persistSession('sat-1', SAMPLE);
    expect(loadSavedSession('sat-1')).toEqual(SAMPLE_LOADED);
  });

  it('returns null when nothing was ever saved', () => {
    expect(loadSavedSession('never-started')).toBeNull();
  });

  it('does not leak one exam’s answers into another', () => {
    persistSession('sat-1', SAMPLE);
    expect(loadSavedSession('ielts-1')).toBeNull();
  });

  it('clears only the exam it was asked to clear', () => {
    persistSession('sat-1', SAMPLE);
    persistSession('ielts-1', SAMPLE);
    clearPersistedSession('sat-1');
    expect(loadSavedSession('sat-1')).toBeNull();
    expect(loadSavedSession('ielts-1')).toEqual(SAMPLE_LOADED);
  });
});

describe('failing safely', () => {
  it('returns null rather than throwing on corrupt JSON', () => {
    localStorage.setItem(storageKey('sat-1'), '{not valid json');
    expect(() => loadSavedSession('sat-1')).not.toThrow();
    expect(loadSavedSession('sat-1')).toBeNull();
  });

  it('survives storage being unavailable entirely (private browsing)', () => {
    vi.stubGlobal('localStorage', {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('SecurityError'); },
      removeItem() { throw new Error('SecurityError'); },
    });
    expect(loadSavedSession('sat-1')).toBeNull();
    // A write failure must never surface into a running exam.
    expect(() => persistSession('sat-1', SAMPLE)).not.toThrow();
    expect(() => clearPersistedSession('sat-1')).not.toThrow();
  });

  it('swallows a quota error on write', () => {
    vi.stubGlobal('localStorage', {
      ...makeStorage(),
      setItem() { throw new Error('QuotaExceededError'); },
    });
    expect(() => persistSession('sat-1', SAMPLE)).not.toThrow();
  });
});

describe('parseMatchingAnswers', () => {
  it('parses well-formed rows', () => {
    expect(parseMatchingAnswers([['q1', '[0,2,1]']])).toEqual([['q1', [0, 2, 1]]]);
  });

  it('drops only the corrupt row, keeping the rest of the exam', () => {
    // The point of the whole function: one bad entry must not lose every answer.
    expect(parseMatchingAnswers([
      ['q1', '[0,1]'],
      ['q2', '{broken'],
      ['q3', '[2,3]'],
    ])).toEqual([['q1', [0, 1]], ['q3', [2, 3]]]);
  });

  it('rejects JSON that parses but is the wrong shape', () => {
    expect(parseMatchingAnswers([
      ['q1', '"a string"'],
      ['q2', '[1,"two"]'],   // mixed types
      ['q3', '{"a":1}'],
      ['q4', 'null'],
    ])).toEqual([]);
  });

  it('accepts an empty selection without treating it as corrupt', () => {
    expect(parseMatchingAnswers([['q1', '[]']])).toEqual([['q1', []]]);
  });

  it('handles an empty input list', () => {
    expect(parseMatchingAnswers([])).toEqual([]);
  });
});

describe('loadSavedSession — hostile and skewed payloads', () => {
  const write = (v: unknown) => localStorage.setItem(storageKey('sat-1'), JSON.stringify(v));

  /*
   * The shape that used to hang the player: `answers` a string still satisfied
   * `saved.answers?.length` at the call site, and `new Map("abc")` then threw
   * from inside `init()`, which never caught — the exam sat on "loading".
   */
  it('does not return a string where a pair list is expected', () => {
    write({ answers: 'abc', openAnswers: 'def', flagged: 'ghi', currentIdx: 'x' });
    const s = loadSavedSession('sat-1')!;
    expect(s.answers).toEqual([]);
    expect(s.openAnswers).toEqual([]);
    expect(s.flagged).toEqual([]);
    expect(s.currentIdx).toBe(0);
    expect(() => new Map(s.answers)).not.toThrow();
  });

  it('drops malformed entries but keeps the good ones', () => {
    write({
      answers: [['q1', 2], ['q2', 'not-a-number'], ['nope'], null, ['q3', 5]],
      flagged: ['q1', 7, null, 'q2'],
    });
    const s = loadSavedSession('sat-1')!;
    expect(s.answers).toEqual([['q1', 2], ['q3', 5]]);
    expect(s.flagged).toEqual(['q1', 'q2']);
  });

  it('returns null for a payload that is not an object', () => {
    write('just a string');
    expect(loadSavedSession('sat-1')).toBeNull();
    write([1, 2, 3]);
    expect(loadSavedSession('sat-1')).toBeNull();
  });

  it('survives invalid JSON', () => {
    localStorage.setItem(storageKey('sat-1'), '{not json');
    expect(loadSavedSession('sat-1')).toBeNull();
  });

  it('ignores a non-finite currentIdx', () => {
    write({ currentIdx: Number.NaN });
    expect(loadSavedSession('sat-1')!.currentIdx).toBe(0);
  });
});
