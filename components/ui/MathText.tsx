import { renderMath } from '@/lib/shared/render-math';

/**
 * Question text that may contain LaTeX.
 *
 * Was defined twice — once in the exam player and once in the review screen —
 * with the two copies having quietly drifted to different line-heights. Shared
 * here so the same question renders identically whether a student is answering
 * it or reviewing it afterwards.
 *
 * `renderMath` escapes every plain-text segment and only emits markup for the
 * math it rendered, which is what makes the `dangerouslySetInnerHTML` here safe;
 * see lib/render-math.ts and its tests.
 *
 * Inline defaults to `<span>`: a `<div>` inside a `<p>` is invalid HTML and
 * throws a hydration error, and these are rendered inside paragraphs (matching
 * items, option labels).
 */
export default function MathText({
  text,
  block = false,
  className,
}: {
  text: string;
  block?: boolean;
  className?: string;
}) {
  const html = { __html: renderMath(text) };
  return block
    ? <div className={className ?? 'leading-relaxed'} dangerouslySetInnerHTML={html} />
    : <span className={className ?? 'inline leading-normal'} dangerouslySetInnerHTML={html} />;
}
