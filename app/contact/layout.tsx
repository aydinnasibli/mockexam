import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Əlaqə',
  description: 'Testcentre ilə əlaqə saxlayın. testcentreaz@proton.me. Suallarınıza 24 saat ərzində cavab veririk.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Əlaqə — Testcentre',
    description: 'Testcentre ilə əlaqə saxlayın. testcentreaz@proton.me.',
    url: '/contact',
  },
  twitter: {
    title: 'Əlaqə — Testcentre',
    description: 'Testcentre ilə əlaqə saxlayın. testcentreaz@proton.me.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
