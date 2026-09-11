/**
 * VALIDATION — a type page is offered for indexing only when it has copy of
 * its own.
 *
 * `resolveType` 404s a type when it has NEITHER editorial copy nor papers. The
 * gap that leaves is a type with papers and no copy: it serves, and everything
 * on it is the `/exams` register with one filter applied — no format section,
 * no scoring, no FAQ. Indexable, that is a self-canonical near-duplicate of the
 * catalog, which is the exact shape this restructure removed six of.
 *
 * No fixture reaches it — every type that currently has papers also has an
 * `EXAM_CONTENT` record — so the day it happens will be the day someone
 * publishes a paper for a new programme, and nobody will be looking. Hence a
 * test rather than a manual check.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicExam } from '@/lib/db/exams';

vi.mock('@/lib/db/exams', () => ({
  getActiveExamsForPrerender: vi.fn(),
  getExamById: vi.fn(async () => null),
}));
// Rendering is not under test here, and both pull in client components.
vi.mock('../ExamsCatalog', () => ({ default: () => null }));
vi.mock('./TypeContent', () => ({ default: () => null }));

const { generateMetadata } = await import('./page');
const { getActiveExamsForPrerender } = await import('@/lib/db/exams');

/** Only the fields `resolveType` and the metadata branch actually read. */
function paper(type: string): PublicExam {
  return { id: `${type}-1`, type } as PublicExam;
}

function withPapers(...types: string[]) {
  vi.mocked(getActiveExamsForPrerender).mockResolvedValue(types.map(paper));
}

/** `robots` as Next's Metadata models it, narrowed to what we assert. */
function robots(meta: Awaited<ReturnType<typeof generateMetadata>>) {
  const r = meta.robots;
  return typeof r === 'object' && r !== null ? r : undefined;
}

const params = (type: string) => ({ params: Promise.resolve({ type }) });

beforeEach(() => vi.clearAllMocks());

describe('type page indexability', () => {
  it('leaves a type with editorial copy indexable', async () => {
    withPapers('ielts');

    const meta = await generateMetadata(params('ielts'));

    // Absent, not `false` — the default is index/follow and restating it here
    // would only be one more thing to keep in step.
    expect(robots(meta)).toBeUndefined();
    expect(meta.alternates?.canonical).toBe('/exams/ielts');
  });

  it('serves a copy-less type that has papers, but noindexes it', async () => {
    // GRE has papers and no `EXAM_CONTENT` record: the gap this test guards.
    withPapers('gre');

    const meta = await generateMetadata(params('gre'));

    expect(robots(meta)).toMatchObject({ index: false, follow: true });
  });

  it('still follows out of that page, so its papers keep a crawl path', async () => {
    withPapers('gre');

    // `noindex, nofollow` would strip the only internal links to those papers
    // that is not the catalog itself.
    expect(robots(await generateMetadata(params('gre')))?.follow).toBe(true);
  });

  it('describes nothing for a type that resolves to no page at all', async () => {
    // No copy and no papers: `resolveType` returns null and the route 404s.
    withPapers('ielts');

    expect(await generateMetadata(params('gre'))).toEqual({});
  });

  it('describes nothing for a non-canonical segment, which redirects', async () => {
    // `/exams/general_english` permanently redirects to `/exams/english-level`.
    withPapers('general_english');

    expect(await generateMetadata(params('general_english'))).toEqual({});
  });
});
