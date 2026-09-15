/**
 * VALIDATION — the structured data a paper page actually renders.
 *
 * A paper is marked up twice, as the thing sold (Product) and as what it is
 * (Course). What this pins is that both hang off the site's ONE organisation
 * node, and that the Course is about the same exam entity as the paper's hub.
 * Before the shared `@id`, each page minted its own anonymous organisation for
 * `seller` and `provider`, and nothing about that looked broken.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isValidElement, type ReactNode } from 'react';
import type { PublicExam } from '@/lib/db/exams';

vi.mock('@/lib/db/exams', () => ({
  getActiveExamsForPrerender: vi.fn(async () => []),
  getExamById: vi.fn(async () => null),
}));
vi.mock('@/lib/db/questions', () => ({ getSampleQuestion: vi.fn(async () => null) }));
vi.mock('@/lib/db/free-claim', () => ({ firstExamFreeEnabled: () => false }));
vi.mock('./PurchaseCard', () => ({ default: () => null }));

const { default: ExamPaper } = await import('./page');
const { getExamById } = await import('@/lib/db/exams');
const { BASE_URL, ORGANIZATION_ID } = await import('@/lib/shared/seo');

type Schema = Record<string, unknown> & { '@type': string };

type Node = { type?: unknown; props: { type?: string; children?: ReactNode; dangerouslySetInnerHTML?: { __html: string } } };

/**
 * Every JSON-LD block in a rendered tree, parsed. The page hands back an
 * element for the async `ExamDetails` component, so function components are
 * called on the way down — the same thing the server renderer would do.
 */
async function jsonLdIn(node: ReactNode): Promise<Schema[]> {
  if (Array.isArray(node)) return (await Promise.all(node.map(jsonLdIn))).flat();
  if (!isValidElement(node)) return [];
  const el = node as unknown as Node;
  if (el.type === 'script' && el.props.type === 'application/ld+json') {
    return [JSON.parse(el.props.dangerouslySetInnerHTML!.__html)];
  }
  if (typeof el.type === 'function' && el.type.name === 'ExamDetails') {
    return jsonLdIn(await (el.type as (p: unknown) => Promise<ReactNode>)(el.props));
  }
  return jsonLdIn(el.props.children);
}

function exam(overrides: Partial<PublicExam> = {}): PublicExam {
  return {
    id: 'ielts-academic-1',
    title: 'IELTS Academic — Practice Test 1',
    type: 'ielts',
    variant: 'academic',
    description: '',
    tag: 'IELTS',
    price: 15,
    durationMinutes: 150,
    totalQuestions: 82,
    features: [],
    isActive: true,
    updatedAt: new Date('2026-08-01T00:00:00Z'),
    modules: [],
    ...overrides,
  };
}

async function schemasFor(paper: PublicExam): Promise<Schema[]> {
  vi.mocked(getExamById).mockResolvedValue(paper);
  const tree = await ExamPaper({ params: Promise.resolve({ type: 'ielts', id: paper.id }) });
  return jsonLdIn(tree);
}

const byType = (schemas: Schema[], type: string) => schemas.find((s) => s['@type'] === type)!;

beforeEach(() => vi.clearAllMocks());

describe('paper structured data', () => {
  it('sells the paper as the site organisation, by id', async () => {
    const product = byType(await schemasFor(exam()), 'Product');
    expect(product.offers).toMatchObject({ seller: { '@id': ORGANIZATION_ID } });
    expect(product['@id']).toBe(`${BASE_URL}/exams/ielts/ielts-academic-1#product`);
  });

  it('names the same organisation as the course provider', async () => {
    const course = byType(await schemasFor(exam()), 'Course');
    expect(course.provider).toMatchObject({ '@id': ORGANIZATION_ID, name: 'Testcentre' });
  });

  it('makes the course about the exam entity its hub is about', async () => {
    const course = byType(await schemasFor(exam()), 'Course');
    expect(course.about).toMatchObject({
      name: 'IELTS',
      sameAs: expect.arrayContaining(['https://www.wikidata.org/wiki/Q490396']),
    });
  });

  it.each([
    [15, 'Paid', false],
    [0, 'Free', true],
  ])('categorises a %d AZN offer as %s', async (price, category, free) => {
    const course = byType(await schemasFor(exam({ price })), 'Course');
    expect(course.offers).toMatchObject({ category, price, priceCurrency: 'AZN' });
    expect(course.isAccessibleForFree).toBe(free);
  });

  it('keeps the four-level breadcrumb', async () => {
    const trail = byType(await schemasFor(exam()), 'BreadcrumbList');
    expect((trail.itemListElement as unknown[]).length).toBe(4);
  });
});
