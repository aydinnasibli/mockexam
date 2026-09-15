import type { Metadata } from 'next';
import { getActiveExamsForPrerender } from '@/lib/db/exams';
import { examPath } from '@/lib/domain/exam-content';
import {
  EXAM_TRAIL_ROOT, breadcrumbSchema, itemListSchema, jsonLd, pageMetadata, webPageSchema,
} from '@/lib/shared/seo';
import Breadcrumb from '@/components/ui/Breadcrumb';
import ExamsCatalog from './ExamsCatalog';
import { registerOrder } from './structure';

/**
 * The unfiltered register.
 *
 * Every filtered view is a route of its own now — `/exams/ielts` and friends,
 * rendered by `[type]` with this same `ExamsCatalog` component. One component,
 * two routes, differing by a prop: the filtered pages are not a copy of this
 * page, they ARE this page with `activeType` set.
 *
 * The legacy `?type=` URLs redirect to those routes from `next.config.ts`, so
 * nothing here reads `searchParams` — which is what keeps the page static.
 */
export const revalidate = 3600;

/*
 * "İmtahanlar — Testcentre" named the section, not the page: it matched no
 * query and sat beside a home title competing for the same words. The register
 * is a catalogue of practice papers, so that is what it is called, and the
 * description lists what a visitor actually finds on it — the programmes, and
 * for each paper its price, length and structure.
 */
const TITLE = 'Sınaq imtahanları kataloqu';
const DESCRIPTION =
  'Bütün onlayn sınaq imtahanları bir səhifədə: SAT, IELTS, TOEFL, buraxılış və magistratura. Hər sınağın qiyməti, sual sayı, müddəti və modul quruluşu.';

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: '/exams',
});

/** Ana səhifə → İmtahanlar. The register is the trail's last step. */
const TRAIL = EXAM_TRAIL_ROOT;

export default async function ExamsPage() {
  const exams = await getActiveExamsForPrerender();

  /*
   * The page says what it is: a collection, listing these papers in the order
   * the register prints them. Each list item is a URL only — a paper's price
   * and format live in the Product and Course markup on its own page, and
   * repeating them here would be a second copy to fall out of date.
   *
   * The list is omitted, not emitted empty, when nothing is on sale.
   */
  const listed = registerOrder(exams);
  const collectionSchema = webPageSchema({
    type: 'CollectionPage',
    path: '/exams',
    name: TITLE,
    description: DESCRIPTION,
    mainEntity: listed.length > 0
      ? itemListSchema(listed.map((exam) => ({ name: exam.title, path: examPath(exam) })))
      : undefined,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(TRAIL)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(collectionSchema) }}
      />
      <Breadcrumb trail={TRAIL} />
      {/*
        No Suspense boundary, and so no loading state.

        The exam query resolves in roughly 300ms, which is too short to justify
        showing anything: a skeleton for that long registers as a flash, and
        deferring the skeleton to avoid the flash just left the body empty for
        the same 300ms. Rendering the page whole means a visitor either sees the
        previous page (client navigation, where the router holds it until the
        payload lands) or nothing yet — never a half-built one.
      */}
      <ExamsCatalog exams={exams} />
    </>
  );
}
