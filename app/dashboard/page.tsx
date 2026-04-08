import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Link from "next/link";

export default function Dashboard() {
  return (
    <>
      <Navbar />
      <div className="flex min-h-screen pt-20">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-6 lg:p-10 max-w-7xl">
          {/* Header Section */}
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-primary tracking-tight">Xoş gəldin, Elvin!</h1>
              <p className="text-on-surface-variant mt-1">Bugünkü hədəfin: Reading bölməsini 8.0+ səviyyəsinə çatdırmaq.</p>
            </div>
            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/20">
              <span className="material-symbols-outlined text-secondary text-sm">schedule</span>
              <span className="text-sm font-semibold text-primary">Növbəti imtahan: 2 gün sonra</span>
            </div>
          </header>

          {/* Summary Cards Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col justify-between hover:bg-surface-bright transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-secondary-container/30 rounded-lg">
                  <span className="material-symbols-outlined text-secondary">task_alt</span>
                </div>
                <span className="text-secondary text-xs font-bold px-2 py-1 bg-secondary-container rounded-md">+12% bu ay</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-sm font-medium mb-1">Tamamlanmış imtahanlar</p>
                <h3 className="text-3xl font-bold text-primary">24</h3>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border border-outline-variant/10 flex flex-col justify-between hover:bg-surface-bright transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-primary-fixed rounded-lg">
                  <span className="material-symbols-outlined text-primary">grade</span>
                </div>
                <span className="text-primary text-xs font-bold px-2 py-1 bg-primary-fixed-dim rounded-md">Yüksək performans</span>
              </div>
              <div>
                <p className="text-on-surface-variant text-sm font-medium mb-1">Orta bal</p>
                <div className="flex items-baseline gap-1">
                  <h3 className="text-3xl font-bold text-primary">7.5</h3>
                  <span className="text-on-surface-variant text-xs">/ 9.0</span>
                </div>
              </div>
            </div>

            <div className="bg-primary p-6 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white/10 rounded-lg">
                  <span className="material-symbols-outlined text-white">event_upcoming</span>
                </div>
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium mb-1">Növbəti imtahan</p>
                <h3 className="text-xl font-bold text-white">IELTS Mock #14</h3>
                <p className="text-white/50 text-xs mt-1">15 Oktyabr, 10:00</p>
              </div>
            </div>
          </div>

          {/* Content Split Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Activities (Asymmetric Large Card) */}
            <div className="lg:col-span-2 bg-surface-container-low rounded-xl p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-primary">Son fəaliyyətlər</h2>
                <button className="text-primary text-sm font-semibold hover:underline underline-offset-4">Hamısına bax</button>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4 group">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-outline-variant/30">
                      <span className="material-symbols-outlined text-secondary text-sm">history_edu</span>
                    </div>
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-outline-variant/30"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-primary group-hover:text-secondary transition-colors">Speaking Mock Test</h4>
                      <span className="text-xs text-on-surface-variant">2 saat əvvəl</span>
                    </div>
                    <p className="text-sm text-on-surface-variant">Part 2 və 3 bölmələri tamamlandı. Akisentlyik üzərində işləmək tövsiyə olunur.</p>
                    <div className="mt-2 flex gap-2">
                      <span className="px-2 py-0.5 bg-surface-container-highest rounded text-[10px] font-bold text-primary uppercase">IELTS</span>
                      <span className="px-2 py-0.5 bg-secondary-container text-secondary rounded text-[10px] font-bold uppercase">Nəticə: 7.0</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 group">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-outline-variant/30">
                      <span className="material-symbols-outlined text-primary text-sm">auto_graph</span>
                    </div>
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-outline-variant/30"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-primary group-hover:text-secondary transition-colors">Analitika yeniləndi</h4>
                      <span className="text-xs text-on-surface-variant">Dünən</span>
                    </div>
                    <p className="text-sm text-on-surface-variant">Listening skorunuz son 3 imtahanda 0.5 bal artıb. Bu tempdə davam edin!</p>
                  </div>
                </div>

                <div className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-outline-variant/30">
                    <span className="material-symbols-outlined text-primary text-sm">description</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-primary group-hover:text-secondary transition-colors">Yeni material: Writing Task 1</h4>
                      <span className="text-xs text-on-surface-variant">3 gün əvvəl</span>
                    </div>
                    <p className="text-sm text-on-surface-variant">&quot;Academic Report Writing&quot; bələdçisi kitabxananıza əlavə edildi.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Exams (Sticky Side Section) */}
            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-bold text-primary">Tövsiyə olunan sınaqlar</h2>

              <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10 hover:shadow-md transition-shadow group">
                <div className="h-32 bg-slate-200 relative overflow-hidden">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="IELTS General Mock"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAZe2MDYbKb6GUtLzf0fM7ZExr3lLP28t3NOL_x5ZzdLWR4WiK4_MMncpiCCieCi7E3vevCwVfMWUs0GWLq3wN88yXrvh2fcSDGFC3ggOdltOr-AbHEBOWAP3e1Q8ay4mbjDQ7mubI4v870aWlDqEU5-StG6uTYCpzafPJxF4gdrSB-H2e6qyiIvWv4lCCWW46woAjw7ynqlLabE7ete_UonBxXi3WVCrAtvTvdOxTSEZun3am8ZOBakLyFfnvvsAX4cyNDFlV21B2X"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <span className="absolute bottom-3 left-3 px-2 py-1 bg-white text-primary text-[10px] font-bold rounded uppercase">Populyar</span>
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-primary mb-2">IELTS General Mock #42</h4>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant mb-4">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">timer</span> 2s 45d</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span> 1.2k+ tələbə</span>
                  </div>
                  <Link href="/mock-exam" className="w-full block text-center bg-surface-container-high text-primary font-bold py-2 rounded-lg text-sm hover:bg-primary hover:text-white transition-all">
                    İndi başla
                  </Link>
                </div>
              </div>

              <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/10 hover:shadow-md transition-shadow group">
                <div className="h-32 bg-slate-200 relative overflow-hidden">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="SAT Practice"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBbWHjS7CjgsPl9Q6YDxArg1tY06D2Y1c2BwFAElpGFn_yo4YtDdijxredIJ_MydRHnQHGcL2-ZB29doLWXQDqevZ7Q8H7us7G7uboJBsXeduE2V4hogh74H97_QJbVHcVruV84_k_Y-51mnd0iA-4mMIXmctGCmwRf1cr-lAu4pDwHlwPXYThZBqepbzfiIQOvBGSwKJhXV17O0bZxvmX7w5B1555eupji2IFBR6Fw3hECaO8ejnV1C_oaITR89JWHZErgHCw7gPv_"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                  <span className="absolute bottom-3 left-3 px-2 py-1 bg-secondary text-white text-[10px] font-bold rounded uppercase">Yeni</span>
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-primary mb-2">SAT Practice - Section 1</h4>
                  <div className="flex items-center gap-4 text-xs text-on-surface-variant mb-4">
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">timer</span> 1s 15d</span>
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">group</span> 450+ tələbə</span>
                  </div>
                  <Link href="/mock-exam" className="w-full block text-center bg-surface-container-high text-primary font-bold py-2 rounded-lg text-sm hover:bg-primary hover:text-white transition-all">
                    İndi başla
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="w-full bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 mt-20 md:ml-64 relative z-10">
        <div className="w-full py-12 px-6 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto gap-8">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-base font-bold text-blue-900 mb-2">Məşqçi Platforması</span>
            <p className="font-inter text-xs text-slate-500 text-center md:text-left">© 2024 Məşqçi Platforması. Bütün hüquqlar qorunur.</p>
          </div>
          <div className="flex gap-8">
            <a className="font-inter text-xs text-slate-500 hover:text-blue-600 transition-all underline-offset-4 hover:underline" href="#">İstifadə şərtləri</a>
            <a className="font-inter text-xs text-slate-500 hover:text-blue-600 transition-all underline-offset-4 hover:underline" href="#">Məxfilik siyasəti</a>
            <a className="font-inter text-xs text-slate-500 hover:text-blue-600 transition-all underline-offset-4 hover:underline" href="#">Dəstək</a>
            <a className="font-inter text-xs text-slate-500 hover:text-blue-600 transition-all underline-offset-4 hover:underline" href="#">Əlaqə</a>
          </div>
        </div>
      </footer>
    </>
  );
}
