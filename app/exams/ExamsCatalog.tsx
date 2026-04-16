'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search, SearchX, Timer, HelpCircle, Banknote,
  Monitor, Globe, BookOpen,
  X, ArrowRight,
} from 'lucide-react';
import type { PublicExam } from '@/lib/db/exams';

type ExamType = 'sat' | 'ielts' | 'toefl';

const examTypeLabels: Record<ExamType, string> = {
  sat: 'SAT', ielts: 'IELTS', toefl: 'TOEFL',
};

const examTypeIcons: Record<ExamType, React.ElementType> = {
  sat: Monitor, ielts: Globe, toefl: BookOpen,
};

const examTypeColors: Record<ExamType, { bg: string; text: string; ring: string }> = {
  sat:   { bg: 'bg-blue-100',   text: 'text-blue-700',   ring: 'ring-blue-200' },
  ielts: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200' },
  toefl: { bg: 'bg-cyan-100',   text: 'text-cyan-700',   ring: 'ring-cyan-200' },
};

const allTypes: ExamType[] = ['sat', 'ielts', 'toefl'];

interface Props {
  exams: PublicExam[];
}

export default function ExamsCatalog({ exams }: Props) {
  const [selectedTypes, setSelectedTypes] = useState<ExamType[]>([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [sortOrder, setSortOrder]         = useState<'newest' | 'price-asc' | 'price-desc'>('newest');

  const toggleType = (type: ExamType) =>
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);

  const clearFilters = () => { setSelectedTypes([]); setSearchQuery(''); setSortOrder('newest'); };
  const hasActiveFilters = selectedTypes.length > 0 || !!searchQuery;

  const filtered = exams
    .filter(exam => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(exam.type as ExamType)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!exam.title.toLowerCase().includes(q) && !exam.description.toLowerCase().includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortOrder === 'price-asc')  return a.price - b.price;
      if (sortOrder === 'price-desc') return b.price - a.price;
      return 0;
    });

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-16 min-h-screen bg-surface">
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <div className="flex items-end gap-4 mb-2">
            <h1 className="text-3xl font-black text-primary font-headline">Bütün İmtahanlar</h1>
            <span className="mb-1 text-sm font-bold text-on-surface-variant bg-surface-container px-3 py-1 rounded-full">
              {filtered.length} sınaq
            </span>
          </div>
          <p className="text-on-surface-variant">SAT, IELTS və TOEFL imtahanlarına professional hazırlıq üçün test paketləri</p>
        </div>

        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full md:w-72 flex-shrink-0 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none shadow-sm placeholder:text-outline"
                placeholder="Sınaq axtar..." type="text"
              />
            </div>

            <div className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-black text-on-surface-variant uppercase tracking-widest">İmtahan növü</h2>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="text-xs font-bold text-secondary hover:text-primary transition-colors">Sıfırla</button>
                )}
              </div>

              <div className="space-y-1">
                {allTypes.map(type => {
                  const Icon = examTypeIcons[type];
                  const colors = examTypeColors[type];
                  const isSelected = selectedTypes.includes(type);
                  const count = exams.filter(e => e.type === type).length;
                  return (
                    <label key={type} className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${isSelected ? 'bg-primary/5' : 'hover:bg-surface-container'}`}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleType(type)} className="w-4 h-4 rounded accent-primary" />
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${colors.bg}`}>
                        <Icon size={14} className={colors.text} />
                      </div>
                      <span className={`text-sm font-semibold flex-1 ${isSelected ? 'text-primary' : 'text-on-surface-variant'}`}>{examTypeLabels[type]}</span>
                      <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">{count}</span>
                    </label>
                  );
                })}
              </div>

              {selectedTypes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-outline-variant/30">
                  {selectedTypes.map(type => (
                    <button key={type} onClick={() => toggleType(type)} className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors">
                      {examTypeLabels[type]} <X size={10} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-on-surface-variant font-medium">
                <span className="font-bold text-primary">{filtered.length}</span> nəticə
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-on-surface-variant">Sıralama:</span>
                <select value={sortOrder} onChange={e => setSortOrder(e.target.value as typeof sortOrder)} className="bg-white border border-outline-variant rounded-lg text-sm font-bold text-primary focus:ring-2 focus:ring-primary/20 focus:outline-none px-3 py-2">
                  <option value="newest">Ən yeni</option>
                  <option value="price-asc">Qiymət: Aşağıdan yuxarı</option>
                  <option value="price-desc">Qiymət: Yuxarıdan aşağı</option>
                </select>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-2xl border border-outline-variant/50">
                <SearchX className="text-outline mb-4" size={48} />
                <h3 className="text-xl font-bold text-primary mb-2 font-headline">Nəticə tapılmadı</h3>
                <p className="text-on-surface-variant text-sm mb-6">Filtrləri dəyişdirməyi cəhd edin</p>
                <button onClick={clearFilters} className="px-5 py-2.5 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                  Filtrləri sıfırla
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(exam => {
                  const type = exam.type as ExamType;
                  const Icon = examTypeIcons[type] ?? BookOpen;
                  const colors = examTypeColors[type] ?? examTypeColors.sat;
                  return (
                    <div key={exam.id} className="bg-white rounded-2xl border border-outline-variant/50 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden">
                      <div className="p-5 pb-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ring-4 ${colors.bg} ${colors.ring}`}>
                            <Icon size={22} className={colors.text} />
                          </div>
                          <span className="editorial-gradient text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{exam.tag}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-primary font-headline leading-snug mb-2">{exam.title}</h3>
                        <p className="text-on-surface-variant text-xs leading-relaxed line-clamp-2">{exam.description}</p>
                      </div>

                      <div className="mx-5 pb-4 flex items-center gap-3 border-t border-outline-variant/20 pt-4">
                        <div className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                          <Timer size={13} />{exam.durationMinutes} dəq
                        </div>
                        <div className="w-px h-3 bg-outline-variant" />
                        <div className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant">
                          <HelpCircle size={13} />{exam.totalQuestions} sual
                        </div>
                        <div className="w-px h-3 bg-outline-variant" />
                        <div className="flex items-center gap-1 text-xs font-bold text-primary ml-auto">
                          <Banknote size={13} />{exam.price} ₼
                        </div>
                      </div>

                      <div className="px-5 pb-5">
                        <Link href={`/exams/${exam.id}`} className="flex items-center justify-center gap-2 w-full editorial-gradient text-white py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                          Sınağa bax <ArrowRight size={16} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// Inline to avoid extra import in the client bundle — same as the existing Navbar
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
