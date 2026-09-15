import type { Metadata } from 'next';

/**
 * The origin every search-engine-facing URL is built on.
 *
 * `testcentre.az` is not a page, it is a 308 to this host, issued by the
 * hosting layer before a request reaches the app. So a canonical, sitemap
 * entry or JSON-LD `url` on the apex points search engines at a redirect —
 * and Google treats a canonical that redirects as a hint it may overrule,
 * which is how the wrong host ends up chosen as canonical.
 */
export const CANONICAL_ORIGIN = 'https://www.testcentre.az';

/**
 * A configured app URL, reduced to a bare origin.
 *
 * Every consumer builds URLs by concatenation — `${BASE_URL}${path}` — so a
 * trailing slash in the environment variable would put `//exams` into every
 * sitemap entry, breadcrumb and IndexNow ping, none of which would fail
 * loudly. `.origin` drops the slash, any path, and lowercases the host.
 *
 * Falls back to the canonical origin rather than throwing: a value that cannot
 * be parsed cannot be a deliberate override.
 */
export function siteOrigin(configured: string | undefined): string {
  if (!configured) return CANONICAL_ORIGIN;
  try {
    const { origin } = new URL(configured);
    // `new URL('localhost:3000')` parses, as an opaque URL whose origin is the
    // string "null".
    return origin === 'null' ? CANONICAL_ORIGIN : origin;
  } catch {
    return CANONICAL_ORIGIN;
  }
}

/**
 * Overridable so a local build points its OG images at itself. A production
 * build refuses to start unless this is `CANONICAL_ORIGIN` — see next.config.ts.
 */
export const BASE_URL = siteOrigin(process.env.NEXT_PUBLIC_APP_URL);

export const SITE_NAME = 'Testcentre';

/**
 * The other name the site goes by, for `alternateName` on WebSite and
 * Organization.
 *
 * Google's site-name system reads these two properties off the home page, and
 * its Organization guidance asks for the SAME pair on both — which is why this
 * is a constant rather than two literals. The domain is what the social cards
 * print and what people type, so it is the name a search engine will otherwise
 * guess at.
 */
export const SITE_ALTERNATE_NAME = 'testcentre.az';

const DEFAULT_OG_ALT = 'Testcentre — Azərbaycanın akademik imtahan hazırlığı platforması';

/**
 * The home page's URL, in the form a URL parser writes it:
 * `https://www.testcentre.az/`.
 *
 * An origin with an empty path and the same origin with `/` are one URL (RFC
 * 3986 §6.2.3), and `new URL()` serialises both with the slash — so that is
 * what every `href="/"` on the site resolves to, and the form the sitemap has to
 * use for a crawler comparing strings to see that the page it lists is the page
 * every navbar, footer and breadcrumb links to. The bare origin this used to
 * return is how a site audit came to report the home page as an orphan that
 * nothing links to.
 *
 * The canonical TAG is the one place this does not reach: Next writes a root
 * canonical as the bare origin whatever it is given
 * (`resolveAbsoluteUrlWithPathname` in `next/dist/lib/metadata/resolvers`).
 * Google treats the two forms as the same URL, so that difference is cosmetic.
 * It is noted here so nobody "fixes" the sitemap back to match the tag.
 */
export const HOME_URL = `${BASE_URL}/`;

/** `/exams` → `https://www.testcentre.az/exams`; `/` → `HOME_URL`. */
export function absoluteUrl(path: string): string {
  return path === '/' ? HOME_URL : `${BASE_URL}${path}`;
}

/*
 * ── The entity graph ──
 *
 * `@id` is how JSON-LD says "the same thing" across script tags and across
 * pages. Before these existed, every Course `provider` and every Offer `seller`
 * was its own anonymous node that merely shared the organisation's name, and a
 * search engine or answer engine had to guess that they and the layout's
 * EducationalOrganization were one entity. With a shared `@id` nothing is
 * guessed: every page's markup resolves back to one organisation and one site.
 *
 * Fragments on the home URL are the convention. They are names, not pages, and
 * never need to resolve to anything.
 */
export const ORGANIZATION_ID = `${HOME_URL}#organization`;
export const WEBSITE_ID = `${HOME_URL}#website`;

