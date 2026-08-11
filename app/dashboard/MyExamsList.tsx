'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart2, BookOpen, HelpCircle, Play, Search, Timer, X } from 'lucide-react';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerChildren';

/** One purchased exam, flattened by the server so nothing Mongoose-shaped crosses over. */
export interface MyExamRow {
  id: string;
  title: string;
  tag: string;
  type: string;
  typeLabel: string;
  minutes: number;
  totalQuestions: number;
  attemptCount: number;
  /** Percent score of the most recent attempt; null when never attempted. */
  lastScore: number | null;
  /** Same attempt rendered in the exam's own unit (Band / 1600 / %). */
  lastScoreLabel: string | null;
  lastAttemptNumber: number | null;
  /** ISO timestamp of the most recent attempt, for the "recent" ordering. */
  lastCompletedAt: string | null;
}

type SortKey = 'suggested' | 'recent' | 'title' | 'score';

const SORT_LABELS: Record<SortKey, string> = {
  suggested: 'Tövsiyə olunan',
  recent:    'Son cəhd',
  title:     'Ad (A–Z)',
  score:     'Ən aşağı nəticə',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-ok';
  if (score >= 60) return 'text-warn';
  return 'text-error';
}

function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-ok';
  if (score >= 60) return 'bg-warn';
  return 'bg-error';
}

/**
 * Ranking behind the default "Tövsiyə olunan" order.
 *
 * The list used to come out in exam creation order — an ordering that says
 * nothing about the student, so a never-opened exam could sit below three they
 * had already aced. Untouched exams surface first, then weak results, then the
 * rest; ties fall back to the most recent attempt.
 */
function suggestedRank(e: MyExamRow): number {
  if (e.attemptCount === 0) return 0;             // never started
  if ((e.lastScore ?? 100) < 80) return 1;        // room to improve
  return 2;                                        // done well
}

