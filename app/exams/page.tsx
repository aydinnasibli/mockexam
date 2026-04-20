import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getActiveExams } from '@/lib/db/exams';
import ExamsCatalog from './ExamsCatalog';
import ExamsListSkeleton from './ExamsListSkeleton';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.testcentre.az';

export const metadata = {
  title: 'İmtahanlar',
  description: 'SAT, IELTS, TOEFL və DİM imtahanlarına professional hazırlıq üçün test paketləri. Ekspertlər tərəfindən hazırlanmış sınaqları kəşf edin.',
  openGraph: {
    title: 'İmtahanlar — Məşqçi',
    description: 'SAT, IELTS, TOEFL və DİM imtahanlarına professional hazırlıq üçün test paketləri.',
    url: '/exams',
  },
  twitter: {
    title: 'İmtahanlar — Məşqçi',
    description: 'SAT, IELTS, TOEFL və DİM imtahanlarına professional hazırlıq üçün test paketləri.',
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Ana səhifə', item: BASE_URL },
    { '@type': 'ListItem', position: 2, name: 'İmtahanlar', item: `${BASE_URL}/exams` },
  ],
};

interface Props {
  searchParams: Promise<{ type?: string }>;
}

async function ExamsList({ type }: { type?: string }) {
  const exams = await getActiveExams();
  return <ExamsCatalog exams={exams} initialType={type} />;
}

export default async function ExamsPage({ searchParams }: Props) {
  const { type } = await searchParams;
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Navbar />
      <Suspense fallback={<ExamsListSkeleton />}>
        <ExamsList type={type} />
      </Suspense>
      <Footer />
    </>
  );
}
