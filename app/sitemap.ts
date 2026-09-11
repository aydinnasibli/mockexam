import type { MetadataRoute } from 'next';
import { getActiveExamsForPrerender } from '@/lib/db/exams';
import { BASE_URL } from '@/lib/shared/seo';
import { CONTENT_TYPES, examPath, typePath } from '@/lib/domain/exam-content';

/**
 * sitemap.ts is a Route Handler, and Next caches it indefinitely unless it uses
 * a request-time API or sets a dynamic config option. It reads exams straight
 * from the database rather than through `fetch`, so nothing here invalidates it
 * on its own: without this line the sitemap is a build artefact and a newly
 * published exam never reaches Google until someone happens to redeploy.
 */
export const revalidate = 3600;

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

  const examUrls: MetadataRoute.Sitemap = exams.map((exam) => ({
    url: `${BASE_URL}${examPath(exam)}`,
    lastModified: exam.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

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
   * indexing and is true before the first paper is published.
   */
  const hubUrls: MetadataRoute.Sitemap = CONTENT_TYPES.map((type) => ({
    url: `${BASE_URL}${typePath(type)}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${BASE_URL}/exams`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...hubUrls,
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    ...examUrls,
    {
      url: `${BASE_URL}/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal/refund`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];
}
