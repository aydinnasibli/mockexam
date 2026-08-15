import type { Metadata } from 'next';
import { getActiveExams } from '@/lib/db/exams';
import { pageMetadata } from '@/lib/shared/seo';
import HomeContent, { type ProgramData } from './HomeContent';

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

  /*
   * Everything the page says about a program — the index strip's status, the
   * hero's open-exam figure and the CTA price rail — comes from this one
   * grouping, so the page can never advertise a count and a price that
   * disagree, or link to a program with nothing behind it.
   */
  const byType: Record<string, ProgramData> = {};
  for (const exam of exams) {
    const entry = byType[exam.type] ?? { count: 0, minPrice: exam.price, titles: [], firstId: exam.id };
    entry.count += 1;
    entry.minPrice = Math.min(entry.minPrice, exam.price);
    entry.titles.push(exam.title);
    byType[exam.type] = entry;
  }

  return <HomeContent byType={byType} totalExams={exams.length} />;
}
