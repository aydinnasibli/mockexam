/**
 * REGRESSION — the breadcrumb schema describes a trail the page actually shows.
 *
 * The type page shipped emitting `BreadcrumbList` for Ana səhifə → İmtahanlar →
 * IELTS while rendering no breadcrumb at all: the visible bar was dropped when
 * the old combined route was split in two, and the schema stayed. Structured
 * data that describes nothing on the page is not an error — it throws nothing,
 * logs nothing, and is simply ignored by the search engines it was written for.
 *
 * The fix is that both ends now consume one `Crumb[]`. These tests pin the
 * properties of that array which the two renderers depend on, so a future
 * change cannot quietly reintroduce a trail that only half exists.
 */
import { describe, it, expect } from 'vitest';
import { BASE_URL, EXAM_TRAIL_ROOT, breadcrumbSchema, type Crumb } from './seo';

/** The trail `/exams/ielts/ielts-academic-1` builds. */
const PAPER_TRAIL: Crumb[] = [
  ...EXAM_TRAIL_ROOT,
  { name: 'IELTS', path: '/exams/ielts' },
  { name: 'IELTS Academic — Practice Test 1', short: 'IELTS—01', path: '/exams/ielts/ielts-academic-1' },
];

describe('breadcrumbSchema', () => {
  it('numbers positions from 1 in trail order', () => {
    expect(breadcrumbSchema(PAPER_TRAIL).itemListElement.map((i) => i.position))
      .toEqual([1, 2, 3, 4]);
  });

  it('absolutises every path against BASE_URL', () => {
    expect(breadcrumbSchema(PAPER_TRAIL).itemListElement.map((i) => i.item)).toEqual([
      BASE_URL,
      `${BASE_URL}/exams`,
      `${BASE_URL}/exams/ielts`,
      `${BASE_URL}/exams/ielts/ielts-academic-1`,
    ]);
  });

  /**
   * `BASE_URL` carries no trailing slash, so a naive concat would emit
   * `https://www.testcentre.az/` for the root crumb and a bare origin for every
   * other. Google treats those as different URLs from the ones the pages
   * actually canonicalise to.
   */
  it('does not double the slash on the root crumb', () => {
    expect(breadcrumbSchema([{ name: 'Ana səhifə', path: '/' }]).itemListElement[0]!.item)
      .toBe(BASE_URL);
  });

  /**
   * The schema carries the FULL name even where the bar prints `short`. This is
   * the one place the two renderings legitimately differ, so it is stated
   * rather than assumed.
   */
  it('uses the full name, never the shortened display label', () => {
    const last = breadcrumbSchema(PAPER_TRAIL).itemListElement.at(-1)!;
    expect(last.name).toBe('IELTS Academic — Practice Test 1');
    expect(last.name).not.toBe('IELTS—01');
  });

  it('ends on the page it describes, so the trail is complete', () => {
    expect(breadcrumbSchema(PAPER_TRAIL).itemListElement).toHaveLength(PAPER_TRAIL.length);
  });
});

describe('EXAM_TRAIL_ROOT', () => {
  it('is the two steps every exam page shares', () => {
    expect(EXAM_TRAIL_ROOT.map((c) => c.path)).toEqual(['/', '/exams']);
  });

  /**
   * Both root crumbs carry a `short`, because the bar is 10px mono in a single
   * non-wrapping row and "Ana səhifə" wraps it. A crumb added without one would
   * render its full name and break the row silently.
   */
  it('gives both root crumbs a short label for the bar', () => {
    expect(EXAM_TRAIL_ROOT.every((c) => typeof c.short === 'string')).toBe(true);
  });

  it('is not mutated by a page appending its own crumb', () => {
    const before = EXAM_TRAIL_ROOT.length;
    const trail: Crumb[] = [...EXAM_TRAIL_ROOT, { name: 'GRE', path: '/exams/gre' }];

    expect(trail).toHaveLength(before + 1);
    expect(EXAM_TRAIL_ROOT).toHaveLength(before);
  });
});
