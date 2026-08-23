import { describe, expect, it } from 'vitest';
import {
  comparePos, isEmptyRange, normalizeRange, segmentRuns,
  removeHighlight, setHighlightNote, highlightsForPassage, isValidHighlight,
  type Highlight, type TextPos,
} from './passage-highlights';

const pos = (block: number, line: number, seg: number, offset: number): TextPos =>
  ({ block, line, seg, offset });

const hl = (id: string, start: TextPos, end: TextPos, note = '', passageKey = 'p1'): Highlight =>
  ({ id, passageKey, start, end, note });

describe('comparePos / normalizeRange', () => {
  it('orders by block, then line, then segment, then offset', () => {
    expect(comparePos(pos(0,0,0,0), pos(1,0,0,0))).toBeLessThan(0);
    expect(comparePos(pos(1,5,0,0), pos(1,2,9,9))).toBeGreaterThan(0);
    expect(comparePos(pos(1,1,1,4), pos(1,1,1,4))).toBe(0);
  });

  it('flips a right-to-left drag so the range still anchors correctly', () => {
    const { start, end } = normalizeRange(pos(0,0,0,9), pos(0,0,0,2));
    expect(start.offset).toBe(2);
    expect(end.offset).toBe(9);
  });

  it('detects a click (empty range) so it is not stored as a highlight', () => {
    expect(isEmptyRange({ start: pos(0,0,0,3), end: pos(0,0,0,3) })).toBe(true);
    expect(isEmptyRange({ start: pos(0,0,0,3), end: pos(0,0,0,4) })).toBe(false);
  });
});

describe('segmentRuns', () => {
  const TEXT = 'The quick brown fox';   // 19 chars

  it('returns the whole segment unhighlighted when nothing covers it', () => {
    expect(segmentRuns(0, 0, 0, TEXT, [])).toEqual([{ text: TEXT, highlightIds: [] }]);
  });

  it('splits a highlight that starts and ends inside the segment', () => {
    const runs = segmentRuns(0, 0, 0, TEXT, [hl('h1', pos(0,0,0,4), pos(0,0,0,9))]);
    expect(runs).toEqual([
      { text: 'The ',  highlightIds: [] },
      { text: 'quick', highlightIds: ['h1'] },
      { text: ' brown fox', highlightIds: [] },
    ]);
  });

  it('covers the whole segment when the range spans across it', () => {
    // Range runs from an earlier block to a later one, so this segment is interior.
    const runs = segmentRuns(1, 0, 0, TEXT, [hl('h1', pos(0,0,0,0), pos(2,0,0,0))]);
    expect(runs).toEqual([{ text: TEXT, highlightIds: ['h1'] }]);
  });

  it('clips a range that starts in this segment and continues past it', () => {
    const runs = segmentRuns(0, 0, 0, TEXT, [hl('h1', pos(0,0,0,10), pos(5,0,0,0))]);
    expect(runs).toEqual([
      { text: 'The quick ', highlightIds: [] },
      { text: 'brown fox', highlightIds: ['h1'] },
    ]);
  });

  it('ignores a highlight that lies entirely outside the segment', () => {
    const runs = segmentRuns(3, 0, 0, TEXT, [hl('h1', pos(0,0,0,0), pos(1,0,0,5))]);
    expect(runs).toEqual([{ text: TEXT, highlightIds: [] }]);
  });

  /* Two notes over overlapping text must both stay reachable. */
  it('tags an overlap with every highlight covering it rather than letting one win', () => {
    const runs = segmentRuns(0, 0, 0, TEXT, [
      hl('h1', pos(0,0,0,0),  pos(0,0,0,9)),
      hl('h2', pos(0,0,0,4),  pos(0,0,0,15)),
    ]);
    expect(runs).toEqual([
      { text: 'The ',  highlightIds: ['h1'] },
      { text: 'quick', highlightIds: ['h1', 'h2'] },
      { text: ' brown', highlightIds: ['h2'] },
      { text: ' fox', highlightIds: [] },
    ]);
  });

  it('drops a zero-width range instead of emitting an empty run', () => {
    const runs = segmentRuns(0, 0, 0, TEXT, [hl('h1', pos(0,0,0,5), pos(0,0,0,5))]);
    expect(runs).toEqual([{ text: TEXT, highlightIds: [] }]);
  });

  it('clamps an offset past the end of the text', () => {
    const runs = segmentRuns(0, 0, 0, 'abc', [hl('h1', pos(0,0,0,1), pos(0,0,0,999))]);
    expect(runs).toEqual([
      { text: 'a',  highlightIds: [] },
      { text: 'bc', highlightIds: ['h1'] },
    ]);
  });

  it('returns nothing for an empty segment', () => {
    expect(segmentRuns(0, 0, 0, '', [hl('h1', pos(0,0,0,0), pos(9,0,0,0))])).toEqual([]);
  });
});

describe('collection helpers', () => {
  const list = [
    hl('a', pos(2,0,0,0), pos(2,0,0,5), 'second'),
    hl('b', pos(0,0,0,0), pos(0,0,0,5), 'first'),
    hl('c', pos(0,0,0,0), pos(0,0,0,5), 'other passage', 'p2'),
  ];

  it('filters to one passage and returns document order', () => {
    expect(highlightsForPassage(list, 'p1').map(h => h.id)).toEqual(['b', 'a']);
  });

  it('removes by id', () => {
    expect(removeHighlight(list, 'a').map(h => h.id)).toEqual(['b', 'c']);
  });

  it('sets a note without disturbing the others', () => {
    const next = setHighlightNote(list, 'b', 'edited');
    expect(next.find(h => h.id === 'b')?.note).toBe('edited');
    expect(next.find(h => h.id === 'a')?.note).toBe('second');
  });
});

describe('isValidHighlight', () => {
  it('accepts a well-formed record', () => {
    expect(isValidHighlight(hl('a', pos(0,0,0,0), pos(0,0,0,4)))).toBe(true);
  });

  it('rejects the shapes localStorage can actually hand back', () => {
    expect(isValidHighlight(null)).toBe(false);
    expect(isValidHighlight('nope')).toBe(false);
    expect(isValidHighlight({ id: '', passageKey: 'p', note: '', start: pos(0,0,0,0), end: pos(0,0,0,1) })).toBe(false);
    expect(isValidHighlight({ id: 'a', passageKey: 'p', note: '', start: { block: 0 }, end: pos(0,0,0,1) })).toBe(false);
    expect(isValidHighlight({ id: 'a', passageKey: 'p', note: '', start: pos(0,0,0,-1), end: pos(0,0,0,1) })).toBe(false);
    expect(isValidHighlight({ id: 'a', passageKey: 'p', start: pos(0,0,0,0), end: pos(0,0,0,1) })).toBe(false);
  });
});
