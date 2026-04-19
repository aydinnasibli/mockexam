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
