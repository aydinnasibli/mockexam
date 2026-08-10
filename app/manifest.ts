import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Testcentre — Akademik imtahan hazırlığı',
    short_name: 'Testcentre',
    description:
      'SAT, IELTS, TOEFL və DİM imtahanlarına rəsmi formata uyğun sınaq imtahanları.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'az',
    dir: 'ltr',
    background_color: '#fafaf6',
    theme_color: '#1a1a1a',
    categories: ['education'],
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
