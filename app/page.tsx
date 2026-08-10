import type { Metadata } from 'next';
import { getActiveExams } from '@/lib/db/exams';
import { pageMetadata } from '@/lib/seo';
import HomeContent from './HomeContent';

// The per-type exam counts are read at build time. Without this the page is
// prerendered once and the numbers stay frozen until the next deploy.
export const revalidate = 3600;

const HOME_TITLE = 'Testcentre — Azərbaycanın akademik imtahan hazırlığı platforması';

export const metadata: Metadata = {
  ...pageMetadata({
    title: HOME_TITLE,
    description:
      'SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.',
    path: '/',
    socialTitle: HOME_TITLE,
  }),
  // `absolute` opts out of the root layout's "%s — Testcentre" template, which
  // would otherwise append the brand name to a title that already ends in it.
  title: { absolute: HOME_TITLE },
};

export default async function Page() {
  const exams = await getActiveExams();

  const countsByType: Record<string, number> = {};
  for (const exam of exams) {
    countsByType[exam.type] = (countsByType[exam.type] ?? 0) + 1;
  }

  return <HomeContent countsByType={countsByType} />;
}
