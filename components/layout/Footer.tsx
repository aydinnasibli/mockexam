import Link from "next/link";
import Image from "next/image";
import { MONO_SECTION as MONO_LABEL } from '@/components/ui/type-styles';


/**
 * Link columns. `href: null` marks a section that is announced but has no page
 * yet — it renders as plain muted text rather than a link, so the footer never
 * advertises a route that 404s.
 */
const COLUMNS: Array<{
  title: string;
  links: Array<{ label: string; href: string | null; prefetch?: false }>;
}> = [
  {
    title: "Platforma",
    links: [
      { label: "Sınaqlar", href: "/exams" },
      /*
       * Prefetch off on both.
       *
       * These sit in the footer of every public page, so Next prefetches them
       * the moment the footer scrolls into view. For a signed-out visitor the
       * proxy answers that RSC prefetch with a cross-origin redirect to Clerk,
       * which CORS then blocks — four console errors per page view, a wasted
       * round-trip each time, and a steady drip of junk into PostHog error
       * tracking (`capture_exceptions` is on). Clicking still works: that is a
       * full navigation, not a prefetch.
       */
      { label: "Kabinet", href: "/dashboard", prefetch: false },
      { label: "Analitika", href: "/dashboard/analytics", prefetch: false },
      { label: "Qiymətlər", href: null },
    ],
  },
  {
    title: "Şirkət",
    links: [
      { label: "Haqqımızda", href: "/about" },
      { label: "Əlaqə", href: "/contact" },
      { label: "Karyera", href: null },
      { label: "Blog", href: null },
    ],
  },
  {
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
        <div className="grid grid-cols-2 gap-10 border-t border-rule pt-10 pb-12 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-12 lg:pb-14">
          <div className="col-span-2 lg:col-span-1">
            <p className="m-0 max-w-80 text-body leading-[1.65] text-ink-soft">
              Akademik imtahan hazırlığı — rəsmi format, ölçülə bilən tərəqqi, hər sualın
              arxasında izahat.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <div className={`${MONO_LABEL} mb-4.5 text-ink-mute`}>{column.title}</div>
              <div className="flex flex-col gap-2.75">
                {column.links.map((link) =>
                  link.href ? (
                    <Link
                      key={link.label}
                      href={link.href}
                      prefetch={link.prefetch}
                      className="-my-1 py-1 text-body text-ink-soft transition-colors duration-150 hover:text-ink"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <span key={link.label} className="text-body text-ink-mute">
                      {link.label}
                    </span>
                  ),
                )}
              </div>
            </div>
          ))}
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
