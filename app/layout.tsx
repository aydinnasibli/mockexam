import type { Metadata, Viewport } from "next";
import { Newsreader, Geist, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { PostHogProvider, PostHogPageView } from '@posthog/next';
import { Toaster } from 'sonner';
import MotionProvider from "@/components/ui/MotionProvider";
import CookieNotice from "@/components/ui/CookieNotice";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  weight: ["300", "400", "500", "600"],
  style: ["normal"],
  display: "swap",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.testcentre.az';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s — Testcentre',
    default: 'Testcentre — Azərbaycanın akademik imtahan hazırlığı platforması',
  },
  description: 'SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'az_AZ',
    url: BASE_URL,
    siteName: 'Testcentre',
    title: 'Testcentre — Azərbaycanın akademik imtahan hazırlığı platforması',
    description: 'SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Testcentre — Azərbaycanın akademik imtahan hazırlığı platforması',
    description: 'SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Testcentre',
  url: BASE_URL,
  logo: `${BASE_URL}/opengraph-image`,
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+994-12-555-14-88',
    contactType: 'customer service',
    email: 'testcentreaz@proton.me',
    availableLanguage: 'Azerbaijani',
  },
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Clerk's usage telemetry posts to clerk-telemetry.com, which is not in our
  // connect-src CSP — it was being blocked and logging a console error on every
  // page load. Turned off at the source rather than widening the CSP: this app
  // handles student exam data, so there is no reason to add a third-party
  // egress destination for analytics we don't use.
  return (
    <ClerkProvider telemetry={false}>
      <html lang="az" className={`${newsreader.variable} ${geist.variable} ${mono.variable}`}>
        <head>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
        </head>
        <body className="antialiased">
          {/*
            posthog-js is initialised in instrumentation-client.ts; this provider
            only supplies the React context for usePostHog(). PostHogPageView
            captures App Router navigations, which posthog-js cannot see itself.
          */}
          <PostHogProvider>
            <PostHogPageView />
            <MotionProvider>
              {children}
              <CookieNotice />
            </MotionProvider>
          </PostHogProvider>
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
