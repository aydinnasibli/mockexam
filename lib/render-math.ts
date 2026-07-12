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
 * Render a reading passage as structured HTML: a title heading, visually
 * separated paragraphs, and set-off "Paragraph A/B/C" labels — while still
 * rendering KaTeX math and escaping all plain text (safe for
 * dangerouslySetInnerHTML). Blank lines separate blocks; single newlines are
 * line breaks within a block (e.g. email headers). Used by the exam + review
 * passage panels.
 */
export function renderPassage(text: string): string {
  const blocks = text.split(/\n[ \t]*\n+/);
  const out: string[] = [];

  blocks.forEach((rawBlock, bi) => {
    const block = rawBlock.trim();
    if (!block) return;
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    // Title: the first block when it's a single, short line that isn't a full
    // sentence (e.g. "The History of Urban Parks", "Should Governments Regulate AI?").
    if (bi === 0 && lines.length === 1 && lines[0].length <= 70 && !lines[0].endsWith('.')) {
      out.push(`<h3 class="passage-title">${renderMath(lines[0])}</h3>`);
      return;
    }

    // A lettered/numbered paragraph label on its own line (e.g. "Paragraph A").
    const label = lines[0].match(/^(Paragraph\s+[A-Za-z0-9]+)[:.]?$/);
    if (label && lines.length > 1) {
      const body = lines.slice(1).map(renderMath).join('<br/>');
      out.push(`<p class="passage-para"><span class="passage-label">${renderMath(label[1])}</span>${body}</p>`);
      return;
    }

    const body = lines.map(renderMath).join('<br/>');
    out.push(`<p class="passage-para">${body}</p>`);
  });

  return out.join('');
}
