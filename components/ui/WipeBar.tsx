'use client';

import { motion } from 'framer-motion';

/**
 * A single chart bar that fills from its left edge when it scrolls into view.
 *
 * The report chart sits well below the fold, so a CSS animation on mount —
 * which is what this replaced — had always finished by the time anyone reached
 * it. Nobody ever saw the chart draw itself. Tying the fill to the viewport
 * means the figure animates exactly when it is being read.
 */
const EASE_OUT_SOFT = [0.2, 0.7, 0.2, 1] as const;

interface Props {
  /** Fill width as a percentage of the track. */
  percent: number;
  /** Fill colour utility. */
  className?: string;
  /** Seconds of stagger relative to its neighbours. */
  delay?: number;
}

export default function WipeBar({ percent, className = 'bg-ink', delay = 0 }: Props) {
  return (
    <motion.div
      className={`h-full ${className}`}
      style={{ width: `${percent}%`, transformOrigin: 'left' }}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.9, ease: EASE_OUT_SOFT, delay }}
    />
  );
}
