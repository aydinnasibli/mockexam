import type { Metadata } from 'next';
import 'katex/dist/katex.min.css';
import { notFound, permanentRedirect } from 'next/navigation';
import { getActiveExamsForPrerender, getExamById, type PublicExam } from '@/lib/db/exams';
import { getSampleQuestion } from '@/lib/db/questions';
import {
  BASE_URL, EXAM_TRAIL_ROOT, SITE_NAME, breadcrumbSchema, clampDescription, jsonLd, pageMetadata,
  type Crumb,
} from '@/lib/shared/seo';
import Breadcrumb from '@/components/ui/Breadcrumb';
import { examTypeLabel } from '@/lib/domain/exam-types';
import { examContent, examPath, typeForSlug, typePath, typeSlug } from '@/lib/domain/exam-content';
import { firstExamFreeEnabled } from '@/lib/db/free-claim';
import { renderMath } from '@/lib/shared/render-math';
import FadeUp from '@/components/ui/FadeUp';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerChildren';
import StructureBar from '@/components/ui/StructureBar';
import { SCORE_SCALE, examCodes, missingSections, pad2, shortTypeLabel, structureOf, upperLabel } from '../../structure';
import PurchaseCard from './PurchaseCard';
import { MONO_LABEL } from '@/components/ui/type-styles';

/**
 * Prerender every active paper under its own type.
 *
 * Returns BOTH segments, fully paired. This function is called once, with an
 * empty `params` — `[type]/page.tsx` is a sibling leaf, not an ancestor
 * segment, so its own `generateStaticParams` never feeds this one. (Next does
 * fan a child out across parent params, but only when the parent is a LAYOUT
 * in this route's tree. There is no layout at `[type]`.)
 *
 * Which makes the obvious-looking `filter((e) => typeSlug(e.type) ===
 * params.type)` a trap worth naming: `params.type` is `undefined` here, every
 * exam filters out, and an empty return leaves Next with no complete param set
 * for the route. It does not warn — it silently prerenders NOTHING and every
 * paper falls back to on-demand rendering. Measured: 0 prerendered paper routes
 * against the 4 this returns.
 */
export async function generateStaticParams() {
  try {
    // The build's shared catalog snapshot, so the papers prerendered here are
    // exactly the papers the pages render from. See `getActiveExamsForPrerender`.
    const exams = await getActiveExamsForPrerender();
    return exams.map((exam) => ({
      // The type SEGMENT is the slug, not the raw stored value: `general_english`
      // lives under `/exams/english-level/`, and an underscore has no business
      // in a URL.
      type: typeSlug(exam.type),
      id: exam.id,
    }));
  } catch {
    // No database at build time (CI): defer every path to first request.
    return [];
  }
}

export const revalidate = 3600;

interface Props {
  params: Promise<{ type: string; id: string }>;
}

/** Shorter than this is a label, not a description. See `examDescription`. */
const MIN_USEFUL_DESCRIPTION = 60;

/**
 * A usable meta description for an exam.
 *
 * The old code was `exam.description || <generated>`, which only caught an
 * empty string — the live SAT exam stored the description "SAT", a truthy
 * value that shipped as the page's entire meta description. Anything too short
 * to be a sentence gets the generated fallback instead.
 */
function examDescription(exam: PublicExam): string {
  const stored = exam.description?.trim() ?? '';
  const generated =
    `${exam.title} — ${examTypeLabel(exam.type)} imtahanına hazırlıq üçün rəsmi formata uyğun sınaq. ` +
    `${exam.totalQuestions} sual, ${exam.durationMinutes} dəqiqə, ${exam.modules.length} modul. ` +
    `Dərhal nəticə və hər sual üçün izahat.`;

  return clampDescription(stored.length >= MIN_USEFUL_DESCRIPTION ? stored : generated);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, id } = await params;

  // An unknown type segment cannot name a real paper; checking it first avoids
  // a database read for a URL that is already wrong.
  if (!typeForSlug(type)) return {};

  const exam = await getExamById(id);
  // No metadata for a mismatched type segment: that URL permanently redirects,
  // and describing it would advertise a canonical we are about to move away from.
  if (!exam || examPath(exam) !== `/exams/${type}/${id}`) return {};

  return pageMetadata({
    title: exam.title,
    description: examDescription(exam),
    path: examPath(exam),
    socialTitle: `${exam.title} — ${SITE_NAME}`,
    // `opengraph-image.tsx` next door. Its URL carries a hash suffix that only
    // Next can compute, so Next is left to write the tags.
    ownOgImage: true,
  });
}

