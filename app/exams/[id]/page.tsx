import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getActiveExams, getExamById, type PublicExam } from '@/lib/db/exams';
import { BASE_URL, SITE_NAME, clampDescription, pageMetadata } from '@/lib/seo';
import { examTypeLabel } from '@/lib/exam-types';
import FadeUp from '@/components/ui/FadeUp';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerChildren';
import StructureBar from '@/components/ui/StructureBar';
import { SCORE_SCALE, examCodes, pad2, shortTypeLabel, structureOf } from '../structure';
import PurchaseCard from './PurchaseCard';

/**
 * Prerender every active exam at build time; anything added later is rendered
 * on demand and then cached (`dynamicParams` defaults to true). Combined with
 * moving the purchase check into a client component, this takes the page off
 * the "uncacheable, two Mongo queries per request" path it was on.
 */
export async function generateStaticParams() {
  const exams = await getActiveExams();
  return exams.map((exam) => ({ id: exam.id }));
}

export const revalidate = 3600;

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * A usable meta description for an exam.
 *
 * The old code was `exam.description || <generated>`, which only caught an
 * empty string — the live SAT exam stored the description "SAT", a truthy
 * value that shipped as the page's entire meta description. Anything too short
 * to be a sentence gets the generated fallback instead.
 */
const MIN_USEFUL_DESCRIPTION = 60;

const MONO_LABEL = 'font-mono text-[10px] tracking-[0.14em] uppercase';

function examDescription(exam: PublicExam): string {
  const stored = exam.description?.trim() ?? '';
  const generated =
    `${exam.title} — ${examTypeLabel(exam.type)} imtahanına hazırlıq üçün rəsmi formata uyğun sınaq. ` +
    `${exam.totalQuestions} sual, ${exam.durationMinutes} dəqiqə, ${exam.modules.length} modul. ` +
    `Dərhal nəticə və hər sual üçün izahat.`;

  return clampDescription(stored.length >= MIN_USEFUL_DESCRIPTION ? stored : generated);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const exam = await getExamById(id);
  if (!exam) return {};

  return pageMetadata({
    title: exam.title,
    description: examDescription(exam),
    path: `/exams/${id}`,
    socialTitle: `${exam.title} — ${SITE_NAME}`,
    ogImagePath: `/exams/${id}/opengraph-image`,
    ogImageAlt: `${exam.title} — ${exam.totalQuestions} sual, ${exam.durationMinutes} dəqiqə`,
  });
}

/** Minutes per question, the derived column in the module table. */
function pace(minutes: number, questions: number): string {
  if (questions <= 0) return '—';
  return `${(minutes / questions).toFixed(2)}′`;
}

