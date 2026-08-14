/**
 * "Skip to content" — WCAG 2.4.1 Bypass Blocks (Level A).
 *
 * Every shell in this app puts persistent navigation ahead of the page body:
 * the public navbar is a bulletin strip plus five links and the auth controls,
 * and the dashboard/admin rails are a dozen more. Without this, a keyboard or
 * screen-reader user re-tabs all of it on every single navigation.
 *
 * It must be the FIRST focusable element in the DOM, so it is rendered above
 * the navbar/sidebar in each layout rather than inside them.
 *
 * Hidden until focused: `sr-only` keeps it out of the visual design, and
 * `focus:not-sr-only` restores it as a real, visible control the moment it is
 * tabbed to — a skip link that never becomes visible fails the same criterion
 * it is meant to satisfy. z-110 clears the highest z-index in the app (z-100)
 * so it cannot appear behind a sticky bar or an open sidebar.
 */
export default function SkipLink() {
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-110 focus:inline-flex focus:items-center focus:rounded-btn focus:border focus:border-ink focus:bg-surface focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-ink focus:shadow-lg"
    >
      Əsas məzmuna keç
    </a>
  );
}
