import Link from 'next/link';
import { MONO_LABEL } from '@/components/ui/type-styles';
import type { Crumb } from '@/lib/shared/seo';

/**
 * The visible trail, rendered from the SAME `Crumb[]` that builds the page's
 * `BreadcrumbList` JSON-LD.
 *
 * That sharing is the point of the component existing at all. Each page used to
 * hand-build an `itemListElement` array and, separately, a row of links — and
 * the type page shipped with the array and no row, which is markup claiming a
 * trail the page does not show. Passing one array to both ends removes the
 * class of bug rather than this instance of it.
 *
 * Rendered by the exam pages directly rather than by a layout: `/exams` and
 * `/exams/[type]` are two routes drawn by one component, and only the page
 * knows which type it is standing on.
 *
 * An ordered list, which is the markup the WAI-ARIA breadcrumb pattern uses: a
 * trail IS a sequence, and the list lets a screen reader announce its length
 * before reading it. Each separator sits inside its item and is hidden, so it is
 * drawn but never read out between crumbs.
 */
export default function Breadcrumb({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="Naviqasiya yolu" className="border-b border-rule">
      {/* `py-2 -my-2` on the links, not on the bar: 10px mono type gives a
          15px-tall hit box, under the 24px WCAG 2.5.8 minimum. The padding
          raises it to 31px and the negative margin cancels it again in the flex
          row, so the bar's height is unchanged.

          `-mx-1 px-1` does the same for WIDTH, and is applied to every link
          rather than only to "Ana" as it once was: "Ana" is 22px and failed the
          minimum, but so would any short crumb, and the type labels here are
          data — "SAT" and "DİM" are already shorter than the label that
          prompted the rule.

          `role="list"`: Tailwind's preflight strips the list style, and Safari
          stops exposing an unstyled list as a list unless the role is stated. */}
      <ol role="list" className={`${MONO_LABEL} shell flex items-center gap-2.5 py-3.25 text-ink-mute`}>
        {trail.map((crumb, i) => {
          const isCurrent = i === trail.length - 1;
          return (
            <li key={crumb.path} className="flex items-center gap-2.5">
              {i > 0 && <span aria-hidden>/</span>}
              {isCurrent ? (
                // The page you are on is text, not a self-link — and says so,
                // so a screen reader announces the trail's end rather than
                // offering a link back to here.
                <span className="text-ink" aria-current="page">
                  {crumb.short ?? crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className="-mx-1 -my-2 px-1 py-2 transition-colors hover:text-ink"
                >
                  {crumb.short ?? crumb.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
