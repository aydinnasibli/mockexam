import { describe, expect, it } from 'vitest';
import { renderMath, renderPassage } from './render-math';

/**
 * These two functions are the XSS boundary for the whole product: their output
 * is the only thing handed to `dangerouslySetInnerHTML` in the exam player, the
 * review panel and the public exam page. Question text, passages and
 * explanations are author-supplied and reach students unescaped by any other
 * layer, so the escaping asserted here is load-bearing rather than cosmetic.
 */

describe('renderMath — escaping', () => {
  it('escapes markup in plain text rather than emitting it', () => {
    expect(renderMath('<script>alert(1)</script>'))
      .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('escapes an event-handler injection attempt', () => {
    const out = renderMath('<img src=x onerror=alert(1)>');
    expect(out).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(out).not.toContain('<img');
  });

  it('escapes the full set of HTML-significant characters', () => {
    expect(renderMath(`a & b < c > d "q" 'r'`))
      .toBe('a &amp; b &lt; c &gt; d &quot;q&quot; &#039;r&#039;');
  });

  it('escapes text surrounding a math segment, not just standalone text', () => {
    const out = renderMath('<b>before</b> $x$ <i>after</i>');
    expect(out).toContain('&lt;b&gt;before&lt;/b&gt;');
    expect(out).toContain('&lt;i&gt;after&lt;/i&gt;');
    expect(out).not.toContain('<b>');
    expect(out).not.toContain('<i>');
  });

  it('leaves an unpaired delimiter as escaped literal text', () => {
    // No closing `$`, so this is not a math segment and must not be swallowed.
    expect(renderMath('unclosed $x + 1')).toBe('unclosed $x + 1');
    expect(renderMath('costs $5 and <b>x</b>')).toBe('costs $5 and &lt;b&gt;x&lt;/b&gt;');
  });
});

describe('renderMath — KaTeX is rendered untrusted', () => {
  it('renders inline math to KaTeX markup', () => {
    const out = renderMath('Solve $x^2$ now');
    expect(out).toContain('class="katex"');
    expect(out).toContain('Solve ');
    expect(out).toContain(' now');
  });

  it('renders display math for the $$…$$ form', () => {
    expect(renderMath('$$\\frac{1}{2}$$')).toContain('class="katex-display"');
  });

  it('refuses \\href, so a javascript: URL never becomes an anchor', () => {
    // KaTeX only honours \href when `trust` is enabled; it defaults to false and
    // is deliberately never set here. The command is rendered as an error token.
    //
    // The raw command still appears in KaTeX's <annotation> node — that is the
    // inert TeX source it always echoes, not a link — so the property under test
    // is that no anchor and no href attribute are produced.
    const out = renderMath('$\\href{javascript:alert(1)}{click}$');
    expect(out).not.toContain('<a ');
    expect(out).not.toContain('href=');
    expect(out).toContain('<annotation encoding="application/x-tex">');
  });

  it('refuses \\htmlData, which would otherwise inject attributes', () => {
    const out = renderMath('$\\htmlData{foo=bar}{y}$');
    expect(out).not.toContain('data-foo');
  });

  it('does not throw on invalid LaTeX', () => {
    expect(() => renderMath('$\\badcmd$')).not.toThrow();
    expect(renderMath('$\\badcmd$')).toContain('class="katex"');
  });
});

describe('renderPassage', () => {
  it('promotes a short opening line to a title and marks up paragraphs', () => {
    expect(renderPassage('My Title\n\nFirst para\n\nSecond para')).toBe(
      '<h3 class="passage-title">My Title</h3>' +
      '<p class="passage-para">First para</p>' +
      '<p class="passage-para">Second para</p>',
    );
  });

  it('sets off a "Paragraph X" label from its body', () => {
    expect(renderPassage('Paragraph A\nbody text')).toBe(
      '<p class="passage-para"><span class="passage-label">Paragraph A</span>body text</p>',
    );
  });

  it('keeps single newlines as line breaks within a block', () => {
    expect(renderPassage('From: a\nTo: b')).toBe(
      '<p class="passage-para">From: a<br/>To: b</p>',
    );
  });

  it('escapes author markup inside every block', () => {
    const out = renderPassage('Intro <b>x</b>\n\n<script>alert(1)</script>');
    expect(out).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(out).toContain('&lt;script&gt;');
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<b>');
  });

  it('does not treat a full sentence as a title', () => {
    // The title heuristic requires a short line that is not a sentence.
    expect(renderPassage('This is a complete sentence.')).toBe(
      '<p class="passage-para">This is a complete sentence.</p>',
    );
  });

  it('returns an empty string for blank input rather than an empty tag', () => {
    expect(renderPassage('')).toBe('');
    expect(renderPassage('\n\n   \n\n')).toBe('');
  });
});
