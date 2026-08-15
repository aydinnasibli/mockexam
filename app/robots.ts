import type { MetadataRoute } from 'next';
import { BASE_URL } from '@/lib/shared/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/admin',
        '/checkout/',
        '/exam-session/',
        '/api/',
        '/testpayment',
        // Same-origin rewrite to PostHog ingest — nothing crawlable behind it.
        '/relay/',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
