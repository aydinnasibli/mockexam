/**
 * Highlights and notes over a reading passage.
 *
 * Computer-delivered IELTS and Bluebook both give candidates a highlighter and
 * a notes tool, and studying a long academic text without one is a materially
 * different task. The player also carried `select-none` across the whole
 * session, so text could not even be selected — the anti-copy value of that was
 * near zero (screenshots, devtools) and it made highlighting impossible.
 *
 * ── Why anchors look like this ──
 * The passage is rendered from `parsePassage`, whose output is a tree of
 * blocks → lines → segments, where a segment is either plain text or a KaTeX
 * span. A character offset into the SOURCE string cannot address the rendered
 * DOM, because `$x^2$` expands into dozens of elements. So a position is
 * (block, line, segment, offset-within-that-segment's-text), which survives
 * re-render, is stable across reloads, and never points into a maths subtree —
 * highlighting inside rendered maths is simply not offered.
 *
 * Pure: no DOM, no React. The component converts a browser Selection into these
 * positions and back.
 */

export interface TextPos {
  block: number;
  line: number;
  seg: number;
  /** Characters into that segment's text. */
  offset: number;
}

export interface Highlight {
  id: string;
  /** Identifies which passage this belongs to — passages differ per question group. */
  passageKey: string;
  start: TextPos;
  end: TextPos;
  /** Empty string when the candidate highlighted without attaching a note. */
  note: string;
}

/** Order two positions. Negative when `a` comes first. */
export function comparePos(a: TextPos, b: TextPos): number {
  return a.block - b.block || a.line - b.line || a.seg - b.seg || a.offset - b.offset;
}

/** True when `start` and `end` address the same point — a click, not a drag. */
export function isEmptyRange(h: Pick<Highlight, 'start' | 'end'>): boolean {
  return comparePos(h.start, h.end) === 0;
}

/** Put a range the right way round, so a right-to-left drag still anchors correctly. */
export function normalizeRange(a: TextPos, b: TextPos): { start: TextPos; end: TextPos } {
  return comparePos(a, b) <= 0 ? { start: a, end: b } : { start: b, end: a };
}

/** One piece of a segment's text, tagged with the highlights covering it. */
export interface TextRun {
  text: string;
  /** Ids of every highlight covering this run; empty for unhighlighted text. */
  highlightIds: string[];
}

function cmpSeg(block: number, line: number, seg: number, p: TextPos): number {
  return block - p.block || line - p.line || seg - p.seg;
}

/**
 * Split one text segment into runs according to the highlights over it.
 *
 * Overlapping highlights are handled by cutting at every boundary and tagging
 * each run with all the ids that cover it, rather than letting the last one
 * win — two overlapping notes both stay reachable.
 */
export function segmentRuns(
  block: number,
  line: number,
  seg: number,
  text: string,
  highlights: readonly Highlight[],
): TextRun[] {
  if (!text) return [];

  // Clip each highlight to this segment, as [from, to) character offsets.
  const spans: Array<{ id: string; from: number; to: number }> = [];
  for (const h of highlights) {
    const afterStart = cmpSeg(block, line, seg, h.start);
    const beforeEnd = cmpSeg(block, line, seg, h.end);
    if (afterStart < 0 || beforeEnd > 0) continue;      // segment lies outside the range

    const from = afterStart === 0 ? Math.max(0, h.start.offset) : 0;
    const to = beforeEnd === 0 ? Math.min(text.length, h.end.offset) : text.length;
    if (to > from) spans.push({ id: h.id, from, to });
  }

  if (spans.length === 0) return [{ text, highlightIds: [] }];

  const cuts = new Set<number>([0, text.length]);
  for (const s of spans) { cuts.add(s.from); cuts.add(s.to); }
  const points = [...cuts].sort((a, b) => a - b);

  const runs: TextRun[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const from = points[i];
    const to = points[i + 1];
    if (to <= from) continue;
    runs.push({
      text: text.slice(from, to),
      highlightIds: spans.filter(s => s.from <= from && s.to >= to).map(s => s.id),
    });
  }
  return runs;
}

/** Drop a highlight by id. */
export function removeHighlight(highlights: readonly Highlight[], id: string): Highlight[] {
  return highlights.filter(h => h.id !== id);
}

/** Replace one highlight's note, leaving the rest untouched. */
export function setHighlightNote(
  highlights: readonly Highlight[],
  id: string,
  note: string,
): Highlight[] {
  return highlights.map(h => (h.id === id ? { ...h, note } : h));
}

/** Highlights belonging to one passage, in document order. */
export function highlightsForPassage(
  highlights: readonly Highlight[],
  passageKey: string,
): Highlight[] {
  return highlights
    .filter(h => h.passageKey === passageKey)
    .sort((a, b) => comparePos(a.start, b.start));
}

/**
 * Validate a highlight decoded from localStorage.
 *
 * Storage can hold anything a previous version of the app wrote, and a bad
 * record must never take a running exam down with it — the worst acceptable
 * outcome is one lost highlight.
 */
export function isValidHighlight(value: unknown): value is Highlight {
  if (!value || typeof value !== 'object') return false;
  const h = value as Record<string, unknown>;
  const pos = (p: unknown): boolean => {
    if (!p || typeof p !== 'object') return false;
    const q = p as Record<string, unknown>;
    return ['block', 'line', 'seg', 'offset'].every(
      k => typeof q[k] === 'number' && Number.isFinite(q[k] as number) && (q[k] as number) >= 0,
    );
  };
  return typeof h.id === 'string' && h.id !== ''
    && typeof h.passageKey === 'string'
    && typeof h.note === 'string'
    && pos(h.start) && pos(h.end);
}
