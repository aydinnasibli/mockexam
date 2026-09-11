import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getActiveExamsForPrerender, getExamById, type PublicExam } from '@/lib/db/exams';
import { EXAM_TYPE_VALUES, examTypeLabel, type ExamType } from '@/lib/domain/exam-types';
import {
  examContent, examPath, typeForSlug, typePath, typeSlug, type ExamTypeContent,
} from '@/lib/domain/exam-content';
import {
  BASE_URL, EXAM_TRAIL_ROOT, SITE_NAME, breadcrumbSchema, faqSchema, jsonLd, pageMetadata,
  type Crumb,
} from '@/lib/shared/seo';
import Breadcrumb from '@/components/ui/Breadcrumb';
import ExamsCatalog from '../ExamsCatalog';
import TypeContent from './TypeContent';

/**
 * One route per exam TYPE, addressed by its SLUG.
 *
 * Params come from `EXAM_TYPES` rather than `EXAM_CONTENT` so that a type which
 * has papers but no editorial copy yet still prerenders. A type with neither is
 * built too, and `resolveType` below turns it into a real 404 — cheaper to
 * prerender the 404 than to special-case the list, and it keeps this function
 * free of database reads.
 *
 * That only holds because an empty type 404s WITHOUT a lookup. It used to fall
 * into the unknown-slug branch and query for a legacy paper id, which meant the
 * prerendered 404 for `gre` needed the database after all — and with the
 * database unreachable, as it is in CI, that query threw and failed the build.
 */
export function generateStaticParams() {
  return EXAM_TYPE_VALUES.map((type) => ({ type: typeSlug(type) }));
}

export const revalidate = 3600;

interface Props {
  params: Promise<{ type: string }>;
}

/**
 * Whether this type has anything worth serving.
 *
 * A type with no papers AND no copy is an empty page: masthead, an empty
 * register, nothing else. Prerendering one for every value in `EXAM_TYPES`
 * produced exactly that for `gre` — indexable, self-canonical, linked from
 * nowhere and listed in no sitemap. That is the "Crawled – currently not
 * indexed" shape this restructure exists to eliminate, so it 404s instead.
 *
 * A type with copy but no papers still serves: `/exams/sat` explaining the SAT
 * and its scoring is a real page, and it is the one that will rank on the day
 * the first SAT paper is published.
 *
 * The three outcomes are kept distinct rather than folded into `null`, because
 * they are handled differently. Only an UNKNOWN slug can be a legacy paper URL
 * worth a database lookup; a known type with nothing to show is simply a 404.
 * Conflating them is what sent `/exams/gre` to the database during the build.
 */
type Resolution =
  | { kind: 'unknown' }
  | { kind: 'empty' }
  | { kind: 'type'; type: ExamType; content: ExamTypeContent | undefined; exams: PublicExam[] };

async function resolveType(slug: string): Promise<Resolution> {
  const type = typeForSlug(slug);
  if (!type) return { kind: 'unknown' };

  const content = examContent(type);
  const exams = await getActiveExamsForPrerender();
  const hasPapers = exams.some((e) => e.type === type);

  if (!content && !hasPapers) return { kind: 'empty' };
  return { kind: 'type', type, content, exams };
}

/**
 * Whether this slug is the type's canonical segment.
 *
 * `typeForSlug` accepts the raw stored value as well as the slug, which is what
 * lets a legacy or hand-typed `/exams/general_english` resolve at all. It must
 * not SERVE there: two working URLs for one register, each declaring itself
 * canonical, is the duplicate this restructure exists to remove. The paper route
 * one level down draws the same line the same way.
 */
