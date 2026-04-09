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
      <main className="pt-16 min-h-screen bg-surface-subtle">
        <section className="px-6 py-14 bg-surface border-b border-outline-variant">
          <div className="max-w-5xl mx-auto">
            <Link
              href="/exams"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-primary-mid mb-8 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Back to all exams
            </Link>

            <div className="flex flex-col md:flex-row gap-12 items-start">
              {/* Left: Info */}
              <div className="flex-1">
                <span className="inline-flex items-center py-1 px-3 bg-accent-container text-primary-mid text-xs font-bold rounded-full mb-4">
                  {exam.tag}
                </span>
                <h1 className="text-4xl lg:text-5xl font-extrabold font-headline text-primary mb-6 leading-tight">
                  {exam.title}
                </h1>
                <p className="text-lg text-on-surface-variant leading-relaxed mb-8">
                  {exam.description}
                </p>

                <h3 className="text-base font-bold text-primary mb-4 font-headline">What&apos;s included:</h3>
                <ul className="space-y-3 mb-8">
                  {exam.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-on-surface-variant text-sm">
                      <span className="material-symbols-outlined text-accent text-[20px] mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Stats */}
                <div className="tc-card p-6">
                  <h3 className="font-bold text-primary mb-5 font-headline text-sm uppercase tracking-wider">Exam at a glance</h3>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-3xl font-black text-primary">{exam.totalQuestions}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Questions</p>
                    </div>
                    <div className="border-x border-outline-variant">
                      <p className="text-3xl font-black text-primary-mid">{exam.durationMinutes}</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Minutes</p>
                    </div>
                    <div>
                      <p className="text-3xl font-black text-accent">∞</p>
                      <p className="text-xs text-on-surface-variant font-medium mt-1">Retakes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Purchase card */}
              <div className="w-full md:w-80 tc-card p-8 shadow-xl sticky top-24 flex-shrink-0">
                <div className="mb-6 pb-6 border-b border-outline-variant">
                  <span className="block text-on-surface-variant font-medium text-xs uppercase tracking-wider mb-3">Exam access fee</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-primary">{exam.price}</span>
                    <span className="text-xl font-bold text-on-surface-variant">AZN</span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-2">One-time payment · Lifetime access</p>
                </div>

                <div className="space-y-3 mb-8 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Duration</span>
                    <span className="font-bold text-primary">{exam.durationMinutes} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Questions</span>
                    <span className="font-bold text-primary">{exam.totalQuestions}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Retakes</span>
                    <span className="font-bold text-accent">Unlimited</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Analytics</span>
                    <span className="font-bold text-accent">Included</span>
                  </div>
                </div>

                <Link
                  href={`/checkout/${exam.id}`}
                  className="w-full flex items-center justify-center gap-2 py-4 tc-gradient text-white rounded-xl font-bold text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary-mid/20"
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  Purchase Access
                </Link>
                <p className="text-xs text-center text-on-surface-variant mt-4">
                  Instant access after payment
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
