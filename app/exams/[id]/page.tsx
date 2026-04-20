import { notFound } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ArrowLeft, CheckCircle2, ShoppingCart, Clock, HelpCircle, Coffee, Shield, Zap, RefreshCw, LayoutDashboard } from 'lucide-react';
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

  const description = exam.description || `${exam.title} sınaq imtahanı. ${exam.totalQuestions} sual, ${exam.durationMinutes} dəqiqə. Məşqçidə hazırlaşın.`;

  return {
    title: exam.title,
    description,
    alternates: { canonical: `/exams/${id}` },
    openGraph: {
      title: `${exam.title} — Məşqçi`,
      description,
      url: `/exams/${id}`,
      type: 'website',
    },
    twitter: {
      title: `${exam.title} — Məşqçi`,
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
  const totalBreak   = exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
  const examTime     = exam.durationMinutes - totalBreak;

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
      <main className="pt-16 min-h-screen bg-surface-subtle">
        <section className="px-6 py-14 bg-surface border-b border-outline-variant">
          <div className="max-w-5xl mx-auto">
            <Link href="/exams" className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-secondary mb-8 transition-colors">
              <ArrowLeft size={18} /> Bütün sınaqlara qayıt
            </Link>

            <div className="flex flex-col md:flex-row gap-12 items-start">
              {/* Left: Info */}
              <div className="flex-1">
                <span className="inline-flex items-center py-1 px-3 bg-secondary-fixed text-on-secondary-fixed text-xs font-bold rounded-full mb-4">
                  {exam.tag}
                </span>
                <h1 className="text-4xl lg:text-5xl font-extrabold font-headline text-primary mb-6 leading-tight">{exam.title}</h1>
                <p className="text-lg text-on-surface-variant leading-relaxed mb-8">{exam.description}</p>

                {/* Features */}
                {exam.features.length > 0 && (
                  <>
                    <h3 className="text-base font-bold text-primary mb-4 font-headline">Nələr daxildir:</h3>
                    <ul className="space-y-3 mb-8">
                      {exam.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3 text-on-surface-variant text-sm">
                          <CheckCircle2 className="text-secondary shrink-0 mt-0.5" size={20} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Stats */}
                <div className="tc-card p-6 mb-6">
                  <h3 className="font-bold text-primary mb-5 font-headline text-sm uppercase tracking-wider">Sınaq haqqında</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-black text-primary">{exam.totalQuestions}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Sual</p>
                    </div>
                    <div className="border-x border-outline-variant">
                      <p className="text-3xl font-black text-secondary">{examTime}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Dəqiqə</p>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-primary">∞</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Yenidən cəhd</p>
                    </div>
                  </div>
                </div>

                {/* Module breakdown */}
                {exam.modules.length > 0 && (
                  <div className="tc-card p-6">
                    <h3 className="font-bold text-primary mb-4 font-headline text-sm uppercase tracking-wider">İmtahan strukturu</h3>
                    <div className="space-y-3">
                      {exam.modules.map((mod, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between py-3 px-4 bg-surface-container-low rounded-xl">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-md editorial-gradient text-white text-[10px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                              <div>
                                <p className="text-sm font-bold text-primary">{mod.name}</p>
                                {mod.isAdaptive && (
                                  <span className="text-[10px] font-bold text-secondary">Adaptiv</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-on-surface-variant">
                              {mod.questions > 0 && (
                                <span className="flex items-center gap-1"><HelpCircle size={12} />{mod.questions} sual</span>
                              )}
                              <span className="flex items-center gap-1 font-semibold text-primary"><Clock size={12} />{mod.durationMinutes} dəq</span>
                            </div>
                          </div>
                          {mod.breakAfterMinutes > 0 && (
                            <div className="flex items-center gap-2 py-2 px-4 text-xs text-on-surface-variant">
                              <Coffee size={11} className="text-secondary" />
                              <span>{mod.breakAfterMinutes} dəqiqəlik fasilə</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {totalBreak > 0 && (
                      <p className="text-xs text-on-surface-variant mt-3 pt-3 border-t border-outline-variant/20">
                        Fasilə daxil ümumi müddət: {exam.durationMinutes} dəq
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Purchase card */}
              <div className="w-full md:w-80 sticky top-24 flex-shrink-0 space-y-4">
                <div className="tc-card overflow-hidden shadow-xl">
                  <div className="h-1 w-full editorial-gradient" />
                  <div className="p-8">
                    {hasPurchased ? (
                      /* Already purchased state */
                      <>
                        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-outline-variant">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                            <CheckCircle2 size={20} className="text-green-600" />
                          </div>
                          <div>
                            <p className="font-bold text-primary text-sm">Artıq alınmışdır</p>
                            <p className="text-xs text-on-surface-variant mt-0.5">Bu sınağa girişiniz var</p>
                          </div>
                        </div>

                        <div className="space-y-3 mb-8 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-on-surface-variant"><Clock size={14} /> Müddət</span>
                            <span className="font-bold text-primary">{examTime} dəq</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-on-surface-variant"><HelpCircle size={14} /> Suallar</span>
                            <span className="font-bold text-primary">{exam.totalQuestions}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-on-surface-variant"><RefreshCw size={14} /> Yenidən cəhd</span>
                            <span className="font-bold text-secondary">Limitsiz</span>
                          </div>
                        </div>

                        <Link
                          href="/dashboard"
                          className="w-full flex items-center justify-center gap-2 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-base transition-colors shadow-lg"
                        >
                          <LayoutDashboard size={20} /> Paneldən başla
                        </Link>
                        <p className="text-xs text-center text-on-surface-variant mt-3">Paneldən sınağa başlaya bilərsiniz</p>
                      </>
                    ) : (
                      /* Not purchased state */
                      <>
                        <div className="mb-6 pb-6 border-b border-outline-variant">
                          <span className="block text-on-surface-variant font-medium text-xs uppercase tracking-wider mb-3">Giriş haqqı</span>
                          <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black text-primary">{exam.price}</span>
                            <span className="text-xl font-bold text-on-surface-variant">AZN</span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-2">Birdəfəlik ödəniş · Ömürlük giriş</p>
                        </div>

                        <div className="space-y-3 mb-8 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-on-surface-variant"><Clock size={14} /> Müddət</span>
                            <span className="font-bold text-primary">{examTime} dəq</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-on-surface-variant"><HelpCircle size={14} /> Suallar</span>
                            <span className="font-bold text-primary">{exam.totalQuestions}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-on-surface-variant"><Zap size={14} /> Modullar</span>
                            <span className="font-bold text-primary">{exam.modules.length}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-on-surface-variant"><RefreshCw size={14} /> Yenidən cəhd</span>
                            <span className="font-bold text-secondary">Limitsiz</span>
                          </div>
                        </div>

                        <Link
                          href={`/checkout/${exam.id}`}
                          className="w-full flex items-center justify-center gap-2 py-4 editorial-gradient text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg"
                        >
                          <ShoppingCart size={20} /> Giriş əldə et
                        </Link>

                        <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-on-surface-variant">
                          <Shield size={12} className="text-green-600" />
                          <span>Güvənli ödəniş · Dərhal giriş</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Feature pills */}
                {exam.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {exam.features.slice(0, 4).map((f, i) => (
                      <span key={i} className="flex items-center gap-1 text-[11px] font-semibold text-primary bg-white border border-outline-variant/50 px-3 py-1.5 rounded-full shadow-sm">
                        <CheckCircle2 size={11} className="text-secondary shrink-0" />{f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
