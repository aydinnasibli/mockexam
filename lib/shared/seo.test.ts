import { describe, expect, it } from 'vitest';
import { CANONICAL_ORIGIN, clampDescription, jsonLd, pageMetadata, siteOrigin } from './seo';

describe('siteOrigin', () => {
  it('is the www origin when nothing is configured', () => {
    expect(CANONICAL_ORIGIN).toBe('https://www.testcentre.az');
    expect(siteOrigin(undefined)).toBe(CANONICAL_ORIGIN);
    expect(siteOrigin('')).toBe(CANONICAL_ORIGIN);
  });

  /**
   * Every URL on the site is `${BASE_URL}${path}`. A trailing slash left in the
   * environment variable would double up into `//exams` in the sitemap, the
   * breadcrumbs and every IndexNow ping.
   */
  it.each([
    ['https://www.testcentre.az/', 'https://www.testcentre.az'],
    ['https://www.testcentre.az/exams', 'https://www.testcentre.az'],
    ['https://WWW.Testcentre.AZ', 'https://www.testcentre.az'],
    ['http://localhost:3000/', 'http://localhost:3000'],
  ])('reduces %s to a bare origin', (configured, origin) => {
    expect(siteOrigin(configured)).toBe(origin);
  });

  it.each(['not a url', 'localhost:3000'])('falls back on the unusable value %j', (configured) => {
    expect(siteOrigin(configured)).toBe(CANONICAL_ORIGIN);
  });
});

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

  it('honours an explicit socialTitle', () => {
    const custom = pageMetadata({
      title: 'SAT',
      description: 'd',
      path: '/exams/ielts/sat-mock-1',
      socialTitle: 'Custom',
    });
    expect(custom.openGraph?.title).toBe('Custom');
  });

  /**
   * `ownOgImage` must leave the `images` KEY absent, not set it to `undefined`.
   *
   * Next gates the file-convention merge on
   * `source.openGraph.hasOwnProperty('images')` (`mergeStaticMetadata`), so an
   * explicit `undefined` blocks the colocated image exactly as a real value
   * would, and the page ships with no social image at all. `toEqual` cannot see
   * that difference — `hasOwnProperty` is the assertion.
   */
  describe('ownOgImage', () => {
    const own = pageMetadata({
      title: 'IELTS Academic — Practice Test 1',
      description: 'd',
      path: '/exams/ielts/ielts-academic-1',
      ownOgImage: true,
    });

    it('omits the openGraph images key so the colocated file supplies it', () => {
      expect(Object.hasOwn(own.openGraph!, 'images')).toBe(false);
    });

    it('omits the twitter images key for the same reason', () => {
      expect(Object.hasOwn(own.twitter!, 'images')).toBe(false);
    });

    it('still restates every other social field', () => {
      expect(own.openGraph?.title).toBe('IELTS Academic — Practice Test 1 — Testcentre');
      expect(own.alternates?.canonical).toBe('/exams/ielts/ielts-academic-1');
      const tw = own.twitter;
      expect(tw && 'card' in tw ? tw.card : undefined).toBe('summary_large_image');
    });
  });
});
