'use client';

import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

/**
 * Marks route changes with a soft settle on the page content.
 *
 * Three things this deliberately does NOT do, each of which was making the
 * previous version feel like a blink rather than a transition:
 *
 * 1. **It never starts from zero.** A 0 → 1 opacity ramp means the new page is
 *    invisible for the first half of the animation, which reads as a flash of
 *    empty screen. Starting at 0.72 keeps the content legible the whole way
 *    through; only the last of the fade is perceptible, as a settle.
 *
 * 2. **It never animates the chrome.** The animation is scoped to `main` in
 *    CSS, so the nav and footer are simply still across a navigation — the
 *    thing that separates an app from a page reload. Fading the header along
 *    with the content is what made the whole viewport pulse.
 *
 * 3. **It does not animate the first paint.** The class is only applied once
 *    the tab has painted a page, so the landing view is immediate and LCP is
 *    untouched.
 *
 * The `key` forces the subtree to remount on navigation, which is what
 * restarts the CSS animation; without it React can reuse the `main` element
 * between two routes and the animation never re-fires. No JS animation library
 * is involved — this is a CSS keyframe, so it stays on the compositor and the
 * global reduced-motion block already neutralises it.
 */
const SELF_MANAGED_SEGMENTS = new Set(['dashboard', 'admin', 'exam-session']);

/** Whether this tab has painted a page yet. See note 3 above. */
let hasPainted = false;

export default function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    hasPainted = true;
  }, []);

  const segment = pathname.split('/')[1] ?? '';
  const key = SELF_MANAGED_SEGMENTS.has(segment) ? segment : pathname;

  return (
    <div key={key} className={hasPainted ? 'route-settle' : undefined}>
      {children}
    </div>
  );
}
