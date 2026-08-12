'use client';

import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * A list that reveals item by item as it scrolls into view.
 *
 * Same curve and distance as `FadeUp` so the two read as one system; the only
 * difference is that children arrive in sequence. 70ms between items is the
 * point where the eye follows the order without the last item feeling late —
 * eight rows finish in half a second.
 *
 * Wrap items in `StaggerItem`. Note that each `StaggerItem` renders a `div`, so
 * do not use it on the direct children of a grid that relies on `:last-child`
 * selectors or `display: contents` — reveal that whole block with `FadeUp`
 * instead.
 */
const EASE_OUT_SOFT = [0.2, 0.7, 0.2, 1] as const;

const containerVariants: Variants = {
  hidden: {},
  show: (delay: number) => ({
    transition: { staggerChildren: 0.07, delayChildren: delay },
  }),
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT_SOFT } },
};

interface ContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function StaggerContainer({ children, className, delay = 0 }: ContainerProps) {
  return (
    <motion.div
      custom={delay}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
