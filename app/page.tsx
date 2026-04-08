import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="pt-24">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 py-20 lg:py-32 max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="z-10">
              <span className="inline-block py-1 px-3 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold mb-6">
                İLK PEŞƏKAR PLATFORMA
              </span>
              <h1 className="text-5xl lg:text-7xl font-extrabold font-headline leading-tight tracking-tighter text-primary mb-8">
                Azərbaycanın ilk peşəkar sınaq imtahanı platforması
              </h1>
              <p className="text-lg text-on-surface-variant leading-relaxed mb-10 max-w-xl">
                SAT, IELTS, TOEFL və DİM imtahanlarına hər yerdə, hər zaman peşəkar mühitdə hazırlaşın. Bizimlə
                akademik hədəflərinizə bir addım daha yaxınlaşın.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/exams" className="px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-on-primary rounded-xl font-bold shadow-lg transition-transform hover:-translate-y-1 inline-block">
                  Sınaqlara bax
                </Link>
                <button className="px-8 py-4 bg-surface-container-high text-primary rounded-xl font-bold hover:bg-surface-container-highest transition-colors">
                  Qeydiyyatdan keç
                </button>
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
                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-white">
                      <span className="material-symbols-outlined">check_circle</span>
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
              <p className="text-on-surface-variant max-w-2xl">
                Müxtəlif beynəlxalq və yerli standartlara uyğun hazırlanmış geniş sınaq bazası.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* SAT Card */}
              <div className="md:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-all group">
                <div className="flex justify-between items-start mb-12">
                  <div className="p-3 bg-primary-fixed rounded-lg text-primary">
                    <span className="material-symbols-outlined">school</span>
                  </div>
                  <span className="text-xs font-bold text-outline uppercase tracking-widest">Global Standard</span>
                </div>
                <h3 className="text-2xl font-bold mb-2">SAT Mock</h3>
                <p className="text-on-surface-variant text-sm mb-6">
                  Riyaziyyat və İngilis dili bölmələri üzrə tam rəqəmsal sınaqlar.
                </p>
                <Link href="/exams" className="text-primary font-bold flex items-center gap-2 group-hover:gap-4 transition-all">
                  Sınağı başlat <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
              </div>

              {/* IELTS Card */}
              <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-all group">
                <div className="mb-12 text-secondary">
                  <span className="material-symbols-outlined text-4xl">language</span>
                </div>
                <h3 className="text-xl font-bold mb-2">IELTS</h3>
                <p className="text-on-surface-variant text-sm mb-6">Listening, Reading və Writing.</p>
                <Link href="/exams" className="text-secondary font-bold text-sm">
                  Daha ətraflı
                </Link>
              </div>

              {/* TOEFL Card */}
              <div className="bg-primary text-on-primary p-8 rounded-xl shadow-sm hover:shadow-md transition-all">
                <div className="mb-12 text-secondary-fixed">
                  <span className="material-symbols-outlined text-4xl">public</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">TOEFL iBT</h3>
                <p className="text-primary-fixed-dim text-sm mb-6">Akademik İngilis dili biliklərinin tam yoxlanılması.</p>
                <button className="w-full py-2 bg-white/10 rounded-lg text-xs font-bold hover:bg-white/20 transition-colors">
                  YENİ GƏLDİ
                </button>
              </div>

              {/* DIM Card */}
              <div className="md:col-span-4 bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4">DİM Qəbul İmtahanları</h3>
                  <p className="text-on-surface-variant mb-6">
                    Dövlət İmtahan Mərkəzinin proqramına tam uyğun, blok və buraxılış imtahanları üçün ixtisaslaşmış
                    sınaqlar.
                  </p>
                  <div className="flex gap-4">
                    <span className="px-3 py-1 bg-surface-container text-primary text-xs font-semibold rounded-full">
                      I-IV qruplar
                    </span>
                    <span className="px-3 py-1 bg-surface-container text-primary text-xs font-semibold rounded-full">
                      Buraxılış
                    </span>
                  </div>
                </div>
                <img
                  alt="Student exam writing"
                  className="w-full md:w-64 h-48 object-cover rounded-xl"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuB1J279reGnnm-7SNXT2dUq9YGdYUGRp9k37_zaQ1IyldWERT6aZzOHsAi0GAQM2F6EAKZwGbirk3AhFuk-8dsdNF1xvFPBnUR0iFnHoLCaHRshfblr4sLgLr0ip1rE4drUFOE49B3j0zNmJZgDBEBe04RNul8Z85mV_PBuaiA-hE0xEzgYoag53Pt3BTotLvMxZO9HGmPQp3kgB2aKAUC4WbqfsDzUfmSWEMRYug2hJ3sUp8GQAFrkxnLvbHAqlmRPVUZpEPFbOkQE"
                />
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
              <h3 className="text-xl font-bold mb-4">Həqiqi imtahan mühiti</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Rəsmi imtahan interfeysi və vaxt məhdudiyyəti ilə özünüzü real imtahan zalında hiss edəcəksiniz.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 hover:bg-white rounded-2xl transition-all">
              <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center text-secondary mb-6">
                <span className="material-symbols-outlined text-3xl">bolt</span>
              </div>
              <h3 className="text-xl font-bold mb-4">Dərhal nəticələr</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                İmtahan bitən kimi balınızı öyrənin. Gözləmək yox, dərhal analiz etmək vaxtıdır.
              </p>
            </div>
            <div className="flex flex-col items-center text-center p-6 hover:bg-white rounded-2xl transition-all">
              <div className="w-16 h-16 bg-surface-container-low rounded-2xl flex items-center justify-center text-tertiary mb-6">
                <span className="material-symbols-outlined text-3xl">analytics</span>
              </div>
              <h3 className="text-xl font-bold mb-4">Ətraflı analiz</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Səhvlərinizin mövzular üzrə paylanmasını görün və zəif tərəfləriniz üzərində işləyin.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="px-6 py-24 bg-primary-container text-on-primary-container" id="pricing">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-extrabold font-headline text-white mb-4">Qiymətlər</h2>
              <p className="text-on-primary-container/80">Sizin üçün ən uyğun paketi seçin.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Basic */}
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 flex flex-col">
                <h3 className="text-xl font-bold mb-2 text-white">Təkli Giriş</h3>
                <div className="text-4xl font-black mb-6 text-white">
                  5 AZN <span className="text-sm font-normal text-on-primary-container">/ sınaq</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-secondary">check</span> 1 tam sınaq imtahanı
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-secondary">check</span> Nəticələrin analizi
                  </li>
                  <li className="flex items-center gap-3 text-sm text-white/50">
                    <span className="material-symbols-outlined">close</span> Müəllim şərhi
                  </li>
                </ul>
                <button className="w-full py-3 bg-white text-primary rounded-xl font-bold hover:bg-on-primary-container transition-colors">
                  Seç
                </button>
              </div>

              {/* Professional (Featured) */}
              <div className="bg-white p-8 rounded-2xl shadow-xl transform scale-105 z-10 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-secondary text-white text-[10px] px-6 py-1 rotate-45 translate-x-6 translate-y-3 font-bold">
                  POPULYAR
                </div>
                <h3 className="text-xl font-bold mb-2 text-primary">Abonement</h3>
                <div className="text-4xl font-black mb-6 text-primary">
                  25 AZN <span className="text-sm font-normal text-on-surface-variant">/ aylıq</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm text-primary">
                    <span className="material-symbols-outlined text-secondary">check</span> 10 sınaq imtahanı
                  </li>
                  <li className="flex items-center gap-3 text-sm text-primary">
                    <span className="material-symbols-outlined text-secondary">check</span> Limitsiz təkrar baxış
                  </li>
                  <li className="flex items-center gap-3 text-sm text-primary">
                    <span className="material-symbols-outlined text-secondary">check</span> Detallı tərəqqi analizi
                  </li>
                </ul>
                <button className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-container transition-colors">
                  İndi al
                </button>
              </div>

              {/* Enterprise */}
              <div className="bg-white/5 backdrop-blur-md p-8 rounded-2xl border border-white/10 flex flex-col">
                <h3 className="text-xl font-bold mb-2 text-white">Tədris Mərkəzi</h3>
                <div className="text-4xl font-black mb-6 text-white">Fərdi</div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-secondary">check</span> Korporativ panel
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-secondary">check</span> Limitsiz tələbə sayı
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <span className="material-symbols-outlined text-secondary">check</span> Brendinq imkanları
                  </li>
                </ul>
                <button className="w-full py-3 border border-white/20 text-white rounded-xl font-bold hover:bg-white/10 transition-colors">
                  Bizimlə əlaqə
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
