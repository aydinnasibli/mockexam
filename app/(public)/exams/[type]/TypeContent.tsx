import type { ExamTypeContent } from '@/lib/domain/exam-content';
import FadeUp from '@/components/ui/FadeUp';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerChildren';
import { MONO_LABEL, MONO_SECTION } from '@/components/ui/type-styles';

const H2 = 'm-0 text-heading-lg font-light leading-[1.04] tracking-[-0.035em] text-ink md:text-display-sm';

/**
 * The editorial half of a type page, rendered BELOW the register.
 *
 * The register above it is the ordinary catalog — same masthead, same tab row,
 * same rows — because a visitor clicking "IELTS" wants the papers, not an
 * article. An earlier version made this an article: heading, two paragraphs,
 * papers somewhere below the fold. It read as a different site.
 *
 * So the split is by ROLE, not by page. The catalog answers "what can I buy";
 * this answers "what is this exam and how is it scored", which is the half that
 * gives the URL something to rank for. Putting it second costs nothing — search
 * engines read the whole document, and visitors who wanted the papers have
 * already found them.
 *
 * Sections render only when their data exists. That is what lets the three
 * Azerbaijani papers ship honestly today: `facts` and `scoring` are empty for
 * them (see `exam-content.ts`), so those blocks are absent rather than filled
 * with regulated numbers nobody verified.
 */
export default function TypeContent({ content }: { content: ExamTypeContent }) {
  // Numbered as they appear, so an omitted section leaves no gap in the rail.
  let n = 0;
  const num = () => String(++n).padStart(2, '0');

  const introN = num();
  const factsN = content.facts.length > 0 ? num() : null;
  const scoringN = content.scoring.length > 0 ? num() : null;
  const faqN = content.faq.length > 0 ? num() : null;

  return (
    <>
      {/* ── What this exam is ── */}
      <section className="border-t border-rule shell py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[96px_1fr] lg:gap-8">
          <div className={`${MONO_SECTION} text-ink-mute lg:pt-2.5`}>{introN}</div>
          <div className="min-w-0">
            <FadeUp>
              {/* The page's h1, and the only one — the register's masthead
                  above steps down to a `<p>` whenever this block renders (see
                  `demoteHeadline` in `ExamsCatalog`). It reads at exactly the
                  same size either way; what changes is that the document is
                  now titled by the programme rather than by how many papers
                  happen to be on sale. */}
              <h1 className={`${H2} mb-9 lg:mb-11`}>{content.h1}</h1>
              <div className="grid max-w-170 gap-5">
                {content.intro.map((para) => (
                  <p key={para.slice(0, 40)} className="m-0 text-lede leading-[1.55] text-ink-soft">
                    {para}
                  </p>
                ))}
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ── Format ── */}
      {factsN && (
        <section className="border-t border-rule bg-surface-2">
          <div className="shell py-16 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[96px_1fr] lg:gap-8">
              <div className={`${MONO_SECTION} text-ink-mute lg:pt-2.5`}>{factsN}</div>
              <div className="min-w-0">
                <h2 className={`${H2} mb-9 lg:mb-11`}>Format.</h2>
                <dl className="m-0 grid max-w-170 grid-cols-1">
                  {content.facts.map((fact, i) => (
                    <div
                      key={fact.label}
                      className={`flex items-baseline justify-between gap-6 py-4 ${
                        i === 0 ? 'border-t border-ink' : 'border-t border-rule'
                      } ${i === content.facts.length - 1 ? 'border-b border-rule' : ''}`}
                    >
                      <dt className={`${MONO_LABEL} shrink-0 text-ink-mute`}>{fact.label}</dt>
                      <dd className="m-0 min-w-0 text-right text-base text-ink">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Scoring ── */}
      {scoringN && (
        <section className="border-t border-rule shell py-16 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[96px_1fr] lg:gap-8">
            <div className={`${MONO_SECTION} text-ink-mute lg:pt-2.5`}>{scoringN}</div>
            <div className="min-w-0">
              <h2 className={`${H2} mb-9 lg:mb-11`}>Bal necə hesablanır.</h2>
              <div className="grid max-w-170 gap-5">
                {content.scoring.map((para) => (
                  <p key={para.slice(0, 40)} className="m-0 text-base leading-[1.65] text-ink-soft">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── FAQ. Also emitted as FAQPage JSON-LD by the page. ── */}
      {faqN && (
        <section className="border-t border-rule bg-surface-2">
          <div className="shell py-16 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[96px_1fr] lg:gap-8">
              <div className={`${MONO_SECTION} text-ink-mute lg:pt-2.5`}>{faqN}</div>
              <div className="min-w-0">
                <h2 className={`${H2} mb-9 lg:mb-11`}>Suallar.</h2>
                <StaggerContainer className="max-w-170">
                  {content.faq.map((item, i) => (
                    <StaggerItem key={item.q}>
                      <details
                        className={`group ${i === 0 ? 'border-t border-ink' : 'border-t border-rule'} ${
                          i === content.faq.length - 1 ? 'border-b border-rule' : ''
                        }`}
                      >
                        <summary className="flex cursor-pointer list-none items-center gap-5 py-5">
                          <span className="flex-1 text-lg font-normal tracking-[-0.015em] text-ink">
                            {item.q}
                          </span>
                          <span className="font-mono text-base text-ink-mute" aria-hidden>
                            <span className="group-open:hidden">+</span>
                            <span className="hidden group-open:inline">−</span>
                          </span>
                        </summary>
                        <p className="m-0 mb-6 max-w-140 text-base leading-[1.65] text-ink-soft">
                          {item.a}
                        </p>
                      </details>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
