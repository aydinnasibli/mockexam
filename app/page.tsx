'use client';

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SignUpButton } from "@clerk/nextjs";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <>
      <Navbar />
      <main className="pt-16">

        {/* Hero Section */}
        <section className="relative overflow-hidden tc-gradient-hero px-6 py-24 lg:py-36">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

          <div className="relative max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full bg-accent/20 text-accent text-xs font-bold mb-6 border border-accent/30">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                OFFICIAL MOCK EXAMS
              </span>
              <h1 className="text-5xl lg:text-6xl xl:text-7xl font-extrabold font-headline leading-tight tracking-tighter text-white mb-6">
                Prepare for Your{" "}
                <span className="text-accent">Dream Score</span>
              </h1>
              <p className="text-lg text-white/70 leading-relaxed mb-10 max-w-lg">
                SAT, IELTS, TOEFL, GRE and DİM mock exams in a real exam environment. Instant results. Deep analytics.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/exams" className="tc-btn-primary shadow-lg shadow-accent/30 text-base px-8 py-3.5">
                  Browse Exams
                  <span className="material-symbols-outlined ml-2 text-[18px]">arrow_forward</span>
                </Link>
                {!isSignedIn ? (
                  <SignUpButton mode="modal">
                    <button className="px-8 py-3.5 bg-white/10 text-white rounded-lg font-bold text-base border border-white/20 hover:bg-white/20 transition-colors">
                      Create Free Account
                    </button>
                  </SignUpButton>
                ) : (
                  <Link href="/dashboard" className="px-8 py-3.5 bg-white/10 text-white rounded-lg font-bold text-base border border-white/20 hover:bg-white/20 transition-colors">
                    My Dashboard
                  </Link>
                )}
              </div>

              <div className="mt-12 flex items-center gap-8">
                <div>
                  <p className="text-2xl font-extrabold text-white">15,000+</p>
                  <p className="text-xs text-white/50 mt-0.5">Students enrolled</p>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div>
                  <p className="text-2xl font-extrabold text-white">11</p>
                  <p className="text-xs text-white/50 mt-0.5">Mock exams available</p>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div>
                  <p className="text-2xl font-extrabold text-white">98%</p>
                  <p className="text-xs text-white/50 mt-0.5">Satisfaction rate</p>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                <img
                  alt="Student studying"
                  className="w-full h-[480px] object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiawthUEkW4Av6Eep1bs7kIew_URybrRK0hzvhwprx9ZF-uRI89skArkG8kOMrsA33PciCA28n7QRHQBo3dXeZqmXlr3eWS90h4sNwgnVjgF3g_MGDlnUuHhMusGFshE3TUHclioz8Hm6LnNZK2iidFmFkhPGNkUX7wz98BqqJm6xy3OyTYODzdTabyVRVvKWkUDJawOfkNjR68a2t7gHnVfsAaU19WsK35PheDPPmn6VqYs-GDZdB_waBbWe6LF_ksTWGBGlLs95r"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
                <div className="absolute bottom-6 left-6 right-6 p-5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center text-white shrink-0">
                      <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Real exam conditions</p>
                      <p className="text-white/60 text-xs">Timed, auto-scored, full analytics</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Exam Types Section */}
        <section className="px-6 py-24 bg-surface" id="exams">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-bold text-accent uppercase tracking-widest mb-3">AVAILABLE EXAMS</span>
              <h2 className="text-3xl lg:text-4xl font-extrabold font-headline text-primary mb-4">Every major test, one platform</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto">Choose from 11 professionally crafted mock exams designed to mirror the real thing exactly.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* SAT */}
              <div className="tc-card p-7 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-accent-container flex items-center justify-center text-primary-mid">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container px-3 py-1 rounded-full">Global</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline text-primary">SAT Mock</h3>
                  <p className="text-on-surface-variant text-sm mb-5 leading-relaxed">Math and Evidence-Based Reading & Writing. Full Bluebook digital format.</p>
                </div>
                <Link href="/exams?type=sat" className="inline-flex items-center gap-1.5 text-primary-mid font-bold text-sm group-hover:gap-3 transition-all">
                  View exams <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {/* IELTS */}
              <div className="tc-card p-7 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-secondary-container flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>language</span>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container px-3 py-1 rounded-full">Academic</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline text-primary">IELTS</h3>
                  <p className="text-on-surface-variant text-sm mb-5 leading-relaxed">Listening, Reading, and Writing sections in one complete mock test.</p>
                </div>
                <Link href="/exams?type=ielts" className="inline-flex items-center gap-1.5 text-secondary font-bold text-sm group-hover:gap-3 transition-all">
                  View exams <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {/* TOEFL */}
              <div className="tc-card p-7 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between bg-primary-mid border-primary-mid">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-white">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>public</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest bg-white/15 text-white px-3 py-1 rounded-full">iBT</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline text-white">TOEFL iBT</h3>
                  <p className="text-white/70 text-sm mb-5 leading-relaxed">Full Academic English proficiency evaluation with integrated skills.</p>
                </div>
                <Link href="/exams?type=toefl" className="inline-flex items-center gap-1.5 text-white font-bold text-sm group-hover:gap-3 transition-all">
                  View exams <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>

              {/* DIM */}
              <div className="tc-card p-7 hover:shadow-md hover:-translate-y-0.5 transition-all group sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center gap-7">
                <div className="flex-1">
                  <div className="w-11 h-11 rounded-xl bg-tertiary-container flex items-center justify-center text-tertiary mb-5">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline text-primary">DİM University Admission</h3>
                  <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">Block and graduation tests aligned with DİM curriculum for Groups I–IV.</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-surface-container text-primary text-xs font-semibold rounded-full">Groups I–IV</span>
                    <span className="px-3 py-1 bg-surface-container text-primary text-xs font-semibold rounded-full">Graduation</span>
                    <span className="px-3 py-1 bg-surface-container text-primary text-xs font-semibold rounded-full">Block</span>
                  </div>
                </div>
                <img
                  alt="Exam writing"
                  className="w-full sm:w-48 h-36 object-cover rounded-xl shrink-0"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1J279reGnnm-7SNXT2dUq9YGdYUGRp9k37_zaQ1IyldWERT6aZzOHsAi0GAQM2F6EAKZwGbirk3AhFuk-8dsdNF1xvFPBnUR0iFnHoLCaHRshfblr4sLgLr0ip1rE4drUFOE49B3j0zNmJZgDBEBe04RNul8Z85mV_PBuaiA-hE0xEzgYoag53Pt3BTotLvMxZO9HGmPQp3kgB2aKAUC4WbqfsDzUfmSWEMRYug2hJ3sUp8GQAFrkxnLvbHAqlmRPVUZpEPFbOkQE"
                />
              </div>

              {/* GRE */}
              <div className="tc-card p-7 hover:shadow-md hover:-translate-y-0.5 transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-tertiary-container flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>psychology</span>
                    </div>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container px-3 py-1 rounded-full">Grad</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline text-primary">GRE General</h3>
                  <p className="text-on-surface-variant text-sm mb-5 leading-relaxed">Verbal, Quantitative, and Analytical Writing for graduate admissions.</p>
                </div>
                <Link href="/exams?type=gre" className="inline-flex items-center gap-1.5 text-tertiary font-bold text-sm group-hover:gap-3 transition-all">
                  View exams <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            </div>

            <div className="text-center mt-10">
              <Link href="/exams" className="tc-btn-primary inline-flex">
                See all exams
                <span className="material-symbols-outlined ml-2 text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-24 bg-surface-container-low" id="about">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-bold text-accent uppercase tracking-widest mb-3">WHY TEST CENTRE</span>
              <h2 className="text-3xl lg:text-4xl font-extrabold font-headline text-primary mb-4">Everything you need to succeed</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto">We replicate the real exam experience so there are no surprises on test day.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="tc-card p-8 flex flex-col items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-accent-container flex items-center justify-center text-primary-mid">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 font-headline text-primary">Real Exam Environment</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">Strict timer, official interface, and exam conditions so you know exactly what to expect.</p>
                </div>
              </div>
              <div className="tc-card p-8 flex flex-col items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-secondary-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 font-headline text-primary">Instant Results</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">Get your score the moment you finish. No waiting — just immediate, detailed feedback.</p>
                </div>
              </div>
              <div className="tc-card p-8 flex flex-col items-start gap-5">
                <div className="w-12 h-12 rounded-xl bg-tertiary-container flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 font-headline text-primary">Deep Analytics</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">See your performance by topic and skill. Know exactly where to focus your study time.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="px-6 py-24 bg-surface" id="pricing">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-bold text-accent uppercase tracking-widest mb-3">PRICING</span>
              <h2 className="text-3xl lg:text-4xl font-extrabold font-headline text-primary mb-4">Simple, transparent pricing</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto">Pay only for what you need. No subscriptions, no hidden fees.</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
              <div className="tc-card p-8 flex flex-col">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Single Access</p>
                <div className="mb-6">
                  <span className="text-4xl font-black text-primary">8+ AZN</span>
                  <span className="text-sm text-on-surface-variant ml-2">/ exam</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-on-surface-variant">
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-accent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    1 full mock exam
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-accent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Unlimited retakes
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-accent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Detailed score report
                  </li>
                </ul>
                <Link href="/exams" className="w-full flex justify-center py-3 border-2 border-primary-mid text-primary-mid rounded-xl font-bold hover:bg-accent-container transition-colors">
                  Browse Exams
                </Link>
              </div>

              <div className="tc-card p-8 flex flex-col relative overflow-hidden ring-2 ring-primary-mid shadow-lg shadow-primary-mid/10">
                <div className="absolute top-4 right-4 bg-accent text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                  Best Value
                </div>
                <p className="text-xs font-bold text-accent uppercase tracking-widest mb-4">5-Exam Bundle</p>
                <div className="mb-6">
                  <span className="text-4xl font-black text-primary">35 AZN</span>
                  <span className="text-sm text-on-surface-variant ml-2">/ 5 exams</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-on-surface-variant">
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-accent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Any 5 mock exams
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-accent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Unlimited retakes
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-accent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Full result history
                  </li>
                </ul>
                <Link href="/exams" className="w-full flex justify-center py-3 tc-gradient text-white rounded-xl font-bold hover:opacity-90 transition-opacity">
                  Get Bundle
                </Link>
              </div>

              <div className="tc-card p-8 flex flex-col">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">Institution</p>
                <div className="mb-6">
                  <span className="text-4xl font-black text-primary">Custom</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1 text-sm text-on-surface-variant">
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-accent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Corporate dashboard
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-accent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Unlimited students
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-accent text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Analytics & reporting
                  </li>
                </ul>
                <button className="w-full py-3 border-2 border-outline text-on-surface-variant rounded-xl font-bold hover:border-primary-mid hover:text-primary-mid transition-colors">
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="px-6 py-20 tc-gradient-hero">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-extrabold font-headline text-white mb-4">Ready to start practising?</h2>
            <p className="text-white/70 text-lg mb-8">Join thousands of students who improved their scores with Test Centre.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/exams" className="tc-btn-primary text-base px-8 py-3.5 shadow-lg shadow-accent/30">
                Browse Exams
              </Link>
              {!isSignedIn && (
                <SignUpButton mode="modal">
                  <button className="px-8 py-3.5 bg-white/10 text-white rounded-lg font-bold text-base border border-white/20 hover:bg-white/20 transition-colors">
                    Sign Up Free
                  </button>
                </SignUpButton>
              )}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
