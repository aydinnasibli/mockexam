/**
 * REGRESSION — a known type with nothing to show 404s WITHOUT a database lookup.
 *
 * `resolveType` used to return `null` both for a slug that is not a type at all
 * and for a real type with neither copy nor papers. The page treated every
 * `null` as "maybe a legacy paper URL" and looked the slug up with
 * `getExamById`. For `/exams/gre` that lookup is meaningless — `gre` is a type,
 * it cannot be a paper id — and because `generateStaticParams` emits every type,
 * it ran during the BUILD. With the database unreachable, as it is in CI, the
 * lookup threw and the build failed on `/exams/gre`.
 *
 * So the test that matters asserts the lookup is NOT made, not merely that the
 * page 404s: a 404 reached after an unnecessary query passes a status check and
 * still breaks the build.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PublicExam } from '@/lib/db/exams';

vi.mock('@/lib/db/exams', () => ({
  getActiveExamsForPrerender: vi.fn(async () => []),
  getExamById: vi.fn(async () => null),
}));
// Rendering is not under test here, and both pull in client components.
vi.mock('../ExamsCatalog', () => ({ default: () => null }));
vi.mock('./TypeContent', () => ({ default: () => null }));
// Next's versions throw framework-internal errors; these make the outcome legible.
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
  permanentRedirect: vi.fn((url: string) => { throw new Error(`NEXT_REDIRECT ${url}`); }),
}));

const { default: ExamTypePage } = await import('./page');
const { getActiveExamsForPrerender, getExamById } = await import('@/lib/db/exams');
const { EXAM_TYPE_VALUES } = await import('@/lib/domain/exam-types');
const { examContent, typeSlug } = await import('@/lib/domain/exam-content');

const render = (type: string) => ExamTypePage({ params: Promise.resolve({ type }) });

/**
 * A real exam type with no editorial record, found rather than hard-coded: the
 * day someone writes GRE copy, this should pick the next such type instead of
 * silently testing a type that now has content.
 */
const bare = EXAM_TYPE_VALUES.find((t) => !examContent(t));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getActiveExamsForPrerender).mockResolvedValue([]);
  vi.mocked(getExamById).mockResolvedValue(null);
});

describe('type route resolution', () => {
  it.runIf(bare)('404s a type with neither copy nor papers, without a lookup', async () => {
    await expect(render(typeSlug(bare!))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(getExamById).not.toHaveBeenCalled();
  });

  it.runIf(bare)('serves that same type once it has a paper', async () => {
    vi.mocked(getActiveExamsForPrerender).mockResolvedValue([
      { id: `${bare}-1`, type: bare } as PublicExam,
    ]);
    await expect(render(typeSlug(bare!))).resolves.toBeTruthy();
    expect(getExamById).not.toHaveBeenCalled();
  });

  it('redirects a legacy paper URL to its nested home', async () => {
    vi.mocked(getExamById).mockResolvedValue({ id: 'ielts-academic-1', type: 'ielts' } as PublicExam);

    await expect(render('ielts-academic-1')).rejects.toThrow('NEXT_REDIRECT /exams/ielts/ielts-academic-1');
    expect(getExamById).toHaveBeenCalledWith('ielts-academic-1');
  });

  it('404s a slug that is neither a type nor a paper', async () => {
    await expect(render('no-such-thing')).rejects.toThrow('NEXT_NOT_FOUND');
    // The one case where the lookup IS the right call.
    expect(getExamById).toHaveBeenCalledWith('no-such-thing');
  });
});
