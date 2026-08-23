'use client';

import { memo, useCallback, useMemo, useRef } from 'react';
import { parsePassage } from '@/lib/shared/render-math';
import {
  segmentRuns, normalizeRange, isEmptyRange,
  type Highlight, type TextPos,
} from '@/lib/domain/passage-highlights';

/**
 * A reading passage the candidate can highlight and annotate.
 *
 * Rendered from `parsePassage` as real React elements rather than one
 * `dangerouslySetInnerHTML` blob, because a highlight has to wrap a RANGE of
 * the text and you cannot wrap part of an opaque HTML string. It also means the
 * only markup fed to `dangerouslySetInnerHTML` here is KaTeX's own output for a
 * maths run — a much smaller sink than the whole passage.
 *
 * Each text segment carries its (block, line, segment) address in data
 * attributes; that is what turns a browser Selection back into the stable
 * anchors in `lib/domain/passage-highlights.ts`.
 */

interface Props {
  text: string;
  /** Identifies this passage in the stored highlight list. */
  passageKey: string;
  highlights: readonly Highlight[];
  onCreate: (start: TextPos, end: TextPos) => void;
  onOpenHighlight: (id: string) => void;
  activeId?: string | null;
  className?: string;
}

/** Characters of `segmentEl`'s text that precede (node, offset). */
function offsetWithinSegment(segmentEl: Element, node: Node, offset: number): number {
  const walker = document.createTreeWalker(segmentEl, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current = walker.nextNode();
  while (current) {
    if (current === node) return total + offset;
    total += current.textContent?.length ?? 0;
    current = walker.nextNode();
  }
  // The selection edge sits on an element rather than inside a text node
  // (Safari does this at a boundary); clamping to the segment end is closer
  // than dropping the whole selection.
  return total;
}

/** Resolve one edge of a Selection to a passage position, or null if it is outside. */
function toPos(root: HTMLElement, node: Node | null, offset: number): TextPos | null {
  if (!node) return null;
  const el = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
  const seg = el?.closest<HTMLElement>('[data-seg-index]');
  if (!seg || !root.contains(seg)) return null;

  const block = Number(seg.dataset.block);
  const line = Number(seg.dataset.line);
  const segIdx = Number(seg.dataset.segIndex);
  if (!Number.isFinite(block) || !Number.isFinite(line) || !Number.isFinite(segIdx)) return null;

  return { block, line, seg: segIdx, offset: offsetWithinSegment(seg, node, offset) };
}

function HighlightablePassage({
  text, passageKey, highlights, onCreate, onOpenHighlight, activeId, className = '',
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  /*
   * `parsePassage` runs KaTeX over every maths run in the text, so it is by far
   * the most expensive thing this component does — and it was being redone on
   * every render. The player re-renders once a second for the whole sitting
   * (the exam clock), which meant a full re-parse and re-render of the passage
   * a candidate was in the middle of reading, sixty times a minute.
   */
  const blocks = useMemo(() => parsePassage(text), [text]);
  const mine = useMemo(
    () => highlights.filter(h => h.passageKey === passageKey),
    [highlights, passageKey],
  );

  /*
   * Committed on pointer/key release rather than on `selectionchange`: the
   * latter fires continuously while dragging, which would create a new
   * highlight for every intermediate selection.
   */
  const commitSelection = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;

    const a = toPos(root, sel.anchorNode, sel.anchorOffset);
    const b = toPos(root, sel.focusNode, sel.focusOffset);
    if (!a || !b) return;

    const range = normalizeRange(a, b);
    if (isEmptyRange(range)) return;

    onCreate(range.start, range.end);
    sel.removeAllRanges();
  }, [onCreate]);

  return (
    <div
      ref={rootRef}
      className={className}
      onMouseUp={commitSelection}
      onTouchEnd={commitSelection}
    >
      {blocks.map((block, bi) => {
        const body = block.lines.map((line, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {line.map((segment, si) =>
              segment.kind === 'math' ? (
                // KaTeX emits HTML; maths is not highlightable, so it needs no address.
                <span key={si} dangerouslySetInnerHTML={{ __html: segment.html }} />
              ) : (
                <span key={si} data-block={bi} data-line={li} data-seg-index={si}>
                  {segmentRuns(bi, li, si, segment.text, mine).map((run, ri) =>
                    run.highlightIds.length === 0 ? (
                      run.text
                    ) : (
                      <mark
                        key={ri}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenHighlight(run.highlightIds[run.highlightIds.length - 1])}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenHighlight(run.highlightIds[run.highlightIds.length - 1]);
                          }
                        }}
                        className={`cursor-pointer rounded-[3px] px-px ${
                          run.highlightIds.includes(activeId ?? '')
                            ? 'bg-warn/45 outline outline-1 outline-warn'
                            : 'bg-warn/25'
                        } ${mine.some(h => run.highlightIds.includes(h.id) && h.note) ? 'border-b-2 border-warn border-dotted' : ''}`}
                        title={
                          mine.find(h => run.highlightIds.includes(h.id) && h.note)?.note || 'Qeyd əlavə et'
                        }
                      >
                        {run.text}
                      </mark>
                    ),
                  )}
                </span>
              ),
            )}
          </span>
        ));

        return block.kind === 'title' ? (
          <h3 key={bi} className="passage-title">{body}</h3>
        ) : (
          <p key={bi} className="passage-para">
            {block.label && <span className="passage-label">{block.label}</span>}
            {body}
          </p>
        );
      })}
    </div>
  );
}

/*
 * Memoised alongside the `useMemo`s above: without it the parent's per-second
 * clock tick re-rendered the whole passage regardless of how well this
 * component memoised its own work internally.
 */
export default memo(HighlightablePassage);
