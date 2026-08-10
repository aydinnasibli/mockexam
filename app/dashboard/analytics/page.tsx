import { auth } from '@clerk/nextjs/server';
import Link from 'next/link';
import { getUserResults } from '@/lib/db/results';
import { getActiveExams } from '@/lib/db/exams';
import { formatOverallScore } from '@/lib/scoring';
import { examTypeLabel } from '@/lib/exam-types';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { ChevronRight, Timer, BookOpen } from 'lucide-react';

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

  const [results, allExams] = await Promise.all([
    getUserResults(userId),
    getActiveExams(),
  ]);

  await dbConnect();
  const purchases = await Purchase.find({ userId, status: 'COMPLETED' }, { examId: 1 }).lean();
  const purchasedIds = new Set(purchases.map(p => p.examId));
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
        <div className="flex items-center gap-3 mb-5">
          <span className="dot" />
          <span className="eyebrow" style={{ color: 'var(--color-ink)' }}>Nəticələr</span>
        </div>
        <h1
          className="font-display font-normal text-ink m-0 mb-3"
          style={{ fontSize: 'clamp(28px, 2.8vw, 40px)', lineHeight: 1.08, letterSpacing: '-0.02em' }}
        >
          Sınaq <span>analitikası.</span>
        </h1>
        <p className="text-[16px] leading-[1.55] text-ink-soft m-0">Bütün imtahan cəhdlərinin tarixi və statistikası.</p>
      </div>

      {/* Summary — one row per exam type, never one figure across all of them */}
      {totalAttempts > 0 && (
        <div className="border-y border-rule py-8 mb-10">
          <div className="flex items-baseline gap-3 mb-7">
            <div className="t-num text-ink" style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1, letterSpacing: '-0.02em' }}>
              {totalAttempts}
            </div>
            <div className="eyebrow">ümumi cəhd</div>
          </div>

          <div className="eyebrow mb-4">Növ üzrə nəticə</div>
          <div className="space-y-px">
            {/* Column headers — hidden on narrow screens where rows stack */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_90px_120px_120px] px-1 pb-2 text-[11px] font-medium text-ink-mute">
              <span>İmtahan növü</span>
              <span className="text-right">Cəhd</span>
              <span className="text-right">Ortalama</span>
              <span className="text-right">Ən yaxşı</span>
            </div>
            {typeGroups.map(g => (
              <div
                key={g.type}
                className="grid grid-cols-2 sm:grid-cols-[1fr_90px_120px_120px] gap-y-1.5 items-center px-1 py-3 border-t border-rule"
              >
                <span className="col-span-2 sm:col-span-1 text-[14px] font-medium text-ink">{g.label}</span>
                <span className="text-[13px] text-ink-mute sm:text-right">
                  <span className="sm:hidden">Cəhd: </span>{g.count}
                </span>
                <span className={`text-[14px] font-bold sm:text-right ${g.isPercent ? scoreColor(g.avgPercent) : 'text-ink'}`}>
                  <span className="sm:hidden text-[13px] font-normal text-ink-mute">Ortalama: </span>{g.avg}
                </span>
                <span className={`text-[14px] font-bold sm:text-right ${g.isPercent ? scoreColor(g.avgPercent) : 'text-ink'}`}>
                  <span className="sm:hidden text-[13px] font-normal text-ink-mute">Ən yaxşı: </span>{g.best}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No attempts */}
      {totalAttempts === 0 && (
        <div className="card-new text-center py-20">
          <h3 className="t-title m-0 mb-3">Hələ nəticə yoxdur</h3>
          <p className="text-[14px] text-ink-soft mb-6 max-w-xs mx-auto m-0">
            {purchasedExams.length > 0
              ? 'Sınaq başlatdıqdan sonra nəticələriniz burada görünəcək.'
              : 'Sınaq aldıqdan sonra nəticələriniz burada görünəcək.'}
          </p>
          <Link
            href={purchasedExams.length > 0 ? '/dashboard' : '/exams'}
            className="btn-primary"
          >
            {purchasedExams.length > 0 ? 'Panelə keç' : 'Sınaqları kəşf et'} <span className="arrow">→</span>
          </Link>
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

            return (
              <div key={exam.id} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-rule)', borderRadius: 16, overflow: 'hidden' }}>

                {/* Exam header */}
                <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="tag tag-accent">{exam.tag}</span>
                      <span className="tag">{examResults.length} cəhd</span>
                    </div>
                    <h3 className="font-display font-normal text-ink m-0 mb-1" style={{ fontSize: 18 }}>
                      {exam.title}
                    </h3>
                    <div className="flex items-center gap-4 text-[12px] text-ink-mute">
                      <span className="flex items-center gap-1"><Timer size={11} />{examMinutes} dəq</span>
                      <span>Ən yaxşı: <span className={`font-bold ${scoreColor(best)}`}>{bestDisp.value}{bestDisp.unit !== '%' ? ` ${bestDisp.unit}` : '%'}</span></span>
                      {examResults.length > 1 && (
                        <span>Son: <span className={`font-bold ${scoreColor(last.score)}`}>{lastDisp.value}{lastDisp.unit !== '%' ? ` ${lastDisp.unit}` : '%'}</span></span>
                      )}
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/analytics/${exam.id}`}
                    className="btn-ghost py-2! px-4! text-[13px]! shrink-0"
                  >
                    Ətraflı <span className="arrow">→</span>
                  </Link>
                </div>

                {/* Attempts table */}
                <div style={{ borderTop: '1px solid var(--color-rule)' }}>
                  {/* Table header */}
                  <div
                    className="grid px-6 py-2 text-[11px] font-medium text-ink-mute"
                    style={{
                      background: 'var(--color-surface-2)',
                      gridTemplateColumns: '40px 1fr 100px 80px 80px',
                    }}
                  >
                    <span>#</span>
                    <span>Tarix</span>
                    <span className="text-right">Müddət</span>
                    <span className="text-right">Nəticə</span>
                    <span className="text-right">Cavablar</span>
                  </div>

                  <div className="divide-y divide-rule">
                    {examResults.slice(0, 3).map(r => (
                      <div
                        key={r.id}
                        className="grid px-6 py-3 items-center text-[13px]"
                        style={{ gridTemplateColumns: '40px 1fr 100px 80px 80px' }}
                      >
                        <span className="text-ink-mute font-medium">#{r.attemptNumber}</span>
                        <span className="text-ink-soft truncate">{formatDate(r.completedAt)}</span>
                        <span className="text-right text-ink-mute">{formatDuration(r.durationSeconds)}</span>
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1 bg-surface-2 rounded-full overflow-hidden hidden sm:block">
                            <div className={`h-full rounded-full ${scoreBarColor(r.score)}`} style={{ width: `${r.score}%` }} />
                          </div>
                          <span className={`font-bold text-right min-w-10 ${scoreColor(r.score)}`}>{(() => { const d = formatOverallScore(r); return d.unit !== '%' ? `${d.value} ${d.unit}` : `${d.value}%`; })()}</span>
                        </div>
                        {/* The answer-by-answer review had no entry point on this
                            page at all — students had to guess it lived a level
                            deeper, under "Ətraflı". */}
                        <Link
                          href={`/dashboard/analytics/${exam.id}/${r.attemptNumber}/review`}
                          className="justify-self-end flex items-center gap-1 px-2.5 py-1 border border-rule rounded-lg text-[11px] font-medium text-ink-soft hover:bg-surface-2 transition-colors"
                        >
                          <BookOpen size={11} /> İcmal
                        </Link>
                      </div>
                    ))}
                  </div>

                  {examResults.length > 3 && (
                    <Link
                      href={`/dashboard/analytics/${exam.id}`}
                      className="flex items-center justify-center gap-1 py-3 text-[12px] font-medium text-ink-soft hover:bg-surface-2 transition-colors"
                      style={{ borderTop: '1px solid var(--color-rule)' }}
                    >
                      Bütün cəhdlərə bax <ChevronRight size={12} />
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
        <div className="mt-6 px-5 py-4 bg-surface rounded-2xl border border-rule flex items-center justify-between">
          <p className="text-[13px] text-ink-soft m-0">
            <span className="font-semibold text-ink">{notAttemptedCount}</span> sınağa hələ başlamadınız.
          </p>
          <Link href="/dashboard" className="text-[13px] font-medium text-ink-soft hover:text-ink">
            Panelə get →
          </Link>
        </div>
      )}
    </div>
  );
}
