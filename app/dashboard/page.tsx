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
  Timer, HelpCircle, ArrowRight,
  Monitor, Globe, BookOpen, TrendingUp, Sparkles,
} from 'lucide-react';
import type { ResultSummary } from '@/lib/db/results';

function todayString() {
  return new Date().toLocaleDateString('az-AZ', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

const examTypeConfig = {
  sat:   { icon: Monitor,  accent: 'bg-blue-500',   soft: 'bg-blue-50',   badge: 'bg-blue-50 text-blue-700',    border: 'border-l-blue-400' },
  ielts: { icon: Globe,    accent: 'bg-purple-500', soft: 'bg-purple-50', badge: 'bg-purple-50 text-purple-700', border: 'border-l-purple-400' },
  toefl: { icon: BookOpen, accent: 'bg-cyan-500',   soft: 'bg-cyan-50',   badge: 'bg-cyan-50 text-cyan-700',    border: 'border-l-cyan-400' },
} as const;

function scoreBadgeClass(score: number) {
  if (score >= 80) return 'text-green-700 bg-green-50 border border-green-200';
  if (score >= 60) return 'text-amber-700 bg-amber-50 border border-amber-200';
  return 'text-red-700 bg-red-50 border border-red-200';
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
  const fullName  = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Tələbə';
  const email     = user.emailAddresses?.[0]?.emailAddress ?? '';
  const imageUrl  = user.imageUrl;

  return (
    <div className="bg-surface-subtle text-on-surface min-h-screen">

      {/* ── Sidebar ── */}
      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col bg-white border-r border-outline-variant/40 z-40">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-outline-variant/20">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl editorial-gradient flex items-center justify-center shadow-sm shrink-0">
              <span className="text-white text-[11px] font-black">TC</span>
            </div>
            <span className="text-base font-extrabold text-primary tracking-tight font-headline">Test Centre</span>
          </Link>
        </div>

        {/* User profile chip */}
        <div className="px-4 py-3 border-b border-outline-variant/20">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container-low">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-primary/10" />
            ) : (
              <div className="w-8 h-8 rounded-full editorial-gradient flex items-center justify-center shrink-0 shadow-sm">
                <span className="text-white text-xs font-black">{firstName[0]}</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-primary text-xs leading-tight truncate">{fullName}</p>
              <p className="text-[10px] text-on-surface-variant truncate">{email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
          <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Menyu</p>
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold bg-primary text-white shadow-sm">
            <LayoutDashboard size={16} /> Panel
          </Link>
          <Link href="/analytics" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all">
            <BarChart2 size={16} className="opacity-60" /> Nəticələr
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container hover:text-primary transition-all">
            <Settings size={16} className="opacity-60" /> Parametrlər
          </Link>
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-outline-variant/20 space-y-1.5">
          <Link href="/exams" className="w-full editorial-gradient text-white py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm shadow-sm">
            <PlusCircle size={15} /> Sınaq Əldə Et
          </Link>
          <SignOutButton>
            <button className="w-full text-on-surface-variant py-2 px-4 flex items-center gap-2.5 hover:text-error transition-colors text-sm font-medium rounded-xl hover:bg-surface-container-low">
              <LogOut size={15} /> Çıxış
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="ml-64 min-h-screen flex flex-col">

        {/* Welcome banner */}
        <div className="editorial-gradient px-8 py-7 relative overflow-hidden shrink-0">
          {/* Decorative blobs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 flex items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={12} className="text-white/50" />
                <p className="text-white/50 text-xs font-semibold capitalize">{todayString()}</p>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-headline leading-tight">
                Xoş gəlmisiniz, {firstName}!
              </h1>
              <p className="text-white/55 text-sm mt-1">
                {purchasedExams.length === 0
                  ? 'Başlamaq üçün bir sınaq əldə edin.'
                  : `${purchasedExams.length} aktiv sınaq · ${results.length} tamamlanan cəhd`}
              </p>
            </div>
            <div className="hidden sm:block shrink-0">
              {purchasedExams.length === 0 ? (
                <Link href="/exams" className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
                  <ShoppingBag size={15} /> Sınaqlara bax
                </Link>
              ) : (
                <Link href="/analytics" className="flex items-center gap-2 bg-white/15 hover:bg-white/25 text-white border border-white/20 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors">
                  <BarChart2 size={15} /> Nəticələrə bax
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="p-8 flex-1">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg">
            <div className="bg-white rounded-2xl border border-outline-variant/40 p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                <GraduationCap size={16} className="text-blue-600" />
              </div>
              <div className="text-2xl font-black text-primary">{purchasedExams.length}</div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Sınaqlarım</p>
            </div>
            <div className="bg-white rounded-2xl border border-outline-variant/40 p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                <TrendingUp size={16} className="text-purple-600" />
              </div>
              <div className="text-2xl font-black text-primary">{results.length}</div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Cəhdlər</p>
            </div>
            <div className="bg-white rounded-2xl border border-outline-variant/40 p-4 shadow-sm">
              <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mb-3">
                <ShoppingBag size={16} className="text-green-600" />
              </div>
              <div className="text-2xl font-black text-primary">{allExams.filter(e => !purchasedIds.includes(e.id)).length}</div>
              <p className="text-[11px] text-on-surface-variant mt-0.5">Katalogda</p>
            </div>
          </div>

          {/* My exams */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-primary font-headline">Mənim Sınaqlarım</h2>
              {results.length > 0 && (
                <Link href="/analytics" className="text-sm font-bold text-secondary hover:underline underline-offset-2 flex items-center gap-1">
                  Bütün nəticələr <ArrowRight size={14} />
                </Link>
              )}
            </div>

            {purchasedExams.length === 0 ? (
              /* ── Empty state ── */
              <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-10 text-center">
                <div className="w-14 h-14 rounded-2xl editorial-gradient mx-auto mb-5 flex items-center justify-center shadow-lg">
                  <GraduationCap size={26} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-primary mb-2 font-headline">Hələ sınaq yoxdur</h3>
                <p className="text-sm text-on-surface-variant mb-8 max-w-xs mx-auto leading-relaxed">
                  SAT, IELTS və ya TOEFL üçün professional sınaq paketlərini kəşf edin.
                </p>

                {/* Exam type mini cards */}
                <div className="grid grid-cols-3 gap-3 mb-8 max-w-sm mx-auto">
                  {(
                    [
                      { type: 'sat',   label: 'SAT',   Icon: Monitor,  accent: 'bg-blue-500',   count: 3, from: 12 },
                      { type: 'ielts', label: 'IELTS', Icon: Globe,    accent: 'bg-purple-500', count: 2, from: 15 },
                      { type: 'toefl', label: 'TOEFL', Icon: BookOpen, accent: 'bg-cyan-500',   count: 2, from: 18 },
                    ] as const
                  ).map(({ type, label, Icon, accent, count, from }) => (
                    <Link
                      key={type}
                      href={`/exams?type=${type}`}
                      className="bg-surface-container-low hover:bg-surface-container rounded-xl p-4 text-center transition-colors group"
                    >
                      <div className={`w-9 h-9 ${accent} rounded-xl mx-auto mb-2 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                        <Icon size={17} className="text-white" />
                      </div>
                      <p className="text-xs font-black text-primary">{label}</p>
                      <p className="text-[10px] text-on-surface-variant">{count} sınaq</p>
                      <p className="text-[10px] font-bold text-secondary mt-0.5">{from} ₼-dən</p>
                    </Link>
                  ))}
                </div>

                <Link href="/exams" className="inline-flex items-center gap-2 editorial-gradient text-white px-7 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-md">
                  <ShoppingBag size={15} /> Kataloqa bax <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              /* ── Exam list ── */
              <div className="space-y-3">
                {purchasedExams.map(exam => {
                  const examMinutes  = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                  const lastResult   = lastResultByExam.get(exam.id);
                  const attemptCount = results.filter(r => r.examId === exam.id).length;
                  const type         = exam.type as keyof typeof examTypeConfig;
                  const cfg          = examTypeConfig[type] ?? examTypeConfig.sat;
                  const TypeIcon     = cfg.icon;

                  return (
                    <div key={exam.id} className={`bg-white rounded-2xl border border-outline-variant/40 border-l-4 ${cfg.border} shadow-sm hover:shadow-md transition-all duration-200 flex`}>
                      <div className="flex-1 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">

                        {/* Type icon */}
                        <div className={`w-11 h-11 rounded-xl ${cfg.accent} flex items-center justify-center shrink-0 shadow-sm`}>
                          <TypeIcon size={19} className="text-white" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}>
                              {exam.tag}
                            </span>
                            {attemptCount > 0 && (
                              <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                                {attemptCount} cəhd
                              </span>
                            )}
                            {attemptCount === 0 && (
                              <span className="text-[10px] font-bold text-secondary bg-secondary/8 px-2 py-0.5 rounded-full">
                                Başlanmayıb
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-bold text-primary font-headline leading-snug">{exam.title}</h3>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-on-surface-variant">
                            <span className="flex items-center gap-1"><Timer size={11} />{examMinutes} dəq</span>
                            <span className="flex items-center gap-1"><HelpCircle size={11} />{exam.totalQuestions} sual</span>
                          </div>
                        </div>

                        {/* Last score badge */}
                        {lastResult && (
                          <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                            <span className={`text-sm font-black px-3 py-1 rounded-lg ${scoreBadgeClass(lastResult.score)}`}>
                              {lastResult.score}%
                            </span>
                            <span className="text-[10px] text-on-surface-variant">son cəhd</span>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                          {attemptCount > 0 && (
                            <Link
                              href={`/analytics/${exam.id}`}
                              className="flex items-center gap-1.5 px-3 py-2 border border-outline-variant rounded-xl text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
                            >
                              <BarChart2 size={13} /> Nəticələr
                            </Link>
                          )}
                          <Link
                            href={`/exam-session/${exam.id}`}
                            className={`flex items-center gap-1.5 px-4 py-2 ${cfg.accent} text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity shadow-sm`}
                          >
                            <Play size={13} /> {attemptCount === 0 ? 'Başla' : 'Yenidən'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Explore / related exams */}
          {relatedExams.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-primary font-headline">
                  {purchasedTypes.size > 0 ? 'Eyni növdə başqaları' : 'Kəşf et'}
                </h2>
                <Link href="/exams" className="text-sm font-bold text-secondary hover:underline underline-offset-2 flex items-center gap-1">
                  Hamısı <ArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {relatedExams.map(exam => {
                  const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                  const type        = exam.type as keyof typeof examTypeConfig;
                  const cfg         = examTypeConfig[type] ?? examTypeConfig.sat;
                  const TypeIcon    = cfg.icon;
                  return (
                    <Link
                      key={exam.id}
                      href={`/exams/${exam.id}`}
                      className="bg-white rounded-2xl border border-outline-variant/40 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl ${cfg.accent} flex items-center justify-center shadow-sm`}>
                          <TypeIcon size={18} className="text-white" />
                        </div>
                        <span className="text-base font-black text-primary">{exam.price} ₼</span>
                      </div>
                      <span className={`self-start text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 ${cfg.badge}`}>
                        {exam.tag}
                      </span>
                      <h3 className="font-bold text-primary text-sm font-headline leading-snug mb-auto group-hover:text-secondary transition-colors">
                        {exam.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-outline-variant/20 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1"><Timer size={11} />{examMinutes} dəq</span>
                        <span className="flex items-center gap-1"><HelpCircle size={11} />{exam.totalQuestions} sual</span>
                        <span className="ml-auto text-secondary font-bold text-[11px]">Ətraflı →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