/**
 * The organisation, as referenced from another node — `provider`, `seller`,
 * `publisher`, `mainEntity`.
 *
 * Carries `name` and `url` beside the `@id` rather than the bare `{ '@id' }` the
 * graph strictly needs. Nodes sharing an `@id` merge, so the extra fields cost
 * nothing, and a consumer that reads one script tag in isolation — which most
 * validators and many answer-engine extractors do — still sees WHO the provider
 * is instead of an opaque IRI.
 */
export const ORGANIZATION_REF = {
  '@type': 'EducationalOrganization',
  '@id': ORGANIZATION_ID,
  name: SITE_NAME,
  url: HOME_URL,
} as const;

/** The site, as referenced from a page's `isPartOf`. See `ORGANIZATION_REF`. */
export const WEBSITE_REF = {
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: SITE_NAME,
  url: HOME_URL,
} as const;

/**
 * Something a page is ABOUT that exists outside this site — an exam, a
 * framework.
 *
 * `sameAs` is the point of the type. "SAT" is a word with a dozen meanings and
 * "IELTS" is one somebody else owns; pointing at the Wikipedia article and
 * Wikidata item is what lets a search engine or an answer engine attach the
 * page to the right entity instead of inferring one from the text. Every URL
 * in it must be verified against the source, never typed from memory: a
 * `sameAs` pointing at the wrong article asserts the wrong identity.
 */
export interface Entity {
  name: string;
  sameAs?: readonly string[];
}

export function entitySchema({ name, sameAs }: Entity) {
  return {
    '@type': 'Thing',
    name,
    // Omitted rather than emitted empty: an empty list says nothing, and some
    // validators flag it.
    ...(sameAs && sameAs.length > 0 ? { sameAs: [...sameAs] } : {}),
  };
}

/**
 * The page itself as a node: what kind of page, what it is about, what it
 * contains, and which site it belongs to.
 *
 * The subtype does real work for a machine reader. `CollectionPage` says "this
 * lists things", `AboutPage` says "this describes the organisation", and
 * `isPartOf` ties every page back to the one WebSite, which is what turns a pile
 * of pages into a site in the graph.
 */
export function webPageSchema({
  type = 'WebPage',
  path,
  name,
  description,
  about,
  mainEntity,
}: {
  type?: 'WebPage' | 'CollectionPage' | 'AboutPage' | 'ContactPage';
  /** Root-relative, and the page's canonical path. */
  path: string;
  name: string;
  description: string;
  about?: object;
  mainEntity?: object;
}) {
  const url = absoluteUrl(path);
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${url}#webpage`,
    url,
    name,
    description,
    inLanguage: 'az',
    isPartOf: WEBSITE_REF,
    ...(about ? { about } : {}),
    ...(mainEntity ? { mainEntity } : {}),
  };
}

/**
 * An `ItemList` of pages, in the order the visitor sees them.
 *
 * `position` is a claim about the VISIBLE list, so callers must pass items in
 * render order — `registerOrder` exists so the register and its markup sort the
 * same way from one function. The summary-page shape (a URL per item, no nested
 * entity) is the one Google documents for lists whose items have pages of
 * their own; each paper's details live on its page, not here.
 */
