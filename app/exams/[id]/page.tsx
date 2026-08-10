import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getActiveExams, getExamById, type PublicExam } from '@/lib/db/exams';
import { BASE_URL, SITE_NAME, clampDescription, pageMetadata } from '@/lib/seo';
import { examTypeLabel } from '@/lib/exam-types';
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

export default async function ExamDetails({ params }: Props) {
  const { id } = await params;
  const exam = await getExamById(id);

  if (!exam) notFound();

  const totalBreak = exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
  const examTime = exam.durationMinutes - totalBreak;
  const isAdaptive = exam.modules.some(m => m.isAdaptive);
  const description = examDescription(exam);

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
      <main className="pt-18 min-h-screen bg-bg">

        {/* Breadcrumb */}
        <div style={{ borderBottom: '1px solid var(--color-rule)' }}>
          <div className="max-w-340 mx-auto px-4 sm:px-8 py-4">
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-ink-mute)' }}>
              <Link href="/" className="hover:text-ink transition-colors">Ana</Link>
              <span>›</span>
              <Link href="/exams" className="hover:text-ink transition-colors">Sınaqlar</Link>
              <span>›</span>
              <span style={{ color: 'var(--color-ink)' }}>{exam.tag}</span>
            </div>
          </div>
        </div>

        <div className="max-w-340 mx-auto px-4 sm:px-8 py-10 sm:py-16">
          {/*
            Was a hard-coded `gridTemplateColumns: '1.6fr 1fr'` with no
            breakpoint, which forced a two-column layout onto phones: the page
            overflowed to 424px at a 375px viewport and the order card — the
            only conversion element — was clipped off the right edge. Single
            column below `lg`.
          */}
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-10 lg:gap-12 items-start">

            {/* LEFT: Info */}
            <div className="min-w-0">
              {/* Tag + title + desc */}
              <span className="tag tag-accent inline-block mb-6">{exam.tag}</span>
              <h1
                className="font-display font-normal m-0 mb-6 text-ink"
                style={{ fontSize: 'clamp(30px, 4.5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                {exam.title}
              </h1>
              <p className="t-lede m-0 mb-10" style={{ color: 'var(--color-ink-soft)' }}>
                {exam.description}
              </p>

              {/* 4-stat card */}
              <div className="mb-10" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 16, overflow: 'hidden' }}>
                {/*
                  2×2 on phones, 1×4 from `sm`. Rules are placed per cell for
                  each layout: on mobile between the two columns and under the
                  first row, from `sm` only between columns.
                */}
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  {[
                    { label: 'Müddət', value: `${examTime} dəq` },
                    { label: 'Suallar', value: String(exam.totalQuestions) },
                    { label: 'Modullar', value: String(exam.modules.length) },
                    { label: 'Format', value: isAdaptive ? 'Adaptive' : 'Standart' },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className={[
                        'p-5 sm:p-6 border-rule',
                        i % 2 === 0 ? 'border-r' : '',
                        i < 2 ? 'border-b sm:border-b-0' : '',
                        i < 3 ? 'sm:border-r' : 'sm:border-r-0',
                      ].filter(Boolean).join(' ')}
                    >
                      <div className="eyebrow mb-2">{stat.label}</div>
                      <div className="t-num text-ink" style={{ fontSize: 22 }}>{stat.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Module structure */}
              {exam.modules.length > 0 && (
                <div className="mb-10">
                  <h2
                    className="font-display font-normal m-0 mb-8 text-ink"
                    style={{ fontSize: 26, letterSpacing: '-0.01em' }}
                  >
                    Sınaq strukturu
                  </h2>
                  <div className="space-y-0">
                    {exam.modules.map((mod, i) => (
                      <div key={i}>
                        <div className="flex items-start gap-4 sm:gap-5 pt-4 border-t border-rule">
                          <span
                            className="t-num shrink-0"
                            style={{ fontSize: 13, color: 'var(--color-ink)', minWidth: 28, paddingTop: 2 }}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 pb-4 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0">
                                <p className="font-medium text-[15px] text-ink mb-0.5">{mod.name}</p>
                                {mod.isAdaptive && (
                                  <span className="text-[12px]" style={{ color: 'var(--color-ink-mute)' }}>
                                    Adaptive
                                  </span>
                                )}
                              </div>
                              <div
                                className="flex items-center gap-3 sm:gap-4 text-[13px] shrink-0"
                                style={{ color: 'var(--color-ink-mute)' }}
                              >
                                {mod.questions > 0 && <span>{mod.questions} sual</span>}
                                <span className="font-medium text-ink">{mod.durationMinutes} dəq</span>
                              </div>
                            </div>
                            {mod.breakAfterMinutes > 0 && (
                              <p className="text-[12px] mt-2 mb-0" style={{ color: 'var(--color-ink-mute)' }}>
                                {mod.breakAfterMinutes} dəqiqəlik fasilə
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {totalBreak > 0 && (
                      <p className="text-[12px] pt-4 border-t border-rule" style={{ color: 'var(--color-ink-mute)' }}>
                        Fasilə daxil ümumi müddət: {exam.durationMinutes} dəq
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Features / Benefits */}
              {exam.features.length > 0 && (
                <div>
                  <h2
                    className="font-display font-normal m-0 mb-8 text-ink"
                    style={{ fontSize: 26, letterSpacing: '-0.01em' }}
                  >
                    Daxildir
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {exam.features.map((feature, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4 rounded-xl"
                        style={{ background: 'var(--color-surface-2)' }}
                      >
                        <span className="shrink-0 font-medium text-[14px] text-ink mt-0.5">✓</span>
                        <span className="text-[14px] leading-normal text-ink">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Order card */}
            <div className="lg:sticky min-w-0" style={{ top: 96 }}>
              <PurchaseCard examId={exam.id} tag={exam.tag} price={exam.price} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
