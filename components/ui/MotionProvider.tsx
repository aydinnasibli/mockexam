'use client';

import { MotionConfig } from 'framer-motion';

/**
 * Applies the visitor's OS "reduce motion" preference to every Framer Motion
 * animation in the app (WCAG 2.3.3).
 *
 * The CSS `@media (prefers-reduced-motion: reduce)` block in globals.css only
 * neutralises CSS transitions/animations — Framer Motion drives transforms in
 * JS, so it needs this too. `reducedMotion="user"` keeps opacity/colour fades
 * (which don't trigger vestibular symptoms) while disabling transform and
 * layout animations.
 *
 * `children` stays server-rendered: it is passed through as a prop, so this
 * wrapper does not turn the tree below it into client components.
 */
export default function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