export function itemListSchema(items: ReadonlyArray<{ name: string; path: string }>) {
  return {
    '@type': 'ItemList',
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

interface PageMetadataInput {
  /** Bare page title. The root layout's template appends " — Testcentre". */
  title: string;
  description: string;
  /** Root-relative path, e.g. '/exams'. Used for both canonical and og:url. */
  path: string;
  /** og:title / twitter:title. Defaults to `${title} — ${SITE_NAME}`. */
  socialTitle?: string;
  /**
   * Set when an `opengraph-image` file sits in THIS page's own directory, so
   * that Next fills in the image tags from that file instead of this helper
   * restating the site-wide one.
   *
   * It must be Next that writes the URL, because only Next knows it. A metadata
   * image under a route group gets a hash suffix derived from its parent path
   * (`getMetadataRouteSuffix`), so the image colocated with
   * `app/(public)/exams/[type]/[id]/page.tsx` is served at
   * `…/opengraph-image-1c9bfn`, not `…/opengraph-image`. Hand-writing the
   * obvious path yields a URL that 404s, silently, on every share.
   */
  ownOgImage?: boolean;
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
 *
 * The one exception is a page with an `opengraph-image` of its OWN — see
 * `ownOgImage`. There the key is omitted so Next's file-convention merge can
 * supply it, which is the only way to get the right URL.
 */
export function pageMetadata({
  title,
  description,
  path,
  socialTitle,
  ownOgImage = false,
}: PageMetadataInput): Metadata {
  const social = socialTitle ?? `${title} — ${SITE_NAME}`;

  /*
   * Spread, so that `images` is ABSENT rather than `undefined`.
   *
   * `mergeStaticMetadata` gates the file-convention image on
   * `source.openGraph.hasOwnProperty('images')`, which an explicit `undefined`
   * satisfies just as well as a real value. Setting the key to any value —
   * `undefined`, `null`, `[]` — blocks the colocated image and leaves the page
   * with none.
   */
  const image = ownOgImage
    ? {}
    : {
        images: [
          {
            url: '/opengraph-image',
            width: 1200,
            height: 630,
            type: 'image/png',
            alt: DEFAULT_OG_ALT,
          },
        ],
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
      ...image,
    },
    twitter: {
      card: 'summary_large_image',
      title: social,
      description,
      ...image,
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

/**
 * One step in a breadcrumb trail.
 *
 * The SAME array builds the visible bar (`components/ui/Breadcrumb`) and the
 * `BreadcrumbList` JSON-LD, because keeping the two in step by hand is a thing
 * this codebase has already failed at: the type page emitted a three-level
 * trail — Ana səhifə → İmtahanlar → IELTS — while rendering no breadcrumb at
 * all, the bar having been dropped when that route was split in two. Structured
 * data is supposed to describe what is on the page; nothing warns when it stops
 * doing that.
 */
export interface Crumb {
  /** The schema `name`, and the visible label unless `short` overrides it. */
  name: string;
  /** Root-relative. The last crumb's is the page's own path. */
  path: string;
  /**
   * Visible label, when the full name will not fit.
   *
   * The bar sets 10px mono in a single non-wrapping row, so it shows "Ana" and
   * the paper's code where the schema carries "Ana səhifə" and the paper's full
   * title. Keeping that difference in one place is the point of the field —
   * the alternative is re-deriving it at each end and letting the two drift.
   *
   * KNOWN DIVERGENCE, accepted rather than unnoticed. Google documents
   * `BreadcrumbList.name` as "the title of the breadcrumb displayed for the
   * user", and "IELTS—01" against "IELTS Academic — Practice Test 1" is plainly
   * not that. It is accepted because the schema name is strictly MORE
   * descriptive than the label, so it misleads nobody, and because neither the
   * Rich Results Test nor Search Console treats the gap as an error. The
   * alternatives were both worse: emitting `short` puts a made-up code in the
   * one field a search engine quotes, and printing the full title needs CSS
   * truncation that ellipsises the trail on a phone.
   *
   * Revisit if Search Console ever reports a breadcrumb name mismatch — the
   * fix is a one-line change in `breadcrumbSchema`, not a redesign.
   */
  short?: string;
}

/** `BreadcrumbList` for a trail, ending on the page's own URL. */
export function breadcrumbSchema(trail: readonly Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/** The two crumbs every public exam page starts with. */
export const EXAM_TRAIL_ROOT: readonly Crumb[] = [
  { name: 'Ana səhifə', short: 'Ana', path: '/' },
  { name: 'İmtahanlar', short: 'Kataloq', path: '/exams' },
];

/**
 * FAQPage structured data from a list of question/answer pairs.
 *
 * Worth emitting even though Google narrowed FAQ rich results to authoritative
 * domains: the markup is a clean, machine-readable Q&A pair, which is the shape
 * answer engines prefer to quote. The FAQ copy on this site was already written
 * and rendered — it was simply never marked up.
 *
 * Callers must pass questions that are ACTUALLY VISIBLE on the page. Marking up
 * answers a visitor cannot see is a structured-data violation, not a shortcut.
 */
export function faqSchema(items: ReadonlyArray<{ q: string; a: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}
