'use client';

import { motion } from 'framer-motion';
import type { StructureBlock } from '@/app/(public)/exams/structure';

/**
 * The proportional timing diagram, drawn block by block as it scrolls into
 * view: each block wipes out from its left edge in the order a candidate would
 * sit them, so the bar reads as time passing rather than as a static chart.
 *
 * It is a client component so the wipe fires when the bar is *seen*. The
 * catalog's rows and the detail page's timeline both sit below the fold, and a
 * CSS animation on mount would have finished long before anyone scrolled to
 * them.
 *
 * `scaleX` with a left origin keeps the whole thing on the compositor — no
 * layout work per frame, whatever the row count.
 */
const EASE_OUT_SOFT = [0.2, 0.7, 0.2, 1] as const;

interface Props {
  blocks: StructureBlock[];
  /** Total minutes drawn, used to decide which blocks can carry a figure. */
  total: number;
  /** Bar height utility, e.g. `h-8.5` (catalog) or `h-11 lg:h-14` (detail). */
  heightClass: string;
  /** Gap between blocks, e.g. `gap-0.5` or `gap-0.75`. */
  gapClass?: string;
  /** Blocks narrower than this share of the bar have no room for a figure. */
  minFigureShare?: number;
  /** Detail page centres a labelled break block; the catalog leaves it blank. */
  labelBreaks?: boolean;
  figureClass?: string;
}

export default function StructureBar({
  blocks,
  total,
  heightClass,
  gapClass = 'gap-0.5',
  minFigureShare = 0.11,
  labelBreaks = false,
  figureClass = 'pl-2 font-mono text-[10px]',
}: Props) {
  return (
    <div className={`flex items-stretch ${gapClass} ${heightClass}`}>
      {blocks.map((block, i) => {
        const showFigure = block.kind === 'module'
          ? block.minutes / total >= minFigureShare
          : labelBreaks;

        return (
          <motion.div
            key={i}
            className={`flex min-w-0.5 items-center overflow-hidden ${block.fill} ${
              block.kind === 'break' && labelBreaks ? 'justify-center' : ''
            }`}
            style={{ flex: block.minutes, transformOrigin: 'left' }}
            title={`${block.label} · ${block.minutes} dəq`}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: EASE_OUT_SOFT, delay: i * 0.08 }}
          >
            {showFigure && (
              <motion.span
                className={`${figureClass} whitespace-nowrap ${block.figureClass}`}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.3, delay: i * 0.08 + 0.25 }}
              >
                {block.minutes}′
              </motion.span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
