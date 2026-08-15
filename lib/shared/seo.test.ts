import { describe, expect, it } from 'vitest';
import { clampDescription, jsonLd, pageMetadata } from './seo';

describe('jsonLd', () => {
  /**
   * JSON-LD is injected via `dangerouslySetInnerHTML` inside a <script> tag on
   * the root layout and both exam pages, and it carries database text (exam
   * titles, descriptions). Escaping `<` is what stops that text closing the
   * script element and running as markup.
   */
  it('escapes `<` so embedded text cannot close the script tag', () => {
    const out = jsonLd({ a: '</script><script>alert(1)</script>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c/script>');
  });

  it('still parses back to the original object', () => {
    const schema = { '@type': 'Product', name: 'SAT <Mock> #1', price: 12 };
    expect(JSON.parse(jsonLd(schema))).toEqual(schema);
  });
});

describe('clampDescription', () => {
  it('leaves a short description untouched', () => {
    expect(clampDescription('A short description.')).toBe('A short description.');
  });

  it('collapses runs of whitespace', () => {
    expect(clampDescription('a   b\n\nc')).toBe('a b c');
  });

  it('truncates on a word boundary and appends an ellipsis', () => {
    const out = clampDescription('word '.repeat(60), 50);
    expect(out.length).toBeLessThanOrEqual(51); // 50 + the ellipsis character
    expect(out.endsWith('…')).toBe(true);
    expect(out).not.toContain('  ');
    // Cut on a space, so the last word is never left half-written.
    expect(out.slice(0, -1).trim().endsWith('word')).toBe(true);
  });

  it('still clamps when the text has no space to break on', () => {
    const out = clampDescription('x'.repeat(200), 20);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBe(21);
  });
});

describe('pageMetadata', () => {
  /**
   * Next.js merges metadata between segments by REPLACEMENT, so a page that
   * declares `openGraph` discards the root layout's — including the og:image
   * contributed by the file-based convention. Every field must therefore be
   * restated here on every page; these assertions are what stops a future edit
   * from silently shipping pages with no social image.
   */
  const meta = pageMetadata({
    title: 'İmtahanlar',
    description: 'Sınaq imtahanları',
    path: '/exams',
  });

  it('sets a per-page canonical rather than inheriting the site root', () => {
    expect(meta.alternates?.canonical).toBe('/exams');
  });

  it('always restates an og:image', () => {
    expect(meta.openGraph?.images).toEqual([
      expect.objectContaining({ url: '/opengraph-image', width: 1200, height: 630 }),
    ]);
  });

  it('always restates the summary_large_image twitter card with an image', () => {
    // `Metadata['twitter']` is a union whose base member has no `card`, so it is
    // narrowed with `in` rather than cast — the assertion is the point of the
    // test and must not be typed away.
    const tw = meta.twitter;
    expect(tw && 'card' in tw ? tw.card : undefined).toBe('summary_large_image');
    expect(meta.twitter?.images).toEqual([
      expect.objectContaining({ url: '/opengraph-image' }),
    ]);
  });

  it('derives the social title from the page title by default', () => {
    expect(meta.openGraph?.title).toBe('İmtahanlar — Testcentre');
  });

  it('honours an explicit socialTitle and a page-specific og image', () => {
    const custom = pageMetadata({
      title: 'SAT',
      description: 'd',
      path: '/exams/sat-mock-1',
      socialTitle: 'Custom',
      ogImagePath: '/exams/sat-mock-1/opengraph-image',
      ogImageAlt: 'SAT',
    });
    expect(custom.openGraph?.title).toBe('Custom');
    expect(custom.openGraph?.images).toEqual([
      expect.objectContaining({ url: '/exams/sat-mock-1/opengraph-image', alt: 'SAT' }),
    ]);
  });
});
