import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { mockExams } from "@/lib/data";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShoppingCart } from "lucide-react";

export default async function ExamDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const exam = mockExams.find(e => e.id === resolvedParams.id);

  if (!exam) return notFound();

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-surface-subtle">
        <section className="px-6 py-14 bg-surface border-b border-outline-variant">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/exams"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-secondary mb-8 transition-colors"
            >
              <ArrowLeft size={18} />
              Bütün sınaqlara qayıt
            </Link>

            <div className="flex flex-col md:flex-row gap-12 items-start">
              {/* Left: Info */}
              <div className="flex-1">
                <span className="inline-flex items-center py-1 px-3 bg-secondary-fixed text-on-secondary-fixed text-xs font-bold rounded-full mb-4">
                  {exam.tag}
                </span>
                <h1 className="text-4xl lg:text-5xl font-extrabold font-headline text-primary mb-6 leading-tight">
                  {exam.title}
                </h1>
                <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
                  {exam.description}
                </p>

                <h3 className="text-base font-bold text-primary mb-4 font-headline">Nələr daxildir:</h3>
                <ul className="space-y-3 mb-8">
                  {exam.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-on-surface-variant text-sm">
                      <CheckCircle2 className="text-secondary shrink-0 mt-0.5" size={20} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Stats */}
                <div className="tc-card p-6">
                  <h3 className="font-bold text-primary mb-5 font-headline text-sm uppercase tracking-wider">Sınaq haqqında</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-black text-primary">{exam.totalQuestions}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Sual</p>
                    </div>
                    <div className="border-x border-outline-variant">
                      <p className="text-3xl font-black text-secondary">{exam.durationMinutes}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Dəqiqə</p>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-primary">∞</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Yenidən cəhd</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Purchase card */}
              <div className="w-full md:w-80 tc-card p-8 shadow-xl sticky top-24 flex-shrink-0">
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
                    <span className="text-on-surface-variant">Müddət</span>
                    <span className="font-bold text-primary">{exam.durationMinutes} dəq</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Suallar</span>
                    <span className="font-bold text-primary">{exam.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Yenidən cəhd</span>
                    <span className="font-bold text-secondary">Limitsiz</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Analitika</span>
                    <span className="font-bold text-secondary">Daxildir</span>
                  </div>
                </div>

                <Link
                  href={`/checkout/${exam.id}`}
                  className="w-full flex items-center justify-center gap-2 py-4 editorial-gradient text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg"
                >
                  <ShoppingCart size={20} />
                  Giriş əldə et
                </Link>
                <p className="text-xs text-center text-on-surface-variant mt-4">
                  Ödənişdən dərhal sonra giriş
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
