import type { MetadataRoute } from 'next';
import { getActiveExams } from '@/lib/db/exams';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.testcentre.az';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const exams = await getActiveExams();

  const examUrls: MetadataRoute.Sitemap = exams.map((exam) => ({
    url: `${BASE_URL}/exams/${exam.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
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
    ...examUrls,
  ];
}
