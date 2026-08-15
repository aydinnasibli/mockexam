import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

/**
 * The button of the design system.
 *
 * Replaces the `.btn-primary` / `.btn-ghost` / `.btn-sm` rules that used to live
 * in globals.css, whose padding, radius and type were hard-coded px values
 * (`13px 22px`, `999px`, `14px`, `8px 16px`) sitting outside the spacing scale
 * the rest of the app is written in.
 *
 * Renders a `next/link` when given `href`, a `<button>` otherwise, so the same
 * component covers the navigation and action call sites without either having
 * to know which classes to apply.
 *
 * Sizes are a closed set on purpose. Call sites used to reach for
 * `py-2! px-4! text-sm!` — important-overrides that existed only to out-rank the
 * CSS class — and every one of those is now either a named size or `size="none"`,
 * which emits no box/type utilities at all so the call site owns them outright.
 */

type Variant = 'primary' | 'ghost';
type Size = 'md' | 'sm' | 'xs' | 'none';

const BASE =
  'group inline-flex cursor-pointer items-center rounded-full font-sans font-medium no-underline';

const VARIANT: Record<Variant, string> = {
  // Per-property transition durations have no utility form, so the shorthand
  // stays as one arbitrary declaration.
  primary:
    'border border-ink bg-ink text-bg tracking-[-0.005em] ' +
    'hover:bg-ink-hover active:translate-y-px [transition:background_.2s,transform_.15s]',
  ghost:
    'border border-rule bg-transparent text-ink ' +
    'hover:border-ink-faint hover:bg-surface [transition:background_.2s,border-color_.2s]',
};

/*
 * Vertical padding differs per variant at the default size because it always
 * did: `.btn-primary` was `13px 22px` and `.btn-ghost` `12px 22px`, so a ghost
 * button sits 2px shorter beside a primary one. Reproduced rather than
 * normalised — this is a refactor, not a redesign.
 */
/*
 * Line-height is per size, and deliberately not uniform, because the rules being
 * replaced were not uniform either:
 *
 *   md — `.btn-primary` set `font-size: 14px` and NO line-height, so the button
 *        inherited body's 1.5 → a 21px line box. Tailwind's `text-sm` ships its
 *        own 20px line-height, so the inherited value has to be restated or every
 *        default button renders 1px shorter.
 *   sm — same story at 13px, but an arbitrary `text-note` carries no
 *        line-height of its own, so `leading-normal` simply states what it
 *        already inherited.
 *   xs — here the font-size came from a `text-xs` utility at the call site, which
 *        brought its OWN 16px line-height. Forcing 1.5 (18px) would make each of
 *        these buttons 2px taller — 10px down a dashboard column.
 */
const SIZE: Record<Size, Record<Variant, string>> = {
  md: {
    primary: 'gap-2.5 px-5.5 py-3.25 text-sm leading-normal',
    ghost:   'gap-2.5 px-5.5 py-3 text-sm leading-normal',
  },
  sm: {
    primary: 'gap-2 px-4 py-2 text-note leading-normal',
    ghost:   'gap-2 px-4 py-2 text-note leading-normal',
  },
  xs: {
    primary: 'gap-2 px-4 py-2 text-xs',
    ghost:   'gap-2 px-4 py-2 text-xs',
  },
  none: { primary: '', ghost: '' },
};

type Common = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children?: ReactNode;
};

type AsLink = Common & { href: string } & Omit<ComponentProps<typeof Link>, 'href' | 'className' | 'children'>;
type AsButton = Common & { href?: undefined } & Omit<ComponentProps<'button'>, 'className' | 'children'>;

export default function Button(props: AsLink | AsButton) {
  const { variant = 'primary', size = 'md', className, children, ...rest } = props;
  const cls = [BASE, VARIANT[variant], SIZE[size][variant], className]
    .filter(Boolean)
    .join(' ');

  // The one cast a polymorphic component cannot avoid: `rest` is the correct
  // prop set for whichever element the `href` discriminant selected, but TS
  // cannot narrow a rest object by a key that was destructured out of it.
  if (rest.href !== undefined) {
    const linkProps = rest as Omit<ComponentProps<typeof Link>, 'className' | 'children'>;
    return <Link {...linkProps} className={cls}>{children}</Link>;
  }
  const buttonProps = rest as Omit<ComponentProps<'button'>, 'className' | 'children'>;
  return <button {...buttonProps} className={cls}>{children}</button>;
}

/**
 * The trailing "→" that steps right on hover.
 *
 * Was `.btn-primary .arrow`, a descendant rule that only worked inside a primary
 * button; `group-hover` states the relationship at the call site instead.
 * Decorative, so always aria-hidden.
 */
export function ButtonArrow() {
  return (
    <span
      aria-hidden
      className="inline-block transition-transform duration-200 group-hover:translate-x-0.75"
    >
      →
    </span>
  );
}
