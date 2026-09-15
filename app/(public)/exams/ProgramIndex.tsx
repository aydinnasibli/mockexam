import Link from 'next/link';
import type { PublicExam } from '@/lib/db/exams';
import { CONTENT_TYPES, EXAM_CONTENT, typePath } from '@/lib/domain/exam-content';
import { MONO_LABEL } from '@/components/ui/type-styles';

const H2 = 'm-0 text-heading-lg font-light leading-[1.04] tracking-[-0.035em] text-ink md:text-display-sm';

/**
 * Every programme with the description its own hub gives — rendered on `/exams`
 * only, below the register.
 *
 * The register lists PAPERS, so on its own the catalog said little beyond
 * titles, figures and prices: under 150 words, the lowest word count on the
 * site, and its only route to the hubs was a tab row of one-word labels. This
 * gives every hub a contextual link from the catalog, anchored on the hub's own
 * heading and followed by its own description — read from the same
 * `EXAM_CONTENT` record the hub renders, so the two can never disagree.
 *
 * All hubs are listed, including those with nothing on sale yet: a hub explains
 * its exam before the first paper exists, which is why the sitemap lists them
 * too. Type pages do not render this — they ARE one of these entries.
 */
export default function ProgramIndex({ exams }: { exams: readonly PublicExam[] }) {
  return (
    <section className="border-t border-rule bg-surface-2">
      <div className="shell py-16 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[96px_1fr] lg:gap-8">
          {/* The rail the other editorial sections number; this one has no
              siblings to be numbered against, so it stays empty. */}
          <div className="hidden lg:block" aria-hidden />
          <div className="min-w-0">
            <h2 className={`${H2} mb-6 lg:mb-8`}>İmtahan növləri.</h2>
            <p className="m-0 mb-10 max-w-170 text-lede leading-[1.55] text-ink-soft lg:mb-12">
              Hər imtahan növünün öz səhifəsi var: imtahan haqqında məlumat, həmin növün bütün
              sınaqları və tez-tez verilən suallar orada bir yerdə toplanıb.
            </p>

            {/* `role="list"`: preflight strips the list style, and Safari then
                stops exposing the list as one unless the role is stated. */}
            <ul role="list" className="grid border-t border-ink sm:grid-cols-2 sm:gap-x-10">
              {CONTENT_TYPES.map((type) => {
                const content = EXAM_CONTENT[type]!;
                const count = exams.filter((exam) => exam.type === type).length;
                return (
                  <li key={type} className="border-b border-rule py-6">
                    <h3 className="m-0 mb-2.5 text-title font-normal tracking-[-0.02em] text-ink">
                      <Link
                        href={typePath(type)}
                        className="underline decoration-ink-faint underline-offset-4 transition-colors duration-150 hover:decoration-ink"
                      >
                        {content.h1}
                      </Link>
                    </h3>
                    <p className="m-0 mb-3 max-w-140 text-body leading-[1.6] text-ink-soft">
                      {content.metaDescription}
                    </p>
                    <p className={`${MONO_LABEL} m-0 text-ink-mute`}>
                      {count > 0 ? `${count} sınaq açıqdır` : 'Hazırlanır'}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