function isCanonicalSlug(type: string, slug: string): boolean {
  return typeSlug(type) === slug;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type: slug } = await params;
  const resolved = await resolveType(slug);
  if (resolved.kind !== 'type') return {};

  const { type, content } = resolved;
  // No metadata for a non-canonical segment: it permanently redirects, and
  // describing it would advertise a canonical we are about to move away from.
  if (!isCanonicalSlug(type, slug)) return {};

  const label = examTypeLabel(type);

  const meta = pageMetadata({
    title: content?.metaTitle ?? `${label} sınaq imtahanları`,
    description:
      content?.metaDescription ??
      `${label} imtahanına hazırlıq üçün rəsmi formata uyğun sınaq imtahanları. Vaxt limitli modullar, dərhal nəticə və hər sual üçün izahat.`,
    path: typePath(type),
  });

  if (content) return meta;

  /*
   * A type with papers but no editorial record: `noindex, follow`.
   *
   * `resolveType` 404s a type only when it has NEITHER copy nor papers. Publish
   * the first GRE paper before anyone writes GRE copy and this page starts
   * serving — and everything on it is the `/exams` register with one filter
   * applied. No format section, no scoring, no FAQ, nothing a visitor could not
   * read one level up. Left indexable it is a self-canonical near-duplicate of
   * the catalog, which is the "Crawled – currently not indexed" shape this
   * whole restructure exists to remove; it would be odd to delete six of those
   * and mint a seventh.
   *
   * `follow`, so the papers listed on it still get their crawl path — the page
   * is genuinely useful to a visitor, it just has nothing of its own to rank
   * with. It is also absent from `sitemap.ts`, which emits `CONTENT_TYPES`
   * only, so the two agree about what is being offered for indexing.
   *
   * Writing the `EXAM_CONTENT` record lifts this by itself: no flag to flip,
   * and no way to leave a page noindexed after it has earned its copy.
   */
  return { ...meta, robots: { index: false, follow: true } };
}

export default async function ExamTypePage({ params }: Props) {
  const { type: slug } = await params;
  const resolved = await resolveType(slug);

  /*
   * Not a type. Before 404ing, check whether it is a PAPER id — until this
   * split, papers lived at `/exams/<id>`, one level up from where they live
   * now. Those URLs were published in a sitemap, so they get a permanent
   * redirect to the paper's real home rather than a dead end.
   *
   * This is the route's only second responsibility, and it is a redirect, not a
   * second thing to render: the page below always renders exactly one kind of
   * page.
   *
   * Reached only for slugs outside `generateStaticParams`, so only at request
   * time — where a failed lookup is a 500 rather than a cached wrong answer,
   * which is the behaviour wanted. It never runs during a build.
   */
  if (resolved.kind === 'unknown') {
    const exam = await getExamById(slug);
    if (exam) permanentRedirect(examPath(exam));
    notFound();
  }

  // A real type with neither copy nor papers. No lookup: it cannot be a paper id.
  if (resolved.kind === 'empty') notFound();

  const { type, content, exams } = resolved;

  // `/exams/general_english` → `/exams/english-level`. See `isCanonicalSlug`.
  if (!isCanonicalSlug(type, slug)) permanentRedirect(typePath(type));

  const label = examTypeLabel(type);
  const path = typePath(type);

  /*
   * Ana səhifə → İmtahanlar → this type.
   *
   * One array, rendered twice: as the bar below and as the JSON-LD above it.
   * This page previously emitted the schema and drew no bar — the visible trail
   * was lost when the old combined route was split, and nothing noticed because
   * a `BreadcrumbList` describing a trail the page does not show is not an
   * error, just markup Google is entitled to ignore.
   */
  const trail: Crumb[] = [...EXAM_TRAIL_ROOT, { name: content?.shortLabel ?? label, path }];

  /*
   * `Course` — or `EducationalOccupationalProgram` for the driving licence,
   * which qualifies you to do something rather than teaching you a subject.
   * `Product` describes the thing being sold and is emitted per paper, not here.
   */
  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': content?.schemaType ?? 'Course',
    name: content?.h1 ?? `${label} sınaq imtahanları`,
    description:
      content?.metaDescription ?? `${label} imtahanına hazırlıq üçün sınaq imtahanları.`,
    url: `${BASE_URL}${path}`,
    inLanguage: 'az',
    provider: { '@type': 'EducationalOrganization', name: SITE_NAME, url: BASE_URL },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(trail)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(courseSchema) }} />
      {content && content.faq.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(content.faq)) }}
        />
      )}
      {/*
        The SAME component `/exams` renders, given a different prop — not a
        reimplementation. That is what keeps the two pages identical in design
        with none of it duplicated, and it is why the tab row can be plain
        links: every tab lands here, on a page that looks like the one it left.
      */}
      <Breadcrumb trail={trail} />
      {/*
        `demoteHeadline` tracks `content` exactly, because `TypeContent` is what
        supplies the h1 in its place. A type with papers but no copy yet renders
        no editorial block, so the masthead keeps the heading rather than
        leaving the page without one.
      */}
      <ExamsCatalog exams={exams} activeType={type} demoteHeadline={Boolean(content)} />
      {content && <TypeContent content={content} />}
    </>
  );
}
