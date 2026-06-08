import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Əlaqə',
  description: 'Məşqçi ilə əlaqə saxlayın. Nizami küçəsi 65, Bakı. testcentreaz@proton.me. Suallarınıza 24 saat ərzində cavab veririk.',
  openGraph: {
    title: 'Əlaqə — Məşqçi',
    description: 'Məşqçi ilə əlaqə saxlayın. Nizami küçəsi 65, Bakı. testcentreaz@proton.me.',
    url: '/contact',
  },
  twitter: {
    title: 'Əlaqə — Məşqçi',
    description: 'Məşqçi ilə əlaqə saxlayın. Nizami küçəsi 65, Bakı. testcentreaz@proton.me.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
