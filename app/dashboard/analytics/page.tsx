import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { getUserResults } from '@/lib/db/results';
import { getActiveExams } from '@/lib/db/exams';
import { formatOverallScore } from '@/lib/domain/scoring';
import { examTypeLabel } from '@/lib/domain/exam-types';
import { ownedExamIds } from '@/lib/db/entitlements';
import { ChevronRight } from 'lucide-react';
import Button, { ButtonArrow } from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';

export const metadata = { title: 'Nəticələr' };

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('az-AZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

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

type ScoreFields = {
  score: number;
  examType?: string;
  overallBand?: number;
  totalScaled?: number;
};

/**
 * Average and best for ONE exam type, expressed in that type's own unit.
 *
 * Aggregating across types was meaningless: a 100% General English paper and a
 * Band 6.5 IELTS paper are not comparable quantities, so a single "best" told
 * the student nothing except which of their exams happened to be easiest.
 * Bands and scaled scores are averaged natively; anything else stays a percent.
 */
function aggregate(type: string | undefined, rs: ScoreFields[]): { avg: string; best: string; isPercent: boolean } {
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

  if (type === 'ielts' && rs.every(r => typeof r.overallBand === 'number')) {
    const bands = rs.map(r => r.overallBand!);
    // IELTS reports to the nearest half band — averaging to 2dp would invent
    // precision the scale does not have.
    const avg = Math.round(mean(bands) * 2) / 2;
    return { avg: `${avg.toFixed(1)} Band`, best: `${Math.max(...bands).toFixed(1)} Band`, isPercent: false };
  }

  if (type === 'sat' && rs.every(r => typeof r.totalScaled === 'number')) {
    const scaled = rs.map(r => r.totalScaled!);
    return { avg: `${Math.round(mean(scaled))}`, best: `${Math.max(...scaled)}`, isPercent: false };
  }

  const pct = rs.map(r => r.score);
  return { avg: `${Math.round(mean(pct))}%`, best: `${Math.max(...pct)}%`, isPercent: true };
}

export default async function AnalyticsPage() {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  const [results, allExams, owned] = await Promise.all([
    getUserResults(userId),
    getActiveExams(),
    ownedExamIds(userId),
  ]);

  const purchasedIds = new Set(owned);
  const purchasedExams = allExams.filter(e => purchasedIds.has(e.id));

  const byExam = new Map<string, typeof results>();
  for (const r of results) {
    if (!byExam.has(r.examId)) byExam.set(r.examId, []);
    byExam.get(r.examId)!.push(r);
  }

  const attemptedExams = purchasedExams.filter(e => byExam.has(e.id));
  const notAttemptedCount = purchasedExams.length - attemptedExams.length;

  const totalAttempts = results.length;

  // Grouped by exam type so averages compare like with like. The type is taken
  // from the exam record, falling back to whatever the result stored, so
  // attempts on an exam that was later removed still land in a group.
  const typeGroups = (() => {
    const byType = new Map<string, typeof results>();
    for (const r of results) {
      const type = allExams.find(e => e.id === r.examId)?.type ?? r.examType ?? 'other';
      if (!byType.has(type)) byType.set(type, []);
      byType.get(type)!.push(r);
    }
    return Array.from(byType.entries())
      .map(([type, rs]) => ({
        type,
        label: examTypeLabel(type),
        count: rs.length,
        ...aggregate(type, rs),
        avgPercent: Math.round(rs.reduce((s, r) => s + r.score, 0) / rs.length),
      }))
      .sort((a, b) => b.count - a.count);
  })();

  return (
    <div className="p-8">

      {/* Header */}
      <div className="mb-10">
        <div className="mb-5 flex items-center gap-3">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
          <span className="font-mono text-label font-normal tracking-[0.16em] uppercase text-ink-mute">Nəticələr</span>
        </div>
        <h1 className="m-0 mb-3 text-heading-lg leading-[1.04] font-light tracking-[-0.035em] text-ink md:text-display-sm">
          Sınaq <span className="font-medium">analitikası.</span>
        </h1>
        <p className="m-0 text-lede leading-[1.55] text-ink-soft">Bütün imtahan cəhdlərinin tarixi və statistikası.</p>
      </div>

      {/* Summary — one row per exam type, never one figure across all of them */}
      {totalAttempts > 0 && (
        <div className="mb-10 border-y border-rule py-8">
          <div className="mb-8 flex items-baseline gap-3.5">
            <div className="font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-ink text-display-xs md:text-display-sm">{totalAttempts}</div>
            <div className="font-mono text-label font-normal tracking-[0.16em] uppercase text-ink-mute">ümumi cəhd</div>
          </div>

          <div className="font-mono text-label font-normal tracking-[0.16em] uppercase mb-4 text-ink-mute">Növ üzrə nəticə</div>
          <div>
            {/* Column headers — hidden on narrow screens where rows stack */}
            <div className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute hidden pb-2.5 sm:grid sm:grid-cols-[1fr_90px_120px_120px]">
              <span>İmtahan növü</span>
              <span className="text-right">Cəhd</span>
              <span className="text-right">Ortalama</span>
              <span className="text-right">Ən yaxşı</span>
            </div>
            {typeGroups.map((g, i) => (
              <div
                key={g.type}
                className={`grid grid-cols-2 items-center gap-y-1.5 py-3.5 sm:grid-cols-[1fr_90px_120px_120px] ${
                  i === 0 ? 'border-t border-ink' : 'border-t border-rule'
                }`}
              >
                <span className="col-span-2 text-body font-medium text-ink sm:col-span-1">{g.label}</span>
                <span className="font-mono text-note tabular-nums text-ink-mute sm:text-right">
                  <span className="sm:hidden">Cəhd: </span>{g.count}
                </span>
                <span className={`font-mono text-note tabular-nums sm:text-right ${g.isPercent ? scoreColor(g.avgPercent) : 'text-ink'}`}>
                  <span className="font-sans text-ink-mute sm:hidden">Ortalama: </span>{g.avg}
                </span>
                <span className={`font-mono text-note tabular-nums sm:text-right ${g.isPercent ? scoreColor(g.avgPercent) : 'text-ink'}`}>
                  <span className="font-sans text-ink-mute sm:hidden">Ən yaxşı: </span>{g.best}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No attempts */}
      {totalAttempts === 0 && (
        <div className="rounded-panel border border-rule bg-surface px-8 py-20 text-center">
          <h3 className="m-0 mb-3 text-2xl leading-tight font-light tracking-tight text-ink">Hələ nəticə yoxdur</h3>
          <p className="m-0 mx-auto mb-7 max-w-xs text-sm text-ink-soft">
            {purchasedExams.length > 0
              ? 'Sınaq başlatdıqdan sonra nəticələriniz burada görünəcək.'
              : 'Sınaq aldıqdan sonra nəticələriniz burada görünəcək.'}
          </p>
          <Button
            href={purchasedExams.length > 0 ? '/dashboard' : '/exams'}
          >
            {purchasedExams.length > 0 ? 'Panelə keç' : 'Sınaqları kəşf et'} <ButtonArrow />
          </Button>
        </div>
      )}

      {/* Per-exam results */}
      {attemptedExams.length > 0 && (
        <div className="space-y-4">
          {attemptedExams.map(exam => {
            const examResults = byExam.get(exam.id)!;
            const best = Math.max(...examResults.map(r => r.score));
            const bestResult = examResults.reduce((a, b) => (b.score > a.score ? b : a));
            const bestDisp = formatOverallScore(bestResult);
            const last = examResults[0];
            const lastDisp = formatOverallScore(last);
            const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);

            // The score column has to hold a meter plus a two-token label
            // ("6.0 Band", "1210 / 1600") on one line — at 92px it wrapped.
            //
            // The five fixed tracks plus gaps and padding need 416px, so at
            // 390px this grid pushed the whole document to 462px wide. Below
            // `sm` it drops to four narrower tracks and the duration column is
            // hidden (it is the one value also shown on the attempt detail
            // page), which keeps the date column readable instead of crushing
            // every track to fit.
            const COLS =
              'grid-cols-[28px_1fr_92px_54px] sm:grid-cols-[36px_1fr_84px_130px_70px]';

            return (
              <div  key={exam.id} className="rounded-panel border border-rule bg-surface">

                {/* Exam header */}
                <div className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Tag tone="accent">{exam.tag}</Tag>
                      <Tag>{examResults.length} cəhd</Tag>
                    </div>
                    {/* h2, not h3: this is the only heading level under the
                        page's h1, and jumping straight to h3 breaks the outline
                        a screen-reader user navigates by. Size is set by the
                        utility, not the tag. */}
                    <h2 className="m-0 mb-2 text-lg font-medium tracking-[-0.015em] text-ink">
                      {exam.title}
                    </h2>
                    <div className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>{examMinutes} dəq</span>
                      <span>
                        Ən yaxşı <span className={scoreColor(best)}>{bestDisp.value}{bestDisp.unit !== '%' ? ` ${bestDisp.unit}` : '%'}</span>
                      </span>
                      {examResults.length > 1 && (
                        <span>
                          Son <span className={scoreColor(last.score)}>{lastDisp.value}{lastDisp.unit !== '%' ? ` ${lastDisp.unit}` : '%'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0"
                    href={`/dashboard/analytics/${exam.id}`}
                  >
                    Ətraflı <ButtonArrow />
                  </Button>
                </div>

                {/* Attempts table */}
                <div className="border-t border-rule">
                  {/* Table header */}
                  <div className={`font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute grid ${COLS} gap-3 border-b border-rule bg-surface-2 px-4 py-2.5 sm:px-6`}>
                    <span>#</span>
                    <span>Tarix</span>
                    <span className="hidden text-right sm:block">Müddət</span>
                    <span className="text-right">Nəticə</span>
                    <span className="text-right">Cavablar</span>
                  </div>

                  <div>
                    {examResults.slice(0, 3).map((r, i) => (
                      <div
                        key={r.id}
                        className={`grid ${COLS} items-center gap-3 px-4 py-3.5 text-sm sm:px-6 ${i > 0 ? 'border-t border-rule-soft' : ''}`}
                      >
                        <span className="font-mono text-note tabular-nums text-ink-mute">{r.attemptNumber}</span>
                        <span className="truncate text-ink-soft">{formatDate(r.completedAt)}</span>
                        <span className="hidden text-right font-mono text-note tabular-nums text-ink-mute sm:block">{formatDuration(r.durationSeconds)}</span>
                        <div className="flex items-center justify-end gap-2.5">
                          <div className="meter hidden h-1 w-10 sm:block">
                            <span className={scoreBarColor(r.score)} style={{ width: `${r.score}%` }} />
                          </div>
                          <span className={`text-right font-mono text-note whitespace-nowrap tabular-nums ${scoreColor(r.score)}`}>{(() => { const d = formatOverallScore(r); return d.unit !== '%' ? `${d.value} ${d.unit}` : `${d.value}%`; })()}</span>
                        </div>
                        {/* The answer-by-answer review had no entry point on this
                            page at all — students had to guess it lived a level
                            deeper, under "Ətraflı". */}
                        <Link
                          href={`/dashboard/analytics/${exam.id}/${r.attemptNumber}/review`}
                          className="-my-1 justify-self-end border-b border-ink-faint pt-1 pb-0.5 text-note font-medium text-ink transition-colors hover:border-ink"
                        >
                          İcmal
                        </Link>
                      </div>
                    ))}
                  </div>

                  {examResults.length > 3 && (
                    <Link
                      href={`/dashboard/analytics/${exam.id}`}
                      className="flex items-center justify-center gap-1 border-t border-rule py-3.5 text-note font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      Bütün cəhdlərə bax <ChevronRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Not attempted note */}
      {notAttemptedCount > 0 && totalAttempts > 0 && (
        <div className="rounded-panel border border-rule bg-surface mt-6 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="m-0 text-sm text-ink-soft">
            <span className="font-mono tabular-nums text-ink">{notAttemptedCount}</span> sınağa hələ başlamadınız.
          </p>
          <Link href="/dashboard" className="text-note font-medium text-ink-soft transition-colors hover:text-ink">
            Panelə get →
          </Link>
        </div>
      )}
    </div>
  );
}
