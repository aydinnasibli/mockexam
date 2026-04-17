import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { getActiveExams } from '@/lib/db/exams';
import { getUserResults } from '@/lib/db/results';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import {
  LayoutDashboard, LogOut, BarChart2, Settings,
  GraduationCap, ShoppingBag, PlusCircle, Play,
  Inbox, Timer, HelpCircle, ArrowRight, Trophy,
} from 'lucide-react';
import type { ResultSummary } from '@/lib/db/results';

function todayString() {
  return new Date().toLocaleDateString('az-AZ', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export const metadata = { title: 'Panel — Test Centre' };

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  await dbConnect();
  const [allExams, results, purchases] = await Promise.all([
    getActiveExams(),
    getUserResults(user.id),
    Purchase.find({ userId: user.id, status: 'COMPLETED' }, { examId: 1 }).lean(),
  ]);

  const purchasedIds = purchases.map(p => p.examId as string);
  const purchasedExams = allExams.filter(e => purchasedIds.includes(e.id));

  const purchasedTypes = new Set(purchasedExams.map(e => e.type));
  const relatedExams = allExams
    .filter(e => !purchasedIds.includes(e.id) && (purchasedTypes.size === 0 || purchasedTypes.has(e.type)))
    .slice(0, 3);

  const lastResultByExam = new Map<string, ResultSummary>();
  for (const r of results) {
    if (!lastResultByExam.has(r.examId)) lastResultByExam.set(r.examId, r);
  }

  const firstName = user.firstName ?? 'Tələbə';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Tələbə';
  const email = user.emailAddresses?.[0]?.emailAddress ?? '';
  const imageUrl = user.imageUrl;

  return (
    <div className="bg-surface text-on-surface min-h-screen">

      {/* ── Sidebar ── */}
      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col py-6 bg-surface-container-low border-r border-outline-variant/40 z-40">
        <div className="px-6 mb-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg editorial-gradient flex items-center justify-center">
              <span className="text-white text-[10px] font-black">TC</span>
            </div>
            <span className="text-base font-extrabold text-primary tracking-tight font-headline">Test Centre</span>
          </Link>
        </div>

        <div className="flex items-center px-6 mb-7 gap-3">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20" />
          ) : (
            <div className="w-10 h-10 rounded-full editorial-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black">{firstName[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-primary text-sm leading-tight truncate">{fullName}</p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-0.5 truncate">{email}</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-3">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white text-primary shadow-sm">
            <LayoutDashboard size={18} className="text-secondary" /> Panel
          </Link>
          <Link href="/analytics" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/60 hover:text-primary transition-all">
            <BarChart2 size={18} className="opacity-70" /> Nəticələr
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/60 hover:text-primary transition-all">
            <Settings size={18} className="opacity-70" /> Parametrlər
          </Link>
        </nav>

        <div className="px-4 mt-4 space-y-2">
          <Link href="/exams" className="w-full editorial-gradient text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity text-sm">
            <PlusCircle size={16} /> Sınaq Əldə Et
          </Link>
          <SignOutButton>
            <button className="w-full text-on-surface-variant py-3 px-4 flex items-center gap-3 hover:text-error transition-colors text-sm font-medium rounded-xl hover:bg-white/50">
              <LogOut size={16} /> Çıxış
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-64 p-8 min-h-screen">

        <header className="mb-10">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
            Xoş gəlmisiniz, {firstName}!
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">{todayString()}</p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 max-w-2xl">
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/40 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><GraduationCap size={16} /></div>
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Sınaqlarım</span>
            </div>
            <div className="text-3xl font-black text-primary">{purchasedExams.length}</div>
            <p className="text-xs text-on-surface-variant mt-0.5">aktiv sınaq</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/40 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><BarChart2 size={16} /></div>
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Cəhdlər</span>
            </div>
            <div className="text-3xl font-black text-primary">{results.length}</div>
            <p className="text-xs text-on-surface-variant mt-0.5">tamamlanan imtahan</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-outline-variant/40 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-50 text-green-600 rounded-xl"><ShoppingBag size={16} /></div>
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">Katalog</span>
            </div>
            <div className="text-3xl font-black text-primary">{allExams.filter(e => !purchasedIds.includes(e.id)).length}</div>
            <p className="text-xs text-on-surface-variant mt-0.5">əldə ediləbilən</p>
          </div>
        </div>

        {/* My exams */}
        <section className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-primary font-headline">Mənim Sınaqlarım</h2>
            {results.length > 0 && (
              <Link href="/analytics" className="text-sm font-bold text-secondary hover:underline underline-offset-2 flex items-center gap-1">
                Bütün nəticələr <ArrowRight size={14} />
              </Link>
            )}
          </div>

          {purchasedExams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-outline-variant/40 p-12 flex flex-col items-center text-center shadow-sm">
              <Inbox className="text-outline mb-4" size={40} />
              <h3 className="text-base font-bold text-primary mb-2">Hələ sınaq yoxdur</h3>
              <p className="text-sm text-on-surface-variant mb-6 max-w-xs">
                SAT, IELTS və ya TOEFL sınaqlarından birini seçib giriş əldə edin.
              </p>
              <Link href="/exams" className="editorial-gradient text-white px-6 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-md">
                Sınaqlara bax
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {purchasedExams.map(exam => {
                const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                const lastResult = lastResultByExam.get(exam.id);
                const attemptCount = results.filter(r => r.examId === exam.id).length;

                return (
                  <div key={exam.id} className="bg-white rounded-2xl border border-outline-variant/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-secondary-fixed/60 text-secondary rounded-full">
                          {exam.tag}
                        </span>
                        {attemptCount > 0 && (
                          <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                            {attemptCount} cəhd
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-primary font-headline leading-snug">{exam.title}</h3>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1"><Timer size={11} />{examMinutes} dəq</span>
                        <span className="flex items-center gap-1"><HelpCircle size={11} />{exam.totalQuestions} sual</span>
                        {lastResult && (
                          <span className="flex items-center gap-1">
                            <Trophy size={11} className="text-secondary" />
                            Son bal: <span className="font-bold text-primary">{lastResult.score}%</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {attemptCount > 0 && (
                        <Link href={`/analytics/${exam.id}`} className="flex items-center gap-1.5 px-4 py-2.5 border border-outline-variant rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors">
                          <BarChart2 size={14} /> Nəticələr
                        </Link>
                      )}
                      <Link href={`/exam-session/${exam.id}`} className="flex items-center gap-2 px-5 py-2.5 editorial-gradient text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-sm">
                        <Play size={14} /> {attemptCount === 0 ? 'Başla' : 'Yenidən'}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Related / explore exams */}
        {relatedExams.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-primary font-headline">
                {purchasedTypes.size > 0 ? 'Eyni növdə başqaları' : 'Kəşf et'}
              </h2>
              <Link href="/exams" className="text-sm font-bold text-secondary hover:underline underline-offset-2 flex items-center gap-1">
                Hamısı <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {relatedExams.map(exam => {
                const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                return (
                  <Link key={exam.id} href={`/exams/${exam.id}`} className="bg-white rounded-2xl border border-outline-variant/40 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-secondary-fixed/60 text-secondary rounded-full">{exam.tag}</span>
                      <span className="text-base font-black text-primary">{exam.price} ₼</span>
                    </div>
                    <h3 className="font-bold text-primary text-sm font-headline leading-snug mb-2 group-hover:text-secondary transition-colors flex-1">{exam.title}</h3>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-outline-variant/20 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1"><Timer size={11} />{examMinutes} dəq</span>
                      <span className="flex items-center gap-1"><HelpCircle size={11} />{exam.totalQuestions} sual</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
