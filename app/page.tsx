'use client';

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { SignUpButton } from "@clerk/nextjs";
import Navbar from "@/components/layout/Navbar";

export default function Home() {
  const { isSignedIn } = useAuth();

  return (
    <>
      <Navbar />
      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 py-20 lg:py-32 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="z-10">
              <span className="inline-block py-1 px-3 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold mb-6">İLK PEŞƏKAR PLATFORMA</span>
              <h1 className="text-5xl lg:text-7xl font-extrabold font-headline leading-tight tracking-tighter text-primary mb-8">
                Azərbaycanın ilk peşəkar sınaq imtahanı platforması
              </h1>
              <p className="text-lg text-on-surface-variant leading-relaxed mb-10 max-w-xl">
                SAT, IELTS, TOEFL, GRE və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/exams" className="px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-1">
                  Sınaqlara bax
                </Link>
                {!isSignedIn ? (
                  <SignUpButton mode="modal">
                    <button className="px-8 py-4 bg-surface-container-high text-primary rounded-xl font-bold hover:bg-surface-container-highest transition-colors">
                      Qeydiyyatdan keç
                    </button>
                  </SignUpButton>
                ) : (
                  <Link href="/dashboard" className="px-8 py-4 bg-surface-container-high text-primary rounded-xl font-bold hover:bg-surface-container-highest transition-colors">
                    Panelimə keç
                  </Link>
                )}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -top-12 -left-12 w-64 h-64 bg-secondary-fixed/20 rounded-full blur-3xl"></div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <img
                  alt="Student studying"
                  className="w-full h-[500px] object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBiawthUEkW4Av6Eep1bs7kIew_URybrRK0hzvhwprx9ZF-uRI89skArkG8kOMrsA33PciCA28n7QRHQBo3dXeZqmXlr3eWS90h4sNwgnVjgF3g_MGDlnUuHhMusGFshE3TUHclioz8Hm6LnNZK2iidFmFkhPGNkUX7wz98BqqJm6xy3OyTYODzdTabyVRVvKWkUDJawOfkNjR68a2t7gHnVfsAaU19WsK35PheDPPmn6VqYs-GDZdB_waBbWe6LF_ksTWGBGlLs95r"
                />
                <div className="absolute bottom-6 left-6 right-6 p-6 glass-nav rounded-xl border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white shrink-0">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    </div>
                    <div>
                      <p className="text-primary font-bold">15,000+ Tələbə</p>
                      <p className="text-xs text-on-surface-variant">Uğurlu nəticələr əldə edilib</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Exams Bento Grid */}
        <section className="px-6 py-20 bg-surface-container-low" id="exams">
          <div className="max-w-7xl mx-auto">
            <div className="mb-16">
              <h2 className="text-3xl font-extrabold font-headline text-primary mb-4">Mövcud imtahanlar</h2>
              <p className="text-on-surface-variant max-w-2xl">Müxtəlif beynəlxalq və yerli standartlara uyğun hazırlanmış geniş sınaq bazası.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* SAT */}
              <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-12">
                    <div className="p-3 bg-primary-fixed rounded-lg text-primary">
                      <span className="material-symbols-outlined">school</span>
                    </div>
                    <span className="text-xs font-bold text-outline uppercase tracking-widest">Global Standard</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2 font-headline">SAT Mock</h3>
                  <p className="text-on-surface-variant text-sm mb-6">Riyaziyyat və İngilis dili bölmələri üzrə tam rəqəmsal sınaqlar. Bluebook formatı.</p>
                </div>
                <Link href="/exams?type=sat" className="text-primary font-bold flex items-center gap-2 group-hover:gap-4 transition-all text-sm">
                  Sınaqlara bax <span className="material-symbols-outlined text-base">arrow_forward</span>
                </Link>
              </div>

              {/* IELTS */}
              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
                <div>
                  <div className="mb-12 text-secondary">
                    <span className="material-symbols-outlined text-4xl">language</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 font-headline">IELTS</h3>
                  <p className="text-on-surface-variant text-sm mb-6">Listening, Reading və Writing.</p>
                </div>
                <Link href="/exams?type=ielts" className="text-secondary font-bold text-sm">Daha ətraflı →</Link>
              </div>

              {/* TOEFL */}
              <div className="bg-primary text-on-primary p-8 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-12 text-secondary-fixed">
                    <span className="material-symbols-outlined text-4xl">public</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white font-headline">TOEFL iBT</h3>
                  <p className="text-primary-fixed-dim text-sm mb-6">Akademik İngilis dili biliklərinin tam yoxlanılması.</p>
                </div>
                <Link href="/exams?type=toefl" className="w-full flex justify-center py-2 bg-white/10 rounded-lg text-xs font-bold hover:bg-white/20 transition-colors">
                  Sınaqlara bax
                </Link>
              </div>

              {/* DIM */}
              <div className="md:col-span-3 bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4 font-headline">DİM Qəbul İmtahanları</h3>
                  <p className="text-on-surface-variant mb-6">DİM proqramına uyğun blok və buraxılış sınaqları. I-IV qruplar üçün.</p>
                  <div className="flex gap-3">
                    <span className="px-3 py-1 bg-surface-container text-primary text-xs font-semibold rounded-full">I-IV qruplar</span>
                    <span className="px-3 py-1 bg-surface-container text-primary text-xs font-semibold rounded-full">Buraxılış</span>
                  </div>
                </div>
                <img
                  alt="Exam writing"
                  className="w-full md:w-56 h-40 object-cover rounded-xl"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1J279reGnnm-7SNXT2dUq9YGdYUGRp9k37_zaQ1IyldWERT6aZzOHsAi0GAQM2F6EAKZwGbirk3AhFuk-8dsdNF1xvFPBnUR0iFnHoLCaHRshfblr4sLgLr0ip1rE4drUFOE49B3j0zNmJZgDBEBe04RNul8Z85mV_PBuaiA-hE0xEzgYoag53Pt3BTotLvMxZO9HGmPQp3kgB2aKAUC4WbqfsDzUfmSWEMRYug2hJ3sUp8GQAFrkxnLvbHAqlmRPVUZpEPFbOkQE"
                />
              </div>

              {/* GRE */}
              <div className="md:col-span-1 bg-tertiary text-on-tertiary p-8 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="mb-8 text-tertiary-fixed">
                    <span className="material-symbols-outlined text-4xl">psychology</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2 text-white font-headline">GRE</h3>
                  <p className="text-tertiary-fixed-dim text-sm mb-6">General Test — magistratura üçün.</p>
                </div>
                <Link href="/exams?type=gre" className="w-full flex justify-center py-2 bg-white/10 rounded-lg text-xs font-bold hover:bg-white/20 transition-colors text-white">
                  Sınaqlara bax
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-24 max-w-7xl mx-auto" id="about">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-extrabold font-headline text-primary mb-4">Niyə Məşqçi?</h2>
            <div className="w-20 h-1.5 bg-secondary mx-auto rounded-full"></div>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center p-6 hover:bg-white rounded-2xl transition-all">
              <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center text-primary mb-6">
                <span className="material-symbols-outlined text-3xl">timer</span>
              </div>
              <h3 className="text-xl font-bold mb-4 font-headline">Həqiqi imtahan mühiti</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">Rəsmi imtahan interfeysi və vaxt məhdudiyyəti ilə real imtahan zalında kimi hiss edin.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 hover:bg-white rounded-2xl transition-all">
              <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center text-secondary mb-6">
                <span className="material-symbols-outlined text-3xl">bolt</span>
              </div>
              <h3 className="text-xl font-bold mb-4 font-headline">Dərhal nəticələr</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">İmtahan bitən kimi balınızı öyrənin. Gözləmək yox, analiz etmək vaxtı.</p>
            </div>
            <div className="flex flex-col items-center text-center p-6 hover:bg-white rounded-2xl transition-all">
              <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center text-tertiary mb-6">
                <span className="material-symbols-outlined text-3xl">analytics</span>
              </div>
              <h3 className="text-xl font-bold mb-4 font-headline">Ətraflı analiz</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">Səhvlərinizin mövzular üzrə paylanmasını görün, zəif tərəflərinizi gücləndir.</p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="px-6 py-24 bg-primary-container" id="pricing">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold font-headline text-white mb-4">Qiymətlər</h2>
              <p className="text-on-primary-container/80">Yalnız ehtiyacınız olan sınağı alın — abunəlik yoxdur.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 flex flex-col">
                <h3 className="text-xl font-bold mb-2 text-white font-headline">Təkli Giriş</h3>
                <div className="text-4xl font-black mb-6 text-white">8+ AZN <span className="text-sm font-normal text-on-primary-container">/ sınaq</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-sm">
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary">check</span> 1 tam sınaq imtahanı</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary">check</span> Limitsiz yenidən başlama</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary">check</span> Detallı nəticə analizi</li>
                </ul>
                <Link href="/exams" className="w-full flex justify-center py-3 bg-white text-primary rounded-xl font-bold hover:opacity-90 transition-opacity">Sınaq Seç</Link>
              </div>
              <div className="bg-white p-8 rounded-2xl shadow-xl md:scale-105 z-10 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-secondary text-white text-[10px] px-6 py-1 rotate-45 translate-x-6 translate-y-3 font-bold">YAXŞI SEÇIM</div>
                <h3 className="text-xl font-bold mb-2 text-primary font-headline">Sınaq Paketi (5)</h3>
                <div className="text-4xl font-black mb-6 text-primary">35 AZN <span className="text-sm font-normal text-on-surface-variant">/ 5 sınaq</span></div>
                <ul className="space-y-4 mb-8 flex-1 text-sm text-primary">
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary">check</span> İstənilən 5 sınaq</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary">check</span> Limitsiz yenidən başlama</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary">check</span> Tam nəticə tarixi</li>
                </ul>
                <Link href="/exams" className="w-full flex justify-center py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-opacity">Paket Al</Link>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 flex flex-col">
                <h3 className="text-xl font-bold mb-2 text-white font-headline">Tədris Mərkəzi</h3>
                <div className="text-4xl font-black mb-6 text-white">Fərdi</div>
                <ul className="space-y-4 mb-8 flex-1 text-sm">
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary">check</span> Korporativ panel</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary">check</span> Limitsiz tələbə</li>
                  <li className="flex items-center gap-3"><span className="material-symbols-outlined text-secondary">check</span> İstatistika və hesabat</li>
                </ul>
                <button className="w-full py-3 border border-white/20 text-white rounded-xl font-bold hover:bg-white/10 transition-colors">Bizimlə əlaqə</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-outline-variant/30 bg-slate-100">
        <div className="w-full py-12 px-6 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto gap-8">
          <div className="text-center md:text-left">
            <span className="text-base font-bold text-primary block mb-2 font-headline">Məşqçi</span>
            <p className="text-xs text-on-surface-variant max-w-xs">Azərbaycanın ən qabaqcıl onlayn sınaq platforması ilə gələcəyinizi bu gündən qurun.</p>
          </div>
          <div className="flex flex-col md:items-end gap-4">
            <div className="flex flex-wrap justify-center gap-6">
              <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">İstifadə şərtləri</a>
              <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Məxfilik siyasəti</a>
              <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Dəstək</a>
              <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">Əlaqə</a>
            </div>
            <p className="text-xs text-on-surface-variant">© 2025 Məşqçi Platforması. Bütün hüquqlar qorunur.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
