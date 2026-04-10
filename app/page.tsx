'use client';

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SignUpButton } from "@clerk/nextjs";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
  ArrowRight, Sparkles, Timer, BarChart2, Database, Brain,
  Landmark, GraduationCap, UserSearch, TrendingUp, CheckCircle2, List
} from "lucide-react";

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <>
      <Navbar />
      <main className="pt-20">

        {/* Hero Section */}
        <section className="relative overflow-hidden bg-surface py-24 px-8">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="z-10">
              <span className="inline-block px-4 py-1.5 mb-6 rounded-full bg-secondary-fixed text-on-secondary-fixed text-sm font-bold tracking-wide uppercase">
                Gələcəyin İmtahan Platforması
              </span>
              <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-primary leading-[1.1] tracking-tight mb-8">
                Gələcəyinizi bizimlə{" "}
                <span className="text-secondary">sınağa çəkin</span>
              </h1>
              <p className="text-lg md:text-xl text-on-surface-variant leading-relaxed mb-10 max-w-xl">
                Müasir texnologiyalar və süni intellekt dəstəyi ilə imtahanlara daha peşəkar hazırlaşın. Bizimlə hər bir sual uğura atılan bir addımdır.
              </p>
              <div className="flex flex-wrap gap-4">
                {!isSignedIn ? (
                  <SignUpButton mode="modal">
                    <button className="px-8 py-4 editorial-gradient text-white rounded-full font-bold text-lg shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200">
                      İndi başlayın
                    </button>
                  </SignUpButton>
                ) : (
                  <Link
                    href="/dashboard"
                    className="px-8 py-4 editorial-gradient text-white rounded-full font-bold text-lg shadow-lg hover:opacity-90 hover:scale-105 active:scale-95 transition-all duration-200"
                  >
                    Kabinetim
                  </Link>
                )}
                <Link
                  href="/exams"
                  className="px-8 py-4 bg-surface-container-low text-primary rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all duration-200 border border-outline-variant"
                >
                  Daha çox öyrən
                </Link>
              </div>

              <div className="mt-12 flex items-center gap-6">
                <div className="flex -space-x-4">
                  {[
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuBf7ZzRxevJaAHLz6mtQ7mxwmw3Ih2l3qtbY6XTbsG1uoPwEvdBbLY0f3vR9KGPH_hxf-8pcWddKsNz4fGu7ByDxhLIYkMvwP7aqca1UG26dbyLF0LNV9aM9qxHK15dNSRtoJVT_kDnr6QH59VKXjPUacZ4eupuo-TGnqsM-QUqAoSZ-jI1ExxdgWmcsFOwJH1BX_t5s4pEhXleDpCE0YMxKu_A3rLtJzEsBUj3aY2mypNDWJjnwGecOJlOqKr-eEMCXfxOhBjYh2y_",
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuAnLUdyR00Rd4Jw-jwAFUGAzr4TcReu0YVgsyPE2nQnsMlElQemfX_qRZG4-srVxIis8-B-xWjrjtRHdGBS0m4-gDwD0bnFjHoXwYvKWVl3UBrUJC384ooDQi6ybkJa8wdSDIOP-g2cnxgG63obA1YY2Qaj64XI5ocCgam1SN874ER0XwoT3TkXY3rYqqHM9SrxiccGqNZ3XXVdS8DgmZKC3-4xw03Zk-uDsVvK2LgzzhXk_kFq1_wQftKL4XdAIBuFTsV6v6dEF7kl",
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuC0Z4tA4XFLVCXPFf-0Ir52ui16-tpd6T4VcDL2V8okiJ42xYfAGs8VfGz0zI4pi1Wnege6GnXENgpn3QUtdaM9gcRbwOvXRaLnH5Y3clPh_29MqYrrEHEXbb2x6EuPbS4cdCtzxax7y8pu8QWeajqLL-0Ds5KXWOiCKZqASK8yh6xeXbbhvT6KWqSUYtzjWPzVfEGZ_Lw4YaLCVhH2H16co0d7BXeauygJMRFCA3jPKKFCUyZ8AWCqIaiRk9Y3FhF8xLMB4rwbnls4",
                  ].map((src, i) => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-surface overflow-hidden bg-surface-container">
                      <img className="w-full h-full object-cover" src={src} alt="Tələbə" />
                    </div>
                  ))}
                </div>
                <p className="text-sm font-medium text-on-surface-variant">
                  <span className="text-primary font-bold">10,000+</span> tələbə tərəfindən etibar edilir
                </p>
              </div>
            </div>

            {/* Right */}
            <div className="relative hidden lg:block">
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-secondary-container/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl transform lg:rotate-3 hover:rotate-0 transition-transform duration-500 bg-surface-container-lowest">
                <img
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCF8V6bxNju_IU3lEpfRjGMnz5r4YRJ8ki55XRqqxaALbvCZmIHGrEMxDDogkjCFu53dNTWskgbFEnmMWBGkAo5NWeJM4kGswfN2I4jvXGnc2arWW4waECgSbjvEgBRItPYQV89xCc1-bU2VVerEgHtBMzYJNt9Y30i6clDOE1hIDDocBQWe1j58S5bffT8GsckXbWvNVgRh2S-sLj0YxD1eOuNHfQsCWY6TkcspdYGhBLdx_bzUISYtPuyAcCb_JPwqdPUldaGypGy"
                  alt="Tələbə oxuyur"
                />
                <div className="absolute inset-0 bg-primary/10" />
              </div>
              {/* Floating Stat Card */}
              <div className="absolute bottom-8 -left-8 bg-surface-container-lowest p-6 rounded-2xl shadow-xl max-w-[200px] border border-outline-variant/30">
                <Sparkles className="text-secondary mb-2" size={36} />
                <p className="text-2xl font-black text-primary">98%</p>
                <p className="text-xs text-on-surface-variant font-medium">İstifadəçi müvəffəqiyyəti</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Bento Grid */}
        <section className="py-24 bg-surface-container-low px-8" id="haqqimizda">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-headline font-extrabold text-primary mb-4">Üstünlüklərimiz</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">
                Təhsil texnologiyalarındakı ən son yenilikləri sizin üçün bir araya gətirdik.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 — wide */}
              <div className="md:col-span-2 bg-surface-container-lowest p-10 rounded-3xl group hover:bg-primary transition-all duration-500 border border-outline-variant/30">
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-secondary-fixed flex items-center justify-center mb-8 group-hover:bg-on-primary-container transition-colors">
                      <Timer className="text-secondary group-hover:text-primary-fixed transition-colors" size={28} />
                    </div>
                    <h3 className="text-3xl font-headline font-bold text-primary mb-4 group-hover:text-on-primary">Real İmtahan Mühiti</h3>
                    <p className="text-on-surface-variant group-hover:text-primary-fixed leading-relaxed text-lg max-w-lg">
                      DİM və digər rəsmi qurumların imtahan formatına tam uyğun, vaxt limitli və stress-test mühiti. Həyəcanınızı sınaqlarla yenin.
                    </p>
                  </div>
                  <div className="mt-8 flex items-center gap-2 text-secondary font-bold group-hover:text-on-primary">
                    Ətraflı məlumat <ArrowRight size={18} />
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="bg-surface-container-lowest p-10 rounded-3xl border border-outline-variant/30">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center mb-8">
                  <BarChart2 className="text-primary" size={28} />
                </div>
                <h3 className="text-2xl font-headline font-bold text-primary mb-4">Ətraflı Analitika</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Zəif və güclü tərəflərinizi süni intellekt analizi ilə müəyyən edin. Tərəqqinizi real zamanlı izləyin.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-surface-container-lowest p-10 rounded-3xl border border-outline-variant/30">
                <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center mb-8">
                  <Database className="text-primary" size={28} />
                </div>
                <h3 className="text-2xl font-headline font-bold text-primary mb-4">Geniş Sual Bazası</h3>
                <p className="text-on-surface-variant leading-relaxed">
                  Ekspertlər tərəfindən hazırlanmış 50,000-dən çox unikal sual və video izahlar.
                </p>
              </div>

              {/* Feature 4 — wide, gradient bg */}
              <div className="md:col-span-2 editorial-gradient p-10 rounded-3xl relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-3xl font-headline font-bold text-white mb-4">Fərdi Öyrənmə Planı</h3>
                  <p className="text-primary-fixed opacity-90 leading-relaxed text-lg max-w-md">
                    Hər bir tələbənin ehtiyacına uyğun, sistemli və məqsədyönlü hazırlıq proqramı.
                  </p>
                </div>
                <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-10 select-none pointer-events-none flex items-end justify-end">
                  <Brain size={200} className="text-white" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Test Categories */}
        <section className="py-24 bg-surface px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
              <div className="max-w-2xl">
                <h2 className="text-4xl font-headline font-extrabold text-primary mb-4">Populyar Kateqoriyalar</h2>
                <p className="text-on-surface-variant">
                  Sizin üçün ən aktual olan imtahan istiqamətlərini seçin və dərhal başlayın.
                </p>
              </div>
              <Link href="/exams" className="flex items-center gap-2 text-secondary font-bold hover:underline">
                Bütün kateqoriyalar <List size={20} />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Category 1 */}
              <div className="group relative bg-surface-container-lowest p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-outline-variant/30">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-surface-container-low rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Landmark size={28} />
                  </div>
                  <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">12 Sınaq</span>
                </div>
                <h4 className="text-xl font-headline font-bold text-primary mb-2">Dövlət Qulluğu</h4>
                <p className="text-sm text-on-surface-variant mb-6">BB, BA və digər kateqoriyalar üzrə qanunvericilik və məntiq sınaqları.</p>
                <Link
                  href="/exams"
                  className="w-full py-3 rounded-xl border border-outline-variant text-primary font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
                >
                  Sınaqlara bax
                </Link>
              </div>

              {/* Category 2 */}
              <div className="group relative bg-surface-container-lowest p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-outline-variant/30">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-surface-container-low rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <GraduationCap size={28} />
                  </div>
                  <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">24 Sınaq</span>
                </div>
                <h4 className="text-xl font-headline font-bold text-primary mb-2">Magistratura</h4>
                <p className="text-sm text-on-surface-variant mb-6">Məntiq, İnformatika və Xarici dil üzrə qəbul imtahanı səviyyəsində suallar.</p>
                <Link
                  href="/exams"
                  className="w-full py-3 rounded-xl border border-outline-variant text-primary font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
                >
                  Sınaqlara bax
                </Link>
              </div>

              {/* Category 3 */}
              <div className="group relative bg-surface-container-lowest p-8 rounded-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-xl border border-outline-variant/30">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-surface-container-low rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <UserSearch size={28} />
                  </div>
                  <span className="text-xs font-bold text-on-surface-variant bg-surface-container-high px-3 py-1 rounded-full">18 Sınaq</span>
                </div>
                <h4 className="text-xl font-headline font-bold text-primary mb-2">Müəllimlərin İşə Qəbulu</h4>
                <p className="text-sm text-on-surface-variant mb-6">İxtisas, metodika və pedaqogika üzrə ən son çərçivəyə uyğun imtahanlar.</p>
                <Link
                  href="/exams"
                  className="w-full py-3 rounded-xl border border-outline-variant text-primary font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
                >
                  Sınaqlara bax
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 bg-surface-container-low px-8 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              {/* Left: image */}
              <div className="order-2 lg:order-1 relative">
                <div className="relative rounded-3xl overflow-hidden aspect-square shadow-2xl">
                  <img
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4bXqXD-p4ExpfzUX2XYdDjBWpMs0WBASK_RwCAvgl4qAP5xR0wgkvSVsei6PYKpaoSpG7lB4I1n6ESjg29QydEtmtq7g8uqxv3IQIw791XuI_P_AS5tWzpxlsmG5fkSHbFn9TPnqbRfu7LuU4j-1yRR3x4UYes36tXD3AJlgVuYOAILvtAWlP-_phz7Z6UGl31aoAyTr5enYXIiB_hOGJ2dNL_tPMeBDimAnttDj1h35HSKJFfuXQtn90Ow3PlkNaNnbHkdYZCVVZ"
                    alt="Tələbələr birgə oxuyur"
                  />
                </div>
                <div className="absolute -right-8 top-1/2 -translate-y-1/2">
                  <div className="bg-surface-container-lowest p-4 rounded-2xl shadow-lg border border-outline-variant/20 flex items-center gap-4 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                      <TrendingUp className="text-error" size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-on-surface-variant">Sürətli Artım</p>
                      <p className="text-sm font-bold text-primary">+15% Nəticə</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: steps */}
              <div className="order-1 lg:order-2">
                <h2 className="text-4xl font-headline font-extrabold text-primary mb-12">Necə işləyirik?</h2>
                <div className="space-y-10">
                  {[
                    {
                      step: "1",
                      title: "Qeydiyyatdan keçin",
                      desc: "Cəmi 30 saniyə ərzində öz profilinizi yaradın və hədəflərinizi təyin edin.",
                    },
                    {
                      step: "2",
                      title: "Sınağı seçin",
                      desc: "Kataloqdan sizə uyğun olan sınağı seçin və real imtahan mühitinə daxil olun.",
                    },
                    {
                      step: "3",
                      title: "Nəticələri təhlil edin",
                      desc: "İmtahan bitdikdən dərhal sonra ətraflı hesabatı alın və səhvləriniz üzərində işləyin.",
                    },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-6 group">
                      <div className="flex-shrink-0 w-12 h-12 rounded-full editorial-gradient text-white flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
                        {step}
                      </div>
                      <div>
                        <h4 className="text-xl font-headline font-bold text-primary mb-2">{title}</h4>
                        <p className="text-on-surface-variant">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {!isSignedIn ? (
                  <SignUpButton mode="modal">
                    <button className="mt-12 px-8 py-4 editorial-gradient text-white rounded-full font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all">
                      İndi sınağa başla
                    </button>
                  </SignUpButton>
                ) : (
                  <Link
                    href="/exams"
                    className="mt-12 inline-block px-8 py-4 editorial-gradient text-white rounded-full font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all"
                  >
                    İndi sınağa başla
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-surface px-8" id="elaqe">
          <div className="max-w-5xl mx-auto editorial-gradient rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-container rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-headline font-extrabold text-white mb-8 leading-tight">
                Uğur yolunda ilk addımı <br />bu gün atın
              </h2>
              <p className="text-primary-fixed text-lg mb-12 max-w-2xl mx-auto opacity-90">
                Sizin müvəffəqiyyətiniz bizim əsas məqsədimizdir. Test Centre ilə hazırlıq fərqini hiss edin.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                {!isSignedIn ? (
                  <SignUpButton mode="modal">
                    <button className="bg-surface-container-lowest text-primary px-10 py-4 rounded-full font-bold text-lg hover:bg-secondary-fixed transition-colors">
                      Pulsuz sınaqla başla
                    </button>
                  </SignUpButton>
                ) : (
                  <Link href="/dashboard" className="bg-surface-container-lowest text-primary px-10 py-4 rounded-full font-bold text-lg hover:bg-secondary-fixed transition-colors">
                    Kabinetə keç
                  </Link>
                )}
                <Link
                  href="/exams"
                  className="bg-transparent border-2 border-primary-fixed text-primary-fixed px-10 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-colors"
                >
                  Sınaqlarla tanış ol
                </Link>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
