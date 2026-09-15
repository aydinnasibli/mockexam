/**
 * VALIDATION — every `lastmod` in the sitemap is a date the site can stand
 * behind, or absent.
 *
 * The failure this guards is invisible from the outside: a sitemap that stamps
 * "now" on pages that did not change still validates, still gets fetched, and
 * simply teaches Google to ignore its dates — the true per-paper ones included.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicExam } from '@/lib/db/exams';

vi.mock('@/lib/db/exams', () => ({ getActiveExamsForPrerender: vi.fn() }));

const { default: sitemap } = await import('./sitemap');
const { getActiveExamsForPrerender } = await import('@/lib/db/exams');
const { BASE_URL, HOME_URL } = await import('@/lib/shared/seo');
const { CONTENT_TYPES, typePath } = await import('@/lib/domain/exam-content');

const OLD = new Date('2026-03-01T00:00:00Z');
const NEW = new Date('2026-08-15T00:00:00Z');

function paper(id: string, type: string, updatedAt: Date): PublicExam {
  return { id, type, updatedAt } as PublicExam;
}

/** The entry for a root-relative path. */
async function entryFor(path: string) {
  const url = path === '/' ? HOME_URL : `${BASE_URL}${path}`;
  return (await sitemap()).find((e) => e.url === url);
}

beforeEach(() => {
  vi.mocked(getActiveExamsForPrerender).mockResolvedValue([
    paper('ielts-1', 'ielts', OLD),
    paper('ielts-2', 'ielts', NEW),
    paper('sat-1', 'sat', OLD),
  ]);
});

describe('sitemap lastmod', () => {
  it("dates each paper by its own updatedAt", async () => {
    expect((await entryFor('/exams/ielts/ielts-1'))?.lastModified).toEqual(OLD);
    expect((await entryFor('/exams/ielts/ielts-2'))?.lastModified).toEqual(NEW);
  });

  it('dates a hub by the newest paper on it', async () => {
    expect((await entryFor('/exams/ielts'))?.lastModified).toEqual(NEW);
    expect((await entryFor('/exams/sat'))?.lastModified).toEqual(OLD);
  });

  it('dates the home page and the catalog by the newest paper anywhere', async () => {
    expect((await entryFor('/'))?.lastModified).toEqual(NEW);
    expect((await entryFor('/exams'))?.lastModified).toEqual(NEW);
  });

  /** A hub with copy but nothing on sale is still listed — it just makes no claim. */
  it('lists a hub with no papers, undated', async () => {
    const empty = CONTENT_TYPES.find((t) => t !== 'ielts' && t !== 'sat')!;
    const entry = await entryFor(typePath(empty));
    expect(entry).toBeDefined();
    expect(entry && Object.hasOwn(entry, 'lastModified')).toBe(false);
  });

  it.each(['/about', '/contact', '/legal/terms', '/legal/privacy', '/legal/cookies', '/legal/refund'])(
    'makes no date claim for the static page %s',
    async (path) => {
      const entry = await entryFor(path);
      expect(entry).toBeDefined();
      expect(entry && Object.hasOwn(entry, 'lastModified')).toBe(false);
    },
  );

  it('never dates anything "now"', async () => {
    const before = Date.now();
    for (const entry of await sitemap()) {
      if (entry.lastModified) expect(new Date(entry.lastModified).getTime()).toBeLessThan(before);
    }
  });

  it('carries no changefreq or priority, which Google ignores', async () => {
    for (const entry of await sitemap()) {
      expect(Object.hasOwn(entry, 'changeFrequency')).toBe(false);
      expect(Object.hasOwn(entry, 'priority')).toBe(false);
    }
  });

  it('dates the listings nothing when the catalog is empty', async () => {
    vi.mocked(getActiveExamsForPrerender).mockResolvedValue([]);
    const home = await entryFor('/');
    expect(home && Object.hasOwn(home, 'lastModified')).toBe(false);
  });
});

describe('sitemap URLs', () => {
  /**
   * The home entry is the URL every `href="/"` resolves to. As the bare origin
   * it read, to a crawler comparing strings, as a page the sitemap lists but
   * nothing on the site links to. See `HOME_URL`.
   */
  it('lists the home page in its normalised, slashed form', async () => {
    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls).toContain(new URL(BASE_URL).href);
    expect(urls).not.toContain(BASE_URL);
  });

  it('writes every other URL without a trailing slash', async () => {
    for (const { url } of await sitemap()) {
      if (url !== HOME_URL) expect(url.endsWith('/')).toBe(false);
    }
  });
});
