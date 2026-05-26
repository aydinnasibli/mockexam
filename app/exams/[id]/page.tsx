import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getExamById } from '@/lib/db/exams';
import { auth } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.testcentre.az';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const exam = await getExamById(id);
  if (!exam) return {};

  const description = exam.description || `${exam.title} sınaq imtahanı. ${exam.totalQuestions} sual, ${exam.durationMinutes} dəqiqə.`;

  return {
    title: exam.title,
    description,
    alternates: { canonical: `/exams/${id}` },
    openGraph: {
      title: `${exam.title} — Testcentre`,
      description,
      url: `/exams/${id}`,
      type: 'website',
    },
    twitter: {
      title: `${exam.title} — Testcentre`,
      description,
    },
  };
}

export default async function ExamDetails({ params }: Props) {
  const { id } = await params;
  const { userId } = await auth();

  await dbConnect();
  const [exam, purchase] = await Promise.all([
    getExamById(id),
    userId
      ? Purchase.findOne({ userId, examId: id, status: 'COMPLETED' }).lean()
      : null,
  ]);

  if (!exam) notFound();

  const hasPurchased = !!purchase;
  const totalBreak = exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
  const examTime = exam.durationMinutes - totalBreak;
  const isAdaptive = exam.modules.some(m => m.isAdaptive);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Ana səhifə', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'İmtahanlar', item: `${BASE_URL}/exams` },
      { '@type': 'ListItem', position: 3, name: exam.title, item: `${BASE_URL}/exams/${id}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Navbar />
      <main className="pt-18 min-h-screen bg-bg">

        {/* Breadcrumb */}
        <div style={{ borderBottom: '1px solid var(--color-rule)' }}>
          <div className="max-w-340 mx-auto px-8 py-4">
            <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--color-ink-mute)' }}>
              <Link href="/" className="hover:text-ink transition-colors">Ana</Link>
              <span>›</span>
              <Link href="/exams" className="hover:text-ink transition-colors">Sınaqlar</Link>
              <span>›</span>
              <span style={{ color: 'var(--color-ink)' }}>{exam.tag}</span>
            </div>
          </div>
        </div>

        <div className="max-w-340 mx-auto px-8 py-16">
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 48, alignItems: 'start' }}>

            {/* LEFT: Info */}
            <div>
              {/* Tag + title + desc */}
              <span className="tag tag-accent inline-block mb-6">{exam.tag}</span>
              <h1
                className="font-display font-normal m-0 mb-6 text-ink"
                style={{ fontSize: 'clamp(36px, 4.5vw, 56px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
              >
                {exam.title}
              </h1>
              <p className="t-lede m-0 mb-10" style={{ color: 'var(--color-ink-soft)' }}>
                {exam.description}
              </p>

              {/* 4-stat card */}
              <div className="mb-10" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 16, overflow: 'hidden' }}>
                <div className="grid grid-cols-4">
                  {[
                    { label: 'Müddət', value: `${examTime} dəq` },
                    { label: 'Suallar', value: String(exam.totalQuestions) },
                    { label: 'Modullar', value: String(exam.modules.length) },
                    { label: 'Format', value: isAdaptive ? 'Adaptive' : 'Standart' },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className="p-6"
                      style={{ borderRight: i < 3 ? '1px solid var(--color-rule)' : 'none' }}
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
                        <div className="flex items-start gap-5 pt-4 border-t border-rule">
                          <span
                            className="t-num shrink-0"
                            style={{ fontSize: 13, color: 'var(--color-ink)', minWidth: 28, paddingTop: 2 }}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium text-[15px] text-ink mb-0.5">{mod.name}</p>
                                {mod.isAdaptive && (
                                  <span className="text-[12px]" style={{ color: 'var(--color-ink-mute)' }}>
                                    Adaptive
                                  </span>
                                )}
                              </div>
                              <div
                                className="flex items-center gap-4 text-[13px] shrink-0"
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
                  <div className="grid grid-cols-2 gap-3">
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
            <div className="sticky" style={{ top: 96 }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 16, overflow: 'hidden' }}>

                {/* Dark header */}
                <div className="px-7 py-6" style={{ background: 'var(--color-ink)' }}>
                  <div className="eyebrow mb-2" style={{ color: 'rgba(250,250,246,0.45)' }}>Sifariş</div>
                  <p
                    className="text-[12px] mb-6"
                    style={{ color: 'rgba(250,250,246,0.35)', margin: '4px 0 20px' }}
                  >
                    {exam.tag} · {exam.id}
                  </p>

                  {hasPurchased ? (
                    <div>
                      <p className="text-[15px] font-medium m-0" style={{ color: 'var(--color-bg)' }}>
                        Artıq alınmışdır
                      </p>
                      <p className="text-[13px] mt-1 m-0" style={{ color: 'rgba(250,250,246,0.45)' }}>
                        Bu sınağa girişiniz var
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px]" style={{ color: 'rgba(250,250,246,0.5)' }}>Qiymət</span>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--color-bg)' }}>
                          {exam.price} ₼
                        </span>
                      </div>
                      <div
                        className="flex items-center justify-between"
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 16, marginBottom: 16 }}
                      >
                        <span className="text-[13px]" style={{ color: 'rgba(250,250,246,0.5)' }}>ƏDV daxil</span>
                        <span className="text-[13px]" style={{ color: 'rgba(250,250,246,0.3)' }}>—</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="font-display font-normal"
                          style={{ fontSize: 40, lineHeight: 1, color: 'var(--color-bg)', letterSpacing: '-0.025em' }}
                        >
                          {exam.price}
                        </span>
                        <span className="text-[16px]" style={{ color: 'rgba(250,250,246,0.45)' }}>AZN</span>
                      </div>
                    </>
                  )}
                </div>

                {/* CTA body */}
                <div className="px-7 py-6">
                  {hasPurchased ? (
                    <Link href="/dashboard" className="btn-primary w-full justify-center">
                      Paneldən başla <span className="arrow">→</span>
                    </Link>
                  ) : (
                    <>
                      <Link href={`/checkout/${exam.id}`} className="btn-primary w-full justify-center mb-4">
                        Giriş əldə et <span className="arrow">→</span>
                      </Link>
                      <p className="text-center text-[12px] m-0" style={{ color: 'var(--color-ink-mute)' }}>
                        Güvənli ödəniş · Dərhal giriş
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
