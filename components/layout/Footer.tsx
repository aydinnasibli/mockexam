import Link from "next/link";
import Image from "next/image";
import { MONO_SECTION as MONO_LABEL } from '@/components/ui/type-styles';
import { CONTENT_TYPES, EXAM_CONTENT, typePath } from '@/lib/domain/exam-content';
import SignedInOnly from './SignedInOnly';


/**
 * Link columns. `href: null` marks a section that is announced but has no page
 * yet — it renders as plain muted text rather than a link, so the footer never
 * advertises a route that 404s.
 */
/*
 * The exam-type column is DERIVED, not typed out.
 *
 * These hub pages are the site's search entry points, and until now nothing
 * linked to them from every page — they existed in the sitemap and nowhere
 * else, which is how a page ends up "Discovered — currently not indexed".
 * A footer link on every public page is the cheapest permanent crawl path
 * there is, and building it from `EXAM_CONTENT` means the driving-licence and
 * magistratura hubs appeared here the moment their records were written,
 * without anyone remembering to come back to this file.
 */
const EXAM_LINKS = CONTENT_TYPES.map((type) => ({
  label: EXAM_CONTENT[type]!.shortLabel,
  href: typePath(type),
}));

interface FooterLink {
  label: string;
  href: string | null;
  /** Rendered only once Clerk reports a signed-in session. See the Platforma column. */
  signedInOnly?: true;
}

const COLUMNS: Array<{
  /** Builds the id of the heading that labels the column's list. */
  id: string;
  title: string;
  links: FooterLink[];
}> = [
  {
    id: "exams",
    title: "İmtahanlar",
    links: EXAM_LINKS,
  },
  {
    id: "platform",
    title: "Platforma",
    links: [
      { label: "Sınaqlar", href: "/exams" },
      /*
       * Account pages, for a signed-in visitor only.
       *
       * To anyone else both links are a detour through Clerk's sign-in, and to
       * a crawler they are two links on every public page into paths robots.txt
       * disallows — which a site audit reports, on every crawl, as pages
       * "blocked from crawling". `SignedInOnly` decides in the browser once
       * Clerk has resolved, so neither link is in the prerendered HTML at all.
       * (It is not Clerk's `<Show>`, which would make every page dynamic — see
       * that component.)
       *
       * That also retires the `prefetch={false}` these used to carry. It
       * existed because prefetching them for a signed-out visitor had the proxy
       * answer the RSC request with a cross-origin redirect to Clerk, which CORS
       * blocked. A signed-in visitor's prefetch simply succeeds.
       */
      { label: "Kabinet", href: "/dashboard", signedInOnly: true },
      { label: "Analitika", href: "/dashboard/analytics", signedInOnly: true },
      { label: "Qiymətlər", href: null },
    ],
  },
  {
    id: "company",
    title: "Şirkət",
    links: [
      { label: "Haqqımızda", href: "/about" },
      { label: "Əlaqə", href: "/contact" },
      { label: "Karyera", href: null },
      { label: "Blog", href: null },
    ],
  },
  {
    id: "legal",
    title: "Hüquqi",
    links: [
      { label: "İstifadə şərtləri", href: "/legal/terms" },
      { label: "Məxfilik", href: "/legal/privacy" },
      { label: "Cookie", href: "/legal/cookies" },
      { label: "Geri qaytarma", href: "/legal/refund" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="w-full border-t border-ink bg-bg">
      <div className="shell">

        {/* Tier 1 — wordmark and contact */}
        <div className="flex flex-col gap-8 pt-12 pb-10 sm:flex-row sm:items-end sm:justify-between lg:pt-14">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.svg" alt="Testcentre" width={30} height={27} className="shrink-0" />
            <span className="text-heading-lg leading-none font-light tracking-[-0.03em] text-ink lg:text-display-xs">
              Test<span className="text-ink-soft">centre</span>
            </span>
          </Link>
          <div className="flex flex-col gap-1 sm:text-right">
            <span className={`${MONO_LABEL} text-ink-mute`}>Əlaqə</span>
            <a
              href="mailto:testcentreaz@proton.me"
              className="text-base text-ink transition-colors hover:text-accent-deep"
            >
              testcentreaz@proton.me
            </a>
          </div>
        </div>

        {/* Tier 2 — descriptor and link columns */}
        <div className="grid grid-cols-2 gap-10 border-t border-rule pt-10 pb-12 lg:grid-cols-[1.6fr_1fr_1fr_1fr_1fr] lg:gap-10 lg:pb-14">
          <div className="col-span-2 lg:col-span-1">
            <p className="m-0 max-w-80 text-body leading-[1.65] text-ink-soft">
              Onlayn sınaq imtahanları — rəsmi format, ölçülə bilən tərəqqi, hər sualın
              arxasında izahat.
            </p>
          </div>

          {COLUMNS.map((column) => {
            const headingId = `footer-${column.id}`;
            return (
              <div key={column.id}>
                <p id={headingId} className={`${MONO_LABEL} mb-4.5 text-ink-mute`}>{column.title}</p>
                {/* A list named by its column title, so assistive technology
                    announces "İmtahanlar, list, 7 items" rather than a run of
                    unrelated links. `role="list"` is not redundant here:
                    Tailwind's preflight sets `list-style: none`, and Safari
                    drops the list semantics of an unstyled list unless the
                    role is stated. */}
                <ul role="list" aria-labelledby={headingId} className="flex flex-col gap-2.75">
                  {column.links.map((link) => {
                    const item = (
                      <li key={link.label}>
                        {link.href ? (
                          <Link
                            href={link.href}
                            className="-my-1 block py-1 text-body text-ink-soft transition-colors duration-150 hover:text-ink"
                          >
                            {link.label}
                          </Link>
                        ) : (
                          <span className="text-body text-ink-mute">{link.label}</span>
                        )}
                      </li>
                    );
                    return link.signedInOnly ? (
                      <SignedInOnly key={link.label}>{item}</SignedInOnly>
                    ) : (
                      item
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Tier 3 — baseline */}
        <div className="flex flex-col gap-2 border-t border-rule pt-4.5 pb-7 sm:flex-row sm:items-center sm:justify-between">
          <span className={`${MONO_LABEL} text-ink-mute`}>© 2026 Testcentre · Bakı, Azərbaycan</span>
          <span className={`${MONO_LABEL} text-ink-mute`}>Sənəd: TC—PUB—2026.08</span>
        </div>
      </div>
    </footer>
  );
}
