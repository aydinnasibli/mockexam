import type { MetadataRoute } from 'next';
import { getActiveExams } from '@/lib/db/exams';
import { BASE_URL } from '@/lib/seo';

/**
 * sitemap.ts is a Route Handler, and Next caches it indefinitely unless it uses
 * a request-time API or sets a dynamic config option. It reads exams straight
 * from Mongo rather than through `fetch`, so nothing here invalidates it on its
 * own: without this line the sitemap is a build artefact and a newly published
 * exam never reaches Google until someone happens to redeploy.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const exams = await getActiveExams();

  const examUrls: MetadataRoute.Sitemap = exams.map((exam) => ({
    url: `${BASE_URL}/exams/${exam.id}`,
    lastModified: exam.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // One entry per exam type that actually has active exams. These are the
  // pages targeting "SAT sınaq", "IELTS hazırlıq" and friends.
  const typeUrls: MetadataRoute.Sitemap = Array.from(
    new Set(exams.map((exam) => exam.type)),
  ).map((type) => ({
    url: `${BASE_URL}/exams?type=${type}`,
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
    ...typeUrls,
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
