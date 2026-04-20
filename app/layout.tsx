import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner';
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-headline",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.testcentre.az';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s — Məşqçi',
    default: 'Məşqçi - Azərbaycanın ilk peşəkar sınaq imtahanı platforması',
  },
  description: 'SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.',
  openGraph: {
    type: 'website',
    locale: 'az_AZ',
    url: BASE_URL,
    siteName: 'Məşqçi',
    title: 'Məşqçi - Azərbaycanın ilk peşəkar sınaq imtahanı platforması',
    description: 'SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'Məşqçi - Sınaq imtahanı platforması',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Məşqçi - Azərbaycanın ilk peşəkar sınaq imtahanı platforması',
    description: 'SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.',
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Məşqçi',
  url: BASE_URL,
  logo: `${BASE_URL}/og.png`,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+994-12-XXX-XX-XX',
    contactType: 'customer service',
    email: 'info@testcentre.az',
    availableLanguage: 'Azerbaijani',
  },
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="az">
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
        </head>
        <body
          className={`${inter.variable} ${manrope.variable} antialiased bg-background text-on-surface font-body selection:bg-primary-fixed selection:text-on-primary-fixed`}
        >
          {children}
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
