'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
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
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-mute"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Sınaq axtar…"
                aria-label="Sınaqlarım arasında axtar"
                /* All four sides need `!`: `.input-new` sets `padding` as a
                   shorthand, which otherwise wins over a longhand utility. */
                className="input-new py-2.5! pr-9! pl-9.5!"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  aria-label="Axtarışı təmizlə"
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-ink-mute transition-colors hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <label className="flex shrink-0 items-center gap-2">
              <span className="sr-only">Sıralama</span>
              <select
                value={sort}
                onChange={e => setSort(e.target.value as SortKey)}
                className="input-new w-auto py-2.5! text-sm!"
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
                    className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                      active
                        ? 'border-ink bg-ink text-bg'
                        : 'border-rule bg-surface text-ink-soft hover:border-ink-faint hover:text-ink'
                    }`}
                  >
                    {t.label}
                    <span className="ml-1.5 font-mono tabular-nums opacity-55">
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
        <div className="panel px-8 py-10 text-center">
          <p className="m-0 text-sm text-ink-soft">
            &ldquo;{query}&rdquo; üçün sınaq tapılmadı.
          </p>
          <button
            onClick={() => { setQuery(''); setType('all'); }}
            className="mt-3 cursor-pointer text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
          >
            Filtrləri sıfırla
          </button>
        </div>
      ) : (
        <StaggerContainer className="space-y-3" delay={0.12}>
          {visible.map(exam => (
            <StaggerItem key={exam.id} className="panel px-5 py-4.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="tag tag-accent">{exam.tag}</span>
                {exam.attemptCount > 0
                  ? <span className="tag">{exam.attemptCount} cəhd</span>
                  : <span className="tag tag-warn">Başlanmayıb</span>
                }
              </div>
              <h3 className="m-0 text-base leading-snug font-medium tracking-[-0.01em] text-ink">{exam.title}</h3>
              <div className="mono-label mt-2 flex items-center gap-3.5">
                <span>{exam.minutes} dəq</span>
                <span>{exam.totalQuestions} sual</span>
              </div>

              <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3.5 border-t border-rule-soft pt-4">
                {exam.lastScore != null ? (
                  <>
                    <div className="min-w-45 flex-1">
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <span className="mono-label">Son nəticə</span>
                        <span className={`font-mono text-[13px] tabular-nums ${scoreColor(exam.lastScore)}`}>
                          {exam.lastScoreLabel}
                        </span>
                      </div>
                      {/* Square track, like every bar in the analysis figure on
                          the home page. */}
                      <div className="meter h-1.5">
                        <span className={scoreBarColor(exam.lastScore)} style={{ width: `${exam.lastScore}%` }} />
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <Link href={`/dashboard/analytics/${exam.id}/${exam.lastAttemptNumber}/review`}
                        className="btn-ghost btn-sm text-xs!">
                        İcmal
                      </Link>
                      <Link href={`/dashboard/analytics/${exam.id}`}
                        className="btn-ghost btn-sm text-xs!">
                        Analiz
                      </Link>
                      <Link href={`/exam-session/${exam.id}`} className="btn-primary btn-sm text-xs!">
                        Yenidən <span className="arrow" aria-hidden>→</span>
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="m-0 flex-1 text-sm text-ink-soft">İlk cəhdinizi başladın!</p>
                    <Link href={`/exam-session/${exam.id}`} className="btn-primary btn-sm shrink-0 text-xs!">
                      Başla <span className="arrow" aria-hidden>→</span>
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
