import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import Navbar from '@/components/layout/Navbar';
import { getExamResults } from '@/lib/db/results';
import { getExamById } from '@/lib/db/exams';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import { Timer, Trophy, TrendingUp, ArrowLeft, Play, BarChart2 } from 'lucide-react';

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
  if (!purchase) redirect(`/checkout/${examId}`);

  const [exam, results] = await Promise.all([
    getExamById(examId),
    getExamResults(userId, examId),
  ]);

  if (!exam) notFound();

  const attempts = results.length;
  const best  = attempts > 0 ? Math.max(...results.map(r => r.score)) : null;
  const avg   = attempts > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / attempts) : null;
  const last  = results[0] ?? null;
  const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-surface-subtle">
        <div className="max-w-4xl mx-auto px-6 py-10">

          {/* Back */}
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
                <span className="flex items-center gap-1"><Timer size={12} />{examMinutes} dəq</span>
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
                  <div className="text-3xl font-black text-primary">{best}%</div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Ən yaxşı bal</p>
                </div>
                <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm text-center">
                  <TrendingUp className="text-secondary mx-auto mb-2" size={20} />
                  <div className="text-3xl font-black text-primary">{avg}%</div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Ortalama bal</p>
                </div>
                <div className="bg-white rounded-2xl border border-outline-variant/40 p-5 shadow-sm text-center">
                  <BarChart2 className="text-secondary mx-auto mb-2" size={20} />
                  <div className="text-3xl font-black text-primary">{attempts}</div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mt-1">Ümumi cəhd</p>
                </div>
              </div>

              {/* Score trend (simple visual) */}
              {attempts > 1 && (
                <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm mb-6">
                  <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-4">Bal dinamikası</h2>
                  <div className="flex items-end gap-2 h-24">
                    {[...results].reverse().map((r, i) => (
                      <div key={r.id} className="flex-1 flex flex-col items-center gap-1 group">
                        <span className="text-[10px] font-bold text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">{r.score}%</span>
                        <div
                          className="w-full rounded-t-lg transition-all editorial-gradient opacity-80 hover:opacity-100"
                          style={{ height: `${Math.max(8, r.score)}%` }}
                        />
                        <span className="text-[10px] text-on-surface-variant">#{i + 1}</span>
                      </div>
                    ))}
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
                    <div key={r.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-primary">Cəhd #{r.attemptNumber}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">{formatDate(r.completedAt)}</p>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center gap-1.5 text-on-surface-variant text-xs">
                          <Timer size={13} />{formatDuration(r.durationSeconds)}
                        </span>
                        <div className="text-right">
                          <span className={`text-xl font-black ${r.score >= 80 ? 'text-green-600' : r.score >= 60 ? 'text-amber-600' : 'text-red-500'}`}>
                            {r.score}%
                          </span>
                          {r.score === best && <p className="text-[10px] text-secondary font-bold">Ən yaxşı</p>}
                        </div>
                      </div>
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
