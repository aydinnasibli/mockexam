import { getActiveExams } from '@/lib/db/exams';
import HomeContent from './HomeContent';

export default async function Page() {
const exams = await getActiveExams();

  const countsByType: Record<string, number> = {};
  for (const exam of exams) {
    countsByType[exam.type] = (countsByType[exam.type] ?? 0) + 1;
  }

  return <HomeContent countsByType={countsByType} />;
}
