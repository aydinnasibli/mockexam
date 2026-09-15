import type { MetadataRoute } from 'next';
import { getActiveExamsForPrerender, type PublicExam } from '@/lib/db/exams';
import { absoluteUrl } from '@/lib/shared/seo';
import { CONTENT_TYPES, examPath, typePath } from '@/lib/domain/exam-content';

/**
 * sitemap.ts is a Route Handler, and Next caches it indefinitely unless it uses
 * a request-time API or sets a dynamic config option. It reads exams straight
 * from the database rather than through `fetch`, so nothing here invalidates it
 * on its own: without this line the sitemap is a build artefact and a newly
 * published exam never reaches Google until someone happens to redeploy.
 */
export const revalidate = 3600;

/**
 * The newest `updatedAt` among these papers, or undefined when there are none.
 *
 * The date a LISTING last changed is the date the newest thing on it changed:
 * every mutation that alters what a register shows — a reprice, a retitle, a
 * resynced question count — bumps the paper's `updatedAt` (see
 * `syncExamTotals` and the admin actions). So this is a date the sitemap can
 * stand behind, rather than one it made up.
 */
function newest(exams: readonly PublicExam[]): Date | undefined {
  let latest: Date | undefined;
  for (const exam of exams) {
    if (!latest || exam.updatedAt > latest) latest = exam.updatedAt;
  }
  return latest;
}

/**
 * One entry, with `lastModified` only when there is a true date to give.
 *
 * ── Why `lastmod` is so often ABSENT here ──
 *
 * Every entry used to carry `lastModified: new Date()`, regenerated hourly — so
 * every hour the sitemap told Google that the privacy policy, the about page and
 * the home page had all just changed. Google's documentation is explicit that it
 * uses `lastmod` only when it is "consistently and verifiably accurate", and a
 * crawler that finds the date moving on pages that did not is entitled to stop
 * trusting it for the whole file — including the per-paper dates, which were
 * true and are the ones worth trusting.
 *
 * So a date appears only where one is known: a paper's `updatedAt`, and for a
 * listing the newest paper on it. The static pages change only when code does,
 * and neither the build time nor "now" is the date their content changed; they
 * go out with no date, which crawlers read as "no claim".
 *
 * ── Why there is no `changeFrequency` or `priority` ──
 *
 * Google ignores both, and says so. They were the values most likely to be
 * wrong — `daily` on a register that changes when an admin publishes — for no
 * benefit to anyone reading the file.
 */
function entry(path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  return lastModified ? { url: absoluteUrl(path), lastModified } : { url: absoluteUrl(path) };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /*
   * Static pages must still ship if the database is unreachable during a build
   * — but not at the cost of caching an exam-less sitemap.
   *
   * `revalidate` above means this file is regenerated in the background, and an
   * unconditional `.catch(() => [])` would let one failed regeneration replace
   * a complete sitemap with a three-entry one for the next hour: every paper
   * and every type page dropped from what Google is told exists. Failing the
   * regeneration instead leaves the previous sitemap served and retries.
   */
  const exams = await getActiveExamsForPrerender();
  const catalogUpdated = newest(exams);

  /*
   * The type hubs — `/exams/ielts`, `/exams/driving` and friends.
   *
   * These replace the `?type=` entries this file used to emit. Those were never
   * real pages: the catalog filtered in `useState`, so every one of them served
   * byte-identical HTML and differed only in <title>. Submitting six URLs with
   * one body is how you get "Duplicate without user-selected canonical" rather
   * than six rankings.
   *
   * Listed whether or not a type currently has papers on sale. A hub carries
   * the format and scoring explanation for its exam, which is the part worth
   * indexing and is true before the first paper is published. A hub with no
   * papers has no date to give.
   */
  const hubUrls = CONTENT_TYPES.map((type) =>
    entry(typePath(type), newest(exams.filter((exam) => exam.type === type))),
  );

  const examUrls = exams.map((exam) => entry(examPath(exam), exam.updatedAt));

  return [
    // The home page renders the per-programme counts and prices, so it moves
    // with the catalog.
    entry('/', catalogUpdated),
    entry('/exams', catalogUpdated),
    ...hubUrls,
    ...examUrls,
    entry('/about'),
    entry('/contact'),
    entry('/legal/terms'),
    entry('/legal/privacy'),
    entry('/legal/cookies'),
    entry('/legal/refund'),
  ];
}
