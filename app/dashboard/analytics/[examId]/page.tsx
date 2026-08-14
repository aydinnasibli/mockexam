import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { getExamResults } from '@/lib/db/results';
import { getExamById } from '@/lib/db/exams';
import { formatOverallScore, formatModuleScore, roundHalfBand } from '@/lib/scoring';
import { hasExamAccess } from '@/lib/db/entitlements';
import { ArrowLeft } from 'lucide-react';
import type { ResultSummary } from '@/lib/db/results';

interface Props {
  params: Promise<{ examId: string }>;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}s ${m}d ${s}s`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('az-AZ', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function scoreColor(s: number) {
  return s >= 80 ? 'text-ok' : s >= 60 ? 'text-warn' : 'text-error';
}

function ScoreTrendChart({ results }: { results: ResultSummary[] }) {
  if (results.length < 2) return null;
  const sorted = [...results].reverse();
  const W = 300, H = 80, padX = 10, padY = 10;
  const chartW = W - 2 * padX;
  const chartH = H - 2 * padY;

  const pts = sorted.map((r, i) => ({
    x: padX + (i / (sorted.length - 1)) * chartW,
    y: padY + (1 - r.score / 100) * chartH,
    score: r.score,
    attempt: r.attemptNumber,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const fillPath = `M ${pts[0].x} ${padY + chartH} ${pts.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${pts[pts.length - 1].x} ${padY + chartH} Z`;

  // --color-ok / --color-warn / --color-error. `#A23A2E` here was a fourth red
  // that exists nowhere in the palette.
  const dotColor = (s: number) => s >= 80 ? '#2F5C3E' : s >= 60 ? '#B8732B' : '#8C3A2B';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 96 }} preserveAspectRatio="none">
      {[25, 50, 75].map(pct => {
        const y = padY + (1 - pct / 100) * chartH;
        return <line key={pct} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#F0EDE4" strokeWidth="0.8" />;
      })}
      <path d={fillPath} fill="rgba(26,26,26,0.04)" />
      <path d={linePath} fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={dotColor(p.score)} stroke="#FFFFFF" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export async function generateMetadata({ params }: Props) {
  const { examId } = await params;
  const exam = await getExamById(examId);
  if (!exam) return {};
  return { title: `${exam.title} — Nəticələr` };
}

