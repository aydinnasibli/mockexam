import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { clerkClient } from '@clerk/nextjs/server';
import dbConnect from '@/lib/infra/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult from '@/lib/models/ExamResult';
import ExamSessionModel from '@/lib/models/ExamSession';
import ExamModel from '@/lib/models/Exam';
import { ADMIN_GRANT_PREFIX } from '@/lib/domain/exam-types';
import { GrantAccessForm, RevokeAccessButton } from './AccessManager';
import { requireAdminPage } from '@/lib/infra/admin';
import Tag, { scoreTone } from '@/components/ui/Tag';

export const metadata = { title: 'İstifadəçi Detalları — Admin' };

interface Props {
  params: Promise<{ id: string }>;
}

/** Row caps for this admin detail view — aggregate stats are computed separately. */
const MAX_ROWS  = 100;
const MAX_EXAMS = 500;

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h} saat ${m} dəq`;
  const s = totalSeconds % 60;
  return m > 0 ? `${m} dəq ${s} san` : `${s} san`;
}

/** The three semantic tints from globals, not raw Tailwind pastels. */
/** This screen grades on a lower curve than the student dashboard (70/40). */
const scoreTone70 = (score: number) => scoreTone(score, 70, 40);

/** Snapshot elapsed time per session at request time (server component renders once per request). */
function buildSessionViews(
  sessions: Array<{ _id: unknown; examId: string; startedAt: Date; totalSeconds: number }>,
) {
  const now = Date.now();
  return sessions.map((s) => {
    const elapsed = Math.floor((now - new Date(s.startedAt).getTime()) / 1000);
    return {
      id: String(s._id),
      examId: s.examId,
      startedAt: s.startedAt,
      totalSeconds: s.totalSeconds,
      elapsed,
      overtime: elapsed > s.totalSeconds,
    };
  });
}

export default async function AdminUserDetailPage({ params }: Props) {
  await requireAdminPage();
  const { id: userId } = await params;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId).catch(() => null);
  if (!user) notFound();

  await dbConnect();
  // Bounded + projected: an ExamResult carries the full answers array (including
  // essay text), so loading every attempt unprojected would pull megabytes per
  // page view. The page only needs the summary fields and the aggregate totals.
  const [purchases, results, sessions, allExams, resultTotals] = await Promise.all([
    Purchase.find({ userId }).sort({ createdAt: -1 }).limit(MAX_ROWS).lean(),
    ExamResult.find({ userId })
      .select('examId examTitle examTag examType attemptNumber completedAt durationSeconds totalQuestions score overallBand totalScaled moduleScores')
      .sort({ completedAt: -1 })
      .limit(MAX_ROWS)
      .lean(),
    ExamSessionModel.find({ userId }).limit(MAX_ROWS).lean(),
    ExamModel.find().select('examId title price isActive').sort({ title: 1 }).limit(MAX_EXAMS).lean(),
    // Averages must cover every attempt, not just the page's worth.
    ExamResult.aggregate<{ count: number; avgScore: number; totalSeconds: number }>([
      { $match: { userId } },
      { $group: { _id: null, count: { $sum: 1 }, avgScore: { $avg: '$score' }, totalSeconds: { $sum: '$durationSeconds' } } },
    ]),
  ]);

  const totals = resultTotals[0] ?? { count: 0, avgScore: 0, totalSeconds: 0 };

  const sessionViews = buildSessionViews(sessions);

  const examTitles = new Map(allExams.map((e) => [e.examId, e.title]));
  const ownedExamIds = new Set(
    purchases.filter((p) => p.status === 'COMPLETED').map((p) => p.examId),
  );
  const grantableExams = allExams
    .filter((e) => !ownedExamIds.has(e.examId))
    .map((e) => ({ examId: e.examId, title: e.title, price: e.price, isActive: e.isActive }));

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Ad yoxdur';
  const email = user.emailAddresses[0]?.emailAddress ?? '—';
  const initial = (user.firstName?.[0] ?? email[0] ?? '?').toUpperCase();
  const isAdmin = (user.publicMetadata as { role?: string })?.role === 'admin';

  const avgScore = totals.count > 0 ? Math.round(totals.avgScore) : null;
  const totalTimeSeconds = totals.totalSeconds;

  const stats = [
    { label: 'İmtahan girişi', value: String(ownedExamIds.size) },
    { label: 'Cəhdlər',        value: String(totals.count) },
    { label: 'Orta bal',       value: avgScore !== null ? `${avgScore}%` : '—' },
    { label: 'Ümumi vaxt',     value: totalTimeSeconds > 0 ? formatDuration(totalTimeSeconds) : '—' },
  ];

  return (
    <div>
      <Link
        href="/admin/users"
        className="mb-7 inline-flex items-center gap-1.5 text-note font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft size={15} /> İstifadəçilərə qayıt
      </Link>

      {/* ── Profile header ── */}
      <header className="mb-6 flex flex-col gap-5 border-b border-ink pb-6 sm:flex-row sm:items-end">
        {user.imageUrl ? (
          <Image
            src={user.imageUrl}
            alt=""
            width={60}
            height={60}
            className="h-15 w-15 shrink-0 rounded-full object-cover ring-1 ring-rule"
          />
        ) : (
          <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-full bg-ink">
            <span className="text-xl font-medium text-bg">{initial}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 text-heading leading-tight font-light tracking-[-0.03em] text-ink">
              {fullName}
            </h1>
            {isAdmin && (
              <span className="inline-flex items-center rounded-full bg-ink px-2.5 py-1 font-mono text-caption tracking-[0.16em] text-bg uppercase">
                Admin
              </span>
            )}
          </div>
          <p className="m-0 mt-1.5 text-sm text-ink-soft">{email}</p>
          <p className="m-0 mt-1 font-mono text-xs text-ink-mute">{user.id}</p>
        </div>
        <div className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute shrink-0 space-y-1 sm:text-right">
          <p className="m-0">Qeydiyyat: {new Date(user.createdAt).toLocaleString('az-AZ')}</p>
          <p className="m-0">
            Son giriş: {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString('az-AZ') : '—'}
          </p>
        </div>
      </header>

      {/* ── Stats ── */}
      <div className="rounded-panel border border-rule bg-surface mb-6 grid grid-cols-1 gap-px overflow-hidden bg-rule sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="bg-surface px-5 py-5">
            <div className="font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-ink text-title-lg">{value}</div>
            <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Active exam sessions ── */}
      {sessions.length > 0 && (
        <div className="rounded-panel border border-rule bg-surface mb-6">
          <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
            <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink">Aktiv sessiyalar</h2>
          </div>
          <div className="px-5">
            {sessionViews.map((s, i) => (
              <div
                key={s.id}
                className={`flex flex-wrap items-center justify-between gap-3 py-3.5 ${i > 0 ? 'border-t border-rule-soft' : ''}`}
              >
                <div className="min-w-0">
                  <p className="m-0 text-sm font-medium text-ink">
                    {examTitles.get(s.examId) ?? s.examId}
                  </p>
                  <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-1">
                    Başlanıb: {new Date(s.startedAt).toLocaleString('az-AZ')}
                  </p>
                </div>
                <span className={`shrink-0 font-mono text-note tabular-nums ${s.overtime ? 'text-error' : 'text-ok'}`}>
                  {formatDuration(Math.min(s.elapsed, s.totalSeconds))} / {formatDuration(s.totalSeconds)}
                  {s.overtime && ' (vaxt bitib)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grant access ── */}
      <div className="rounded-panel border border-rule bg-surface mb-6">
        <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
          <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink">Ödənişsiz giriş ver</h2>
        </div>
        <div className="p-5">
          <p className="m-0 mb-4 text-sm text-ink-soft">
            Seçilmiş imtahana ödəniş olmadan tam giriş verilir. Qrant istənilən vaxt geri alına bilər.
          </p>
          <GrantAccessForm userId={user.id} exams={grantableExams} />
        </div>
      </div>

      {/* ── Purchases / access ── */}
      <div className="rounded-panel border border-rule bg-surface mb-6 overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
          <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink">İmtahan girişləri</h2>
        </div>
        {purchases.length === 0 ? (
          <p className="m-0 px-5 py-8 text-sm text-ink-soft">
            Hələ heç bir alış və ya qrant yoxdur.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>İmtahan</th>
                  <th>Mənbə</th>
                  <th>Status</th>
                  <th>Cəhd sayı</th>
                  <th>Tarix</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  // Legacy purchase docs may lack transactionId
                  const isGrant = (p.transactionId ?? '').startsWith(ADMIN_GRANT_PREFIX);
                  return (
                    <tr key={String(p._id)}>
                      <td className="font-medium text-ink">
                        {examTitles.get(p.examId) ?? p.examId}
                      </td>
                      <td className="text-ink-soft">
                        {isGrant ? (
                          <Tag tone="accent" className="whitespace-nowrap">Admin qrantı</Tag>
                        ) : (
                          <span className="num text-ink">{(p.amountCents / 100).toFixed(2)} {p.currency}</span>
                        )}
                      </td>
                      <td className="text-ink-soft">
                        {p.status === 'COMPLETED' ? (
                          <span className="flex items-center gap-2 text-note whitespace-nowrap text-ok">
                            <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden /> Aktiv
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-note whitespace-nowrap text-error">
                            <span className="h-1.5 w-1.5 rounded-full bg-error" aria-hidden /> {p.status}
                          </span>
                        )}
                      </td>
                      <td className="num text-ink">{p.attemptCount}</td>
                      <td className="num text-xs whitespace-nowrap text-ink-mute">
                        {new Date(p.createdAt).toLocaleString('az-AZ')}
                      </td>
                      <td className="text-right text-ink-soft">
                        {isGrant && p.status === 'COMPLETED' && (
                          <RevokeAccessButton userId={user.id} examId={p.examId} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Exam history ── */}
      <div className="rounded-panel border border-rule bg-surface overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
          <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink">İmtahan tarixçəsi</h2>
        </div>
        {results.length === 0 ? (
          <p className="m-0 px-5 py-8 text-sm text-ink-soft">
            Hələ tamamlanmış imtahan yoxdur.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="app-table">
              <thead>
                <tr>
                  <th>İmtahan</th>
                  <th>Cəhd</th>
                  <th>Bal</th>
                  <th>Modullar</th>
                  <th>Müddət</th>
                  <th>Tamamlanma</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={String(r._id)}>
                    <td className="text-ink-soft">
                      <p className="m-0 font-medium text-ink">{r.examTitle}</p>
                      <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-1">{r.examTag}</p>
                    </td>
                    <td className="num text-ink">{r.attemptNumber}</td>
                    <td className="text-ink-soft">
                      <Tag tone={scoreTone70(r.score)} className="font-mono tabular-nums">
                        {r.score}%
                      </Tag>
                    </td>
                    <td className="text-ink-soft">
                      <div className="flex flex-wrap gap-1.5">
                        {(r.moduleScores ?? []).map((m) => (
                          <Tag className="whitespace-nowrap" key={m.moduleIndex}>
                            {m.moduleName}: {m.scorePercent}%
                          </Tag>
                        ))}
                      </div>
                    </td>
                    <td className="num text-xs whitespace-nowrap text-ink-mute">
                      {formatDuration(r.durationSeconds)}
                    </td>
                    <td className="num text-xs whitespace-nowrap text-ink-mute">
                      {new Date(r.completedAt).toLocaleString('az-AZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
