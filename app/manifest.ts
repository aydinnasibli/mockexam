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
    // `sizes` must state the icon's real pixel dimensions. `any` is reserved for
    // scalable formats (SVG); declaring it on the 32×32 .ico made Chrome reject
    // the entry — "Resource size is not correct" logged on every page load.
    // `purpose: 'maskable'` is deliberately absent: these marks have no safe-zone
    // padding, so Android would crop the glyph when masking them to a circle.
    icons: [
      { src: '/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
