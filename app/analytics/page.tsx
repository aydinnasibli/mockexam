import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";

export default function Analytics() {
  return (
    <>
      <Navbar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-6 md:p-10 bg-surface-subtle min-h-screen">
          {/* Hero Results Section */}
          <section className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Score Card */}
            <div className="lg:col-span-2 tc-gradient-hero p-10 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-extrabold font-headline tracking-tight mb-2">SAT Mock #432</h1>
                    <p className="text-on-primary-container font-medium">24 Oktyabr, 2024</p>
                  </div>
                  <span className="bg-secondary px-4 py-1 rounded-full text-xs font-bold tracking-widest">ƏLA NƏTİCƏ</span>
                </div>
                <div className="flex items-baseline gap-4 mb-2">
                  <span className="text-[5rem] font-black font-headline leading-none">1540</span>
                  <span className="text-2xl text-on-primary-container font-medium">/ 1600</span>
                </div>
                <p className="text-lg text-white/80 max-w-md">
                  Təbriklər! Sizin nəticəniz müraciət edənlərin top 1%-lik hissəsinə daxildir.
                </p>
              </div>
              {/* Decorative Graphic */}
              <div className="absolute right-[-10%] bottom-[-20%] w-64 h-64 bg-secondary rounded-full blur-[80px] opacity-20"></div>
            </div>

            {/* Quick Stats Bento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest p-6 rounded-3xl flex flex-col justify-center items-center shadow-sm">
                <span className="material-symbols-outlined text-secondary text-3xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>timer</span>
                <span className="text-2xl font-bold font-headline">172 dəq</span>
                <span className="text-xs text-outline font-medium">Ümumi vaxt</span>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-3xl flex flex-col justify-center items-center shadow-sm">
                <span className="material-symbols-outlined text-primary text-3xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                <span className="text-2xl font-bold font-headline">94%</span>
                <span className="text-xs text-outline font-medium">Düzgünlük</span>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-3xl flex flex-col justify-center items-center shadow-sm">
                <span className="material-symbols-outlined text-error text-3xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                <span className="text-2xl font-bold font-headline">6</span>
                <span className="text-xs text-outline font-medium">Səhv cavab</span>
              </div>
              <div className="bg-surface-container-lowest p-6 rounded-3xl flex flex-col justify-center items-center shadow-sm">
                <span className="material-symbols-outlined text-tertiary text-3xl mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                <span className="text-2xl font-bold font-headline">+40</span>
                <span className="text-xs text-outline font-medium">Artım</span>
              </div>
            </div>
          </section>

          {/* Categories Breakdown */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold font-headline mb-6 px-2">Bölmələr üzrə göstəricilər</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Math Section */}
              <div className="bg-surface-container-low p-8 rounded-3xl hover:bg-surface-bright transition-all duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg font-headline">SAT Math</h3>
                  <span className="text-secondary font-bold">790/800</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-outline">Düzgün cavablar</span>
                      <span>56 / 58</span>
                    </div>
                    <div className="h-2 w-full bg-secondary-container rounded-full overflow-hidden flex">
                      <div className="h-full bg-secondary" style={{ width: '96%' }}></div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-outline-variant/10">
                    <div className="flex-1">
                      <p className="text-[10px] text-outline font-bold uppercase mb-1">Cəbr</p>
                      <p className="font-bold text-sm">Mükəmməl</p>
                    </div>
                    <div className="flex-1 border-l border-outline-variant/10 pl-4">
                      <p className="text-[10px] text-outline font-bold uppercase mb-1">Həndəsə</p>
                      <p className="font-bold text-sm">Təkmilləşdirilməli</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reading Section */}
              <div className="bg-surface-container-low p-8 rounded-3xl hover:bg-surface-bright transition-all duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg font-headline">Reading</h3>
                  <span className="text-secondary font-bold">380/400</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-outline">Düzgün cavablar</span>
                      <span>48 / 52</span>
                    </div>
                    <div className="h-2 w-full bg-secondary-container rounded-full overflow-hidden flex">
                      <div className="h-full bg-secondary" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-outline-variant/10">
                    <div className="flex-1">
                      <p className="text-[10px] text-outline font-bold uppercase mb-1">Analiz</p>
                      <p className="font-bold text-sm">Yüksək</p>
                    </div>
                    <div className="flex-1 border-l border-outline-variant/10 pl-4">
                      <p className="text-[10px] text-outline font-bold uppercase mb-1">Lüğət</p>
                      <p className="font-bold text-sm">Orta</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Writing Section */}
              <div className="bg-surface-container-low p-8 rounded-3xl hover:bg-surface-bright transition-all duration-300">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-lg font-headline">Writing</h3>
                  <span className="text-secondary font-bold">370/400</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-2">
                      <span className="text-outline">Düzgün cavablar</span>
                      <span>40 / 44</span>
                    </div>
                    <div className="h-2 w-full bg-secondary-container rounded-full overflow-hidden flex">
                      <div className="h-full bg-secondary" style={{ width: '90%' }}></div>
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-outline-variant/10">
                    <div className="flex-1">
                      <p className="text-[10px] text-outline font-bold uppercase mb-1">Qrammatika</p>
                      <p className="font-bold text-sm">Əla</p>
                    </div>
                    <div className="flex-1 border-l border-outline-variant/10 pl-4">
                      <p className="text-[10px] text-outline font-bold uppercase mb-1">Punktuasiya</p>
                      <p className="font-bold text-sm">Təkrarlamalı</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Error Analysis Section */}
          <section className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
              <div>
                <h2 className="text-3xl font-extrabold font-headline tracking-tight mb-2">Səhvlərin analizi</h2>
                <p className="text-outline max-w-lg">Səhv cavablandırdığınız sualların detallı izahı və mövzu üzrə təsnifatı.</p>
              </div>
              <button className="bg-surface-container-high text-primary font-bold py-3 px-6 rounded-xl hover:bg-surface-dim transition-colors flex items-center gap-2">
                <span className="material-symbols-outlined">download</span>
                PDF Yüklə
              </button>
            </div>

            <div className="space-y-6">
              {/* Error Question Item 1 */}
              <div className="p-6 bg-surface-container-low rounded-2xl group hover:bg-surface-bright transition-all">
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-[10px] font-bold uppercase">Sual 14</span>
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full text-[10px] font-bold uppercase">Math - Functions</span>
                  <span className="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase">Çətinlik: Orta</span>
                </div>
                <h4 className="font-headline font-bold text-lg mb-4 leading-relaxed">
                  If f(x) = ax² + bx + c and the graph of y = f(x) passes through the points (0, 3) and (1, 4), which of the following could be the value of a + b?
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 p-6 bg-white rounded-xl">
                  <div>
                    <p className="text-[10px] font-black text-error mb-3 tracking-widest">SİZİN CAVABINIZ</p>
                    <div className="p-4 border-2 border-error/20 bg-error/5 rounded-lg font-medium text-error">
                      B) 7
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-secondary mb-3 tracking-widest">DÜZGÜN CAVAB</p>
                    <div className="p-4 border-2 border-secondary/20 bg-secondary/5 rounded-lg font-medium text-secondary">
                      A) 1
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-6 border-t border-outline-variant/10">
                  <p className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">lightbulb</span>
                    Ekspert İzahı:
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    f(0) = 3 olduğu üçün c = 3 tapılır. f(1) = 4 olduğu üçün a(1)² + b(1) + 3 = 4, yəni a + b + 3 = 4. Buradan a + b = 1 nəticəsi alınır. Siz c-ni nəzərə almadan birbaşa hesablama apardığınız üçün səhv etmisiniz.
                  </p>
                </div>
              </div>

              {/* Error Question Item 2 */}
              <div className="p-6 bg-surface-container-low rounded-2xl group hover:bg-surface-bright transition-all">
                <div className="flex flex-wrap gap-3 mb-4">
                  <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-[10px] font-bold uppercase">Sual 32</span>
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed px-3 py-1 rounded-full text-[10px] font-bold uppercase">Reading - Evidence Based</span>
                  <span className="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-bold uppercase">Çətinlik: Çətin</span>
                </div>
                <h4 className="font-headline font-bold text-lg mb-4 leading-relaxed">
                  Which choice best describes the central theme of the passage regarding the industrial revolution&apos;s impact on rural communities?
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 p-6 bg-white rounded-xl">
                  <div>
                    <p className="text-[10px] font-black text-error mb-3 tracking-widest">SİZİN CAVABINIZ</p>
                    <div className="p-4 border-2 border-error/20 bg-error/5 rounded-lg font-medium text-error">
                      D) Complete disappearance of traditions
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-secondary mb-3 tracking-widest">DÜZGÜN CAVAB</p>
                    <div className="p-4 border-2 border-secondary/20 bg-secondary/5 rounded-lg font-medium text-secondary">
                      C) Gradual transformation and adaptation
                    </div>
                  </div>
                </div>
                <div className="mt-6 p-6 border-t border-outline-variant/10">
                  <p className="text-sm font-bold text-primary mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">lightbulb</span>
                    Ekspert İzahı:
                  </p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Mətndə 14-cü sətirdə qeyd olunduğu kimi, kənd həyatı tamamilə yox olmur, əksinə yeni iqtisadi reallıqlara uyğunlaşır. &quot;Complete disappearance&quot; ifadəsi mətndəki &quot;evolution&quot; sözü ilə ziddiyyət təşkil edir.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Chart/Visualization Placeholder Section */}
          <section className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm">
              <h3 className="font-bold font-headline mb-6">Nəticə Trendi</h3>
              <div className="h-64 flex items-end justify-between gap-2 px-2">
                <div className="w-full bg-primary-fixed-dim/20 rounded-t-lg relative group h-[40%]">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-[10px] px-2 py-1 rounded">1240</div>
                </div>
                <div className="w-full bg-primary-fixed-dim/40 rounded-t-lg relative group h-[55%]">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-[10px] px-2 py-1 rounded">1380</div>
                </div>
                <div className="w-full bg-primary-fixed-dim/60 rounded-t-lg relative group h-[65%]">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-[10px] px-2 py-1 rounded">1420</div>
                </div>
                <div className="w-full bg-primary-fixed-dim/80 rounded-t-lg relative group h-[85%]">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-[10px] px-2 py-1 rounded">1510</div>
                </div>
                <div className="w-full bg-primary rounded-t-lg relative group h-full">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-white text-[10px] px-2 py-1 rounded">1540</div>
                </div>
              </div>
              <div className="flex justify-between mt-4 text-[10px] font-bold text-outline">
                <span>Sentyabr</span>
                <span>Oktyabr</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm relative overflow-hidden">
              <h3 className="font-bold font-headline mb-2">Güclü Tərəfləriniz</h3>
              <p className="text-xs text-outline mb-8">Data analiz əsasında fokuslanmalı olduğunuz sahələr.</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                    <span className="material-symbols-outlined">psychology</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Məntiqi Təfəkkür</span>
                      <span>98%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full">
                      <div className="h-full bg-secondary rounded-full" style={{ width: '98%' }}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <span className="material-symbols-outlined">speed</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Vaxt İdarəetməsi</span>
                      <span>85%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full">
                      <div className="h-full bg-primary rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-tertiary/10 text-tertiary rounded-lg">
                    <span className="material-symbols-outlined">menu_book</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span>Sürətli Oxuma</span>
                      <span>72%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container rounded-full">
                      <div className="h-full bg-tertiary rounded-full" style={{ width: '72%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
      {/* We add a simpler footer here to match the dashboard style */}
      <footer className="w-full bg-surface-container-low border-t border-outline-variant ml-0 md:ml-64 relative z-10">
        <div className="w-full py-8 px-6 flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto">
          <div className="flex flex-col items-center md:items-start gap-1 mb-4 md:mb-0">
            <div className="text-sm font-bold text-primary font-headline">Test Centre</div>
            <p className="text-xs text-on-surface-variant">© 2025 Test Centre. All rights reserved.</p>
          </div>
          <div className="flex gap-6">
            <a className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors" href="#">Terms of Use</a>
            <a className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors" href="#">Privacy Policy</a>
            <a className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors" href="#">Support</a>
            <a className="text-xs text-on-surface-variant hover:text-primary-mid transition-colors" href="#">Contact</a>
          </div>
        </div>
      </footer>
    </>
  );
}
