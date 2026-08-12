import type { Metadata, Viewport } from "next";
import { Roboto, JetBrains_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs'
import { PostHogProvider, PostHogPageView } from '@posthog/next';
import { Toaster } from 'sonner';
import MotionProvider from "@/components/ui/MotionProvider";
import RouteTransition from "@/components/ui/RouteTransition";
import NavProgress from "@/components/ui/NavProgress";
import PostHogIdentify from "@/components/PostHogIdentify";
import CookieNotice from "@/components/ui/CookieNotice";
import { BASE_URL } from "@/lib/seo";
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
 * serif (Newsreader) with a separate body sans (Geist); Roboto now serves both
 * roles, so `--font-display` and `--font-sans` resolve to the same face.
 * The two tokens are kept distinct anyway — every call site already targets one
 * or the other, so reintroducing a display face later is a one-line change here
 * rather than an edit across every component.
 */
const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  variable: "--font-roboto",
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
      <html lang="az" className={`${roboto.variable} ${mono.variable}`}>
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
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c'),
            }}
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
