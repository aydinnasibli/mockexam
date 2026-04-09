'use client';

import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { mockExams, ExamType, examTypeLabels } from "@/lib/data";
import { Search, SearchX, Timer, HelpCircle, Eye, X } from "lucide-react";

const examTypeImages: Record<ExamType, string> = {
  sat: "https://lh3.googleusercontent.com/aida-public/AB6AXuBORwBxeFQQ9zI3gWcDIjuoqPlBx6HSvuLO4KllcFAzqGZ2kHoqBO7dLYk5wkhKd6kzYEouTXEsa7YLg_IWISjBlWi1eq5o5JP1DErpGKG9-3XuGMoWpqhzSW7ju_3_Bpbi5H0eL1487PN6m9oBauKPfhdhPejW8da_ZkrNaUTnEg5OLky7-mG2xPr7gjPfZHFqmsrc16WaDljWupfpzEH5Vylj8LHKIWLG5xvG_CDMzamJYLUcDzZWjbeuPyeatV94Amp-EdvqaCgU",
  ielts: "https://lh3.googleusercontent.com/aida-public/AB6AXuBgnB_DWqXR9h8C0ooDR3IJBSZ45SBab96k9R5Q0Su8JPUl4afhijKaZDE3oulHJcNespLdvTn5j6_eI10W1so28m9v4ZvkNTHdDwNp71dTK4UDY1EwoAV8G5EUuYWpIJPoFPRvZhPYsqzwByFMKczvl9J3Jem3Gwh2gljkEVuk8mnkKcVPLoEROLWB83W5ZcHpYgl4Anc-kG_3hEzEYXY6jkhy_NkSmS05_whLff9AFstIxk6A7NGvapjmVXCKPsAmkBzR5ZGRLJ8L",
  toefl: "https://lh3.googleusercontent.com/aida-public/AB6AXuCMuRuaJ7vyi1iiyAaHG6I6oEOjrn89FwAN2kxPqMLJlNvRvwWCTRKC2Z0zxZqVPsr8guj5WyaglsOWZezTdNKqabxxHSZrwiOBcnnkcZX4E52n7YGLmzLjnJ-d7lBslOq8wiVrAz_UUL6PVfYBdqj6mAc5AYLIjzTW9uVeKmxcf6lOCyDUmNZFSeLLQ7mt4EENy7gVaHn_0kFCgTTzlL8_QHorzcrnUg7Ef0M_UhPWbRrQNpLAGyaunpZye2iqxT4AnYBcYTRHKOV9",
  dim: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIPOQeIOnSUIkTIzkNIt_Zoxz2Qza2nkglFDxK0_M4S4jLs333LtMV8MIeFDMxXREgPRjbaPFx2FM3zKyRuj0z2oI06Yu94WRJALJG1dXKhItHqePvV3c3pkYngE8UryTPyN7qN8Sn7Hv2PLKxdKLO3_snAP4IEL_7brTPEezUYhdWUWJasNoEXhhl6nUYNxr1B3O4Xj2OIPxNSjzyz0spo81yd1r-r9Q47ndeijTNQAM8LD05KhakUZ5qg7H16iFu88c0eJcB9KuI",
  gre: "https://lh3.googleusercontent.com/aida-public/AB6AXuBgnB_DWqXR9h8C0ooDR3IJBSZ45SBab96k9R5Q0Su8JPUl4afhijKaZDE3oulHJcNespLdvTn5j6_eI10W1so28m9v4ZvkNTHdDwNp71dTK4UDY1EwoAV8G5EUuYWpIJPoFPRvZhPYsqzwByFMKczvl9J3Jem3Gwh2gljkEVuk8mnkKcVPLoEROLWB83W5ZcHpYgl4Anc-kG_3hEzEYXY6jkhy_NkSmS05_whLff9AFstIxk6A7NGvapjmVXCKPsAmkBzR5ZGRLJ8L",
};

