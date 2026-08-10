import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/seo';

export const metadata: Metadata = pageMetadata({
  title: 'Əlaqə',
  description:
    'Testcentre ilə əlaqə saxlayın — testcentreaz@proton.me. Sual, geri bildirim və tərəfdaşlıq müraciətlərinizə 24 saat ərzində insan cavab verir.',
  path: '/contact',
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
