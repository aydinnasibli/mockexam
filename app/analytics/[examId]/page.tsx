import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import Navbar from '@/components/layout/Navbar';
import { getExamResults } from '@/lib/db/results';
import { getExamById } from '@/lib/db/exams';
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
  return s >= 80 ? 'text-green-600' : s >= 60 ? 'text-amber-600' : 'text-red-500';
}

function ScoreTrendChart({ results }: { results: ResultSummary[] }) {
  if (results.length < 2) return null;
  const sorted = [...results].reverse(); // oldest → newest
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

  const dotColor = (s: number) => s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 96 }} preserveAspectRatio="none">
      {/* Grid lines at 25, 50, 75 */}
      {[25, 50, 75].map(pct => {
        const y = padY + (1 - pct / 100) * chartH;
        return <line key={pct} x1={padX} x2={W - padX} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="0.8" />;
      })}
      {/* Fill */}
      <path d={fillPath} fill="rgba(99,102,241,0.07)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="rgb(99,102,241)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
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
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

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
  const examNetMin = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
  const expectedSecPerQ = exam.totalQuestions > 0 ? (examNetMin * 60) / exam.totalQuestions : 0;

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-surface-subtle">
        <div className="max-w-4xl mx-auto px-6 py-10">

          <Link href="/analytics" className="inline-flex items-center gap-1.5 text-sm font-semibold text-on-surface-variant hover:text-secondary mb-6 transition-colors">
            <ArrowLeft size={16} /> Bütün nəticələrə qayıt
          </Link>

          {/* Exam header */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-secondary-fixed/60 text-secondary rounded-full mb-2">
                {exam.tag}
              </span>
              <h1 className="text-xl font-extrabold text-primary font-headline">{exam.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1"><Timer size={12} />{examNetMin} dəq</span>
                <span>{exam.totalQuestions} sual</span>
                <span>{exam.modules.length} modul</span>
              </div>
            </div>
            <Link
              href={`/exam-session/${exam.id}`}
              className="flex items-center gap-2 px-5 py-3 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm shrink-0"
            >
              <Play size={15} /> {attempts === 0 ? 'İmtahana başla' : 'Yenidən cəhd et'}
            </Link>
          </div>

          {attempts === 0 ? (
            <div className="bg-white rounded-2xl border border-outline-variant/40 p-16 flex flex-col items-center text-center shadow-sm">
              <BarChart2 className="text-outline mb-4" size={40} />
              <h3 className="text-base font-bold text-primary mb-2">Hələ nəticə yoxdur</h3>
              <p className="text-sm text-on-surface-variant mb-6">Bu imtahana ilk dəfə girişinizi tamamlayın.</p>
              <Link href={`/exam-session/${exam.id}`} className="editorial-gradient text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                İmtahana başla
              </Link>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm text-center">
                  <Trophy className="text-secondary mx-auto mb-2" size={20} />
                  <div className={`text-3xl font-black ${scoreColor(best!)}`}>{best}%</div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Ən yaxşı bal</p>
                </div>
                <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm text-center">
                  <TrendingUp className="text-secondary mx-auto mb-2" size={20} />
                  <div className={`text-3xl font-black ${scoreColor(avg!)}`}>{avg}%</div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Ortalama bal</p>
                </div>
                <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm text-center">
                  <BarChart2 className="text-secondary mx-auto mb-2" size={20} />
                  <div className="text-3xl font-black text-primary">{attempts}</div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Ümumi cəhd</p>
                </div>
              </div>

              {/* Score trend */}
              {attempts > 1 && (
                <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-primary uppercase tracking-wider">Bal dinamikası</h2>
                    <div className="flex items-center gap-3 text-[10px] text-on-surface-variant">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />≥80%</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />60–79%</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />&lt;60%</span>
                    </div>
                  </div>
                  <ScoreTrendChart results={results} />
                  <div className="flex justify-between mt-2 text-[10px] text-on-surface-variant font-medium px-2">
                    <span>Cəhd #{[...results].reverse()[0]?.attemptNumber}</span>
                    <span>Cəhd #{results[0]?.attemptNumber}</span>
                  </div>
                </div>
              )}

              {/* Time efficiency */}
              {last && exam.totalQuestions > 0 && (
                <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm mb-6">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Vaxt effektivliyi</h2>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-2">
                        <Clock size={16} className="text-blue-600" />
                      </div>
                      <p className="text-lg font-black text-primary">{Math.round(expectedSecPerQ)}s</p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Gözlənilən / sual</p>
                    </div>
                    <div className="text-center">
                      <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center mx-auto mb-2">
                        <Timer size={16} className="text-purple-600" />
                      </div>
                      <p className="text-lg font-black text-primary">
                        {Math.round(last.durationSeconds / last.totalQuestions)}s
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">Ortalama / sual (son)</p>
                    </div>
                    <div className="text-center">
                      {(() => {
                        const actual = last.durationSeconds / last.totalQuestions;
                        const ratio  = actual / expectedSecPerQ;
                        const label  = ratio < 0.7 ? 'Çox sürətli' : ratio > 1.3 ? 'Yavaş' : 'Normal';
                        const color  = ratio < 0.7 ? 'text-amber-600' : ratio > 1.3 ? 'text-red-500' : 'text-green-600';
                        const bg     = ratio < 0.7 ? 'bg-amber-50' : ratio > 1.3 ? 'bg-red-50' : 'bg-green-50';
                        const icon   = ratio < 0.7 ? 'text-amber-600' : ratio > 1.3 ? 'text-red-500' : 'text-green-600';
                        return (
                          <>
                            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mx-auto mb-2`}>
                              <Zap size={16} className={icon} />
                            </div>
                            <p className={`text-lg font-black ${color}`}>{label}</p>
                            <p className="text-[11px] text-on-surface-variant mt-0.5">Temp qiymətləndirməsi</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Module time bars */}
                  <div className="mt-5 pt-4 border-t border-outline-variant/10">
                    <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-3">Modullar üzrə gözlənilən vaxt</p>
                    <div className="space-y-2">
                      {exam.modules.map((mod, i) => {
                        const modExpected = mod.durationMinutes * 60;
                        const pct = Math.round((modExpected / (examNetMin * 60)) * 100);
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-on-surface-variant w-28 shrink-0 truncate">{mod.name}</span>
                            <div className="flex-1 h-1.5 bg-surface-container rounded-full overflow-hidden">
                              <div className="h-full bg-primary/40 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs font-bold text-on-surface-variant w-12 text-right shrink-0">{mod.durationMinutes}d</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Module breakdown (if any result has module scores) */}
              {results.some(r => r.moduleScores.length > 0) && (
                <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm mb-6">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Modul üzrə bölgü</h2>
                  <div className="space-y-3">
                    {exam.modules.map((mod, modIdx) => {
                      const latestWithModule = results.find(r => r.moduleScores.some(m => m.moduleIndex === modIdx));
                      const ms = latestWithModule?.moduleScores.find(m => m.moduleIndex === modIdx);
                      if (!ms) return null;
                      return (
                        <div key={modIdx}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <BookOpen size={13} className="text-on-surface-variant" />
                              <span className="text-xs font-semibold text-on-surface-variant">{mod.name}</span>
                            </div>
                            <span className={`text-xs font-black ${scoreColor(ms.scorePercent)}`}>
                              {ms.correct}/{ms.total} · {ms.scorePercent}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${ms.scorePercent >= 80 ? 'bg-green-500' : ms.scorePercent >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${ms.scorePercent}%` }} />
                          </div>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">Son cəhd əsasında</p>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>
              )}

              {/* Attempt history */}
              <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-outline-variant/20">
                  <h2 className="text-base font-bold text-primary font-headline">Cəhd tarixi</h2>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {results.map(r => (
                    <div key={r.id} className="px-6 py-4">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                          <p className="text-sm font-bold text-primary">Cəhd #{r.attemptNumber}</p>
                          <p className="text-xs text-on-surface-variant mt-0.5">{formatDate(r.completedAt)}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                            <Timer size={13} />{formatDuration(r.durationSeconds)}
                          </span>
                          <div className="text-right">
                            <span className={`text-xl font-black ${scoreColor(r.score)}`}>{r.score}%</span>
                            {r.score === best && <p className="text-[10px] text-secondary font-bold">Ən yaxşı</p>}
                          </div>
                          <Link href={`/analytics/${exam.id}/${r.attemptNumber}/review`}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container hover:bg-surface-container-low border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface-variant transition-colors">
                            <BookOpen size={12} /> İcmal
                          </Link>
                        </div>
                      </div>
                      {/* Module scores row */}
                      {r.moduleScores.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {r.moduleScores.map(ms => (
                            <span key={ms.moduleIndex} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ms.scorePercent >= 80 ? 'bg-green-50 text-green-700' : ms.scorePercent >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                            }`}>
                              {ms.moduleName}: {ms.scorePercent}%
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
    </>
  );
}
