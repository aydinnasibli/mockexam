/**
 * REGRESSION — `revalidateExam` names the paper from what it was HANDED.
 *
 * The bug these tests exist for was invisible from every angle a reviewer
 * normally looks. `pingIndexNow` used to resolve the paper itself with
 * `getExamById`, which filters on `is_active` — so `toggleExamActive(id, false)`
 * and `deleteExam`, the two mutations whose entire point is that a URL stopped
 * working, were exactly the two where that lookup came back empty and the
 * paper's URL was dropped from the submission. Nothing threw, nothing logged,
 * and the remaining URLs still went out looking like a healthy ping.
 *
 * The fix is structural — the identity travels with the call — so the assertion
 * that protects it has to be structural too. Asserting only "the URL is in the
 * batch" would pass again the moment someone reintroduced a lookup, because in
 * a test the row still exists. So these tests also assert that NO query is
 * issued: the paper's URL must come from the argument, never from the database,
 * because after a delete the database is precisely where it is not.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const queries = vi.fn();

vi.mock('@/lib/infra/db', () => ({
  // Any property access is a query attempt. `revalidateExam` must not make one.
  db: new Proxy({}, { get: () => { queries(); return () => {}; } }),
}));
vi.mock('@/lib/infra/observability', () => ({
  captureException: vi.fn(async () => {}),
  captureMessage: vi.fn(async () => {}),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
// `after` normally defers to post-response. Run it inline so the submission is
// observable; what it defers is not what these tests are about.
vi.mock('next/server', () => ({ after: (fn: () => unknown) => { void fn(); } }));
vi.mock('@/lib/infra/indexnow', () => ({
  indexNowKey: vi.fn(() => 'a1b2c3d4e5f6a7b8'),
  submitToIndexNow: vi.fn(async () => {}),
}));

const { revalidateExam } = await import('@/lib/db/exam-totals');
const { revalidatePath } = await import('next/cache');
const { indexNowKey, submitToIndexNow } = await import('@/lib/infra/indexnow');
const { BASE_URL } = await import('@/lib/shared/seo');
const { EXAM_PAPER_ROUTE, EXAM_TYPE_ROUTE } = await import('@/lib/shared/app-routes');

/** The URL list handed to the single submission. */
function submitted(): string[] {
  const call = vi.mocked(submitToIndexNow).mock.calls[0];
  return call ? [...call[0]] : [];
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(indexNowKey).mockReturnValue('a1b2c3d4e5f6a7b8');
});

describe('revalidateExam', () => {
  it('submits the paper URL built from the type it was given', () => {
    revalidateExam({ id: 'ielts-academic-1', type: 'ielts' });

    expect(submitted()).toContain(`${BASE_URL}/exams/ielts/ielts-academic-1`);
  });

  it('uses the type SLUG, not the stored value, so the URL is the canonical one', () => {
    // `general_english` lives under `/exams/english-level/`. Submitting the raw
    // stored value would ping a URL that only 308s.
    revalidateExam({ id: 'general-english-a1', type: 'general_english' });

    expect(submitted()).toContain(`${BASE_URL}/exams/english-level/general-english-a1`);
  });

  /**
   * The one that would have caught the original bug.
   *
   * A deleted paper has no row, and a deactivated one is invisible to every
   * public read — so any implementation that reaches for the database here is
   * already broken for the two callers that need it most.
   */
  it('reads nothing from the database to build that URL', () => {
    revalidateExam({ id: 'ielts-academic-1', type: 'ielts' });

    expect(submitted()).toContain(`${BASE_URL}/exams/ielts/ielts-academic-1`);
    expect(queries).not.toHaveBeenCalled();
  });

  it('submits the catalog and every type page alongside it', () => {
    revalidateExam({ id: 'ielts-academic-1', type: 'ielts' });
    const urls = submitted();

    expect(urls).toContain(BASE_URL);
    expect(urls).toContain(`${BASE_URL}/exams`);
    // Publishing or removing a paper changes its type's register either way.
    expect(urls).toContain(`${BASE_URL}/exams/ielts`);
  });

  /**
   * A type move retires a URL, and the retirement is the news.
   *
   * `updateExam` may change a paper's type, which leaves
   * `/exams/<old type>/<id>` answering 308 instead of 200. Nothing links there
   * any more, so this submission is the only announcement a search engine gets
   * that it changed at all — submitting the destination alone leaves the old
   * URL to be rediscovered on whatever schedule the crawler feels like.
   */
  it('submits every URL a paper owns when it was moved between types', () => {
    revalidateExam([
      { id: 'ielts-academic-1', type: 'toefl' },
      { id: 'ielts-academic-1', type: 'ielts' },
    ]);
    const urls = submitted();

    expect(urls).toContain(`${BASE_URL}/exams/toefl/ielts-academic-1`);
    expect(urls).toContain(`${BASE_URL}/exams/ielts/ielts-academic-1`);
  });

  it('still takes a bare ref, which is what every other caller passes', () => {
    revalidateExam({ id: 'ielts-academic-1', type: 'ielts' });
    const urls = submitted();

    expect(urls).toContain(`${BASE_URL}/exams/ielts/ielts-academic-1`);
    expect(urls.filter((u) => /\/exams\/[^/]+\/[^/]+$/.test(u))).toHaveLength(1);
  });

  it('submits no paper URL for a bulk operation, which names no paper', () => {
    revalidateExam();

    expect(submitted().every((url) => !/\/exams\/[^/]+\/[^/]+$/.test(url))).toBe(true);
  });

  it('invalidates both dynamic routes with the page type Next requires', () => {
    revalidateExam({ id: 'ielts-academic-1', type: 'ielts' });

    // Without the second argument a dynamic pattern is silently a no-op, which
    // is how the pre-restructure version managed to invalidate nothing at all.
    expect(revalidatePath).toHaveBeenCalledWith(EXAM_TYPE_ROUTE, 'page');
    expect(revalidatePath).toHaveBeenCalledWith(EXAM_PAPER_ROUTE, 'page');
    expect(revalidatePath).toHaveBeenCalledWith('/exams');
  });

  it('skips the submission entirely when no key is configured', () => {
    vi.mocked(indexNowKey).mockReturnValue(null);

    revalidateExam({ id: 'ielts-academic-1', type: 'ielts' });

    expect(submitToIndexNow).not.toHaveBeenCalled();
    // The cache invalidation is not conditional on IndexNow being configured.
    expect(revalidatePath).toHaveBeenCalledWith(EXAM_PAPER_ROUTE, 'page');
  });
});
