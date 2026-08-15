import type { ReactNode } from 'react';

/**
 * The small pill that labels an exam type, a status or a module score.
 *
 * Replaces `.tag` + `.tag-accent` / `.tag-ink` / `.tag-ok` / `.tag-warn` /
 * `.tag-error` from globals.css, whose padding (`4px 10px`), radius (`999px`)
 * and type (`12px`) were hard-coded.
 *
 * `leading-normal` is required, not cosmetic: the old rule set `font-size: 12px`
 * with no line-height, so it inherited body's 1.5 → an 18px line box. Tailwind's
 * `text-xs` ships its own 16px line-height, which would shrink every pill by 2px.
 *
 * The tinted tones were `color-mix(in srgb, <token> 10%, transparent)`. Tailwind's
 * `/10` alpha syntax mixes in oklab instead, which was verified in-browser to
 * composite to the identical pixel for these three colours.
 */

export type TagTone = 'default' | 'accent' | 'ink' | 'ok' | 'warn' | 'error';

const BASE = 'inline-flex items-center rounded-full px-2.5 py-1 text-xs leading-normal font-medium';

const TONE: Record<TagTone, string> = {
  default: 'bg-surface-2 text-ink-soft',
  accent:  'bg-accent-soft text-accent',
  ink:     'bg-ink text-bg',
  ok:      'bg-ok/10 text-ok',
  warn:    'bg-warn/10 text-warn',
  error:   'bg-error/8 text-error',
};

/** Maps a 0–100 score onto the ok / warn / error tones. */
export function scoreTone(score: number, okAt = 80, warnAt = 60): TagTone {
  if (score >= okAt) return 'ok';
  if (score >= warnAt) return 'warn';
  return 'error';
}

export default function Tag({
  tone = 'default',
  className,
  children,
}: {
  tone?: TagTone;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <span className={[BASE, TONE[tone], className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
