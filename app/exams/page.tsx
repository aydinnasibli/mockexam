import { getActiveExams } from '@/lib/db/exams';
import ExamsCatalog from './ExamsCatalog';

export const metadata = {
  title: 'İmtahanlar — Məşqçi',
  description: 'SAT, IELTS və TOEFL imtahanlarına professional hazırlıq üçün test paketləri',
};

interface Props {
  searchParams: Promise<{ type?: string }>;
}

export default async function ExamsPage({ searchParams }: Props) {
  const [exams, { type }] = await Promise.all([getActiveExams(), searchParams]);
  return <ExamsCatalog exams={exams} initialType={type} />;
}
