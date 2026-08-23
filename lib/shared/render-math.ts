import katex from 'katex';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Renders LaTeX math delimiters ($...$ and $$...$$) via KaTeX while escaping
 * all plain-text segments to prevent HTML injection via dangerouslySetInnerHTML.
 */
export function renderMath(text: string): string {
  // Split on $$ and $ delimiters, preserving the delimiters in the result.
  // Process $$ (display) first to avoid mistaking $$ as two separate $.
  const segments = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  return segments.map(seg => {
    if (seg.startsWith('$$') && seg.endsWith('$$')) {
      const expr = seg.slice(2, -2);
      try {
        return katex.renderToString(expr, { displayMode: true, throwOnError: false });
      } catch {
        return escapeHtml(seg);
      }
    }
    if (seg.startsWith('$') && seg.endsWith('$') && seg.length > 2) {
      const expr = seg.slice(1, -1);
      try {
        return katex.renderToString(expr, { displayMode: false, throwOnError: false });
      } catch {
        return escapeHtml(seg);
      }
    }
    return escapeHtml(seg);
  }).join('');
}

/**
 * One run of a passage line: either plain text, or a rendered KaTeX span.
 *
 * Text is carried RAW and unescaped, because the React renderer puts it in a
 * text node where escaping is the renderer's job. `renderPassage` escapes it on
 * the way into its HTML string instead.
 */
export type PassageSegment =
  | { kind: 'text'; text: string }
  | { kind: 'math'; html: string };

export interface PassageBlock {
  kind: 'title' | 'para';
  /** A "Paragraph A" style label set off from the body, or '' when there is none. */
  label: string;
  /** Body lines; a single newline in the source becomes a line break. */
  lines: PassageSegment[][];
}

/** Split one line into text and math runs, matching `renderMath`'s tokenisation exactly. */
export function parseInline(text: string): PassageSegment[] {
  const segments = text.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g);

  return segments.flatMap((seg): PassageSegment[] => {
    if (!seg) return [];
    if (seg.startsWith('$$') && seg.endsWith('$$')) {
      const expr = seg.slice(2, -2);
      try {
        return [{ kind: 'math', html: katex.renderToString(expr, { displayMode: true, throwOnError: false }) }];
      } catch {
        return [{ kind: 'text', text: seg }];
      }
    }
    if (seg.startsWith('$') && seg.endsWith('$') && seg.length > 2) {
      const expr = seg.slice(1, -1);
      try {
        return [{ kind: 'math', html: katex.renderToString(expr, { displayMode: false, throwOnError: false }) }];
      } catch {
        return [{ kind: 'text', text: seg }];
      }
    }
    return [{ kind: 'text', text: seg }];
  });
}

/**
 * Parse a reading passage into blocks: an optional title, "Paragraph A/B/C"
 * labels set off from their body, and paragraphs whose single newlines are line
 * breaks (e.g. email headers). Blank lines separate blocks.
 *
 * This is the shared parser. `renderPassage` flattens it to an HTML string for
 * the review page; `PassageText` renders it as real React elements so the exam
 * player can wrap ranges of it in highlight marks — which is impossible against
 * an opaque `dangerouslySetInnerHTML` blob, and is why the structure exists.
 */
export function parsePassage(text: string): PassageBlock[] {
  const rawBlocks = text.split(/\n[ \t]*\n+/);
  const out: PassageBlock[] = [];

  rawBlocks.forEach((rawBlock, bi) => {
    const block = rawBlock.trim();
    if (!block) return;
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Title: the first block when it's a single, short line that isn't a full
    // sentence (e.g. "The History of Urban Parks", "Should Governments Regulate AI?").
    if (bi === 0 && lines.length === 1 && lines[0].length <= 70 && !lines[0].endsWith('.')) {
      out.push({ kind: 'title', label: '', lines: [parseInline(lines[0])] });
      return;
    }

    // A lettered/numbered paragraph label on its own line (e.g. "Paragraph A").
    const label = lines[0].match(/^(Paragraph\s+[A-Za-z0-9]+)[:.]?$/);
    if (label && lines.length > 1) {
      out.push({ kind: 'para', label: label[1], lines: lines.slice(1).map(parseInline) });
      return;
    }

    out.push({ kind: 'para', label: '', lines: lines.map(parseInline) });
  });

  return out;
}

function segmentsToHtml(segments: PassageSegment[]): string {
  return segments.map(s => (s.kind === 'math' ? s.html : escapeHtml(s.text))).join('');
}

/**
 * Render a reading passage as structured HTML: a title heading, visually
 * separated paragraphs, and set-off "Paragraph A/B/C" labels — while still
 * rendering KaTeX math and escaping all plain text (safe for
 * dangerouslySetInnerHTML). Used by the review page.
 */
export function renderPassage(text: string): string {
  return parsePassage(text).map(block => {
    if (block.kind === 'title') {
      return `<h3 class="passage-title">${segmentsToHtml(block.lines[0] ?? [])}</h3>`;
    }
    const body = block.lines.map(segmentsToHtml).join('<br/>');
    return block.label
      ? `<p class="passage-para"><span class="passage-label">${segmentsToHtml(parseInline(block.label))}</span>${body}</p>`
      : `<p class="passage-para">${body}</p>`;
  }).join('');
}
