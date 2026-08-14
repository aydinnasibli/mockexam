import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { PostHogProvider, PostHogPageView } from '@posthog/next';
import { Toaster } from 'sonner';
import MotionProvider from "@/components/ui/MotionProvider";
import RouteTransition from "@/components/ui/RouteTransition";
import NavProgress from "@/components/ui/NavProgress";
import PostHogIdentify from "@/components/PostHogIdentify";
import CookieNotice from "@/components/ui/CookieNotice";
import { BASE_URL, jsonLd } from "@/lib/seo";
import "./globals.css";

/*
 * All three families are variable fonts, so no `weight` is declared: passing a
 * weight list makes next/font fetch one static instance per weight (12 files
 * here) instead of a single variable file covering the whole range.
 *
 * `latin-ext` is not optional for this site. Azerbaijani needs ə (U+0259),
 * ğ (U+011F), ş (U+015F) and Ə (U+018F), all of which live in latin-ext, not
 * latin. With `latin` alone next/font preloads only the ASCII subset and the
 * browser discovers the file carrying most of our glyphs after first paint —
 * a guaranteed swap and layout shift on essentially every line of body text.
 *
 * The subset lists are repeated per call rather than shared from a constant:
 * next/font resolves these options at build time and rejects a spread.
 */
/*
 * One family for both headings and body. The site previously paired a display
 * serif (Newsreader) with a body sans (Geist), then collapsed both roles onto
 * Roboto. Roboto is Android's system UI font: on a page carrying no imagery,
 * where an 88px headline is the entire visual argument, it reads as the absence
 * of a choice rather than a choice.
 *
 * Archivo is drawn by Omnibus-Type for print and high-performance display work,
 * so it holds its shape at Light 88px where Roboto goes slack, and still sets
 * as a text face at 16px. That matches the brief this page is making: an
 * official examination document, reproduced exactly.
 *
 * Azerbaijani coverage was verified against the rendered font rather than
 * assumed from Google's subset metadata — Archivo carries Ə (U+018F) and
 * ə (U+0259), which the schwa-less candidates (Sora has neither, Manrope has no
 * uppercase Ə) silently substitute from a fallback face mid-word. ə appears 110
 * times in the homepage alone, including in the first word of the headline.
 *
 * Archivo also exposes a `wdth` axis; it is deliberately NOT requested. Only
 * `wght` is fetched by default, and nothing in this design varies width.
 */
const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  variable: "--font-archivo",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s — Testcentre',
    default: 'Testcentre — Azərbaycanın akademik imtahan hazırlığı platforması',
  },
  description: 'SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.',
  // NOTE: deliberately no `alternates.canonical` here. Metadata is inherited by
  // every segment that doesn't override it, so a canonical on the root layout
  // silently points new pages at the homepage and folds them out of the index.
  // Each public page sets its own via pageMetadata().
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

/*
 * `logo` points at the square app icon, not the 1200×630 opengraph banner —
 * Google reads this field as the organisation's actual mark.
 *
 * There is deliberately no `telephone`: the previous value (+994-12-555-14-88)
 * was a placeholder that appears nowhere else on the site, and a phone number
 * in structured data that contradicts the contact page is worse than none.
 * Add it back here and on /contact together, or not at all. Same for `sameAs` —
 * an empty array carries no meaning, so it is omitted until there are real
 * profiles to list.
 */
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: 'Testcentre',
  url: BASE_URL,
  logo: `${BASE_URL}/icon`,
  image: `${BASE_URL}/opengraph-image`,
  description:
    'SAT, IELTS, TOEFL və DİM imtahanlarına hazırlıq üçün rəsmi formata uyğun sınaq imtahanları.',
  areaServed: 'AZ',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Bakı',
    addressCountry: 'AZ',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'testcentreaz@proton.me',
    availableLanguage: ['az'],
  },
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
      {/* Next 16 only overrides scroll-behavior on navigation when this attribute is set. */}
      <html lang="az" data-scroll-behavior="smooth" className={`${archivo.variable} ${mono.variable}`}>
        <head>
          {/*
            Kept in <head> rather than as a child of <body>: Clerk and PostHog
            both inject a <script> at the top of the body, and React matches
            this element against theirs during hydration, which throws a
            hydration mismatch. `<` is escaped so a future data-driven field
            cannot break out of the script tag.
          */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema) }}
          />
        </head>
        <body className="antialiased">
          {/*
            posthog-js is initialised in instrumentation-client.ts; this provider
            only supplies the React context for usePostHog(). PostHogPageView
            captures App Router navigations, which posthog-js cannot see itself.
            PostHogIdentify binds the browser identity to the Clerk user so that
            client events and server events resolve to one person.
          */}
          <PostHogProvider>
            <PostHogPageView />
            <PostHogIdentify />
            <MotionProvider>
              <NavProgress />
              {/* Route crossfade. `children` is passed through as a prop, so the
                  page tree below stays server-rendered. */}
              <RouteTransition>{children}</RouteTransition>
              <CookieNotice />
            </MotionProvider>
          </PostHogProvider>
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
