import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.testcentre.az';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/admin', '/checkout/', '/exam-session/', '/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
