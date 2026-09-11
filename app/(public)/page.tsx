import type { Metadata } from 'next';
import { getActiveExamsForPrerender } from '@/lib/db/exams';
import { examPath } from '@/lib/domain/exam-content';
import { BASE_URL, SITE_NAME, faqSchema, jsonLd, pageMetadata } from '@/lib/shared/seo';
import { HOME_FAQ } from '@/lib/domain/home-faq';
import HomeContent, { type ProgramData } from './HomeContent';

// The per-type exam counts are read at build time. Without this the page is
// prerendered once and the numbers stay frozen until the next deploy.
export const revalidate = 3600;

const HOME_TITLE = 'Testcentre — Azərbaycanın akademik imtahan hazırlığı platforması';

export const metadata: Metadata = {
  ...pageMetadata({
    title: HOME_TITLE,
    description:
      'SAT, IELTS, TOEFL, buraxılış və magistratura imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.',
    path: '/',
    socialTitle: HOME_TITLE,
  }),
  // `absolute` opts out of the root layout's "%s — Testcentre" template, which
  // would otherwise append the brand name to a title that already ends in it.
  title: { absolute: HOME_TITLE },
};

/*
 * `WebSite` is what Google's site-name system reads, and only from the home
 * page — without it the result header falls back to a guess, typically the
 * bare domain. `url` must be the canonical home page, so it is built on the
 * same origin as the canonical tag rather than restated.
 */
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: BASE_URL,
  inLanguage: 'az',
};

export default async function Page() {
  /*
   * Degrade to an empty catalog at BUILD time, and only at build time.
   *
   * A build against an unreachable database used to die here, which is not only
   * a CI concern: a Neon cold start during a deploy would take the whole deploy
   * with it. But the unconditional `.catch(() => [])` that fixed that also
   * applied at request time, and this page carries `revalidate = 3600` — so one
   * blip during a background revalidation rendered a homepage with no programs
   * and ISR stored it as a perfectly good page for the next hour.
   *
   * `getActiveExamsForPrerender` draws that line: swallow during `next build`,
   * throw at request time, where a failed revalidation leaves the last good
   * copy in place and retries. See its docblock.
   */
  const exams = await getActiveExamsForPrerender();

  /*
   * Everything the page says about a program — the index strip's status, the
   * hero's open-exam figure and the CTA price rail — comes from this one
   * grouping, so the page can never advertise a count and a price that
   * disagree, or link to a program with nothing behind it.
   */
  const byType: Record<string, ProgramData> = {};
  for (const exam of exams) {
    const entry = byType[exam.type] ?? { count: 0, minPrice: exam.price, titles: [], firstPath: examPath(exam) };
    entry.count += 1;
    entry.minPrice = Math.min(entry.minPrice, exam.price);
    entry.titles.push(exam.title);
    byType[exam.type] = entry;
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(websiteSchema) }}
      />
      {/* The §05 block on this page renders exactly these questions. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema(HOME_FAQ)) }}
      />
      <HomeContent byType={byType} totalExams={exams.length} />
    </>
  );
}
