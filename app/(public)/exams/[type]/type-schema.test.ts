/**
 * VALIDATION — the structured data a hub page actually renders.
 *
 * A hub is a collection of practice papers about one exam. The markup has to
 * say three things and get each right: what the page is about (the exam, as an
 * entity a search engine can resolve), what it lists (the papers, in the order
 * shown), and whose site it is on. Each is wired from a different module, which
 * is why this reads the rendered page rather than the helpers.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactNode } from 'react';
import type { PublicExam } from '@/lib/db/exams';

vi.mock('@/lib/db/exams', () => ({
  getActiveExamsForPrerender: vi.fn(async () => []),
  getExamById: vi.fn(async () => null),
}));
// Rendering is not under test here, and both pull in client components.
vi.mock('../ExamsCatalog', () => ({ default: () => null }));
vi.mock('./TypeContent', () => ({ default: () => null }));

const { default: ExamTypePage } = await import('./page');
const { getActiveExamsForPrerender } = await import('@/lib/db/exams');
const { BASE_URL, WEBSITE_ID } = await import('@/lib/shared/seo');

type Schema = Record<string, unknown> & { '@type': string };

/** Every JSON-LD block in a rendered tree, parsed. */
function jsonLdIn(node: ReactNode): Schema[] {
  if (Array.isArray(node)) return node.flatMap(jsonLdIn);
  if (!isValidElement<{ type?: string; children?: ReactNode; dangerouslySetInnerHTML?: { __html: string } }>(node)) {
    return [];
  }
  if (node.type === 'script' && node.props.type === 'application/ld+json') {
    return [JSON.parse(node.props.dangerouslySetInnerHTML!.__html)];
  }
  return jsonLdIn(node.props.children);
}

async function schemasFor(type: string): Promise<Schema[]> {
  return jsonLdIn(await ExamTypePage({ params: Promise.resolve({ type }) }));
}

function paper(id: string, type: string, title = id): PublicExam {
  return { id, type, title } as PublicExam;
}

beforeEach(() => {
  vi.mocked(getActiveExamsForPrerender).mockResolvedValue([
    paper('ielts-2', 'ielts', 'IELTS Academic 2'),
    paper('sat-1', 'sat', 'SAT 1'),
    paper('ielts-1', 'ielts', 'IELTS Academic 1'),
  ]);
});

describe('hub structured data', () => {
  it('describes the hub as a collection page on this site', async () => {
    const page = (await schemasFor('ielts')).find((s) => s['@type'] === 'CollectionPage');
    expect(page).toMatchObject({
      url: `${BASE_URL}/exams/ielts`,
      isPartOf: { '@id': WEBSITE_ID },
    });
  });

  /** It used to claim to be a Course; the courses are the papers, on their own pages. */
  it('does not describe the hub as a course or a programme', async () => {
    const types = (await schemasFor('ielts')).map((s) => s['@type']);
    expect(types).not.toContain('Course');
    expect(types).not.toContain('EducationalOccupationalProgram');
  });

  it('is about the exam as a resolvable entity', async () => {
    const page = (await schemasFor('ielts')).find((s) => s['@type'] === 'CollectionPage');
    expect(page?.about).toMatchObject({
      name: 'IELTS',
      sameAs: expect.arrayContaining([
        'https://en.wikipedia.org/wiki/International_English_Language_Testing_System',
      ]),
    });
  });

  it("lists this programme's papers, and only them, in register order", async () => {
    const page = (await schemasFor('ielts')).find((s) => s['@type'] === 'CollectionPage');
    const list = page?.mainEntity as { itemListElement: Array<{ position: number; url: string }> };
    expect(list.itemListElement).toEqual([
      expect.objectContaining({ position: 1, url: `${BASE_URL}/exams/ielts/ielts-2` }),
      expect.objectContaining({ position: 2, url: `${BASE_URL}/exams/ielts/ielts-1` }),
    ]);
  });

  it('omits the list for a programme with nothing on sale', async () => {
    const page = (await schemasFor('toefl')).find((s) => s['@type'] === 'CollectionPage');
    expect(page).toBeDefined();
    expect(Object.hasOwn(page!, 'mainEntity')).toBe(false);
  });

  it('keeps the breadcrumb and the FAQ beside it', async () => {
    const types = (await schemasFor('ielts')).map((s) => s['@type']);
    expect(types).toEqual(expect.arrayContaining(['BreadcrumbList', 'FAQPage']));
  });
});
