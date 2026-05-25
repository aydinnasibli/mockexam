import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getActiveExams } from '@/lib/db/exams';
import { getUserResults } from '@/lib/db/results';
import { getUserSettings } from '@/lib/actions/settings';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import {
  BarChart2, Settings, ShoppingBag, Play, Timer, HelpCircle, ArrowRight, TrendingUp, TrendingDown,
} from 'lucide-react';
import FadeUp from '@/components/ui/FadeUp';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerChildren';

const examTypeLabels: Record<string, string> = {
  sat: 'SAT', ielts: 'IELTS', toefl: 'TOEFL', general_english: 'General English',
};

function weekAgoMs(): number {
  return Date.now() - 7 * 24 * 60 * 60 * 1000;
}

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

function scoreBg(score: number) {
  if (score >= 80) return 'bg-green-50 text-green-700 border-green-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
}

export const metadata = { title: 'Panel — Testcentre' };

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect('/sign-in');

  await dbConnect();
  const [allExams, results, purchases, userSettings] = await Promise.all([
    getActiveExams(),
    getUserResults(user.id),
    Purchase.find({ userId: user.id, status: 'COMPLETED' }, { examId: 1 }).lean(),
    getUserSettings(),
  ]);

  const purchasedIds   = purchases.map(p => p.examId as string);
  const purchasedExams = allExams.filter(e => purchasedIds.includes(e.id));
  const exploreExams   = allExams.filter(e => !purchasedIds.includes(e.id)).slice(0, 3);

  const lastResultByExam = new Map<string, (typeof results)[0]>();
  for (const r of results) {
    if (!lastResultByExam.has(r.examId)) lastResultByExam.set(r.examId, r);
  }

  const recentResults = results.slice(0, 6);

  const resultsByType = new Map<string, typeof results>();
  for (const r of results) {
    const exam = allExams.find(e => e.id === r.examId);
    if (!exam) continue;
    if (!resultsByType.has(exam.type)) resultsByType.set(exam.type, []);
    resultsByType.get(exam.type)!.push(r);
  }
  const typeAvgs = Array.from(resultsByType.entries()).map(([type, typeResults]) => ({
    type,
    label: examTypeLabels[type] ?? type.toUpperCase(),
    avg: Math.round(typeResults.reduce((s, r) => s + r.score, 0) / typeResults.length),
    count: typeResults.length,
  })).sort((a, b) => b.count - a.count);

  const weeklyAttempts = results.filter(r => new Date(r.completedAt).getTime() >= weekAgoMs()).length;

  const dominantType = typeAvgs.length > 0 ? typeAvgs[0].type : null;
  const dominantResults = dominantType
    ? results.filter(r => allExams.find(e => e.id === r.examId)?.type === dominantType)
    : [];
  const last3Avg = dominantResults.length >= 3
    ? Math.round(dominantResults.slice(0, 3).reduce((s, r) => s + r.score, 0) / 3)
    : null;
  const prev3Avg = dominantResults.length >= 6
    ? Math.round(dominantResults.slice(3, 6).reduce((s, r) => s + r.score, 0) / 3)
    : dominantResults.length >= 4
      ? Math.round(dominantResults.slice(3).reduce((s, r) => s + r.score, 0) / (dominantResults.length - 3))
      : null;
  const scoreTrend = last3Avg != null && prev3Avg != null ? last3Avg - prev3Avg : null;

  const countdown = (() => {
    if (!userSettings?.targetExamDate) return null;
    const target = new Date(userSettings.targetExamDate);
    const now    = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return null;
    const type = (userSettings.targetExamType ?? 'sat') as string;
    return {
      days, type,
      dateStr: new Date(userSettings.targetExamDate).toLocaleDateString('az-AZ', {
        day: 'numeric', month: 'long', year: 'numeric',
      }),
    };
  })();

  const nextStep = (() => {
    if (purchasedExams.length === 0) return {
      label: 'İlk sınağınızı əldə edin',
      desc: 'Mövcud sınaqları kəşf edin və hazırlığa başlayın.',
      href: '/exams', cta: 'Kataloqa bax',
    };
    const untouched = purchasedExams.find(e => !lastResultByExam.has(e.id));
    if (untouched) return {
      label: `${untouched.tag} sınağınızı başladın!`,
      desc: `"${untouched.title}" — hələ başlamadınız. İlk addımı atın.`,
      href: `/exam-session/${untouched.id}`, cta: 'İndi başla',
    };
    const worst = purchasedExams
      .map(e => ({ exam: e, score: lastResultByExam.get(e.id)!.score }))
      .sort((a, b) => a.score - b.score)[0];
    if (worst.score < 80) return {
      label: 'Nəticənizi yaxşılaşdırın',
      desc: `"${worst.exam.title}" — son nəticə ${worst.score}%.`,
      href: `/exam-session/${worst.exam.id}`, cta: 'Yenidən cəhd et',
    };
    return {
      label: 'Yeni sınaq kəşf edin',
      desc: 'Bütün sınaqlarınızda yaxşı nəticə göstərdiniz.',
      href: '/exams', cta: 'Kataloqa bax',
    };
  })();

  const firstName = user.firstName ?? 'Tələbə';

  return (
    <>
      {/* Welcome banner */}
      <FadeUp y={10} className="px-8 py-10 relative overflow-hidden shrink-0 bg-ink">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full" style={{ background: 'rgba(255,255,255,0.04)', filter: 'blur(40px)' }} />
          <div className="absolute -bottom-10 left-1/3 w-56 h-56 rounded-full" style={{ background: 'rgba(255,255,255,0.03)', filter: 'blur(32px)' }} />
        </div>
        <div className="relative z-10">
          <p className="eyebrow mb-4 capitalize" style={{ color: 'rgba(250,250,246,0.4)' }}>{todayString()}</p>
          <h1
            className="font-display font-normal m-0"
            style={{ fontSize: 40, lineHeight: 1.1, letterSpacing: '-0.02em', color: 'var(--color-bg)' }}
          >
            Xoş gəlmisiniz, {firstName}.
          </h1>
          <p className="text-[14px] mt-3 mb-0" style={{ color: 'rgba(250,250,246,0.4)' }}>
            {purchasedExams.length === 0
              ? 'Başlamaq üçün bir sınaq əldə edin.'
              : `${purchasedExams.length} aktiv sınaq · ${results.length} tamamlanan cəhd`}
          </p>
        </div>
      </FadeUp>

      <div className="p-6 flex-1">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">

          {/* ── Left column ── */}
          <div className="space-y-6 min-w-0">

            {/* Next step card */}
            <FadeUp delay={0.05} className="bg-surface rounded-2xl border border-rule p-5 flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                style={{ background: 'var(--color-accent-soft)' }}
              >
                <ArrowRight size={18} style={{ color: 'var(--color-ink)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-ink m-0">{nextStep.label}</p>
                <p className="text-[13px] text-ink-soft mt-0.5 line-clamp-1 m-0">{nextStep.desc}</p>
              </div>
              <Link href={nextStep.href} className="btn-primary shrink-0 py-2! px-4! text-[13px]!">
                {nextStep.cta}
              </Link>
            </FadeUp>

            {/* Stats */}
            <StaggerContainer className="grid grid-cols-3 gap-4" delay={0.08}>
              <StaggerItem className="bg-surface rounded-2xl border border-rule p-5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <ShoppingBag size={15} style={{ color: 'var(--color-ink-soft)' }} />
                </div>
                <div className="font-display text-[28px] font-normal text-ink leading-none">{purchasedExams.length}</div>
                <p className="text-[11px] text-ink-mute mt-1 m-0">Sınaqlarım</p>
                {exploreExams.length > 0
                  ? <p className="text-[11px] text-ink-soft font-medium mt-1 m-0">+{exploreExams.length} kataloqda</p>
                  : <p className="text-[11px] text-ink-mute mt-1 m-0">hamısı əldə edilib</p>
                }
              </StaggerItem>

              <StaggerItem className="bg-surface rounded-2xl border border-rule p-5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <TrendingUp size={15} style={{ color: 'var(--color-ink-soft)' }} />
                </div>
                <div className="font-display text-[28px] font-normal text-ink leading-none">{results.length}</div>
                <p className="text-[11px] text-ink-mute mt-1 m-0">Cəhdlər</p>
                {weeklyAttempts > 0
                  ? <p className="text-[11px] text-ok font-medium mt-1 m-0">+{weeklyAttempts} bu həftə</p>
                  : <p className="text-[11px] text-ink-mute mt-1 m-0">bu həftə yoxdur</p>
                }
              </StaggerItem>

              <StaggerItem className="bg-surface rounded-2xl border border-rule p-5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <BarChart2 size={15} style={{ color: 'var(--color-ink-soft)' }} />
                </div>
                {typeAvgs.length === 0 ? (
                  <>
                    <div className="font-display text-[28px] font-normal text-ink-mute leading-none">—</div>
                    <p className="text-[11px] text-ink-mute mt-1 m-0">Ortalama</p>
                  </>
                ) : typeAvgs.length === 1 ? (
                  <>
                    <div className={`font-display text-[28px] font-normal leading-none ${scoreColor(typeAvgs[0].avg)}`}>
                      {typeAvgs[0].avg}%
                    </div>
                    <p className="text-[11px] text-ink-mute mt-1 m-0">{typeAvgs[0].label} ortalama</p>
                    {scoreTrend != null && (
                      <p className={`text-[11px] font-medium mt-1 m-0 flex items-center gap-0.5 ${scoreTrend > 0 ? 'text-ok' : scoreTrend < 0 ? 'text-error' : 'text-ink-mute'}`}>
                        {scoreTrend > 0 ? <TrendingUp size={10} /> : scoreTrend < 0 ? <TrendingDown size={10} /> : null}
                        {scoreTrend > 0 ? `+${scoreTrend}` : scoreTrend}% son 3 cəhd
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[11px] text-ink-mute mb-2 m-0">Növ üzrə ortalama</p>
                    <div className="space-y-1">
                      {typeAvgs.map(t => (
                        <div key={t.type} className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-ink-soft">{t.label}</span>
                          <span className={`text-[11px] font-bold ${scoreColor(t.avg)}`}>{t.avg}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </StaggerItem>
            </StaggerContainer>

            {/* My exams */}
            <section>
              <FadeUp delay={0.1} className="flex items-center justify-between mb-4">
                <h2 className="eyebrow">Mənim Sınaqlarım</h2>
                {results.length > 0 && (
                  <Link href="/dashboard/analytics" className="text-[12px] font-medium text-ink-soft hover:text-ink flex items-center gap-1">
                    Nəticələr <ArrowRight size={12} />
                  </Link>
                )}
              </FadeUp>

              {purchasedExams.length === 0 ? (
                <FadeUp delay={0.15} className="bg-surface rounded-2xl border border-rule p-8 text-center">
                  <div
                    className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'var(--color-ink)' }}
                  >
                    <ShoppingBag size={20} style={{ color: 'var(--color-bg)' }} />
                  </div>
                  <h3 className="font-display text-[16px] font-normal text-ink mb-2">Hələ sınaq yoxdur</h3>
                  <p className="text-[13px] text-ink-soft mb-6 max-w-xs mx-auto m-0">
                    Mövcud sınaq paketlərini kəşf edin və hazırlığa başlayın.
                  </p>
                  <Link href="/exams" className="btn-primary">
                    Kataloqa bax <span className="arrow">→</span>
                  </Link>
                </FadeUp>
              ) : (
                <StaggerContainer className="space-y-3" delay={0.12}>
                  {purchasedExams.map(exam => {
                    const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                    const lastResult  = lastResultByExam.get(exam.id);
                    const attemptCount = results.filter(r => r.examId === exam.id).length;

                    return (
                      <StaggerItem key={exam.id} className="bg-surface rounded-2xl border border-rule overflow-hidden">
                        <div className="p-4 flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <span className="tag tag-accent">{exam.tag}</span>
                              {attemptCount > 0
                                ? <span className="tag">{attemptCount} cəhd</span>
                                : <span className="text-[11px] font-medium text-warn bg-amber-50 px-2 py-0.5 rounded-full">Başlanmayıb</span>
                              }
                            </div>
                            <h3 className="font-display text-[15px] font-normal text-ink leading-snug m-0">{exam.title}</h3>
                            <div className="flex items-center gap-3 mt-1.5 text-[12px] text-ink-mute">
                              <span className="flex items-center gap-1"><Timer size={11} />{examMinutes} dəq</span>
                              <span className="flex items-center gap-1"><HelpCircle size={11} />{exam.totalQuestions} sual</span>
                            </div>
                          </div>
                        </div>

                        <div className="px-4 pb-4 flex items-center gap-3">
                          {lastResult ? (
                            <>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] text-ink-mute">Son nəticə</span>
                                  <span className={`text-[11px] font-bold ${scoreColor(lastResult.score)}`}>{lastResult.score}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${scoreBarColor(lastResult.score)}`}
                                    style={{ width: `${lastResult.score}%` }} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Link href={`/dashboard/analytics/${exam.id}`}
                                  className="flex items-center gap-1 px-3 py-1.5 border border-rule rounded-lg text-[12px] font-medium text-ink-soft hover:bg-surface-2 transition-colors">
                                  <BarChart2 size={12} /> Analiz
                                </Link>
                                <Link href={`/exam-session/${exam.id}`}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-ink text-bg rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity">
                                  <Play size={12} /> Yenidən
                                </Link>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="flex-1 text-[13px] text-ink-soft m-0">İlk cəhdinizi başladın!</p>
                              <Link href={`/exam-session/${exam.id}`}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-ink text-bg rounded-lg text-[12px] font-medium hover:opacity-90 transition-opacity">
                                <Play size={13} /> Başla
                              </Link>
                            </>
                          )}
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </section>

            {/* Explore */}
            {exploreExams.length > 0 && (
              <section>
                <FadeUp delay={0.05} className="flex items-center justify-between mb-4">
                  <h2 className="eyebrow">Kəşf et</h2>
                  <Link href="/exams" className="text-[12px] font-medium text-ink-soft hover:text-ink flex items-center gap-1">
                    Hamısı <ArrowRight size={12} />
                  </Link>
                </FadeUp>
                <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-3" delay={0.08}>
                  {exploreExams.map(exam => {
                    const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                    return (
                      <StaggerItem key={exam.id}>
                        <Link href={`/exams/${exam.id}`}
                          className="bg-surface rounded-2xl border border-rule p-4 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 flex flex-col group">
                          <div className="flex items-start justify-between mb-3">
                            <span className="tag tag-accent">{exam.tag}</span>
                            <span className="font-display text-[15px] font-normal text-ink">{exam.price} ₼</span>
                          </div>
                          <h3 className="font-display font-normal text-ink text-[13px] leading-snug mb-auto group-hover:text-ink-soft transition-colors m-0">
                            {exam.title}
                          </h3>
                          <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-rule text-[11px] text-ink-mute">
                            <span className="flex items-center gap-0.5"><Timer size={10} />{examMinutes}d</span>
                            <span className="flex items-center gap-0.5"><HelpCircle size={10} />{exam.totalQuestions}s</span>
                            <span className="ml-auto text-ink font-medium">Bax →</span>
                          </div>
                        </Link>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              </section>
            )}
          </div>

          {/* ── Right column ── */}
          <StaggerContainer className="space-y-4" delay={0.15}>

            {/* Countdown card */}
            {countdown && (
              <StaggerItem className="rounded-2xl border border-rule bg-surface-2 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="eyebrow m-0">İmtahan geri sayımı</p>
                  <Link href="/dashboard/settings" className="text-[11px] font-medium text-ink-mute hover:text-ink transition-colors">
                    Dəyişdir
                  </Link>
                </div>
                <p className="text-[12px] text-ink-soft mb-4 m-0">{countdown.dateStr}</p>
                <div className="text-center py-3">
                  <p
                    className="font-display font-normal text-ink"
                    style={{ fontSize: 48, lineHeight: 1, letterSpacing: '-0.025em' }}
                  >
                    {countdown.days}
                  </p>
                  <p className="text-[13px] font-medium text-ink-soft mt-1 m-0">
                    {countdown.days === 0 ? 'Bugün!' : countdown.days === 1 ? 'gün qalıb' : 'gün qalır'}
                  </p>
                </div>
                {countdown.days <= 14 && (
                  <Link href={`/exams?type=${countdown.type}`} className="btn-primary w-full justify-center mt-4">
                    Sınaqlara bax <span className="arrow">→</span>
                  </Link>
                )}
              </StaggerItem>
            )}

            {/* Recent activity */}
            {recentResults.length > 0 ? (
              <StaggerItem className="bg-surface rounded-2xl border border-rule overflow-hidden">
                <div className="px-5 py-4 border-b border-rule flex items-center justify-between">
                  <h2 className="eyebrow">Son Fəaliyyət</h2>
                  <Link href="/dashboard/analytics" className="text-[12px] font-medium text-ink-soft hover:text-ink">Hamısı</Link>
                </div>
                <div className="divide-y divide-rule">
                  {recentResults.map(r => (
                    <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${scoreBarColor(r.score)}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-ink truncate m-0">{r.examTitle}</p>
                        <p className="text-[11px] text-ink-mute mt-0.5 m-0">
                          {shortDate(r.completedAt)} · {formatDuration(r.durationSeconds)}
                        </p>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${scoreBg(r.score)}`}>
                        {r.score}%
                      </span>
                    </div>
                  ))}
                </div>
              </StaggerItem>
            ) : (
              <StaggerItem className="bg-surface rounded-2xl border border-rule p-5 text-center">
                <div
                  className="w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center"
                  style={{ background: 'var(--color-surface-2)' }}
                >
                  <BarChart2 size={18} style={{ color: 'var(--color-ink-mute)' }} />
                </div>
                <p className="text-[13px] font-semibold text-ink mb-1 m-0">Fəaliyyət yoxdur</p>
                <p className="text-[12px] text-ink-soft mb-4 m-0">
                  İmtahan bitirdikdən sonra nəticələriniz burada görünəcək.
                </p>
                <Link href="/exams" className="text-[12px] font-medium text-ink-soft hover:text-ink inline-flex items-center gap-1">
                  Sınaqlara bax <ArrowRight size={12} />
                </Link>
              </StaggerItem>
            )}

            {/* Quick links */}
            <StaggerItem className="bg-surface rounded-2xl border border-rule overflow-hidden">
              <div className="px-5 py-4 border-b border-rule">
                <h2 className="eyebrow">Sürətli Keçidlər</h2>
              </div>
              <div className="divide-y divide-rule">
                {[
                  { href: '/dashboard/analytics', icon: BarChart2,   label: 'Bütün nəticələr',   sub: `${results.length} cəhd` },
                  { href: '/exams',               icon: ShoppingBag, label: 'Sınaq kataloqu',     sub: `${allExams.length} sınaq` },
                  { href: '/dashboard/settings',  icon: Settings,    label: 'Hesab parametrləri', sub: 'Profil, şifrə' },
                ].map(({ href, icon: Icon, label, sub }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors group">
                    <div
                      className="w-8 h-8 rounded-lg group-hover:bg-surface-3 flex items-center justify-center shrink-0 transition-colors"
                      style={{ background: 'var(--color-surface-2)' }}
                    >
                      <Icon size={15} style={{ color: 'var(--color-ink-mute)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-ink m-0">{label}</p>
                      <p className="text-[11px] text-ink-mute m-0">{sub}</p>
                    </div>
                    <ArrowRight size={13} className="text-ink-mute opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </StaggerItem>

          </StaggerContainer>
        </div>
      </div>
    </>
  );
}
