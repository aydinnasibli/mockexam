import type { Metadata } from 'next';
import { getActiveExams } from '@/lib/db/exams';
import { examTypeLabel, isExamType } from '@/lib/domain/exam-types';
import { BASE_URL, jsonLd, pageMetadata } from '@/lib/shared/seo';
import ExamsCatalog from './ExamsCatalog';

interface Props {
  searchParams: Promise<{ type?: string }>;
}

/**
 * `?type=` is treated as a real landing page rather than a duplicate of
 * /exams. These are the queries with commercial intent ("SAT sınaq",
 * "IELTS hazırlıq"), and previously every filtered view canonicalised back to
 * the bare catalog, so none of them could rank. Unknown values still
 * canonicalise to /exams so junk params cannot mint indexable URLs.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { type } = await searchParams;

  // A filter only earns its own canonical if it has exams behind it. An empty
  // filtered view is the same "no results" page for every unused type, so
  // those all canonicalise back to /exams instead of becoming thin duplicates.
  const hasExams =
    isExamType(type) && (await getActiveExams()).some((exam) => exam.type === type);

  if (!isExamType(type) || !hasExams) {
    return pageMetadata({
      title: 'İmtahanlar',
      description:
        'SAT, IELTS, TOEFL və DİM imtahanlarına professional hazırlıq üçün test paketləri. Ekspertlər tərəfindən hazırlanmış sınaqları kəşf edin.',
      path: '/exams',
    });
  }

  const label = examTypeLabel(type);
  return pageMetadata({
    title: `${label} sınaq imtahanları`,
    description: `${label} imtahanına hazırlıq üçün rəsmi formata uyğun sınaq imtahanları. Vaxt limitli modullar, dərhal nəticə və hər sual üçün izahat.`,
    path: `/exams?type=${type}`,
  });
}

async function ExamsList({ type }: { type?: string }) {
  const exams = await getActiveExams();
  return <ExamsCatalog exams={exams} initialType={type} />;
}

function breadcrumbSchema(type?: string) {
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Ana səhifə', item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'İmtahanlar', item: `${BASE_URL}/exams` },
  ];

  if (isExamType(type)) {
    items.push({
      '@type': 'ListItem',
      position: 3,
      name: examTypeLabel(type),
      item: `${BASE_URL}/exams?type=${type}`,
    });
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
}

export default async function ExamsPage({ searchParams }: Props) {
  const { type } = await searchParams;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(type)) }}
      />
      {/*
        No Suspense boundary, and so no loading state.

        The exam query resolves in roughly 300ms, which is too short to justify
        showing anything: a skeleton for that long registers as a flash, and
        deferring the skeleton to avoid the flash just left the body empty for
        the same 300ms. Rendering the page whole means a visitor either sees
        the previous page (client navigation, where the router holds it until
        the payload lands) or nothing yet (a fresh load, where the browser has
        not painted at all) — never a half-built one.

        If this query ever grows slow enough to need feedback, the answer is a
        navigation progress indicator, not a skeleton of a register whose row
        count nobody can predict.
      */}
      <ExamsList type={type} />
    </>
  );
}