const allTypes: ExamType[] = ['sat', 'ielts', 'toefl', 'dim', 'gre'];

export default function ExamsCatalog() {
  const [selectedTypes, setSelectedTypes] = useState<ExamType[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  const toggleType = (type: ExamType) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSearchQuery("");
    setSortOrder('newest');
  };

  const filteredExams = mockExams
    .filter(exam => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(exam.type)) return false;
      if (searchQuery && !exam.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'price-asc') return a.price - b.price;
      if (sortOrder === 'price-desc') return b.price - a.price;
      return 0;
    });

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-7xl mx-auto flex flex-col md:flex-row gap-8 min-h-screen">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-6">
          <section className="tc-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-primary font-headline">Filtrlər</h2>
              {(selectedTypes.length > 0 || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="text-xs font-bold text-secondary hover:text-on-secondary-container transition-colors"
                >
                  Təmizlə
                </button>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">İmtahan növü</label>
              <div className="flex flex-col gap-2">
                {allTypes.map(type => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={() => toggleType(type)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary/20 border-outline-variant accent-primary"
                    />
                    <span className={`text-sm font-medium transition-colors ${selectedTypes.includes(type) ? 'text-primary font-bold' : 'text-on-surface-variant group-hover:text-primary'}`}>
                      {examTypeLabels[type]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {selectedTypes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => toggleType(type)}
                    className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-primary text-white rounded-full"
                  >
                    {examTypeLabels[type]}
                    <X size={10} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <p className="text-sm text-on-surface-variant font-medium px-1">
            <span className="font-bold text-primary">{filteredExams.length}</span> nəticə tapıldı
          </p>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="relative w-full md:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={20} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-surface-container-lowest border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-sm"
                placeholder="Sınaq axtar..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-on-surface-variant whitespace-nowrap">Sıralama:</span>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                className="bg-surface-container-lowest border border-outline-variant rounded-lg text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 focus:outline-none px-3 py-2"
              >
                <option value="newest">Ən yeni</option>
                <option value="price-asc">Qiymət: Aşağıdan Yuxarı</option>
                <option value="price-desc">Qiymət: Yuxarıdan Aşağı</option>
              </select>
            </div>
          </div>

          {filteredExams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <SearchX className="text-outline mb-4" size={48} />
              <h3 className="text-xl font-bold text-primary mb-2">Nəticə tapılmadı</h3>
              <p className="text-on-surface-variant text-sm">Filtrləri və ya axtarışı dəyişdirməyə cəhd edin.</p>
              <button onClick={clearFilters} className="mt-4 px-5 py-2 editorial-gradient text-white rounded-lg text-sm font-bold hover:opacity-90 transition-opacity">
                Filtrləri təmizlə
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredExams.map((exam) => (
                <div key={exam.id} className="group tc-card overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
                  <div className="relative h-44 overflow-hidden">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      src={examTypeImages[exam.type]}
                      alt={exam.title}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    <span className="absolute top-3 left-3 editorial-gradient text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      {exam.tag}
                    </span>
                    <span className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-primary text-sm font-black px-3 py-1 rounded-full">
                      {exam.price} ₼
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h3 className="text-lg font-extrabold text-primary leading-tight font-headline mb-2">{exam.title}</h3>
                    <p className="text-on-surface-variant text-sm mb-4 line-clamp-2 flex-1">{exam.description}</p>

                    <div className="flex flex-wrap gap-2 mb-5">
                      <div className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-lg">
                        <Timer size={14} />
                        {exam.durationMinutes} dəq
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant bg-surface-container-high px-2.5 py-1 rounded-lg">
                        <HelpCircle size={14} />
                        {exam.totalQuestions} sual
                      </div>
                    </div>

                    <Link
                      href={`/exams/${exam.id}`}
                      className="w-full editorial-gradient text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
                    >
                      <Eye size={18} />
                      Ətraflı bax
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
