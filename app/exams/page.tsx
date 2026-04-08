import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";

export default function ExamsCatalog() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <section className="bg-surface-container-low p-6 rounded-xl space-y-6">
            <h2 className="text-lg font-bold text-primary">Filtrlər</h2>

            {/* Exam Type */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">İmtahan Növü</label>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20" type="checkbox" />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">SAT</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input defaultChecked className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20" type="checkbox" />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">IELTS</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20" type="checkbox" />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">TOEFL</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20" type="checkbox" />
                  <span className="text-sm font-medium text-on-surface-variant group-hover:text-primary transition-colors">DİM</span>
                </label>
              </div>
            </div>

            {/* Level */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Səviyyə</label>
              <select className="w-full bg-surface-container-lowest border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-primary/40 py-2.5">
                <option>Bütün səviyyələr</option>
                <option>Başlanğıc</option>
                <option>Orta</option>
                <option>Yüksək</option>
              </select>
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Qiymət Aralığı (₼)</label>
              <div className="flex gap-2 items-center">
                <input className="w-full bg-surface-container-lowest border-none rounded-lg text-sm p-2" placeholder="Min" type="number" />
                <span className="text-outline-variant">-</span>
                <input className="w-full bg-surface-container-lowest border-none rounded-lg text-sm p-2" placeholder="Max" type="number" />
              </div>
            </div>

            <button className="w-full bg-surface-container-high text-primary py-3 rounded-xl font-bold text-sm hover:bg-surface-variant transition-colors">
              Filtrləri Təmizlə
            </button>
          </section>

          <div className="relative rounded-xl overflow-hidden aspect-[4/5] group">
            <img
              className="w-full h-full object-cover"
              alt="Promotion"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBQWKvqDNijTa7Ph27WRHYeGbJ8H81d_hQJYe0wjB1pwqISKcZV6CKGty6qdqo6eEEJQuu1i67-j9XosDQez1aNTgyQdh-elvDescG_lUbw378Rrgx_If_bVZeTjPd6Ofl899jxfr4miX72aY4Gqvu7VZ71eoc6iUwWhZBaNdJUtjTKP2LTgJm1wI2i8hvS5j2ElVgzppfXyR3-LO-T2GmvbMuV7jy5N6xVOE9xj4nzvf9yh6sNBSlMDu6FogdQRs09LWQqlgblVAEk"
            />
            <div className="absolute inset-0 bg-primary/40 backdrop-blur-[2px] flex flex-col justify-end p-6">
              <h3 className="text-white font-bold text-xl leading-tight">Yeniliklərdən xəbərdar ol!</h3>
              <p className="text-white/80 text-xs mt-2">Bülletenimizə abunə olaraq yeni imtahanlardan ilk sən xəbər tut.</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 space-y-8">
          {/* Search and Results Info */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:max-w-md">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 shadow-sm"
                placeholder="İmtahan axtar..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-on-surface-variant">Sırala:</span>
              <select className="bg-transparent border-none text-sm font-bold text-primary focus:ring-0">
                <option>Ən yenilər</option>
                <option>Qiymət: Azdan çoxa</option>
                <option>Qiymət: Çoxdan aza</option>
              </select>
            </div>
          </div>

          {/* Exam Grid (Bento-inspired layout) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1 (Highlight) */}
            <div className="group bg-surface-container-lowest rounded-xl p-1 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="relative rounded-lg overflow-hidden h-48 mb-4">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="IELTS Mock"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBgnB_DWqXR9h8C0ooDR3IJBSZ45SBab96k9R5Q0Su8JPUl4afhijKaZDE3oulHJcNespLdvTn5j6_eI10W1so28m9v4ZvkNTHdDwNp71dTK4UDY1EwoAV8G5EUuYWpIJPoFPRvZhPYsqzwByFMKczvl9J3Jem3Gwh2gljkEVuk8mnkKcVPLoEROLWB83W5ZcHpYgl4Anc-kG_3hEzEYXY6jkhy_NkSmS05_whLff9AFstIxk6A7NGvapjmVXCKPsAmkBzR5ZGRLJ8L"
                />
                <span className="absolute top-4 left-4 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Populyar</span>
              </div>
              <div className="px-5 pb-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-extrabold text-primary leading-tight">IELTS Academic Mock</h3>
                  <span className="text-secondary font-bold text-lg">15 ₼</span>
                </div>
                <p className="text-on-surface-variant text-sm mb-6 line-clamp-2">
                  Həqiqi imtahan mühitini hiss edin. Bütün 4 bölmə üzrə tam simulyasiya.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">timer</span> 2s 45d
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">quiz</span> 80 sual
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">trending_up</span> Orta
                  </div>
                </div>
                <Link href="/mock-exam" className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-xl">shopping_cart</span> Satın al
                </Link>
              </div>
            </div>

            {/* Card 2 */}
            <div className="group bg-surface-container-lowest rounded-xl p-1 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="relative rounded-lg overflow-hidden h-48 mb-4">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="SAT Practice"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBORwBxeFQQ9zI3gWcDIjuoqPlBx6HSvuLO4KllcFAzqGZ2kHoqBO7dLYk5wkhKd6kzYEouTXEsa7YLg_IWISjBlWi1eq5o5JP1DErpGKG9-3XuGMoWpqhzSW7ju_3_Bpbi5H0eL1487PN6m9oBauKPfhdhPejW8da_ZkrNaUTnEg5OLky7-mG2xPr7gjPfZHFqmsrc16WaDljWupfpzEH5Vylj8LHKIWLG5xvG_CDMzamJYLUcDzZWjbeuPyeatV94Amp-EdvqaCgU"
                />
                <span className="absolute top-4 left-4 bg-secondary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Yeni</span>
              </div>
              <div className="px-5 pb-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-extrabold text-primary leading-tight">SAT Practice Test 1</h3>
                  <span className="text-secondary font-bold text-lg">12 ₼</span>
                </div>
                <p className="text-on-surface-variant text-sm mb-6 line-clamp-2">
                  Digital SAT formatına tam uyğunlaşdırılmış riyaziyyat və oxu testləri.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">timer</span> 2s 14d
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">quiz</span> 98 sual
                  </div>
                </div>
                <Link href="/mock-exam" className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-xl">shopping_cart</span> Satın al
                </Link>
              </div>
            </div>

            {/* Card 3 */}
            <div className="group bg-surface-container-lowest rounded-xl p-1 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="relative rounded-lg overflow-hidden h-48 mb-4">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="TOEFL"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMuRuaJ7vyi1iiyAaHG6I6oEOjrn89FwAN2kxPqMLJlNvRvwWCTRKC2Z0zxZqVPsr8guj5WyaglsOWZezTdNKqabxxHSZrwiOBcnnkcZX4E52n7YGLmzLjnJ-d7lBslOq8wiVrAz_UUL6PVfYBdqj6mAc5AYLIjzTW9uVeKmxcf6lOCyDUmNZFSeLLQ7mt4EENy7gVaHn_0kFCgTTzlL8_QHorzcrnUg7Ef0M_UhPWbRrQNpLAGyaunpZye2iqxT4AnYBcYTRHKOV9"
                />
              </div>
              <div className="px-5 pb-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-extrabold text-primary leading-tight">TOEFL iBT Simulation</h3>
                  <span className="text-secondary font-bold text-lg">18 ₼</span>
                </div>
                <p className="text-on-surface-variant text-sm mb-6 line-clamp-2">
                  Real TOEFL interfeysi ilə tanış olun və nəticələrinizi dərhal əldə edin.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">timer</span> 3s 00d
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">quiz</span> 65 sual
                  </div>
                </div>
                <Link href="/mock-exam" className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-xl">shopping_cart</span> Satın al
                </Link>
              </div>
            </div>

            {/* Card 4 */}
            <div className="group bg-surface-container-lowest rounded-xl p-1 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="relative rounded-lg overflow-hidden h-48 mb-4">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  alt="DİM"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCIPOQeIOnSUIkTIzkNIt_Zoxz2Qza2nkglFDxK0_M4S4jLs333LtMV8MIeFDMxXREgPRjbaPFx2FM3zKyRuj0z2oI06Yu94WRJALJG1dXKhItHqePvV3c3pkYngE8UryTPyN7qN8Sn7Hv2PLKxdKLO3_snAP4IEL_7brTPEezUYhdWUWJasNoEXhhl6nUYNxr1B3O4Xj2OIPxNSjzyz0spo81yd1r-r9Q47ndeijTNQAM8LD05KhakUZ5qg7H16iFu88c0eJcB9KuI"
                />
                <span className="absolute top-4 left-4 bg-tertiary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">Dövlət İmtahanı</span>
              </div>
              <div className="px-5 pb-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-extrabold text-primary leading-tight">DİM Buraxılış İmtahanı</h3>
                  <span className="text-secondary font-bold text-lg">10 ₼</span>
                </div>
                <p className="text-on-surface-variant text-sm mb-6 line-clamp-2">
                  11-ci siniflər üçün yeni kurikulum əsasında hazırlanmış tam sınaq paketi.
                </p>
                <div className="flex flex-wrap gap-3 mb-6">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">timer</span> 3s 15d
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-on-tertiary-fixed-variant bg-tertiary-fixed/30 px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-base">quiz</span> 90 sual
                  </div>
                </div>
                <Link href="/mock-exam" className="w-full bg-gradient-to-r from-primary to-primary-container text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <span className="material-symbols-outlined text-xl">shopping_cart</span> Satın al
                </Link>
              </div>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-2 pt-8">
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center bg-primary text-white font-bold">1</button>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors font-semibold">2</button>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors font-semibold">3</button>
            <button className="w-10 h-10 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