/** Minutes per question, the derived column in the module table. */
function pace(minutes: number, questions: number): string {
  if (questions <= 0) return '—';
  return `${(minutes / questions).toFixed(2)}′`;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** How much of a reading passage the specimen panel prints before it elides. */
const PASSAGE_EXCERPT = 320;

/** Cuts at a sentence end where there is one nearby, so the excerpt does not
 *  stop mid-clause. */
function passageExcerpt(passage: string): string {
  const text = passage.trim();
  if (text.length <= PASSAGE_EXCERPT) return text;

  const window = text.slice(0, PASSAGE_EXCERPT);
  const stop = Math.max(window.lastIndexOf('. '), window.lastIndexOf('? '), window.lastIndexOf('! '));
  return stop > PASSAGE_EXCERPT * 0.6 ? `${window.slice(0, stop + 1)} […]` : `${window.trimEnd()}…`;
}

export default async function ExamPaper({ params }: Props) {
  const { type, id } = await params;
  if (!typeForSlug(type)) notFound();

  const exam = await getExamById(id);
  if (!exam) notFound();

  /*
   * The paper, insisted upon through its OWN type segment.
   *
   * `/exams/sat/ielts-academic-1` describes a paper that does not exist. Served
   * as-is it would be a second working URL for the same content — a duplicate
   * competing with the real one and splitting whatever ranking it earns, which
   * is the precise failure this whole restructure exists to remove.
   *
   * A mismatch is a permanent redirect rather than a 404: the paper is real and
   * the visitor should still reach it, while search engines are told plainly
   * which URL counts.
   */
  if (examPath(exam) !== `/exams/${type}/${id}`) permanentRedirect(examPath(exam));

  return <ExamDetails exam={exam} />;
}

/**
 * The paper itself. Takes the resolved exam rather than an id: the route above
 * has already loaded it to check the type segment, and re-reading it here would
 * be a second database round-trip for a record already in hand.
 */
async function ExamDetails({ exam }: { exam: PublicExam }) {
  const totalBreak = exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
  const examTime = exam.durationMinutes - totalBreak;
  const description = examDescription(exam);
  const structure = structureOf(exam);

  /** This paper's canonical path — the same one `generateMetadata` pins. */
  const url = examPath(exam);

  // Sections this paper does not simulate. Computed once: it is read twice
  // below, and it walks the module list each time.
  const absentSections = missingSections(exam.type, exam.modules);

  // The specimen comes from this exam's own bank; `moduleIndex` names the
  // module it sits in, when the exam still declares one at that index. The
  // catalog is read alongside it — neither query depends on the other, and in
  // sequence they were two round-trips where one wait would do.
  const [sample, allExams] = await Promise.all([
    getSampleQuestion(exam.id),
    // The prerender-aware read, as the rule in its own docblock requires: this
    // page prerenders and this call reads the catalog. `getActiveExams()` here
    // would fail a build that got its params through and then lost the database
    // — and the only thing riding on it is the display CODE, which already has
    // a per-type fallback below.
    getActiveExamsForPrerender(),
  ]);
  const sampleModule = sample ? exam.modules[sample.moduleIndex]?.name?.trim() : undefined;

  // The code is the one the catalog register prints, so a visitor arriving from
  // /exams sees the same identifier in the breadcrumb.
  // Short form: the breadcrumb bar sets 10px mono, where "General English
  // (CEFR)" would wrap the row.
  const typeLabel = examContent(exam.type)?.shortLabel ?? shortTypeLabel(exam.type, examTypeLabel(exam.type));

  const code = examCodes(allExams, (type) => shortTypeLabel(type, examTypeLabel(type))).get(exam.id)
    ?? shortTypeLabel(exam.type, examTypeLabel(exam.type));

  // Fourth figure: the program's published maximum where there is one,
  // otherwise the (unlimited) attempt allowance rather than an invented number.
  const scale = SCORE_SCALE[exam.type];
  const figures = [
    { value: `${examTime}′`, label: 'müddət' },
    { value: String(exam.totalQuestions), label: 'sual' },
    { value: pad2(exam.modules.length), label: 'modul' },
    scale ? { value: scale, label: 'maksimum bal' } : { value: '∞', label: 'cəhd' },
  ];

  /*
   * Four levels, not three. The paper genuinely sits under its type now, and
   * saying so is the point of nesting the route: it declares the topical
   * relationship between `/exams/ielts` and this paper, which a flat trail
   * could only imply. The type step is also the only internal link from a paper
   * back up to its programme page, which is what gives those pages a crawl path
   * from somewhere other than the footer.
   *
   * `short` on the last step: the bar sets 10px mono in one non-wrapping row,
   * where a full paper title would run off the end — so it prints the code the
   * register uses while the schema carries the real title.
   */
  const trail: Crumb[] = [
    ...EXAM_TRAIL_ROOT,
    { name: typeLabel, path: typePath(exam.type) },
    { name: exam.title, short: code, path: url },
  ];

  /*
   * These pages sell a named product at a fixed price with instant delivery,
   * which is exactly what Product/Offer describes — previously the only
   * structured data here was a breadcrumb, so none of that was machine-readable.
   * `priceValidUntil` is deliberately omitted: we have no scheduled price
   * change, and a stale date reads as an expired offer.
   */
  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: exam.title,
    description,
    category: `${examTypeLabel(exam.type)} sınaq imtahanı`,
    brand: { '@type': 'Brand', name: SITE_NAME },
    url: `${BASE_URL}${url}`,
    /*
     * The SITE card, not this paper's own.
     *
     * The per-paper card is a metadata-file route, and because this page sits
     * in a route group its URL carries a hash suffix Next derives at build
     * time (`getMetadataRouteSuffix`). Page code cannot know that suffix, and
     * the obvious `${url}/opengraph-image` is a 404 — which is what this line
     * used to emit. Reproducing Next's hashing here would be worse: it would
     * work until the day the route moved, then break silently again. The
     * site-wide card is a real 1200×630 image at a stable path, so Product
     * keeps a resolvable `image` and the per-paper card still reaches every
     * social platform through the `og:image` Next writes for us.
     */
    image: `${BASE_URL}/opengraph-image`,
    sku: exam.id,
    offers: {
      '@type': 'Offer',
      price: exam.price,
      priceCurrency: 'AZN',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: `${BASE_URL}${url}`,
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };

  /*
   * `Product` says this is a thing for sale; `Course` says what it actually is.
   * Both belong on the page — Google reads education rich results off Course,
   * and an answer engine asked "IELTS sınaq imtahanı hardan tapa bilərəm"
   * matches an educational program, not a SKU.
   *
   * Every value is derived from the paper's own record. `courseWorkload` is the
   * exam's real duration in ISO 8601, and `courseMode: 'online'` is simply true.
   * Nothing here is asserted that the page does not already state.
   */
  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: exam.title,
    description,
    url: `${BASE_URL}${url}`,
    inLanguage: 'az',
    provider: { '@type': 'EducationalOrganization', name: SITE_NAME, url: BASE_URL },
    about: `${examTypeLabel(exam.type)} imtahanına hazırlıq`,
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${exam.durationMinutes}M`,
      inLanguage: 'az',
    },
    offers: {
      '@type': 'Offer',
      price: exam.price,
      priceCurrency: 'AZN',
      availability: 'https://schema.org/InStock',
      url: `${BASE_URL}${url}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema(trail)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(courseSchema) }}
      />

        <Breadcrumb trail={trail} />

        <div className="shell pt-10 pb-24 lg:pt-16 lg:pb-28">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_360px] lg:gap-18">

            {/* ── Left: the specification ── */}
            <div className="min-w-0">
              <div className="mb-6 flex items-center gap-3">
                <span className={`${MONO_LABEL} text-label tracking-[0.16em] text-ink`}>{code}</span>
                <span className="h-1.25 w-1.25 rounded-full bg-correct" aria-hidden />
                <span className={`${MONO_LABEL} text-label text-ink-mute`}>açıq</span>
              </div>

              <h1 className="m-0 max-w-155 text-4xl leading-[0.98] font-light tracking-[-0.042em] text-ink md:text-5xl lg:text-6xl">
                {exam.title}
              </h1>

              {/* Key figures */}
              <div className="mt-10 grid grid-cols-2 border-t border-ink sm:grid-cols-4 lg:mt-12">
                {figures.map((figure, i) => (
                  <div
                    key={figure.label}
                    className={[
                      'py-4.5',
                      i === 0 ? 'pr-4.5' : 'px-4.5',
                      i < figures.length - 1 ? 'border-r border-rule' : '',
                      i < 2 ? 'border-b border-rule sm:border-b-0' : '',
                      i === 1 ? 'sm:border-r' : '',
                      i === 3 ? 'border-r-0 pr-0' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <div className="font-mono text-heading font-light tracking-[-0.03em] tabular-nums text-ink lg:text-heading-lg">
                      {figure.value}
                    </div>
                    <div className={`${MONO_LABEL} mt-1.5 text-ink-mute`}>{figure.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Timeline ── */}
              {structure.total > 0 && (
                <FadeUp className="mt-14 lg:mt-18">
                  {/* Same wrap rule as the Nümunə heading below — this label is
                      short today, but it is built from exam data too. */}
                  <div className="mb-7 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="m-0 text-2xl font-light tracking-[-0.03em] text-ink lg:text-heading-lg">
                      Vaxt xətti
                    </h2>
                    {totalBreak > 0 && (
                      <span className={`${MONO_LABEL} min-w-0 text-ink-mute`}>
                        fasilə daxil {exam.durationMinutes}′
                      </span>
                    )}
                  </div>

                  <StructureBar
                    blocks={structure.blocks}
                    total={structure.total}
                    heightClass="h-11 lg:h-14"
                    gapClass="gap-0.75"
                    labelBreaks
                    figureClass="px-3.5 font-mono text-label"
                  />

                  {/* Labels track the same flex ratios, so each sits under its
                      own block. */}
                  <div className="mt-2.5 flex gap-0.75">
                    {structure.blocks.map((block, i) => (
                      <div key={i} className="min-w-1 overflow-hidden" style={{ flex: block.minutes }}>
                        <span className={`${MONO_LABEL} block truncate text-ink-mute`}>{upperLabel(block.label)}</span>
                      </div>
                    ))}
                  </div>

                </FadeUp>
              )}

              {/* ── Module table ── */}
              {exam.modules.length > 0 && (
                <div className="mt-14 lg:mt-18">
                  <div className={`${MONO_LABEL} grid grid-cols-[32px_1fr_64px] gap-4 border-t border-ink pt-2.75 pb-2.75 text-ink-mute sm:grid-cols-[44px_1fr_92px_76px_110px] sm:gap-5`}>
                    <span>№</span>
                    <span>Modul</span>
                    <span className="hidden text-right sm:block">Sual</span>
                    <span className="text-right">Vaxt</span>
                    <span className="hidden text-right sm:block">Sual/dəq</span>
                  </div>

                  <StaggerContainer>
                  {exam.modules.map((mod, i) => (
                    <StaggerItem key={i}>
                      <div className="grid grid-cols-[32px_1fr_64px] items-center gap-4 border-b border-rule py-4 sm:grid-cols-[44px_1fr_92px_76px_110px] sm:gap-5">
                        <span className="font-mono text-xs text-ink-mute">{pad2(i + 1)}</span>
                        <span className="min-w-0 text-body font-medium text-ink sm:text-base">
                          {mod.name}
                        </span>
                        <span className="hidden text-right font-mono text-sm text-ink-soft sm:block">
                          {mod.questions > 0 ? mod.questions : '—'}
                        </span>
                        <span className="text-right font-mono text-sm text-ink">{mod.durationMinutes}′</span>
                        <span className="hidden text-right font-mono text-sm text-ink-mute sm:block">
                          {pace(mod.durationMinutes, mod.questions)}
                        </span>
                      </div>
                      {mod.breakAfterMinutes > 0 && (
                        <div className="grid grid-cols-[32px_1fr] gap-4 border-b border-rule bg-surface-2 py-2.75 sm:grid-cols-[44px_1fr] sm:gap-5">
                          <span aria-hidden />
                          <span className={`${MONO_LABEL} text-ink-mute`}>
                            {mod.breakAfterMinutes}′ fasilə
                          </span>
                        </div>
                      )}
                    </StaggerItem>
                  ))}
                  </StaggerContainer>

                  {/*
                    Stated before purchase, not discovered during the exam. A
                    section we do not offer is a real difference from the exam
                    being simulated, and burying it would be the kind of thing a
                    candidate finds out at the worst possible moment.
                  */}
                  {absentSections.length > 0 && (
                    <p className="mt-5 text-body text-ink-soft">
                      <span className={`${MONO_LABEL} mr-2 text-ink-mute`}>Qeyd</span>
                      Bu sınaqda {absentSections.join(', ')} bölməsi yoxdur.
                      Qalan bölmələr tam formatda verilir və bal yalnız həmin bölmələr üzrə hesablanır.
                    </p>
                  )}
                </div>
              )}

              {/* ── Sample question ──
                  A real question from this exam's own bank — the first scorable
                  MCQ in module order — so an IELTS page shows an IELTS question.
                  The panel is omitted rather than filled with an illustration
                  when the bank holds nothing suitable. */}
              {sample && (
                <FadeUp className="mt-14 lg:mt-18">
                  {/* `flex-wrap` + a shrinkable label, not `shrink-0`: the module
                      name is exam data, and a long one ("READING & WRITING —
                      MODULE 1") measured 340px against the 327px mobile content
                      column, pushing the whole document 92px wide at 390px. It
                      still sits on the headline's baseline wherever it fits. */}
                  <div className="mb-6 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h2 className="m-0 text-2xl font-light tracking-[-0.03em] text-ink lg:text-heading-lg">Nümunə</h2>
                    <span className={`${MONO_LABEL} min-w-0 text-ink-mute`}>
                      {sampleModule ? `${upperLabel(sampleModule)} · ` : ''}
                      {exam.totalQuestions} sualdan biri
                    </span>
                  </div>

                  <div className={`grid overflow-hidden rounded-panel border border-rule bg-surface ${
                    sample.explanation ? 'lg:grid-cols-[1fr_260px]' : ''
                  }`}>
                    <div className="border-b border-rule px-5 py-6 lg:border-r lg:border-b-0 lg:px-6">
                      {/* Passage-based questions are unreadable without their
                          text, but the panel is a specimen, not a reading task —
                          so it carries the opening of the passage only. */}
                      {sample.passage && (
                        <div className="mb-5 border-l-2 border-rule pl-4">
                          <div className={`${MONO_LABEL} mb-2 text-ink-mute`}>Mətn</div>
                          <p
                            className="m-0 text-body leading-[1.6] text-ink-soft"
                            dangerouslySetInnerHTML={{ __html: renderMath(passageExcerpt(sample.passage)) }}
                          />
                        </div>
                      )}

                      <p
                        className="m-0 mb-5 text-lg leading-[1.45] text-ink"
                        dangerouslySetInnerHTML={{ __html: renderMath(sample.stem) }}
                      />

                      <div className="grid gap-1.75 sm:grid-cols-2">
                        {sample.options.map((option, i) => {
                          const correct = i === sample.correctIndex;
                          return (
                            <div
                              key={i}
                              className={`flex items-baseline gap-3 rounded-btn border px-3.5 py-2.75 ${
                                correct ? 'border-correct bg-correct' : 'border-rule'
                              }`}
                            >
                              <span className={`font-mono text-label ${correct ? 'text-bg/60' : 'text-ink-mute'}`}>
                                {OPTION_KEYS[i] ?? i + 1}
                              </span>
                              <span
                                className={`min-w-0 text-body ${correct ? 'text-bg' : 'text-ink'}`}
                                dangerouslySetInnerHTML={{ __html: renderMath(option) }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {sample.explanation && (
                      <div className="bg-surface-2 px-5 py-6 lg:px-5.5">
                        <div className={`${MONO_LABEL} mb-3.5 text-ink-mute`}>İzahat</div>
                        <p
                          className="m-0 text-sm leading-[1.65] text-ink"
                          dangerouslySetInnerHTML={{ __html: renderMath(sample.explanation) }}
                        />
                      </div>
                    )}
                  </div>
                </FadeUp>
              )}
            </div>

            {/* ── Right: purchase rail ── */}
            <div className="min-w-0 lg:sticky lg:top-6">
              <PurchaseCard
                examId={exam.id}
                price={exam.price}
                features={exam.features}
                promoActive={firstExamFreeEnabled()}
              />
            </div>
          </div>
        </div>
    </>
  );
}
