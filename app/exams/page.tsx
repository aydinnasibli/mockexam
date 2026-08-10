import { Suspense } from 'react';
import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getActiveExams } from '@/lib/db/exams';
import { examTypeLabel, isExamType } from '@/lib/exam-types';
import { BASE_URL, pageMetadata } from '@/lib/seo';
import ExamsCatalog from './ExamsCatalog';
import ExamsListSkeleton from './ExamsListSkeleton';

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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(type)) }}
      />
      <Navbar />
      <Suspense fallback={<ExamsListSkeleton />}>
        <ExamsList type={type} />
      </Suspense>
      <Footer />
    </>
  );
}
