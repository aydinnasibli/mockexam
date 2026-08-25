import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { getActiveExams } from '@/lib/db/exams';
import { getUserResults } from '@/lib/db/results';
import { getUserSettings } from '@/lib/actions/settings';
import { formatOverallScore } from '@/lib/domain/scoring';
import { ownedExamIds } from '@/lib/db/entitlements';
import { reconcilePurchase } from '@/lib/payments/reconcile';
import { captureException } from '@/lib/infra/observability';
import { ArrowRight } from 'lucide-react';
import FadeUp from '@/components/ui/FadeUp';
import { StaggerContainer, StaggerItem } from '@/components/ui/StaggerChildren';
import MyExamsList, { type MyExamRow } from './MyExamsList';

import { examTypeLabel } from '@/lib/domain/exam-types';
import Button, { ButtonArrow } from '@/components/ui/Button';
import Tag, { scoreTone } from '@/components/ui/Tag';

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

/*
 * The three semantic tints already defined in globals — 10%/8% washes of the
 * same green/amber/rust the public pages mark correct and wrong answers with.
 * This used to return raw Tailwind pastels (`bg-green-50 text-green-700
 * border-green-200`), which belonged to no palette in the design.
 */
export const metadata = { title: 'Panel' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ purchased?: string }>;
}) {
  const user = await currentUser();
  if (!user) return (await auth()).redirectToSignIn();

  // The bank redirects here on success (?purchased=<examId>). If the webhook
  // hasn't landed yet, reconcile against Epoint's get-status so the buyer gets
  // access immediately instead of staring at a page that doesn't show the exam.
  const { purchased } = await searchParams;
  if (purchased) {
    // Never let a reconcile hiccup break the dashboard render — but report it.
    // A buyer who lands here without access is a support ticket, and swallowing
    // the cause silently is how it stays unexplained.
    try {
      await reconcilePurchase(user.id, purchased);
    } catch (err) {
      void captureException(err, {
        tags: { page: 'dashboard', step: 'reconcilePurchase' },
        extra: { userId: user.id, examId: purchased },
      });
    }
  }

  const [allExams, results, purchasedIds, userSettings] = await Promise.all([
    getActiveExams(),
    getUserResults(user.id),
    ownedExamIds(user.id),
    getUserSettings(),
  ]);

  const purchasedExams = allExams.filter(e => purchasedIds.includes(e.id));
  const exploreExams   = allExams.filter(e => !purchasedIds.includes(e.id)).slice(0, 3);

  const lastResultByExam = new Map<string, (typeof results)[0]>();
  for (const r of results) {
    if (!lastResultByExam.has(r.examId)) lastResultByExam.set(r.examId, r);
  }

  /*
   * Only results whose exam still exists.
   *
   * Each of these links to a review page that resolves the exam and calls
   * `notFound()` when it is gone — so an attempt on a deleted exam rendered as
   * a dead link on the candidate's own dashboard. The analytics page never had
   * the problem because it derives its list from the live catalog; this one
   * took the results straight from the database.
   */
  const liveExamIds = new Set(allExams.map(e => e.id));
  const recentResults = results.filter(r => liveExamIds.has(r.examId)).slice(0, 6);

  const resultsByType = new Map<string, typeof results>();
  for (const r of results) {
    const exam = allExams.find(e => e.id === r.examId);
    if (!exam) continue;
    if (!resultsByType.has(exam.type)) resultsByType.set(exam.type, []);
    resultsByType.get(exam.type)!.push(r);
  }
  const typeAvgs = Array.from(resultsByType.entries()).map(([type, typeResults]) => ({
    type,
    label: examTypeLabel(type),
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
    // Names the exam, not its type. This used to read "<TAG> sınağınızı
    // başladın!", which looked like the platform was pitching a product the
    // student hadn't bought — when in fact it is one they already own and
    // simply haven't opened.
    const untouched = purchasedExams.find(e => !lastResultByExam.has(e.id));
    if (untouched) return {
      label: 'Başlanmamış sınağınız var',
      desc: `"${untouched.title}" — hələ heç bir cəhd etməmisiniz.`,
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

  // Flattened for the client list, which owns the search/filter/sort controls.
  const myExamRows: MyExamRow[] = purchasedExams.map(exam => {
    const last = lastResultByExam.get(exam.id) ?? null;
    const disp = last ? formatOverallScore(last) : null;
    return {
      id:                exam.id,
      title:             exam.title,
      tag:               exam.tag,
      type:              exam.type,
      typeLabel:         examTypeLabel(exam.type),
      minutes:           exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0),
      totalQuestions:    exam.totalQuestions,
      attemptCount:      results.filter(r => r.examId === exam.id).length,
      lastScore:         last?.score ?? null,
      lastScoreLabel:    disp ? (disp.unit !== '%' ? `${disp.value} ${disp.unit}` : `${disp.value}%`) : null,
      lastAttemptNumber: last?.attemptNumber ?? null,
      lastCompletedAt:   last?.completedAt ?? null,
    };
  });

  const firstName = user.firstName ?? 'Tələbə';

  return (
    <>
      {/* Masthead. Flat ink, exactly like the §03 and CTA bands on the home
          page — the two blurred white blobs that used to float behind it were
          the only gradient artefact anywhere in the product. */}
      <FadeUp y={10} className="shrink-0 bg-ink px-8 py-11">
        <div className="mb-6 flex items-center gap-3">
          <span className="h-1.75 w-1.75 rounded-full bg-bg/70" aria-hidden />
          {/* NOTE: the original was `mono-label mono-label-lg text-bg/55 capitalize`, but
              `.mono-label` set both `text-transform` and `color`, and globals.css's
              @layer utilities is emitted after Tailwind's — so it won both ties and
              the `text-bg/55 capitalize` never applied. Reproduced as it shipped. */}
          <span className="font-mono text-label font-normal tracking-[0.16em] uppercase text-ink-mute">{todayString()}</span>
        </div>
        <h1 className="m-0 text-heading-lg leading-[1.04] font-light tracking-[-0.035em] text-bg md:text-display-xs">
          Xoş gəlmisiniz, <span className="font-medium">{firstName}.</span>
        </h1>
        <p className="mt-3.5 mb-0 text-body text-bg/55">
          {purchasedExams.length === 0
            ? 'Başlamaq üçün bir sınaq əldə edin.'
            : `${purchasedExams.length} aktiv sınaq · ${results.length} tamamlanan cəhd`}
        </p>
      </FadeUp>

      <div className="flex-1 px-8 py-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">

          {/* ── Left column ── */}
          <div className="min-w-0 space-y-6">

            {/* Next step */}
            {/* Stacks below sm: side by side, the button squeezed the sentence
                down to "IELTS Academi…" on a phone. */}
            <FadeUp delay={0.05} className="rounded-panel border border-rule bg-surface flex flex-col items-start gap-4 px-5 py-4.5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-body font-medium tracking-[-0.01em] text-ink">{nextStep.label}</p>
                <p className="m-0 mt-1 text-sm text-ink-soft sm:line-clamp-1">{nextStep.desc}</p>
              </div>
              <Button size="sm" className="shrink-0" href={nextStep.href}>
                {nextStep.cta} <ButtonArrow />
              </Button>
            </FadeUp>

            {/* Stats. The home hero's figure row: mono numerals over mono
                captions, divided by rules rather than boxed into three tiles
                with an icon chip apiece. */}
            <StaggerContainer className="rounded-panel border border-rule bg-surface grid grid-cols-1 sm:grid-cols-3" delay={0.08}>
              <StaggerItem className="border-b border-rule px-5 py-5 sm:border-r sm:border-b-0">
                <div className="font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-ink text-3xl">{purchasedExams.length}</div>
                <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2.5">Sınaqlarım</p>
                {exploreExams.length > 0
                  ? <p className="m-0 mt-1.5 text-note text-ink-soft">+{exploreExams.length} kataloqda</p>
                  : <p className="m-0 mt-1.5 text-note text-ink-mute">hamısı əldə edilib</p>
                }
              </StaggerItem>

              <StaggerItem className="border-b border-rule px-5 py-5 sm:border-r sm:border-b-0">
                <div className="font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-ink text-3xl">{results.length}</div>
                <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2.5">Cəhdlər</p>
                {weeklyAttempts > 0
                  ? <p className="m-0 mt-1.5 text-note text-ok">+{weeklyAttempts} bu həftə</p>
                  : <p className="m-0 mt-1.5 text-note text-ink-mute">bu həftə yoxdur</p>
                }
              </StaggerItem>

              <StaggerItem className="px-5 py-5">
                {typeAvgs.length === 0 ? (
                  <>
                    <div className="font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-3xl text-ink">—</div>
                    <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2.5">Ortalama</p>
                  </>
                ) : typeAvgs.length === 1 ? (
                  <>
                    <div className={`font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-ink text-3xl ${scoreColor(typeAvgs[0].avg)}`}>
                      {typeAvgs[0].avg}%
                    </div>
                    <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2.5">{typeAvgs[0].label} ortalama</p>
                    {scoreTrend != null && (
                      <p className={`m-0 mt-1.5 font-mono text-note tabular-nums ${scoreTrend > 0 ? 'text-ok' : scoreTrend < 0 ? 'text-error' : 'text-ink-mute'}`}>
                        {scoreTrend > 0 ? '▲' : scoreTrend < 0 ? '▼' : '·'} {Math.abs(scoreTrend)}% son 3 cəhd
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mb-3">Növ üzrə ortalama</p>
                    <div>
                      {typeAvgs.map(t => (
                        <div key={t.type} className="flex items-baseline justify-between gap-3 border-t border-rule-soft py-1.5 first:border-t-0 first:pt-0">
                          <span className="truncate text-note text-ink-soft">{t.label}</span>
                          <span className={`font-mono text-note tabular-nums ${scoreColor(t.avg)}`}>{t.avg}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </StaggerItem>
            </StaggerContainer>

            {/* My exams */}
            <section>
              <FadeUp delay={0.1} className="mb-4 flex items-center justify-between gap-4 border-b border-ink pb-3">
                <h2 className="font-mono text-label font-normal tracking-[0.16em] uppercase m-0 text-ink-mute">Mənim Sınaqlarım</h2>
                {results.length > 0 && (
                  <Link href="/dashboard/analytics" className="-my-1 flex items-center gap-1 py-1 text-note font-medium text-ink-soft transition-colors hover:text-ink">
                    Nəticələr <ArrowRight size={12} />
                  </Link>
                )}
              </FadeUp>

              {purchasedExams.length === 0 ? (
                <FadeUp delay={0.15} className="rounded-panel border border-rule bg-surface px-8 py-12 text-center">
                  <h3 className="m-0 mb-2.5 text-xl font-light tracking-tight text-ink">Hələ sınaq yoxdur</h3>
                  <p className="m-0 mx-auto mb-7 max-w-xs text-sm text-ink-soft">
                    Mövcud sınaq paketlərini kəşf edin və hazırlığa başlayın.
                  </p>
                  <Button href="/exams">
                    Kataloqa bax <ButtonArrow />
                  </Button>
                </FadeUp>
              ) : (
                <MyExamsList exams={myExamRows} />
              )}
            </section>

            {/* Explore */}
            {exploreExams.length > 0 && (
              <section>
                <FadeUp delay={0.05} className="mb-4 flex items-center justify-between gap-4 border-b border-ink pb-3">
                  <h2 className="font-mono text-label font-normal tracking-[0.16em] uppercase m-0 text-ink-mute">Kəşf et</h2>
                  <Link href="/exams" className="-my-1 flex items-center gap-1 py-1 text-note font-medium text-ink-soft transition-colors hover:text-ink">
                    Hamısı <ArrowRight size={12} />
                  </Link>
                </FadeUp>
                <StaggerContainer className="grid grid-cols-1 gap-3 sm:grid-cols-3" delay={0.08}>
                  {exploreExams.map(exam => {
                    const examMinutes = exam.durationMinutes - exam.modules.reduce((s, m) => s + m.breakAfterMinutes, 0);
                    return (
                      <StaggerItem key={exam.id}>
                        <Link href={`/exams/${exam.id}`}
                          className="panel group flex h-full flex-col p-4.5 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-ink-faint hover:shadow-md">
                          <div className="mb-3.5 flex items-start justify-between gap-3">
                            <Tag tone="accent">{exam.tag}</Tag>
                            <span className="font-mono text-body tabular-nums text-ink">{exam.price} ₼</span>
                          </div>
                          <h3 className="m-0 mb-auto text-sm leading-snug font-medium text-ink">
                            {exam.title}
                          </h3>
                          <div className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute mt-3.5 flex items-center gap-3 border-t border-rule-soft pt-3">
                            <span>{examMinutes} dəq</span>
                            <span>{exam.totalQuestions} sual</span>
                            <span className="ml-auto text-ink transition-transform duration-150 group-hover:translate-x-0.5">Bax →</span>
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

            {/* Countdown. An ink card carrying one big mono numeral — the same
                object as the home hero's score-delta card. */}
            {countdown && (
              <StaggerItem className="rounded-panel bg-ink px-6 pt-5.5 pb-6">
                <div className="mb-5 flex items-baseline justify-between gap-3">
                  <p className="font-mono text-label font-normal tracking-[0.16em] uppercase m-0 text-ink-mute">İmtahan geri sayımı</p>
                  <Link href="/dashboard/settings" className="shrink-0 text-xs font-medium text-bg/50 transition-colors hover:text-bg">
                    Dəyişdir
                  </Link>
                </div>
                <div className="flex items-baseline gap-3.5">
                  <span className="font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-display-md text-ink">{countdown.days}</span>
                  <span className="text-sm text-bg/55">
                    {countdown.days === 0 ? 'Bugün!' : countdown.days === 1 ? 'gün qalıb' : 'gün qalır'}
                  </span>
                </div>
                <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase mt-5 m-0 border-t border-bg/16 pt-3 text-ink-mute">{countdown.dateStr}</p>
                {countdown.days <= 14 && (
                  <Link
                    href={`/exams?type=${countdown.type}`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-bg px-5 py-3 text-note font-medium text-ink transition-colors duration-150 hover:bg-surface active:translate-y-px"
                  >
                    Sınaqlara bax <span aria-hidden>→</span>
                  </Link>
                )}
              </StaggerItem>
            )}

            {/* Recent activity */}
            {recentResults.length > 0 ? (
              <StaggerItem className="rounded-panel border border-rule bg-surface">
                <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
                  <h2 className="font-mono text-label font-normal tracking-[0.16em] uppercase m-0 text-ink-mute">Son Fəaliyyət</h2>
                  <Link href="/dashboard/analytics" className="-my-1 py-1 text-note font-medium text-ink-soft transition-colors hover:text-ink">Hamısı</Link>
                </div>
                {/*
                  Each row links straight to that attempt's answer-by-answer
                  review. It was previously inert text, and the review page —
                  the thing students actually want after a test — was reachable
                  only via a small link two pages deep.
                */}
                <div>
                  {recentResults.map(r => (
                    <Link
                      key={r.id}
                      href={`/dashboard/analytics/${r.examId}/${r.attemptNumber}/review`}
                      className="flex items-center gap-3 border-b border-rule-soft px-5 py-3.5 transition-colors hover:bg-surface-2"
                    >
                      {/* Square, not a dot: the status marks on the public
                          pages are rules and squares, never bubbles. */}
                      <span className={`h-2 w-2 shrink-0 ${scoreBarColor(r.score)}`} aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-sm font-medium text-ink">{r.examTitle}</p>
                        <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-1">
                          {shortDate(r.completedAt)} · {formatDuration(r.durationSeconds)}
                        </p>
                      </div>
                      <Tag tone={scoreTone(r.score)} className="shrink-0 font-mono tabular-nums">
                        {(() => { const d = formatOverallScore(r); return d.unit !== '%' ? `${d.value} ${d.unit}` : `${d.value}%`; })()}
                      </Tag>
                    </Link>
                  ))}
                </div>
                <p className="m-0 px-5 py-3 text-note text-ink-mute">
                  Cavablarınızı görmək üçün bir cəhdə toxunun.
                </p>
              </StaggerItem>
            ) : (
              <StaggerItem className="rounded-panel border border-rule bg-surface px-5 py-8 text-center">
                <p className="m-0 mb-2 text-base font-light tracking-tight text-ink">Fəaliyyət yoxdur</p>
                <p className="m-0 mb-5 text-sm text-ink-soft">
                  İmtahan bitirdikdən sonra nəticələriniz burada görünəcək.
                </p>
                <Link href="/exams" className="inline-flex items-center gap-1 text-note font-medium text-ink-soft transition-colors hover:text-ink">
                  Sınaqlara bax <ArrowRight size={12} />
                </Link>
              </StaggerItem>
            )}

            {/*
              A "Sürətli Keçidlər" card used to sit here listing Nəticələr /
              Kataloq / Parametrlər — the exact three destinations already in the
              sidebar one column to the left. Removed rather than restyled: a
              duplicate nav costs a scan every visit and pays back nothing.
            */}

          </StaggerContainer>
        </div>
      </div>
    </>
  );
}
