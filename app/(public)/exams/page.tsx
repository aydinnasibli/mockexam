import type { Metadata } from 'next';
import { getActiveExamsForPrerender } from '@/lib/db/exams';
import { EXAM_TRAIL_ROOT, breadcrumbSchema, jsonLd, pageMetadata } from '@/lib/shared/seo';
import Breadcrumb from '@/components/ui/Breadcrumb';
import ExamsCatalog from './ExamsCatalog';

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

export const metadata: Metadata = pageMetadata({
  title: 'İmtahanlar',
  description:
    'SAT, IELTS, TOEFL, buraxılış və magistratura imtahanlarına professional hazırlıq üçün test paketləri. Ekspertlər tərəfindən hazırlanmış sınaqları kəşf edin.',
  path: '/exams',
});

/** Ana səhifə → İmtahanlar. The register is the trail's last step. */
const TRAIL = EXAM_TRAIL_ROOT;

export default async function ExamsPage() {
  const exams = await getActiveExamsForPrerender();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(TRAIL)) }}
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
