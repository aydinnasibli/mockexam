import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { mockExams } from "@/lib/data";
import { notFound } from "next/navigation";

export default async function ExamDetails({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const exam = mockExams.find(e => e.id === resolvedParams.id);

  if (!exam) return notFound();

  return (
    <>
      <Navbar />
      <main className="pt-24 min-h-screen bg-surface">
        <section className="px-6 py-16 bg-surface-container-lowest border-b border-outline-variant/20">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/exams"
              className="inline-flex items-center gap-1 text-sm font-bold text-on-surface-variant hover:text-primary mb-8 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Bütün sınaqlara qayıt
            </Link>

            <div className="flex flex-col md:flex-row gap-12 items-start">
              {/* Left: Info */}
              <div className="flex-1">
                <span className="inline-block py-1 px-3 bg-secondary-container text-on-secondary-container text-xs font-bold rounded-full mb-4">
                  {exam.tag}
                </span>
                <h1 className="text-4xl lg:text-5xl font-extrabold font-headline text-primary mb-6 leading-tight">
                  {exam.title}
                </h1>
                <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
                  {exam.description}
                </p>

                <h3 className="text-lg font-bold text-primary mb-4 font-headline">Bu sınağın üstünlükləri:</h3>
                <ul className="space-y-3 mb-8">
                  {exam.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-on-surface-variant">
                      <span className="material-symbols-outlined text-secondary text-xl mt-0.5">check_circle</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* What you get */}
                <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/20">
                  <h3 className="font-bold text-primary mb-4 font-headline">Nə əldə edirsiniz?</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-black text-primary">{exam.totalQuestions}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Sual</p>
                    </div>
                    <div className="text-center border-x border-outline-variant/20">
                      <p className="text-2xl font-black text-primary">{exam.durationMinutes}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Dəqiqə</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-secondary">∞</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Baxış</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Purchase card */}
              <div className="w-full md:w-80 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 shadow-xl sticky top-28 flex-shrink-0">
                <div className="mb-6 pb-6 border-b border-outline-variant/20">
                  <span className="block text-on-surface-variant font-medium text-sm mb-2">Sınağa giriş haqqı</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-primary">{exam.price}</span>
                    <span className="text-xl font-bold text-on-surface-variant">AZN</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2">Bir dəfəlik ödəniş · ömürlük giriş</p>
                </div>

                <div className="space-y-3 mb-8 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Müddət</span>
                    <span className="font-bold text-primary">{exam.durationMinutes} dəqiqə</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Sual sayı</span>
                    <span className="font-bold text-primary">{exam.totalQuestions} sual</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Yenidən başlama</span>
                    <span className="font-bold text-secondary">Limitsiz</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Nəticə analizi</span>
                    <span className="font-bold text-secondary">Daxildir</span>
                  </div>
                </div>

                <Link
                  href={`/checkout/${exam.id}`}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  İndi Satın Al
                </Link>
                <p className="text-xs text-center text-on-surface-variant mt-4">
                  Ödənişdən dərhal sonra hesabınıza əlavə olunacaq
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