export default async function ExamDetails({ params }: Props) {
  const { id } = await params;
  const exam = await getExamById(id);

  if (!exam) notFound();

  const totalBreak = exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
  const examTime = exam.durationMinutes - totalBreak;
  const isAdaptive = exam.modules.some(m => m.isAdaptive);
  const description = examDescription(exam);
  const structure = structureOf(exam);

  // The code is the one the catalog register prints, so a visitor arriving from
  // /exams sees the same identifier in the breadcrumb.
  const allExams = await getActiveExams();
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

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana səhifə', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'İmtahanlar', item: `${BASE_URL}/exams` },
      { '@type': 'ListItem', position: 3, name: exam.title, item: `${BASE_URL}/exams/${id}` },
    ],
  };

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
    url: `${BASE_URL}/exams/${id}`,
    image: `${BASE_URL}/exams/${id}/opengraph-image`,
    sku: exam.id,
    offers: {
      '@type': 'Offer',
      price: exam.price,
      priceCurrency: 'AZN',
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      url: `${BASE_URL}/exams/${id}`,
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <Navbar />
      <main className="min-h-screen bg-bg">

        {/* ── Breadcrumb ── */}
        <div className="border-b border-rule">
          <div className={`${MONO_LABEL} mx-auto flex w-full max-w-320 items-center gap-2.5 px-6 py-3.25 text-ink-mute lg:px-10`}>
            <Link href="/" className="transition-colors hover:text-ink">Ana</Link>
            <span aria-hidden>/</span>
            <Link href="/exams" className="transition-colors hover:text-ink">Kataloq</Link>
            <span aria-hidden>/</span>
            <span className="text-ink">{code}</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-320 px-6 pt-10 pb-24 lg:px-10 lg:pt-16 lg:pb-28">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_360px] lg:gap-18">

            {/* ── Left: the specification ── */}
            <div className="min-w-0">
              <div className="mb-6 flex items-center gap-3">
                <span className={`${MONO_LABEL} text-[11px] tracking-[0.16em] text-ink`}>{code}</span>
                <span className="h-1.25 w-1.25 rounded-full bg-correct" aria-hidden />
                <span className={`${MONO_LABEL} text-[11px] text-ink-mute`}>açıq</span>
              </div>

              <h1 className="m-0 max-w-155 text-[36px] leading-[0.98] font-light tracking-[-0.042em] text-ink md:text-5xl lg:text-6xl">
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
                    <div className="font-mono text-[28px] font-light tracking-[-0.03em] tabular-nums text-ink lg:text-[34px]">
                      {figure.value}
                    </div>
                    <div className={`${MONO_LABEL} mt-1.5 text-ink-mute`}>{figure.label}</div>
                  </div>
                ))}
              </div>

              {/* ── Timeline ── */}
              {structure.total > 0 && (
                <FadeUp className="mt-14 lg:mt-18">
                  <div className="mb-7 flex items-baseline justify-between gap-4">
                    <h2 className="m-0 text-2xl font-light tracking-[-0.03em] text-ink lg:text-[32px]">
                      Vaxt xətti
                    </h2>
                    {totalBreak > 0 && (
                      <span className={`${MONO_LABEL} shrink-0 text-ink-mute`}>
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
                    figureClass="px-3.5 font-mono text-[11px]"
                  />

                  {/* Labels track the same flex ratios, so each sits under its
                      own block. */}
                  <div className="mt-2.5 flex gap-0.75">
                    {structure.blocks.map((block, i) => (
                      <div key={i} className="min-w-1 overflow-hidden" style={{ flex: block.minutes }}>
                        <span className={`${MONO_LABEL} block truncate text-ink-mute`}>{block.label}</span>
                      </div>
                    ))}
                  </div>

                  {isAdaptive && (
                    <div className="mt-5 flex items-center gap-2">
                      <span className="font-mono text-[10px] text-ink-mute" aria-hidden>△</span>
                      <span className="text-sm text-ink-soft">
                        çətinlik əvvəlki modulun nəticəsinə görə seçilir
                      </span>
                    </div>
                  )}
                </FadeUp>
              )}

              {/* ── Module table ── */}
              {exam.modules.length > 0 && (
                <div className="mt-14 lg:mt-18">
                  <div className={`${MONO_LABEL} grid grid-cols-[32px_1fr_64px] gap-4 border-t border-ink pt-2.75 pb-2.75 text-[9px] tracking-[0.16em] text-ink-mute sm:grid-cols-[44px_1fr_92px_76px_110px] sm:gap-5`}>
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
                        <span className="min-w-0 text-[15px] font-medium text-ink sm:text-base">
                          {mod.name}
                          {mod.isAdaptive && (
                            <span className={`${MONO_LABEL} ml-2 text-[10px] tracking-[0.12em] text-ink-mute`}>
                              adaptive
                            </span>
                          )}
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
                </div>
              )}

              {/* ── Sample question ──
                  A specimen, not a question from this paper's bank: the bank
                  is the product, so nothing from it is printed on a public
                  page. It is the same illustration the home page carries. */}
              <FadeUp className="mt-14 lg:mt-18">
                <div className="mb-6 flex items-baseline justify-between gap-4">
                  <h2 className="m-0 text-2xl font-light tracking-[-0.03em] text-ink lg:text-[32px]">Nümunə</h2>
                  <span className={`${MONO_LABEL} shrink-0 text-ink-mute`}>
                    {exam.totalQuestions} sualdan biri
                  </span>
                </div>

                <div className="grid overflow-hidden rounded-[14px] border border-rule bg-surface lg:grid-cols-[1fr_260px]">
                  <div className="border-b border-rule px-5 py-6 lg:border-r lg:border-b-0 lg:px-6">
                    <p className="m-0 mb-5 text-[18px] leading-[1.45] text-ink">
                      If <span className="font-mono text-[17px]">ƒ(x) = 3x² − 5x + 2</span>, what is{' '}
                      <span className="font-mono text-[17px]">ƒ(−1)</span>?
                    </p>
                    <div className="grid gap-1.75 sm:grid-cols-2">
                      {[
                        { key: 'A', value: '−6', correct: false },
                        { key: 'B', value: '0',  correct: false },
                        { key: 'C', value: '10', correct: true  },
                        { key: 'D', value: '14', correct: false },
                      ].map((option) => (
                        <div
                          key={option.key}
                          className={`flex items-center gap-3 rounded-[9px] border px-3.5 py-2.75 ${
                            option.correct ? 'border-correct bg-correct' : 'border-rule'
                          }`}
                        >
                          <span className={`font-mono text-[11px] ${option.correct ? 'text-bg/60' : 'text-ink-mute'}`}>
                            {option.key}
                          </span>
                          <span className={`font-mono text-[15px] ${option.correct ? 'text-bg' : 'text-ink'}`}>
                            {option.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-surface-2 px-5 py-6 lg:px-5.5">
                    <div className={`${MONO_LABEL} mb-3.5 text-[9px] tracking-[0.16em] text-ink-mute`}>İzahat</div>
                    <div className="flex flex-col">
                      {[
                        { step: '3(−1)² = 3',  last: false },
                        { step: '−5(−1) = +5', last: false },
                        { step: '= 10',        last: true  },
                      ].map((row) => (
                        <span
                          key={row.step}
                          className={`border-t border-[#E4E0D6] py-2 font-mono text-sm ${
                            row.last ? 'border-b text-correct' : 'text-ink'
                          }`}
                        >
                          {row.step}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </FadeUp>
            </div>

            {/* ── Right: purchase rail ── */}
            <div className="min-w-0 lg:sticky lg:top-6">
              <PurchaseCard
                examId={exam.id}
                price={exam.price}
                features={exam.features}
              />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
