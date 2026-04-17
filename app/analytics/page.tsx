import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getUserResults } from '@/lib/db/results';
import { getActiveExams } from '@/lib/db/exams';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import {
  BarChart2, Timer, Trophy, TrendingUp, Inbox, ChevronRight, Target,
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

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 h-1.5 bg-surface-container rounded-full overflow-hidden hidden sm:block">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`font-black text-sm min-w-[3rem] text-right tabular-nums ${textColor}`}>{score}%</span>
    </div>
  );
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

  // Only show exams that have at least one attempt
  const attemptedExams = purchasedExams.filter(e => byExam.has(e.id));
  const notAttemptedCount = purchasedExams.length - attemptedExams.length;

  const totalAttempts = results.length;
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : null;

  return (
    <main className="min-h-screen bg-surface-subtle">
        <div className="max-w-5xl mx-auto px-6 py-10">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-primary font-headline mb-1">Nəticələrim</h1>
            <p className="text-on-surface-variant text-sm">Bütün imtahan cəhdlərinin tarixi və statistikası</p>
          </div>

          {/* Summary stats — only when there are attempts */}
          {totalAttempts > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-10">
              <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Target size={16} /></div>
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Ümumi cəhd</span>
                </div>
                <div className="text-3xl font-black text-primary">{totalAttempts}</div>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><BarChart2 size={16} /></div>
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Sınaq sayı</span>
                </div>
                <div className="text-3xl font-black text-primary">{attemptedExams.length}</div>
              </div>
              <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><TrendingUp size={16} /></div>
                  <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Ortalama</span>
                </div>
                <div className="text-3xl font-black text-secondary">{avgScore != null ? `${avgScore}%` : '—'}</div>
              </div>
            </div>
          )}

          {/* No attempts at all */}
          {totalAttempts === 0 && (
            <div className="bg-white rounded-2xl border border-outline-variant/40 p-16 flex flex-col items-center text-center shadow-sm">
              <Inbox className="text-outline mb-4" size={40} />
              <h3 className="text-base font-bold text-primary mb-2">Hələ nəticə yoxdur</h3>
              <p className="text-sm text-on-surface-variant mb-6 max-w-xs">
                {purchasedExams.length > 0
                  ? 'Sınaq başlatdıqdan sonra nəticələriniz burada görünəcək.'
                  : 'Sınaq aldıqdan sonra nəticələriniz burada görünəcək.'}
              </p>
              <Link
                href={purchasedExams.length > 0 ? '/dashboard' : '/exams'}
                className="editorial-gradient text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              >
                {purchasedExams.length > 0 ? 'Panelə keç' : 'Sınaqları kəşf et'}
              </Link>
            </div>
          )}

          {/* Per-exam results — only exams with attempts */}
          {attemptedExams.length > 0 && (
            <div className="space-y-4">
              {attemptedExams.map(exam => {
                const examResults = byExam.get(exam.id)!;
                const best = Math.max(...examResults.map(r => r.score));
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
                          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                            {examResults.length} cəhd
                          </span>
                        </div>
                        <h3 className="font-bold text-primary font-headline text-base">{exam.title}</h3>
                        <div className="flex items-center gap-4 mt-1.5 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1"><Timer size={11} />{examMinutes} dəq</span>
                          <span className="flex items-center gap-1">
                            <Trophy size={11} className="text-amber-500" />Ən yaxşı: <span className={`font-bold ml-0.5 ${best >= 80 ? 'text-green-600' : best >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{best}%</span>
                          </span>
                          {examResults.length > 1 && (
                            <span className="flex items-center gap-1">
                              <BarChart2 size={11} />Son: <span className={`font-bold ml-0.5 ${last.score >= 80 ? 'text-green-600' : last.score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{last.score}%</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/analytics/${exam.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 border border-outline-variant rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors shrink-0"
                      >
                        <BarChart2 size={14} /> Ətraflı
                      </Link>
                    </div>

                    {/* Attempts list */}
                    <div className="border-t border-outline-variant/20">
                      <div className="divide-y divide-outline-variant/10">
                        {examResults.slice(0, 3).map(r => (
                          <div key={r.id} className="px-6 py-3 flex items-center gap-4">
                            <span className="text-on-surface-variant font-bold text-xs shrink-0 w-6">#{r.attemptNumber}</span>
                            <span className="text-xs text-on-surface-variant flex-1 hidden sm:block truncate">{formatDate(r.completedAt)}</span>
                            <div className="flex items-center gap-3 shrink-0 ml-auto">
                              <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                                <Timer size={11} />{formatDuration(r.durationSeconds)}
                              </span>
                              <ScoreBar score={r.score} />
                            </div>
                          </div>
                        ))}
                      </div>
                      {examResults.length > 3 && (
                        <Link
                          href={`/analytics/${exam.id}`}
                          className="flex items-center justify-center gap-1 py-3 text-xs font-bold text-secondary hover:bg-surface-container transition-colors"
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

          {/* Not yet attempted note */}
          {notAttemptedCount > 0 && totalAttempts > 0 && (
            <div className="mt-6 px-5 py-4 bg-white rounded-2xl border border-outline-variant/40 shadow-sm flex items-center justify-between">
              <p className="text-sm text-on-surface-variant">
                <span className="font-bold text-primary">{notAttemptedCount}</span> sınağa hələ başlamadınız.
              </p>
              <Link href="/dashboard" className="text-sm font-bold text-secondary hover:underline">
                Panelə get →
              </Link>
            </div>
          )}
        </div>
      </main>
  );
}
