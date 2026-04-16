import { getActiveExams } from '@/lib/db/exams';
import ExamsCatalog from './ExamsCatalog';

export const metadata = {
  title: 'İmtahanlar — Məşqçi',
  description: 'SAT, IELTS və TOEFL imtahanlarına professional hazırlıq üçün test paketləri',
};

export default async function ExamsPage() {
  const exams = await getActiveExams();
  return <ExamsCatalog exams={exams} />;
}
