import { renderPassage } from '@/lib/shared/render-math';

/**
 * Renders a reading passage with proper structure (title, separated paragraphs,
 * "Paragraph A/B/C" labels) and KaTeX math. Presentation-only — see
 * `renderPassage` for the parsing. Wrap in a `.passage-body` container for the
 * reading typography.
 */
export default function PassageText({ text, className = '' }: { text: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: renderPassage(text) }} />;
}
