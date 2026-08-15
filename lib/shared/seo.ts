import type { Metadata } from 'next';

export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.testcentre.az';

export const SITE_NAME = 'Testcentre';

const DEFAULT_OG_ALT = 'Testcentre — Azərbaycanın akademik imtahan hazırlığı platforması';

interface PageMetadataInput {
  /** Bare page title. The root layout's template appends " — Testcentre". */
  title: string;
  description: string;
  /** Root-relative path, e.g. '/exams'. Used for both canonical and og:url. */
  path: string;
  /** og:title / twitter:title. Defaults to `${title} — ${SITE_NAME}`. */
  socialTitle?: string;
  /**
   * Route of an `opengraph-image` colocated with the page, e.g.
   * '/exams/sat-mock-1/opengraph-image'. Defaults to the site-wide image.
   */
  ogImagePath?: string;
  /** Alt text for a page-specific og image. */
  ogImageAlt?: string;
}

/**
 * Builds a complete Metadata object for a public page.
 *
 * Use this rather than hand-writing `openGraph` / `twitter` on a page. Next.js
 * merges metadata between segments by REPLACEMENT, not deep merge: the moment a
 * page declares its own `openGraph`, it discards everything the root layout
 * contributed to that object — including the `og:image` that the file-based
 * `app/opengraph-image.tsx` convention injects there. Pages that did this were
 * silently shipping with no social image at all and a downgraded
 * `twitter:card`, so every field is restated here on every page.
 */
export function pageMetadata({
  title,
  description,
  path,
  socialTitle,
  ogImagePath,
  ogImageAlt,
}: PageMetadataInput): Metadata {
  const social = socialTitle ?? `${title} — ${SITE_NAME}`;
  const image = {
    url: ogImagePath ?? '/opengraph-image',
    width: 1200,
    height: 630,
    type: 'image/png',
    alt: ogImageAlt ?? DEFAULT_OG_ALT,
  };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'az_AZ',
      siteName: SITE_NAME,
      url: path,
      title: social,
      description,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: social,
      description,
      images: [image],
    },
  };
}

/**
 * Clamps text to a length search engines will actually render, breaking on a
 * word boundary. Google truncates descriptions around 155–160 characters.
 */
export function clampDescription(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Serialises JSON-LD for dangerouslySetInnerHTML, escaping `<` so DB text cannot close the script tag. */
export function jsonLd(schema: unknown): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