export default function MyExamsList({ exams }: { exams: MyExamRow[] }) {
  const [query, setQuery]   = useState('');
  const [type, setType]     = useState<string>('all');
  const [sort, setSort]     = useState<SortKey>('suggested');

  // Only offer a type filter when there is more than one type to choose between.
  const types = useMemo(() => {
    const seen = new Map<string, string>();
    for (const e of exams) if (!seen.has(e.type)) seen.set(e.type, e.typeLabel);
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [exams]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('az-AZ');
    const filtered = exams.filter(e => {
      if (type !== 'all' && e.type !== type) return false;
      if (!q) return true;
      return (
        e.title.toLocaleLowerCase('az-AZ').includes(q) ||
        e.tag.toLocaleLowerCase('az-AZ').includes(q) ||
        e.typeLabel.toLocaleLowerCase('az-AZ').includes(q)
      );
    });

    const sorted = [...filtered];
    switch (sort) {
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title, 'az-AZ'));
        break;
      case 'recent':
        // Never-attempted exams have no date; they sort last here rather than
        // pretending to be infinitely old.
        sorted.sort((a, b) => {
          const at = a.lastCompletedAt ? Date.parse(a.lastCompletedAt) : -1;
          const bt = b.lastCompletedAt ? Date.parse(b.lastCompletedAt) : -1;
          return bt - at;
        });
        break;
      case 'score':
        sorted.sort((a, b) => (a.lastScore ?? -1) - (b.lastScore ?? -1));
        break;
      default:
        sorted.sort((a, b) => {
          const rank = suggestedRank(a) - suggestedRank(b);
          if (rank !== 0) return rank;
          const at = a.lastCompletedAt ? Date.parse(a.lastCompletedAt) : 0;
          const bt = b.lastCompletedAt ? Date.parse(b.lastCompletedAt) : 0;
          return bt - at;
        });
    }
    return sorted;
  }, [exams, query, type, sort]);

  // The controls only earn their space once the list is long enough to search.
  const showControls = exams.length > 3;

  return (
    <>
      {showControls && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-ink-mute)' }}
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Sınaq axtar…"
                aria-label="Sınaqlarım arasında axtar"
                className="input-new pl-9 pr-9 py-2! text-sm!"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Axtarışı təmizlə"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-surface-2 transition-colors"
                  style={{ color: 'var(--color-ink-mute)' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 shrink-0">
              <span className="sr-only">Sıralama</span>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                className="input-new py-2! text-sm! w-auto"
              >
                {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                  <option key={k} value={k}>{SORT_LABELS[k]}</option>
                ))}
              </select>
            </label>
          </div>

          {types.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {[{ value: 'all', label: 'Hamısı' }, ...types].map(t => {
                const active = type === t.value;
                return (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    aria-pressed={active}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
                    style={{
                      background: active ? 'var(--color-ink)' : 'var(--color-surface)',
                      color:      active ? 'var(--color-bg)'  : 'var(--color-ink-soft)',
                      border:     `1px solid ${active ? 'var(--color-ink)' : 'var(--color-rule)'}`,
                    }}
                  >
                    {t.label}
                    <span className="ml-1.5 opacity-60">
                      {t.value === 'all' ? exams.length : exams.filter(e => e.type === t.value).length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <div className="bg-surface rounded-2xl border border-rule p-8 text-center">
          <p className="text-sm text-ink-soft m-0">
            &ldquo;{query}&rdquo; üçün sınaq tapılmadı.
          </p>
          <button
            onClick={() => { setQuery(''); setType('all'); }}
            className="text-xs font-medium text-ink-soft hover:text-ink mt-3"
          >
            Filtrləri sıfırla
          </button>
        </div>
      ) : (
        <StaggerContainer className="space-y-3" delay={0.12}>
          {visible.map(exam => (
            <StaggerItem key={exam.id} className="bg-surface rounded-2xl border border-rule overflow-hidden">
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                    <span className="tag tag-accent">{exam.tag}</span>
                    {exam.attemptCount > 0
                      ? <span className="tag">{exam.attemptCount} cəhd</span>
                      : <span className="text-xs font-medium text-warn bg-amber-50 px-2 py-0.5 rounded-full">Başlanmayıb</span>
                    }
                  </div>
                  <h3 className="font-display text-base font-normal text-ink leading-snug m-0">{exam.title}</h3>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-mute">
                    <span className="flex items-center gap-1"><Timer size={11} />{exam.minutes} dəq</span>
                    <span className="flex items-center gap-1"><HelpCircle size={11} />{exam.totalQuestions} sual</span>
                  </div>
                </div>
              </div>

              <div className="px-4 pb-4 flex items-center gap-3">
                {exam.lastScore != null ? (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-ink-mute">Son nəticə</span>
                        <span className={`text-xs font-bold ${scoreColor(exam.lastScore)}`}>
                          {exam.lastScoreLabel}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${scoreBarColor(exam.lastScore)}`}
                          style={{ width: `${exam.lastScore}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <Link href={`/dashboard/analytics/${exam.id}/${exam.lastAttemptNumber}/review`}
                        className="flex items-center gap-1 px-3 py-1.5 border border-rule rounded-lg text-xs font-medium text-ink-soft hover:bg-surface-2 transition-colors">
                        <BookOpen size={12} /> İcmal
                      </Link>
                      <Link href={`/dashboard/analytics/${exam.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 border border-rule rounded-lg text-xs font-medium text-ink-soft hover:bg-surface-2 transition-colors">
                        <BarChart2 size={12} /> Analiz
                      </Link>
                      <Link href={`/exam-session/${exam.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-ink text-bg rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                        <Play size={12} /> Yenidən
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm text-ink-soft m-0">İlk cəhdinizi başladın!</p>
                    <Link href={`/exam-session/${exam.id}`}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-ink text-bg rounded-lg text-xs font-medium hover:opacity-90 transition-opacity">
                      <Play size={13} /> Başla
                    </Link>
                  </>
                )}
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </>
  );
}
