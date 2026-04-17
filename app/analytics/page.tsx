import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import { getUserResults } from '@/lib/db/results';
import { getActiveExams } from '@/lib/db/exams';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import {
  BarChart2, Timer, Trophy, ArrowRight, Play, Inbox, ChevronRight,
} from 'lucide-react';

export const metadata = { title: 'Nəticələr — Məşqçi' };

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('az-AZ', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default async function AnalyticsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [results, allExams] = await Promise.all([
    getUserResults(userId),
    getActiveExams(),
  ]);

  await dbConnect();
  const purchases = await Purchase.find({ userId, status: 'COMPLETED' }, { examId: 1 }).lean();
  const purchasedIds = new Set(purchases.map(p => p.examId));
  const purchasedExams = allExams.filter(e => purchasedIds.has(e.id));

  // Group results by examId
  const byExam = new Map<string, typeof results>();
  for (const r of results) {
    if (!byExam.has(r.examId)) byExam.set(r.examId, []);
    byExam.get(r.examId)!.push(r);
  }

  const totalAttempts = results.length;
  const attemptedExams = byExam.size;
  const bestScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : null;

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-surface-subtle">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-primary font-headline mb-1">Nəticələrim</h1>
            <p className="text-on-surface-variant text-sm">Bütün imtahan cəhdlərinin tarixi və statistikası</p>
          </div>

          {/* Summary stats */}
          {totalAttempts > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm text-center">
                <div className="text-3xl font-black text-primary mb-1">{totalAttempts}</div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Ümumi cəhd</p>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm text-center">
                <div className="text-3xl font-black text-primary mb-1">{attemptedExams}</div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">İmtahan növü</p>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm text-center">
                <div className="text-3xl font-black text-secondary mb-1">{bestScore != null ? `${bestScore}%` : '—'}</div>
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Ən yüksək bal</p>
              </div>
            </div>
          )}

          {/* Per-exam results */}
          {purchasedExams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-outline-variant/40 p-16 flex flex-col items-center text-center shadow-sm">
              <Inbox className="text-outline mb-4" size={40} />
              <h3 className="text-base font-bold text-primary mb-2">Hələ sınaq yoxdur</h3>
              <p className="text-sm text-on-surface-variant mb-6">Sınaq aldıqdan sonra nəticələriniz burada görünəcək.</p>
              <Link href="/exams" className="editorial-gradient text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                Sınaqları kəşf et
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {purchasedExams.map(exam => {
                const examResults = byExam.get(exam.id) ?? [];
                const attempts = examResults.length;
                const best = attempts > 0 ? Math.max(...examResults.map(r => r.score)) : null;
                const last = examResults[0];
                const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);

                return (
                  <div key={exam.id} className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
                    {/* Exam header */}
                    <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-secondary-fixed/60 text-secondary rounded-full">
                            {exam.tag}
                          </span>
                          {attempts > 0 && (
                            <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                              {attempts} cəhd
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-primary font-headline text-base">{exam.title}</h3>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1"><Timer size={11} />{examMinutes} dəq</span>
                          {best != null && (
                            <span className="flex items-center gap-1"><Trophy size={11} className="text-secondary" />Ən yaxşı: {best}%</span>
                          )}
                          {last && (
                            <span className="flex items-center gap-1"><BarChart2 size={11} />Son: {last.score}%</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {attempts > 0 && (
                          <Link
                            href={`/analytics/${exam.id}`}
                            className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                          >
                            <BarChart2 size={14} /> Nəticələr
                          </Link>
                        )}
                        <Link
                          href={`/exam-session/${exam.id}`}
                          className="flex items-center gap-1.5 px-4 py-2 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm"
                        >
                          <Play size={14} /> {attempts === 0 ? 'Başla' : 'Yenidən'}
                        </Link>
                      </div>
                    </div>

                    {/* Last 3 attempts */}
                    {examResults.length > 0 && (
                      <div className="border-t border-outline-variant/20">
                        <div className="divide-y divide-outline-variant/10">
                          {examResults.slice(0, 3).map(r => (
                            <div key={r.id} className="px-6 py-3 flex items-center gap-4 text-sm">
                              <span className="text-on-surface-variant font-medium text-xs shrink-0">
                                #{r.attemptNumber}
                              </span>
                              <div className="flex-1 min-w-0 hidden sm:block">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-xs text-on-surface-variant truncate">{formatDate(r.completedAt)}</span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${r.score >= 80 ? 'bg-green-500' : r.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${r.score}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0 ml-auto">
                                <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                                  <Timer size={11} />{formatDuration(r.durationSeconds)}
                                </span>
                                <span className={`font-black text-sm min-w-[3rem] text-right ${r.score >= 80 ? 'text-green-600' : r.score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                                  {r.score}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {examResults.length > 3 && (
                          <Link href={`/analytics/${exam.id}`} className="flex items-center justify-center gap-1 py-3 text-xs font-bold text-secondary hover:bg-surface-container transition-colors">
                            Hamısına bax <ChevronRight size={12} />
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Exams not yet attempted */}
          {purchasedExams.some(e => !byExam.has(e.id)) && (
            <div className="mt-8 p-5 bg-white rounded-2xl border border-outline-variant/40 shadow-sm">
              <p className="text-sm text-on-surface-variant">
                <span className="font-bold text-primary">{purchasedExams.filter(e => !byExam.has(e.id)).length}</span> sınağa hələ başlamadınız.{' '}
                <Link href="/dashboard" className="text-secondary font-bold hover:underline">Panelə get →</Link>
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
