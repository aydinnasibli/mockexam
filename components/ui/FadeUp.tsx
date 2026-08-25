'use client';

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Reveals a block as it scrolls into view — the workhorse of the site's motion.
 *
 * The curve is the design system's `--ease-out-soft` (cubic-bezier(.2,.7,.2,1)):
 * quick to leave, slow to settle, so the movement reads as arrival rather than
 * a slide. 18px and 550ms are chosen to be *seen* — anything shorter or
 * shallower registers as a flicker instead of motion.
 *
 * `once: true` means a section animates the first time it is reached and never
 * again; re-animating on every scroll-by is what makes motion feel cheap.
 * `margin` starts the reveal slightly before the block reaches the viewport
 * edge, so it is already settling by the time it is properly on screen.
 *
 * Children are passed as props, so wrapping a server-rendered section in this
 * does not turn it into a client component.
 */
const EASE_OUT_SOFT = [0.2, 0.7, 0.2, 1] as const;

interface Props {
  children: ReactNode;
  /** Seconds to wait before this block starts. */
  delay?: number;
  /** Travel distance in px. */
  y?: number;
  className?: string;
}

export default function FadeUp({ children, delay = 0, y = 18, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.55, ease: EASE_OUT_SOFT, delay }}
      // `js-reveal` is the hook for the <noscript> rule in the root layout:
      // `initial` is serialised into the SSR HTML as `opacity:0`, so without JS
      // this content is present but painted invisible. See app/layout.tsx.
      className={className ? `js-reveal ${className}` : 'js-reveal'}
    >
      {children}
    </motion.div>
  );
}
