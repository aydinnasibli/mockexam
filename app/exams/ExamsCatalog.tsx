'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { SlidersHorizontal, X } from 'lucide-react';
import type { PublicExam } from '@/lib/db/exams';
import { EXAM_TYPE_LABELS } from '@/lib/exam-types';

const examTypeLabels: Record<string, string> = EXAM_TYPE_LABELS;

interface Props {
  exams: PublicExam[];
  initialType?: string;
}

export default function ExamsCatalog({ exams, initialType }: Props) {
  const [activeType, setActiveType]   = useState<string>(initialType ?? 'all');
  const [sortOrder, setSortOrder]     = useState<'popular' | 'price-asc' | 'price-desc'>('popular');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const types = Array.from(new Set(exams.map(e => e.type)));

  const filtered = exams
    .filter(exam => activeType === 'all' || exam.type === activeType)
    .sort((a, b) => {
      if (sortOrder === 'price-asc')  return a.price - b.price;
      if (sortOrder === 'price-desc') return b.price - a.price;
      return b.totalQuestions - a.totalQuestions;
    });

  const hasActiveFilters = activeType !== 'all';

  function clearAllFilters() {
    setActiveType('all');
  }

  // Rendered as a plain function call rather than a nested component: declaring
  // a component inside render gives it a new identity every render, which
  // remounts it and drops its state (react-hooks/static-components).
  const filterPanel = (
    <>
      <div className="eyebrow mb-4">İmtahan növü</div>
      <div className="flex flex-col gap-0.5">
        {['all', ...types].map(type => {
          const count = type === 'all'
            ? exams.length
            : exams.filter(e => e.type === type).length;
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => { setActiveType(type); setFiltersOpen(false); }}
              aria-pressed={isActive}
              className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors text-left"
              style={{
                background: isActive ? 'var(--color-surface-2)' : 'transparent',
                color: isActive ? 'var(--color-ink)' : 'var(--color-ink-soft)',
              }}
            >
              {isActive && (
                <span className="shrink-0 rounded-full bg-ink" style={{ width: 5, height: 5, display: 'inline-block' }} />
              )}
              <span className="flex-1">
                {type === 'all' ? 'Hamısı' : (examTypeLabels[type] ?? type.toUpperCase())}
              </span>
              <span className="text-[12px]" style={{ color: 'var(--color-ink-mute)' }}>{count}</span>
            </button>
          );
        })}
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="mt-6 text-[13px] font-medium transition-colors"
          style={{ color: 'var(--color-ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Filtri təmizlə
        </button>
      )}
    </>
  );

  return (
    <main className="pt-18 bg-bg min-h-screen">
      <div className="max-w-340 mx-auto px-4 sm:px-8 py-16">

        {/* Hero */}
        <div className="mb-14">
          <div className="flex items-center gap-3 mb-6">
            <span className="dot" />
            <span className="eyebrow" style={{ color: 'var(--color-ink)' }}>Kataloq</span>
          </div>
          <h1 className="t-display-2 m-0 mb-6">
            Bütün <span>sınaqlar.</span>
          </h1>
          <p className="t-lede m-0" style={{ color: 'var(--color-ink-soft)', maxWidth: 560 }}>
            SAT, IELTS, TOEFL imtahanlarına peşəkar hazırlıq paketləri.
          </p>
        </div>

        {/* Mobile filter toggle */}
        <div className="lg:hidden mb-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setFiltersOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rule text-[14px] font-medium text-ink-soft hover:bg-surface-2 transition-colors"
          >
            <SlidersHorizontal size={15} />
            Filtrlər
            {activeType !== 'all' && (
              <span className="w-2 h-2 rounded-full bg-ink" />
            )}
          </button>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
            aria-label="Sınaqları sırala"
            className="input-new"
            style={{ width: 'auto', paddingTop: 10, paddingBottom: 10, fontSize: 13 }}
          >
            <option value="popular">Popularlığa görə</option>
            <option value="price-asc">Qiymətə görə ↑</option>
            <option value="price-desc">Qiymətə görə ↓</option>
          </select>
        </div>

        {/* Mobile filter panel */}
        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden overflow-hidden mb-6"
            >
              <div className="card-new">
                <div className="flex items-center justify-between mb-4">
                  <span className="eyebrow">Filtrlər</span>
                  <button onClick={() => setFiltersOpen(false)} className="p-1 text-ink-mute hover:text-ink">
                    <X size={16} />
                  </button>
                </div>
                {filterPanel}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Body: sidebar + grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 lg:gap-12">

          {/* Desktop sidebar */}
          <aside className="hidden lg:block shrink-0 sticky top-24 self-start">
            {filterPanel}
          </aside>

          {/* Main */}
          <div>
            {/* Results row */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <span className="text-[14px]" style={{ color: 'var(--color-ink-mute)' }}>
                <span className="font-medium" style={{ color: 'var(--color-ink)' }}>{filtered.length}</span> nəticə
              </span>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                aria-label="Sınaqları sırala"
                className="input-new"
                style={{ width: 'auto', paddingTop: 8, paddingBottom: 8, fontSize: 13 }}
              >
                <option value="popular">Popularlığa görə</option>
                <option value="price-asc">Qiymət ↑</option>
                <option value="price-desc">Qiymət ↓</option>
              </select>
            </div>

            <p className="lg:hidden text-[13px] text-ink-mute mb-4">
              <span className="font-medium text-ink">{filtered.length}</span> nəticə
            </p>

            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="card-new text-center py-20"
                >
                  <p className="t-title m-0 mb-3">Nəticə tapılmadı</p>
                  <p className="text-[14px] m-0 mb-6" style={{ color: 'var(--color-ink-soft)' }}>
                    Filtrləri dəyişdirməyi cəhd edin
                  </p>
                  <button onClick={clearAllFilters} className="btn-ghost">
                    Sıfırla
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key={activeType + sortOrder}
                  className="grid gap-4"
                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}
                  initial="hidden"
                  animate="show"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                >
                  {filtered.map(exam => {
                    const examMinutes = exam.durationMinutes -
                      exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                    const isAdaptive = exam.modules.some(m => m.isAdaptive);
                    return (
                      <motion.div
                        key={exam.id}
                        variants={{
                          hidden: { opacity: 0, y: 14 },
                          show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } },
                        }}
                      >
                        <Link href={`/exams/${exam.id}`} className="flex flex-col card-new card-new-hover h-full">
                          <div className="flex items-start justify-between mb-4">
                            <span className="tag tag-accent">{exam.tag}</span>
                            {exam.price > 0 && (
                              <span
                                className="font-display font-medium shrink-0 ml-2"
                                style={{ fontSize: 20, color: 'var(--color-ink)' }}
                              >
                                {exam.price} ₼
                              </span>
                            )}
                          </div>

                          <h3 className="t-title m-0 mb-3" style={{ fontSize: 18, lineHeight: 1.3 }}>
                            {exam.title}
                          </h3>

                          <p
                            className="text-[14px] leading-[1.55] m-0 flex-1"
                            style={{ color: 'var(--color-ink-soft)' }}
                          >
                            {exam.description}
                          </p>

                          <div
                            className="flex items-center gap-4 mt-5 pt-4 border-t border-rule text-[12px]"
                            style={{ color: 'var(--color-ink-mute)' }}
                          >
                            <span>{examMinutes} dəq</span>
                            <span className="w-px h-3 bg-rule" />
                            <span>{exam.totalQuestions} sual</span>
                            <span className="w-px h-3 bg-rule" />
                            <span>{isAdaptive ? 'Adaptive' : 'Standart'}</span>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </main>
  );
}
