import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { getExamResults } from '@/lib/db/results';
import { getExamById } from '@/lib/db/exams';
import { formatOverallScore, formatModuleScore, roundHalfBand } from '@/lib/scoring';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import {
  Timer, Trophy, TrendingUp, ArrowLeft, Play, BarChart2,
  BookOpen, Clock, Zap,
} from 'lucide-react';
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

  const dotColor = (s: number) => s >= 80 ? '#2F5C3E' : s >= 60 ? '#B8732B' : '#A23A2E';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 96 }} preserveAspectRatio="none">
      {[25, 50, 75].map(pct => {
        const y = padY + (1 - pct / 100) * chartH;
        return <line key={pct} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#E8E5DC" strokeWidth="0.8" />;
      })}
      <path d={fillPath} fill="rgba(26,26,26,0.04)" />
      <path d={linePath} fill="none" stroke="#1A1A1A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="4" fill={dotColor(p.score)} stroke="white" strokeWidth="1.5" />
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

  await dbConnect();
  const purchase = await Purchase.findOne({ userId, examId, status: 'COMPLETED' }).lean();
  if (!purchase) redirect(`/exams/${examId}`);

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
    <main className="min-h-screen bg-surface-2">
      <div className="max-w-4xl mx-auto px-6 py-10">

        <Link href="/dashboard/analytics" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink mb-6 transition-colors">
          <ArrowLeft size={16} /> Bütün nəticələrə qayıt
        </Link>

        {/* Exam header */}
        <div className="bg-surface rounded-2xl border border-rule p-6 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="tag-ink text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide mb-2 inline-block">
              {exam.tag}
            </span>
            <h1 className="font-display text-xl font-bold text-ink">{exam.title}</h1>
            <div className="flex items-center gap-4 mt-2 text-xs text-ink-mute">
              <span className="flex items-center gap-1"><Timer size={12} />{examNetMin} dəq</span>
              <span>{exam.totalQuestions} sual</span>
              <span>{exam.modules.length} modul</span>
            </div>
          </div>
          <Link
            href={`/exam-session/${exam.id}`}
            className="flex items-center gap-2 px-5 py-3 bg-ink text-bg rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors shrink-0"
          >
            <Play size={15} /> {attempts === 0 ? 'İmtahana başla' : 'Yenidən cəhd et'}
          </Link>
        </div>

        {attempts === 0 ? (
          <div className="bg-surface rounded-2xl border border-rule p-16 flex flex-col items-center text-center">
            <BarChart2 className="text-ink-mute mb-4" size={40} />
            <h3 className="font-display text-base font-bold text-ink mb-2">Hələ nəticə yoxdur</h3>
            <p className="text-sm text-ink-soft mb-6">Bu imtahana ilk dəfə girişinizi tamamlayın.</p>
            <Link href={`/exam-session/${exam.id}`} className="bg-ink text-bg px-6 py-3 rounded-xl text-sm font-semibold hover:bg-ink/90 transition-colors">
              İmtahana başla
            </Link>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-surface rounded-2xl border border-rule p-5 text-center">
                <Trophy className="text-warn mx-auto mb-2" size={20} />
                <div className={`font-display text-3xl font-bold ${scoreColor(best!)}`}>
                  {bestDisp?.value}{bestDisp && bestDisp.unit !== '%' && <span className="text-base font-medium text-ink-mute ml-1">{bestDisp.unit}</span>}{bestDisp?.unit === '%' && '%'}
                </div>
                <p className="eyebrow mt-2">Ən yaxşı bal</p>
              </div>
              <div className="bg-surface rounded-2xl border border-rule p-5 text-center">
                <TrendingUp className="text-ink-soft mx-auto mb-2" size={20} />
                <div className={`font-display text-3xl font-bold ${scoreColor(avg!)}`}>
                  {avgDisp?.value}{avgDisp && avgDisp.unit !== '%' && <span className="text-base font-medium text-ink-mute ml-1">{avgDisp.unit}</span>}{avgDisp?.unit === '%' && '%'}
                </div>
                <p className="eyebrow mt-2">Ortalama bal</p>
              </div>
              <div className="bg-surface rounded-2xl border border-rule p-5 text-center">
                <BarChart2 className="text-ink-soft mx-auto mb-2" size={20} />
                <div className="font-display text-3xl font-bold text-ink">{attempts}</div>
                <p className="eyebrow mt-2">Ümumi cəhd</p>
              </div>
            </div>

            {/* Score trend */}
            {attempts > 1 && (
              <div className="bg-surface rounded-2xl border border-rule p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="eyebrow">Bal dinamikası</h2>
                  <div className="flex items-center gap-3 text-xs text-ink-mute">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-ok inline-block" />≥80%</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-warn inline-block" />60–79%</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-error inline-block" />&lt;60%</span>
                  </div>
                </div>
                <ScoreTrendChart results={results} />
                <div className="flex justify-between mt-2 text-xs text-ink-mute font-medium px-2">
                  <span>Cəhd #{[...results].reverse()[0]?.attemptNumber}</span>
                  <span>Cəhd #{results[0]?.attemptNumber}</span>
                </div>
              </div>
            )}

            {/* Time efficiency */}
            {last && exam.totalQuestions > 0 && (
              <div className="bg-surface rounded-2xl border border-rule p-6 mb-6">
                <h2 className="eyebrow mb-4">Vaxt effektivliyi</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                      <Clock size={16} className="text-blue-600" />
                    </div>
                    <p className="font-display text-lg font-bold text-ink">{Math.round(expectedSecPerQ)}s</p>
                    <p className="text-sm text-ink-mute mt-0.5">Gözlənilən / sual</p>
                  </div>
                  <div className="text-center">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-2">
                      <Timer size={16} className="text-purple-600" />
                    </div>
                    <p className="font-display text-lg font-bold text-ink">
                      {Math.round(last.durationSeconds / last.totalQuestions)}s
                    </p>
                    <p className="text-sm text-ink-mute mt-0.5">Ortalama / sual (son)</p>
                  </div>
                  <div className="text-center">
                    {(() => {
                      const actual = last.durationSeconds / last.totalQuestions;
                      const ratio  = actual / expectedSecPerQ;
                      const label  = ratio < 0.7 ? 'Çox sürətli' : ratio > 1.3 ? 'Yavaş' : 'Normal';
                      const color  = ratio < 0.7 ? 'text-warn' : ratio > 1.3 ? 'text-error' : 'text-ok';
                      const bg     = ratio < 0.7 ? 'bg-amber-50' : ratio > 1.3 ? 'bg-red-50' : 'bg-green-50';
                      const icon   = ratio < 0.7 ? 'text-warn' : ratio > 1.3 ? 'text-error' : 'text-ok';
                      return (
                        <>
                          <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
                            <Zap size={16} className={icon} />
                          </div>
                          <p className={`font-display text-lg font-bold ${color}`}>{label}</p>
                          <p className="text-sm text-ink-mute mt-0.5">Temp qiymətləndirməsi</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="mt-5 pt-4 border-t border-rule">
                  <p className="eyebrow mb-3">Modullar üzrə gözlənilən vaxt</p>
                  <div className="space-y-2">
                    {exam.modules.map((mod, i) => {
                      const modExpected = mod.durationMinutes * 60;
                      const pct = Math.round((modExpected / (examNetMin * 60)) * 100);
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-ink-soft w-28 shrink-0 truncate">{mod.name}</span>
                          <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                            <div className="h-full bg-ink/30 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-ink-mute w-12 text-right shrink-0">{mod.durationMinutes}d</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Module breakdown */}
            {results.some(r => r.moduleScores.length > 0) && (
              <div className="bg-surface rounded-2xl border border-rule p-6 mb-6">
                <h2 className="eyebrow mb-4">Modul üzrə bölgü</h2>
                <div className="space-y-3">
                  {exam.modules.map((mod, modIdx) => {
                    const latestWithModule = results.find(r => r.moduleScores.some(m => m.moduleIndex === modIdx));
                    const ms = latestWithModule?.moduleScores.find(m => m.moduleIndex === modIdx);
                    if (!ms) return null;
                    return (
                      <div key={modIdx}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <BookOpen size={13} className="text-ink-mute" />
                            <span className="text-xs font-medium text-ink-soft">{mod.name}</span>
                          </div>
                          <span className={`text-xs font-bold ${scoreColor(ms.scorePercent)}`}>
                            {exam.type === 'ielts'
                              ? formatModuleScore(exam.type, ms)
                              : `${ms.correct}/${ms.total} · ${ms.scorePercent}%`}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${ms.scorePercent >= 80 ? 'bg-ok' : ms.scorePercent >= 60 ? 'bg-warn' : 'bg-error'}`}
                            style={{ width: `${ms.scorePercent}%` }} />
                        </div>
                        <p className="text-sm text-ink-mute mt-0.5">Son cəhd əsasında</p>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            )}

            {/* Attempt history */}
            <div className="bg-surface rounded-2xl border border-rule overflow-hidden">
              <div className="px-6 py-4 border-b border-rule">
                <h2 className="font-display text-base font-bold text-ink">Cəhd tarixi</h2>
              </div>
              <div className="divide-y divide-rule">
                {results.map(r => (
                  <div key={r.id} className="px-6 py-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-display text-sm font-bold text-ink">Cəhd #{r.attemptNumber}</p>
                        <p className="text-sm text-ink-mute mt-0.5">{formatDate(r.completedAt)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-ink-mute text-xs">
                          <Timer size={13} />{formatDuration(r.durationSeconds)}
                        </span>
                        <div className="text-right">
                          {(() => {
                            const d = formatOverallScore(r);
                            return (
                              <span className={`font-display text-xl font-bold ${scoreColor(r.score)}`}>
                                {d.value}{d.unit !== '%' ? <span className="text-xs font-medium text-ink-mute ml-0.5">{d.unit}</span> : '%'}
                              </span>
                            );
                          })()}
                          {r.score === best && <p className="text-sm text-ink-soft font-medium">Ən yaxşı</p>}
                        </div>
                        {/* Promoted to the row's primary action: this is the
                            page students come back for, and as a muted ghost
                            button it read as a secondary detail. */}
                        <Link href={`/dashboard/analytics/${exam.id}/${r.attemptNumber}/review`}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-ink text-bg rounded-xl text-xs font-semibold hover:opacity-90 transition-opacity">
                          <BookOpen size={12} /> Cavablara bax
                        </Link>
                      </div>
                    </div>
                    {r.moduleScores.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {r.moduleScores.map(ms => (
                          <span key={ms.moduleIndex} className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            ms.scorePercent >= 80 ? 'bg-green-50 text-green-700' : ms.scorePercent >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
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
    </main>
  );
}
