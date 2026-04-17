import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getActiveExams } from '@/lib/db/exams';
import { getUserResults } from '@/lib/db/results';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import {
  BarChart2,
  GraduationCap, ShoppingBag, PlusCircle, Play,
  Timer, HelpCircle, ArrowRight,
  Monitor, Globe, BookOpen, TrendingUp, Sparkles, Clock,
} from 'lucide-react';

function todayString() {
  return new Date().toLocaleDateString('az-AZ', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('az-AZ', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const examTypeConfig = {
  sat:   { icon: Monitor,  accent: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700',    border: 'border-l-blue-400',   accentText: 'text-blue-600' },
  ielts: { icon: Globe,    accent: 'bg-purple-500', badge: 'bg-purple-50 text-purple-700', border: 'border-l-purple-400', accentText: 'text-purple-600' },
  toefl: { icon: BookOpen, accent: 'bg-cyan-500',   badge: 'bg-cyan-50 text-cyan-700',    border: 'border-l-cyan-400',   accentText: 'text-cyan-600' },
} as const;

const tagToType: Record<string, keyof typeof examTypeConfig> = {
  SAT: 'sat', IELTS: 'ielts', TOEFL: 'toefl',
};

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-500';
}
function scoreBarColor(score: number) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}
function scoreBg(score: number) {
  if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
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

  const purchasedIds   = purchases.map(p => p.examId as string);
  const purchasedExams = allExams.filter(e => purchasedIds.includes(e.id));
  const exploreExams   = allExams.filter(e => !purchasedIds.includes(e.id)).slice(0, 3);

  const lastResultByExam = new Map<string, (typeof results)[0]>();
  for (const r of results) {
    if (!lastResultByExam.has(r.examId)) lastResultByExam.set(r.examId, r);
  }

  const recentResults = results.slice(0, 6);
  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : null;

  const firstName = user.firstName ?? 'Tələbə';

  return (
    <>

        {/* Welcome banner */}
        <div className="editorial-gradient px-8 py-8 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/8 rounded-full blur-3xl" />
            <div className="absolute -bottom-8 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-2xl" />
          </div>
          <div className="relative z-10 flex items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={12} className="text-white/40" />
                <p className="text-white/40 text-xs font-semibold capitalize">{todayString()}</p>
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-headline leading-tight">
                Xoş gəlmisiniz, {firstName}!
              </h1>
              <p className="text-white/50 text-sm mt-1.5">
                {purchasedExams.length === 0
                  ? 'Başlamaq üçün bir sınaq əldə edin.'
                  : `${purchasedExams.length} aktiv sınaq · ${results.length} tamamlanan cəhd`}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3 shrink-0">
              {results.length > 0 && (
                <Link href="/analytics" className="flex items-center gap-2 bg-white/12 hover:bg-white/20 text-white border border-white/15 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                  <BarChart2 size={15} /> Nəticələr
                </Link>
              )}
              <Link href="/exams" className="flex items-center gap-2 bg-white/12 hover:bg-white/20 text-white border border-white/15 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                <ShoppingBag size={15} /> Katalog
              </Link>
            </div>
          </div>
        </div>

        <div className="p-6 flex-1">

          {/* Stats + content grid */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">

            {/* ── Left column ── */}
            <div className="space-y-6 min-w-0">

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                    <GraduationCap size={16} className="text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-primary">{purchasedExams.length}</div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Sınaqlarım</p>
                </div>
                <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                    <TrendingUp size={16} className="text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-primary">{results.length}</div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Cəhdlər</p>
                </div>
                <div className="bg-white rounded-2xl border border-outline-variant/30 p-4 shadow-sm">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mb-3">
                    <BarChart2 size={16} className="text-amber-600" />
                  </div>
                  <div className={`text-2xl font-black ${avgScore != null ? scoreColor(avgScore) : 'text-on-surface-variant'}`}>
                    {avgScore != null ? `${avgScore}%` : '—'}
                  </div>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">Ortalama</p>
                </div>
              </div>

              {/* My exams */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-bold text-primary font-headline uppercase tracking-wider">Mənim Sınaqlarım</h2>
                  {results.length > 0 && (
                    <Link href="/analytics" className="text-xs font-bold text-secondary hover:underline flex items-center gap-1">
                      Nəticələr <ArrowRight size={13} />
                    </Link>
                  )}
                </div>

                {purchasedExams.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-8 text-center">
                    <div className="w-12 h-12 rounded-2xl editorial-gradient mx-auto mb-4 flex items-center justify-center shadow-md">
                      <GraduationCap size={22} className="text-white" />
                    </div>
                    <h3 className="text-base font-bold text-primary mb-1.5 font-headline">Hələ sınaq yoxdur</h3>
                    <p className="text-sm text-on-surface-variant mb-6 max-w-xs mx-auto">
                      SAT, IELTS və ya TOEFL üçün professional sınaq paketlərini kəşf edin.
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-6 max-w-xs mx-auto">
                      {(
                        [
                          { type: 'sat',   label: 'SAT',   Icon: Monitor,  accent: 'bg-blue-500',   from: 12 },
                          { type: 'ielts', label: 'IELTS', Icon: Globe,    accent: 'bg-purple-500', from: 15 },
                          { type: 'toefl', label: 'TOEFL', Icon: BookOpen, accent: 'bg-cyan-500',   from: 18 },
                        ] as const
                      ).map(({ type, label, Icon, accent, from }) => (
                        <Link key={type} href={`/exams?type=${type}`}
                          className="bg-[#f0f2f5] hover:bg-surface-container rounded-xl p-3 text-center transition-colors group">
                          <div className={`w-8 h-8 ${accent} rounded-lg mx-auto mb-2 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform`}>
                            <Icon size={15} className="text-white" />
                          </div>
                          <p className="text-[11px] font-black text-primary">{label}</p>
                          <p className="text-[10px] text-secondary font-semibold">{from} ₼+</p>
                        </Link>
                      ))}
                    </div>
                    <Link href="/exams" className="inline-flex items-center gap-2 editorial-gradient text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity shadow-md">
                      <ShoppingBag size={14} /> Kataloqa bax
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchasedExams.map(exam => {
                      const examMinutes  = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                      const lastResult   = lastResultByExam.get(exam.id);
                      const attemptCount = results.filter(r => r.examId === exam.id).length;
                      const type         = exam.type as keyof typeof examTypeConfig;
                      const cfg          = examTypeConfig[type] ?? examTypeConfig.sat;
                      const TypeIcon     = cfg.icon;

                      return (
                        <div key={exam.id} className={`bg-white rounded-2xl border border-outline-variant/30 border-l-4 ${cfg.border} shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}>
                          {/* Card header */}
                          <div className="p-4 flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-xl ${cfg.accent} flex items-center justify-center shrink-0 shadow-sm`}>
                              <TypeIcon size={18} className="text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${cfg.badge}`}>{exam.tag}</span>
                                {attemptCount > 0
                                  ? <span className="text-[10px] font-semibold text-on-surface-variant bg-[#f0f2f5] px-2 py-0.5 rounded-full">{attemptCount} cəhd</span>
                                  : <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Başlanmayıb</span>
                                }
                              </div>
                              <h3 className="text-sm font-bold text-primary font-headline leading-snug">{exam.title}</h3>
                              <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                                <span className="flex items-center gap-1"><Timer size={11} />{examMinutes} dəq</span>
                                <span className="flex items-center gap-1"><HelpCircle size={11} />{exam.totalQuestions} sual</span>
                              </div>
                            </div>
                          </div>

                          {/* Card footer — score bar + actions */}
                          <div className="px-4 pb-4 flex items-center gap-3">
                            {lastResult ? (
                              <>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-on-surface-variant font-medium">Son nəticə</span>
                                    <span className={`text-[10px] font-black ${scoreColor(lastResult.score)}`}>{lastResult.score}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-[#f0f2f5] rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${scoreBarColor(lastResult.score)}`}
                                      style={{ width: `${lastResult.score}%` }} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Link href={`/analytics/${exam.id}`}
                                    className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant/60 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-[#f0f2f5] transition-colors">
                                    <BarChart2 size={12} /> Analiz
                                  </Link>
                                  <Link href={`/exam-session/${exam.id}`}
                                    className={`flex items-center gap-1 px-3 py-1.5 ${cfg.accent} text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-sm`}>
                                    <Play size={12} /> Yenidən
                                  </Link>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="flex-1 text-xs text-on-surface-variant">İlk cəhdinizi başladın!</p>
                                <Link href={`/exam-session/${exam.id}`}
                                  className={`flex items-center gap-1.5 px-4 py-1.5 ${cfg.accent} text-white rounded-lg text-xs font-bold hover:opacity-90 transition-opacity shadow-sm`}>
                                  <Play size={13} /> Başla
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Explore */}
              {exploreExams.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-primary font-headline uppercase tracking-wider">Kəşf et</h2>
                    <Link href="/exams" className="text-xs font-bold text-secondary hover:underline flex items-center gap-1">
                      Hamısı <ArrowRight size={13} />
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {exploreExams.map(exam => {
                      const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                      const type        = exam.type as keyof typeof examTypeConfig;
                      const cfg         = examTypeConfig[type] ?? examTypeConfig.sat;
                      const TypeIcon    = cfg.icon;
                      return (
                        <Link key={exam.id} href={`/exams/${exam.id}`}
                          className="bg-white rounded-2xl border border-outline-variant/30 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col group shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <div className={`w-9 h-9 rounded-xl ${cfg.accent} flex items-center justify-center shadow-sm`}>
                              <TypeIcon size={16} className="text-white" />
                            </div>
                            <span className="text-sm font-black text-primary">{exam.price} ₼</span>
                          </div>
                          <span className={`self-start text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-2 ${cfg.badge}`}>{exam.tag}</span>
                          <h3 className="font-bold text-primary text-xs font-headline leading-snug mb-auto group-hover:text-secondary transition-colors">{exam.title}</h3>
                          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-outline-variant/20 text-[10px] text-on-surface-variant">
                            <span className="flex items-center gap-0.5"><Timer size={10} />{examMinutes}d</span>
                            <span className="flex items-center gap-0.5"><HelpCircle size={10} />{exam.totalQuestions}s</span>
                            <span className="ml-auto text-secondary font-bold">Bax →</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {/* ── Right column — Recent activity ── */}
            <div className="space-y-4">

              {/* Recent activity */}
              {recentResults.length > 0 ? (
                <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-outline-variant/15 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-primary font-headline">Son Fəaliyyət</h2>
                    <Link href="/analytics" className="text-xs font-bold text-secondary hover:underline">Hamısı</Link>
                  </div>
                  <div className="divide-y divide-outline-variant/10">
                    {recentResults.map(r => {
                      const type = tagToType[r.examTag] ?? 'sat';
                      const cfg  = examTypeConfig[type];
                      const Icon = cfg.icon;
                      return (
                        <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${cfg.accent} flex items-center justify-center shrink-0`}>
                            <Icon size={14} className="text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-primary truncate">{r.examTitle}</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-on-surface-variant">
                              <Clock size={9} />
                              <span>{shortDate(r.completedAt)}</span>
                              <span>·</span>
                              <span>{formatDuration(r.durationSeconds)}</span>
                            </div>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${scoreBg(r.score)}`}>{r.score}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* No activity yet — show quick links */
                <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm p-5 text-center">
                  <div className="w-10 h-10 rounded-xl bg-surface-container mx-auto mb-3 flex items-center justify-center">
                    <BarChart2 size={18} className="text-on-surface-variant" />
                  </div>
                  <p className="text-sm font-bold text-primary mb-1">Fəaliyyət yoxdur</p>
                  <p className="text-xs text-on-surface-variant mb-4">İmtahan bitirdikdən sonra nəticələriniz burada görünəcək.</p>
                  <Link href="/exams" className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline">
                    Sınaqlara bax <ArrowRight size={12} />
                  </Link>
                </div>
              )}

              {/* Quick links */}
              <div className="bg-white rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-outline-variant/15">
                  <h2 className="text-sm font-bold text-primary font-headline">Sürətli Keçidlər</h2>
                </div>
                <div className="divide-y divide-outline-variant/10">
                  {[
                    { href: '/analytics',         icon: BarChart2,  label: 'Bütün nəticələr',    sub: `${results.length} cəhd` },
                    { href: '/exams',              icon: ShoppingBag, label: 'Sınaq kataloqu',    sub: `${allExams.length} sınaq` },
                    { href: '/dashboard/settings', icon: Settings,   label: 'Hesab parametrləri', sub: 'Profil, şifrə' },
                  ].map(({ href, icon: Icon, label, sub }) => (
                    <Link key={href} href={href}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[#f0f2f5] transition-colors group">
                      <div className="w-8 h-8 rounded-lg bg-[#f0f2f5] group-hover:bg-surface-container flex items-center justify-center shrink-0 transition-colors">
                        <Icon size={15} className="text-on-surface-variant" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-primary">{label}</p>
                        <p className="text-[10px] text-on-surface-variant">{sub}</p>
                      </div>
                      <ArrowRight size={13} className="text-outline opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
    </>
  );
}
