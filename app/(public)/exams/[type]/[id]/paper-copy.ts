import type { PublicExam } from '@/lib/db/exams';
import type { ExamTypeContent } from '@/lib/domain/exam-content';
import { registerOrder, structureOf } from '../../structure';

/**
 * The prose a paper page says about itself, built from the paper's record.
 *
 * The page used to carry almost none. Its main column was a title, four
 * figures, a module table and a specimen question — 138 words on the live A1
 * paper, most of them numbers and labels — so a site audit flagged every paper
 * for low word count, and a search engine reading the page found nothing that
 * described what the paper is. The admin-written description existed all along
 * and went only into the meta tag.
 *
 * Every sentence here restates something the record or the platform already
 * guarantees: the module list and counts, the scale scoring actually produces,
 * the access terms the purchase card prints. Nothing a particular paper could
 * make false — which is why it is generated rather than typed into each record,
 * and why it lives in a pure module that `paper-copy.test.ts` can pin.
 */

/** Shorter than this is a label, not a description. */
const MIN_USEFUL_DESCRIPTION = 60;

/**
 * The admin-written description, when it is long enough to be one.
 *
 * Length, not presence: the live SAT exam once stored the description "SAT" — a
 * truthy value that shipped as the page's entire meta description.
 */
export function storedDescription(exam: Pick<PublicExam, 'description'>): string | null {
  const stored = exam.description?.trim() ?? '';
  return stored.length >= MIN_USEFUL_DESCRIPTION ? stored : null;
}

/** `['A']` → `A`; `['A', 'B', 'C']` → `A, B və C`. */
export function joinAz(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} və ${items[items.length - 1]}`;
}

/**
 * How a result is reported, for the types whose attempts are converted to the
 * board's own scale.
 *
 * Deliberately the same keys as `SCORE_SCALE`, for the reason that list gives:
 * scoring converts IELTS bands and SAT scaled scores and nothing else, and every
 * other attempt reports a plain percentage. A sentence promising a scale the
 * engine cannot produce is exactly what `SCORE_SCALE` was trimmed to stop
 * saying, so the two move together — `paper-copy.test.ts` fails if they drift.
 */
export const RESULT_SENTENCE: Readonly<Record<string, string>> = {
  ielts: 'Nəticə rəsmi çevirmə cədvəli ilə 0–9 band şkalasında göstərilir.',
  sat: 'Nəticə 400–1600 şkala balı ilə göstərilir.',
};

const PERCENT_RESULT = 'Nəticə düzgün cavabların faizi ilə göstərilir.';

/**
 * The "Sınaq haqqında" paragraphs: what the paper contains, then what happens
 * once it has been taken.
 *
 * Modules are named by BAND — the labels the timeline's legend uses — so a SAT
 * paper reads "Reading & Writing və Math" rather than listing four modules
 * that differ only by a trailing number.
 */
export function paperAbout(exam: PublicExam): [contents: string, afterwards: string] {
  const bands = structureOf(exam).bands.map((band) => band.label);
  const breakMinutes = exam.modules.reduce((sum, m) => sum + m.breakAfterMinutes, 0);

  const contents = [
    bands.length > 0 &&
      `Sınaq ${exam.modules.length} moduldan ibarətdir və ${joinAz(bands)} ` +
        `${bands.length === 1 ? 'bölməsini' : 'bölmələrini'} əhatə edir.`,
    // `durationMinutes` includes the breaks; the figure row above subtracts
    // them the same way, so the two numbers on the page agree.
    `Ümumilikdə ${exam.totalQuestions} sual var və cavablamaq üçün ` +
      `${exam.durationMinutes - breakMinutes} dəqiqə verilir.`,
    breakMinutes > 0 && `Modullar arasında cəmi ${breakMinutes} dəqiqə fasilə nəzərdə tutulub.`,
  ];

  const afterwards = [
    RESULT_SENTENCE[exam.type] ?? PERCENT_RESULT,
    'Hər cəhddən sonra cavablarınızı izahatlarla birlikdə kabinetinizdə nəzərdən keçirə bilərsiniz.',
    'Sınağa giriş müddətsizdir və onu istədiyiniz qədər təkrar edə bilərsiniz — hər cəhdin nəticəsi ayrıca saxlanılır.',
  ];

  return [contents.filter(Boolean).join(' '), afterwards.join(' ')];
}

/**
 * What a hub page covers, for the sentence that links a paper to it.
 *
 * Read off the record, because the three Azerbaijani hubs deliberately render
 * no format or scoring section (see `exam-content.ts`), and a link promising one
 * would send the reader to a page without it.
 */
export function hubTopics(content: Pick<ExamTypeContent, 'facts' | 'scoring' | 'faq'>): string {
  return joinAz([
    'ümumi məlumat',
    ...(content.facts.length > 0 ? ['format'] : []),
    ...(content.scoring.length > 0 ? ['bal hesablanması'] : []),
    ...(content.faq.length > 0 ? ['tez-tez verilən suallar'] : []),
  ]);
}

/** How many other papers of the same programme a paper page lists. */
export const SIBLING_LIMIT = 6;

/**
 * The other papers of this paper's programme, in the order its hub lists them.
 *
 * A paper used to link only upward — to its hub, through the breadcrumb — so
 * its incoming links were the catalog and the hub and nothing else, and nothing
 * tied General English A1 to A2. Listing the siblings gives each paper a link
 * from every other paper of its programme, which is also the next thing a
 * candidate looking at one level wants to see.
 *
 * Capped, with `more` set when the hub has papers this list leaves out, so a
 * programme with thirty papers points at its hub instead of printing all of
 * them on every one.
 */
export function siblingPapers(
  catalog: readonly PublicExam[],
  paper: Pick<PublicExam, 'id' | 'type'>,
  limit = SIBLING_LIMIT,
): { shown: PublicExam[]; more: boolean } {
  const siblings = registerOrder(catalog, paper.type).filter((exam) => exam.id !== paper.id);
  return { shown: siblings.slice(0, limit), more: siblings.length > limit };
}
