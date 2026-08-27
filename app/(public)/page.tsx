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
  /*
   * Degrade to an empty catalog rather than failing the build.
   *
   * This was the last build-time database read without a fallback — `sitemap.ts`
   * and both `generateStaticParams` already have one — so a build against an
   * unreachable database died here. That is not only CI: a Neon cold start
   * during a deploy would take the whole deploy with it.
   *
   * Reported rather than swallowed, because the degraded page is a real one: it
   * renders with no programs, and `revalidate` above means it stays that way
   * for up to an hour before ISR regenerates it.
   */
  const exams = await getActiveExams().catch((err: unknown) => {
    /*
     * `console.error`, NOT `captureException`.
     *
     * `captureException` resolves a distinct id through `auth()`, which reads
     * cookies — and a cookie read inside a statically prerendered page opts the
     * page out of static rendering entirely. Reporting the failure that way
     * turned this route from ISR into a dynamic one whenever the build happened
     * to hit this branch, which is a worse outcome than the failure it reports.
     *
     * Vercel surfaces build and ISR-regeneration logs, so this is still visible.
     */
    console.error('[home] could not load exams; rendering an empty catalog:', err);
    return [];
  });

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
