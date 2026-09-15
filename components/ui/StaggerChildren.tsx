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
 * Wrap items in `StaggerItem`. Note that each `StaggerItem` renders a `div` by
 * default, so do not use it on the direct children of a grid that relies on
 * `:last-child` selectors or `display: contents` — reveal that whole block with
 * `FadeUp` instead.
 *
 * `as` renders the pair as a real list — `ul` or `ol` around `li` — wherever the
 * children genuinely are one, rather than a list-shaped stack of divs. A list
 * container states `role="list"` itself: Tailwind's preflight strips the list
 * style, and Safari stops exposing an unstyled list as a list unless the role is
 * explicit.
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

const CONTAINERS = { div: motion.div, ul: motion.ul, ol: motion.ol } as const;
const ITEMS = { div: motion.div, li: motion.li } as const;

interface ContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** A list container pairs with `<StaggerItem as="li">`. */
  as?: keyof typeof CONTAINERS;
}

export function StaggerContainer({ children, className, delay = 0, as = 'div' }: ContainerProps) {
  const Container = CONTAINERS[as];
  return (
    <Container
      custom={delay}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      role={as === 'div' ? undefined : 'list'}
      className={className}
    >
      {children}
    </Container>
  );
}

interface ItemProps {
  children: ReactNode;
  className?: string;
  as?: keyof typeof ITEMS;
}

export function StaggerItem({ children, className, as = 'div' }: ItemProps) {
  const Item = ITEMS[as];
  return (
    // `js-reveal`: the hidden variant is serialised into the SSR HTML, so
    // without JS this item never becomes visible. See app/layout.tsx.
    <Item variants={itemVariants} className={className ? `js-reveal ${className}` : 'js-reveal'}>
      {children}
    </Item>
  );
}
