import Link from "next/link";
import { Timer, ZoomIn, PenLine, Flag, Strikethrough, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";

export default function MockExam() {
  return (
    <div className="bg-background text-on-surface select-none h-screen overflow-hidden flex flex-col">
      {/* TopAppBar */}
      <header className="w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm h-16 flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-xl font-bold tracking-tighter text-primary font-headline">
            Test Centre
          </Link>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Digital SAT Practice</span>
            <span className="text-sm font-bold text-primary">Reading and Writing Module 1</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-primary/10 rounded-full shadow-sm">
            <Timer className="text-primary" size={18} />
            <span className="font-headline font-bold text-primary tabular-nums">34:52</span>
          </div>
          <button className="editorial-gradient hover:opacity-90 transition-all text-white px-5 py-2 rounded-xl text-sm font-bold font-headline shadow-lg">
            İmtahanı bitir
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Panel */}
        <section className="w-1/2 border-r border-slate-100 bg-surface flex flex-col overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-surface-container-low">
            <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Mətn</span>
            <div className="flex gap-2">
              <button className="p-1.5 hover:bg-white rounded-lg transition-colors text-on-surface-variant">
                <ZoomIn size={20} />
              </button>
              <button className="p-1.5 hover:bg-white rounded-lg transition-colors text-on-surface-variant">
                <PenLine size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-12 py-10 no-scrollbar">
            <article className="max-w-2xl mx-auto">
              <h2 className="text-xl font-headline font-bold text-primary mb-6 leading-tight">The Evolution of Digital Architecture</h2>
              <div className="space-y-6 text-on-surface/90 leading-relaxed font-body">
                <p>
                  In the burgeoning era of technological sophistication, the architectural landscape has shifted from tactile drafting boards to immersive digital environments. This transition, while primarily logistical, carries profound implications for the spatial cognition of the designer. When an architect interacts with a three-dimensional model via a screen, the sensory feedback loop is inherently mediated by the software&apos;s constraints.
                </p>
                <p>
                  Historically, the physical act of drawing allowed for a &quot;productive friction&quot;—a moment of hesitation where the hand&apos;s movement across the grain of the paper invited reflection. Digital tools, conversely, prioritize efficiency and seamlessness, potentially bypassing this contemplative phase of the creative process. However, recent developments in haptic feedback and virtual reality seek to reintroduce this tactile engagement, bridging the gap between the ephemeral digital void and the grounded physical reality.
                </p>
                <p>
                  The question then remains: does the precision of the algorithm enrich the soul of the structure, or does it merely standardize the human experience into a series of optimized nodes? Scholars suggest that the most successful contemporary works are those that leverage computational power while maintaining a vestigial connection to traditional craft and human-centric proportions.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* Right Panel */}
        <section className="w-1/2 bg-white flex flex-col overflow-hidden relative">
          <div className="flex-1 flex flex-col overflow-y-auto px-12 py-10 no-scrollbar">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-8">
                <span className="bg-primary text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold font-headline text-sm">14</span>
                <span className="text-on-surface-variant font-medium text-sm">Sual 27-dən 14-cüsü</span>
              </div>

              <div className="mb-10">
                <p className="text-lg font-medium leading-relaxed text-on-surface mb-8">
                  Based on the text, which of the following best describes the author&apos;s view on the relationship between digital tools and the creative process?
                </p>
                <div className="space-y-3">
                  <label className="group flex items-start gap-4 p-4 rounded-xl border-2 border-transparent bg-surface-container-low hover:bg-surface-container-high transition-all cursor-pointer">
                    <input className="mt-1 text-primary focus:ring-primary h-4 w-4" name="exam_option" type="radio" />
                    <span className="text-on-surface leading-normal">Digital tools have completely replaced the need for traditional drafting and have improved architectural quality.</span>
                  </label>
                  <label className="group flex items-start gap-4 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 transition-all cursor-pointer">
                    <input defaultChecked className="mt-1 text-primary focus:ring-primary h-4 w-4" name="exam_option" type="radio" />
                    <span className="text-primary font-semibold leading-normal">Digital tools prioritize efficiency, which may inadvertently shorten the necessary period of reflection in design.</span>
                  </label>
                  <label className="group flex items-start gap-4 p-4 rounded-xl border-2 border-transparent bg-surface-container-low hover:bg-surface-container-high transition-all cursor-pointer">
                    <input className="mt-1 text-primary focus:ring-primary h-4 w-4" name="exam_option" type="radio" />
                    <span className="text-on-surface leading-normal">The absence of physical friction in digital drafting tools makes the design process more prone to technical errors.</span>
                  </label>
                  <label className="group flex items-start gap-4 p-4 rounded-xl border-2 border-transparent bg-surface-container-low hover:bg-surface-container-high transition-all cursor-pointer">
                    <input className="mt-1 text-primary focus:ring-primary h-4 w-4" name="exam_option" type="radio" />
                    <span className="text-on-surface leading-normal">The use of algorithms in modern architecture ensures that all human needs are met with mathematical precision.</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">
                  <Flag size={18} />
                  İşarələ
                </button>
                <button className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors text-sm font-medium">
                  <Strikethrough size={18} />
                  Seçimləri sil
                </button>
              </div>
            </div>
          </div>

          <footer className="h-20 bg-surface-container-low border-t border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
            <button className="flex items-center gap-2 text-primary font-bold font-headline hover:bg-white px-4 py-2 rounded-xl transition-all">
              <ChevronLeft size={20} />
              Əvvəlki
            </button>
            <button className="flex items-center gap-3 px-6 py-2 bg-white rounded-xl shadow-sm border border-slate-100 group">
              <span className="text-sm font-bold text-primary font-headline">Bütün suallar</span>
              <ChevronUp className="text-primary group-hover:rotate-180 transition-transform" size={18} />
            </button>
            <button className="flex items-center gap-2 editorial-gradient text-white font-bold font-headline px-6 py-2 rounded-xl hover:opacity-90 shadow-lg transition-all">
              Növbəti
              <ChevronRight size={20} />
            </button>
          </footer>
        </section>

        {/* Question Navigation Float */}
        <div className="absolute bottom-24 right-8 w-64 bg-white p-4 rounded-2xl shadow-2xl border border-slate-100 z-30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">Sual Naviqasiyası</h3>
            <span className="text-xs font-bold text-secondary">13/27</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((num) => (
              <button key={num} className="aspect-square editorial-gradient text-white text-xs font-bold rounded-lg">{num}</button>
            ))}
            <button className="aspect-square border-2 border-primary text-primary text-xs font-bold rounded-lg">14</button>
            {[15, 16, 17, 18].map((num) => (
              <button key={num} className="aspect-square bg-surface-container text-on-surface-variant text-xs font-bold rounded-lg">{num}</button>
            ))}
            <button className="aspect-square bg-surface-container text-on-surface-variant text-xs font-bold rounded-lg flex items-center justify-center">
              <Flag className="text-error" size={12} />
            </button>
            <button className="aspect-square bg-surface-container text-on-surface-variant text-xs font-bold rounded-lg">20</button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-[10px] text-on-surface-variant font-medium">Cavablanıb</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-surface-container" />
              <span className="text-[10px] text-on-surface-variant font-medium">Qalıb</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
