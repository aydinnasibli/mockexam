/**
 * Skeleton primitives.
 *
 * Two rules the whole app follows:
 *
 * 1. **A skeleton mirrors the layout it replaces.** If the shape is wrong the
 *    page visibly jumps when the data lands, which is worse than showing
 *    nothing. Where a route's pages are too different from each other to
 *    mirror (admin, the exam runtime), use a spinner instead — an honest
 *    "working" indicator beats a lying preview.
 *
 * 2. **One pulse per screen, not per block.** `SkeletonScreen` owns the
 *    animation so every block breathes in sync, and it carries the
 *    `role="status"` announcement so screen readers say "loading" once rather
 *    than reading dozens of empty boxes.
 *
 * Under `prefers-reduced-motion` the global block in `globals.css` collapses
 * the pulse, leaving the blocks static at full opacity.
 */

interface SkeletonProps {
  /** Sizing and shape utilities — `h-*`, `w-*`, `rounded-*`. */
  className?: string;
  /** `ink` for blocks sitting on a dark band, `bone` (default) on the page. */
  tone?: 'bone' | 'ink';
}

export function Skeleton({ className = '', tone = 'bone' }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={`block ${tone === 'ink' ? 'bg-bg/15' : 'bg-surface-2'} ${className}`}
    />
  );
}

interface SkeletonScreenProps {
  children: React.ReactNode;
  className?: string;
  /** Announced to assistive tech while the region is pending. */
  label?: string;
}

export function SkeletonScreen({ children, className = '', label = 'Yüklənir' }: SkeletonScreenProps) {
  /*
   * `skeleton-delayed` holds the whole thing invisible for the first 350ms and
   * then fades it in over 260ms.
   *
   * A skeleton that flashes for a third of a second is worse than no skeleton:
   * the eye registers a loading screen, then an empty frame as it is torn down,
   * then the content — a blink. Waiting first means a fast response never shows
   * loading UI at all, and a genuinely slow one still gets a skeleton.
   *
   * The usual companion to a delay is a *minimum display time*, so a skeleton
   * that has appeared cannot vanish a frame later. That is not implementable
   * for a Suspense fallback: React tears the fallback down the moment the
   * boundary resolves and nothing in userland can hold it there. The fade-in
   * ramp is what covers that case instead — a response landing at, say, 420ms
   * catches the skeleton at roughly a quarter opacity, so it reads as a hint
   * of movement rather than a screen that appeared and left. Anything
   * resolving before ~610ms never sees it at full strength at all.
   *
   * The pulse lives on an inner element because both are `animation`
   * declarations and one element cannot carry two independently.
   */
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={`skeleton-delayed ${className}`}>
      <span className="sr-only">{label}…</span>
      <div className="animate-pulse">{children}</div>
    </div>
  );
}