export default async function ExamAnalyticsPage({ params }: Props) {
  const { examId } = await params;
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();

  if (!(await hasExamAccess(userId, examId))) redirect(`/exams/${examId}`);

  const [exam, results] = await Promise.all([
    getExamById(examId),
    getExamResults(userId, examId),
  ]);

  if (!exam) notFound();

  const attempts   = results.length;
  const best       = attempts > 0 ? Math.max(...results.map(r => r.score)) : null;
  const avg        = attempts > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / attempts) : null;
  const last       = results[0] ?? null;

  // Best/average shown in the exam's real units (IELTS band / SAT scaled / %).
  const bestResult = attempts > 0 ? results.reduce((a, b) => (b.score > a.score ? b : a)) : null;
  const bestDisp   = bestResult ? formatOverallScore(bestResult) : null;
  const avgDisp    = (() => {
    if (exam.type === 'ielts') {
      const bands = results.map(r => r.overallBand).filter((x): x is number => typeof x === 'number');
      return bands.length ? { value: roundHalfBand(bands.reduce((a, b) => a + b, 0) / bands.length).toFixed(1), unit: 'Band' } : null;
    }
    if (exam.type === 'sat') {
      const tot = results.map(r => r.totalScaled).filter((x): x is number => typeof x === 'number');
      return tot.length ? { value: String(Math.round(tot.reduce((a, b) => a + b, 0) / tot.length)), unit: '/ 1600' } : null;
    }
    return avg != null ? { value: String(avg), unit: '%' } : null;
  })();
  const examNetMin = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
  const expectedSecPerQ = exam.totalQuestions > 0 ? (examNetMin * 60) / exam.totalQuestions : 0;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <Link href="/dashboard/analytics" className="mb-7 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink">
          <ArrowLeft size={15} /> Bütün nəticələrə qayıt
        </Link>

        {/* Exam header */}
        <div className="mb-6 flex flex-col items-start justify-between gap-5 border-b border-ink pb-6 sm:flex-row sm:items-end">
          <div className="min-w-0">
            <span className="tag tag-accent mb-3.5">{exam.tag}</span>
            <h1 className="m-0 text-[28px] leading-[1.06] font-light tracking-[-0.03em] text-ink md:text-4xl">{exam.title}</h1>
            <div className="mono-label mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>{examNetMin} dəq</span>
              <span>{exam.totalQuestions} sual</span>
              <span>{exam.modules.length} modul</span>
            </div>
          </div>
          <Link href={`/exam-session/${exam.id}`} className="btn-primary shrink-0">
            {attempts === 0 ? 'İmtahana başla' : 'Yenidən cəhd et'} <span className="arrow" aria-hidden>→</span>
          </Link>
        </div>

        {attempts === 0 ? (
          <div className="panel px-8 py-20 text-center">
            <h3 className="m-0 mb-3 text-2xl leading-tight font-light tracking-tight text-ink">Hələ nəticə yoxdur</h3>
            <p className="m-0 mb-7 text-sm text-ink-soft">Bu imtahana ilk dəfə girişinizi tamamlayın.</p>
            <Link href={`/exam-session/${exam.id}`} className="btn-primary">
              İmtahana başla <span className="arrow">→</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Stats — the home hero's figure row */}
            <div className="panel mb-6 grid grid-cols-1 sm:grid-cols-3">
              <div className="border-b border-rule px-5 py-5 sm:border-r sm:border-b-0">
                <div className={`figure text-3xl ${scoreColor(best!)}`}>
                  {bestDisp?.value}{bestDisp && bestDisp.unit !== '%' && <span className="ml-1.5 text-sm text-ink-mute">{bestDisp.unit}</span>}{bestDisp?.unit === '%' && '%'}
                </div>
                <p className="mono-label m-0 mt-2.5">Ən yaxşı bal</p>
              </div>
              <div className="border-b border-rule px-5 py-5 sm:border-r sm:border-b-0">
                <div className={`figure text-3xl ${scoreColor(avg!)}`}>
                  {avgDisp?.value}{avgDisp && avgDisp.unit !== '%' && <span className="ml-1.5 text-sm text-ink-mute">{avgDisp.unit}</span>}{avgDisp?.unit === '%' && '%'}
                </div>
                <p className="mono-label m-0 mt-2.5">Ortalama bal</p>
              </div>
              <div className="px-5 py-5">
                <div className="figure text-3xl">{attempts}</div>
                <p className="mono-label m-0 mt-2.5">Ümumi cəhd</p>
              </div>
            </div>

            {/* Score trend */}
            {attempts > 1 && (
              <div className="panel mb-6">
                <div className="panel-head flex-wrap">
                  <h2 className="mono-label mono-label-lg m-0 text-ink">Bal dinamikası</h2>
                  <div className="mono-label flex items-center gap-3.5">
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-ok" aria-hidden />≥80%</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-warn" aria-hidden />60–79%</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 bg-error" aria-hidden />&lt;60%</span>
                  </div>
                </div>
                <div className="panel-body">
                  <ScoreTrendChart results={results} />
                  <div className="mono-label mt-2.5 flex justify-between px-2">
                    <span>Cəhd {[...results].reverse()[0]?.attemptNumber}</span>
                    <span>Cəhd {results[0]?.attemptNumber}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Time efficiency.
                `last.totalQuestions` is the attempt's own graded count, which
                can be 0 (an exam whose bank was emptied after the attempt) even
                when the exam declares questions — dividing by it printed NaN. */}
            {last && exam.totalQuestions > 0 && last.totalQuestions > 0 && expectedSecPerQ > 0 && (
              <div className="panel mb-6">
                <div className="panel-head">
                  <h2 className="mono-label mono-label-lg m-0 text-ink">Vaxt effektivliyi</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3">
                  <div className="border-b border-rule px-5 py-5 sm:border-r sm:border-b-0">
                    <p className="figure m-0 text-2xl">{Math.round(expectedSecPerQ)}s</p>
                    <p className="mono-label m-0 mt-2.5">Gözlənilən / sual</p>
                  </div>
                  <div className="border-b border-rule px-5 py-5 sm:border-r sm:border-b-0">
                    <p className="figure m-0 text-2xl">
                      {Math.round(last.durationSeconds / last.totalQuestions)}s
                    </p>
                    <p className="mono-label m-0 mt-2.5">Ortalama / sual (son)</p>
                  </div>
                  <div className="px-5 py-5">
                    {(() => {
                      const actual = last.durationSeconds / last.totalQuestions;
                      const ratio  = actual / expectedSecPerQ;
                      const label  = ratio < 0.7 ? 'Çox sürətli' : ratio > 1.3 ? 'Yavaş' : 'Normal';
                      const color  = ratio < 0.7 ? 'text-warn' : ratio > 1.3 ? 'text-error' : 'text-ok';
                      return (
                        <>
                          <p className={`m-0 text-2xl leading-none font-light tracking-tight ${color}`}>{label}</p>
                          <p className="mono-label m-0 mt-2.5">Temp qiymətləndirməsi</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="border-t border-rule px-5 py-5">
                  <p className="mono-label m-0 mb-4">Modullar üzrə gözlənilən vaxt</p>
                  <div className="space-y-3">
                    {exam.modules.map((mod, i) => {
                      const modExpected = mod.durationMinutes * 60;
                      const pct = Math.round((modExpected / (examNetMin * 60)) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3.5">
                          <span className="w-28 shrink-0 truncate text-[13px] text-ink-soft">{mod.name}</span>
                          <div className="meter h-1.5 flex-1">
                            <span className="bg-ink-faint" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-12 shrink-0 text-right font-mono text-[11px] tabular-nums text-ink-mute">{mod.durationMinutes}d</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Module breakdown */}
            {results.some(r => r.moduleScores.length > 0) && (
              <div className="panel mb-6">
                <div className="panel-head">
                  <h2 className="mono-label mono-label-lg m-0 text-ink">Modul üzrə bölgü</h2>
                  <span className="mono-label">Son cəhd əsasında</span>
                </div>
                <div className="panel-body space-y-4">
                  {exam.modules.map((mod, modIdx) => {
                    const latestWithModule = results.find(r => r.moduleScores.some(m => m.moduleIndex === modIdx));
                    const ms = latestWithModule?.moduleScores.find(m => m.moduleIndex === modIdx);
                    if (!ms) return null;
                    return (
                      <div key={modIdx}>
                        <div className="mb-2 flex items-baseline justify-between gap-3">
                          <span className="truncate text-[13px] font-medium text-ink-soft">{mod.name}</span>
                          <span className={`shrink-0 font-mono text-[13px] tabular-nums ${scoreColor(ms.scorePercent)}`}>
                            {exam.type === 'ielts'
                              ? formatModuleScore(exam.type, ms)
                              : `${ms.correct}/${ms.total} · ${ms.scorePercent}%`}
                          </span>
                        </div>
                        <div className="meter h-2">
                          <span className={ms.scorePercent >= 80 ? 'bg-ok' : ms.scorePercent >= 60 ? 'bg-warn' : 'bg-error'}
                            style={{ width: `${ms.scorePercent}%` }} />
                        </div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            )}

            {/* Attempt history */}
            <div className="panel">
              <div className="panel-head">
                <h2 className="mono-label mono-label-lg m-0 text-ink">Cəhd tarixi</h2>
              </div>
              <div>
                {results.map((r, i) => (
                  <div key={r.id} className={`px-5 py-4.5 ${i > 0 ? 'border-t border-rule-soft' : ''}`}>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="m-0 flex items-baseline gap-2.5 text-[15px] font-medium text-ink">
                          Cəhd <span className="font-mono tabular-nums">{r.attemptNumber}</span>
                          {r.score === best && <span className="tag tag-ok">Ən yaxşı</span>}
                        </p>
                        <p className="mono-label m-0 mt-1.5">
                          {formatDate(r.completedAt)} · {formatDuration(r.durationSeconds)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        {(() => {
                          const d = formatOverallScore(r);
                          return (
                            <span className={`figure text-2xl ${scoreColor(r.score)}`}>
                              {d.value}{d.unit !== '%' ? <span className="ml-1 text-xs text-ink-mute">{d.unit}</span> : '%'}
                            </span>
                          );
                        })()}
                        {/* Promoted to the row's primary action: this is the
                            page students come back for, and as a muted ghost
                            button it read as a secondary detail. */}
                        <Link href={`/dashboard/analytics/${exam.id}/${r.attemptNumber}/review`}
                          className="btn-primary btn-sm text-xs!">
                          Cavablara bax <span className="arrow" aria-hidden>→</span>
                        </Link>
                      </div>
                    </div>
                    {r.moduleScores.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {r.moduleScores.map(ms => (
                          <span key={ms.moduleIndex} className={`tag ${
                            ms.scorePercent >= 80 ? 'tag-ok' : ms.scorePercent >= 60 ? 'tag-warn' : 'tag-error'
                          }`}>
                            {ms.moduleName}: {formatModuleScore(r.examType, ms)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
