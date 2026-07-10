import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  ArrowLeft, Gift, CreditCard, CheckCircle, XCircle, Clock,
  BookOpen, Trophy, Timer, PlayCircle, Shield,
} from 'lucide-react';
import { clerkClient } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamResult from '@/lib/models/ExamResult';
import ExamSessionModel from '@/lib/models/ExamSession';
import ExamModel from '@/lib/models/Exam';
import { ADMIN_GRANT_PREFIX } from '@/lib/exam-types';
import { GrantAccessForm, RevokeAccessButton } from './AccessManager';

export const metadata = { title: 'İstifadəçi Detalları — Admin' };

interface Props {
  params: Promise<{ id: string }>;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h} saat ${m} dəq`;
  const s = totalSeconds % 60;
  return m > 0 ? `${m} dəq ${s} san` : `${s} san`;
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-700 bg-emerald-50';
  if (score >= 40) return 'text-amber-700 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

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
  const { id: userId } = await params;

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(userId).catch(() => null);
  if (!user) notFound();

  await dbConnect();
  const [purchases, results, sessions, allExams] = await Promise.all([
    Purchase.find({ userId }).sort({ createdAt: -1 }).lean(),
    ExamResult.find({ userId }).sort({ completedAt: -1 }).lean(),
    ExamSessionModel.find({ userId }).lean(),
    ExamModel.find().select('examId title price isActive').sort({ title: 1 }).lean(),
  ]);

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

  const avgScore = results.length > 0
    ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
    : null;
  const totalTimeSeconds = results.reduce((s, r) => s + r.durationSeconds, 0);

  const stats = [
    { label: 'İmtahan Girişi', value: String(ownedExamIds.size), icon: BookOpen },
    { label: 'Cəhdlər', value: String(results.length), icon: PlayCircle },
    { label: 'Orta Bal', value: avgScore !== null ? `${avgScore}%` : '—', icon: Trophy },
    { label: 'Ümumi Vaxt', value: totalTimeSeconds > 0 ? formatDuration(totalTimeSeconds) : '—', icon: Timer },
  ];

  return (
    <div>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm font-semibold text-on-surface-variant hover:text-primary mb-6"
      >
        <ArrowLeft size={16} /> İstifadəçilərə qayıt
      </Link>

      {/* ── Profile header ── */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5">
          {user.imageUrl ? (
            <Image
              src={user.imageUrl}
              alt={fullName}
              width={64}
              height={64}
              className="rounded-full object-cover ring-2 ring-outline-variant/30 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full editorial-gradient flex items-center justify-center shrink-0">
              <span className="text-white text-xl font-black">{initial}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold text-primary tracking-tight font-headline">
                {fullName}
              </h1>
              {isAdmin && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-secondary-fixed/60 rounded-md text-[10px] font-black text-secondary uppercase tracking-widest">
                  <Shield size={10} /> Admin
                </span>
              )}
            </div>
            <p className="text-sm text-on-surface-variant font-medium mt-0.5">{email}</p>
            <p className="font-mono text-xs text-on-surface-variant mt-1">{user.id}</p>
          </div>
          <div className="text-xs text-on-surface-variant space-y-1 sm:text-right shrink-0">
            <p>
              <span className="font-bold">Qeydiyyat:</span>{' '}
              {new Date(user.createdAt).toLocaleString('az-AZ')}
            </p>
            <p>
              <span className="font-bold">Son giriş:</span>{' '}
              {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString('az-AZ') : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white rounded-2xl border border-outline-variant/40 p-4 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon size={12} className="text-on-surface-variant" />
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{label}</p>
            </div>
            <p className="text-2xl font-black text-primary">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Active exam sessions ── */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-6 mb-6">
          <h2 className="text-lg font-extrabold text-primary font-headline mb-4 flex items-center gap-2">
            <PlayCircle size={18} className="text-secondary" /> Aktiv Sessiyalar
          </h2>
          <div className="space-y-2">
            {sessionViews.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low border border-outline-variant/20"
              >
                <div>
                  <p className="text-sm font-bold text-primary">
                    {examTitles.get(s.examId) ?? s.examId}
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    Başlanıb: {new Date(s.startedAt).toLocaleString('az-AZ')}
                  </p>
                </div>
                <span className={`flex items-center gap-1 text-xs font-bold ${s.overtime ? 'text-red-600' : 'text-emerald-700'}`}>
                  <Clock size={13} />
                  {formatDuration(Math.min(s.elapsed, s.totalSeconds))} / {formatDuration(s.totalSeconds)}
                  {s.overtime && ' (vaxt bitib)'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grant access ── */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-extrabold text-primary font-headline mb-1 flex items-center gap-2">
          <Gift size={18} className="text-secondary" /> Ödənişsiz Giriş Ver
        </h2>
        <p className="text-xs text-on-surface-variant font-medium mb-4">
          Seçilmiş imtahana ödəniş olmadan tam giriş verilir. Qrant istənilən vaxt geri alına bilər.
        </p>
        <GrantAccessForm userId={user.id} exams={grantableExams} />
      </div>

      {/* ── Purchases / access ── */}
      <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm mb-6">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-extrabold text-primary font-headline flex items-center gap-2">
            <CreditCard size={18} className="text-secondary" /> İmtahan Girişləri
          </h2>
        </div>
        {purchases.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-on-surface-variant font-medium">
            Hələ heç bir alış və ya qrant yoxdur.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-black">İmtahan</th>
                  <th className="px-5 py-3 font-black">Mənbə</th>
                  <th className="px-5 py-3 font-black">Status</th>
                  <th className="px-5 py-3 font-black">Cəhd sayı</th>
                  <th className="px-5 py-3 font-black">Tarix</th>
                  <th className="px-5 py-3 font-black"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {purchases.map((p) => {
                  // Legacy purchase docs may lack transactionId
                  const isGrant = (p.transactionId ?? '').startsWith(ADMIN_GRANT_PREFIX);
                  return (
                    <tr key={String(p._id)} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="px-5 py-3 text-sm font-semibold text-primary">
                        {examTitles.get(p.examId) ?? p.examId}
                      </td>
                      <td className="px-5 py-3">
                        {isGrant ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary-fixed/60 rounded-md text-[10px] font-black text-secondary uppercase tracking-widest">
                            <Gift size={10} /> Admin Qrantı
                          </span>
                        ) : (
                          <span className="text-sm font-bold text-primary">
                            {(p.amountCents / 100).toFixed(2)} {p.currency}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {p.status === 'COMPLETED' ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle size={13} /> Aktiv
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                            <XCircle size={13} /> {p.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-sm text-on-surface-variant">{p.attemptCount}</td>
                      <td className="px-5 py-3 text-xs text-on-surface-variant">
                        {new Date(p.createdAt).toLocaleString('az-AZ')}
                      </td>
                      <td className="px-5 py-3 text-right">
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
      <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-extrabold text-primary font-headline flex items-center gap-2">
            <Trophy size={18} className="text-secondary" /> İmtahan Tarixçəsi
          </h2>
        </div>
        {results.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-on-surface-variant font-medium">
            Hələ tamamlanmış imtahan yoxdur.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest border-b border-outline-variant/20">
                  <th className="px-5 py-3 font-black">İmtahan</th>
                  <th className="px-5 py-3 font-black">Cəhd</th>
                  <th className="px-5 py-3 font-black">Bal</th>
                  <th className="px-5 py-3 font-black">Modullar</th>
                  <th className="px-5 py-3 font-black">Müddət</th>
                  <th className="px-5 py-3 font-black">Tamamlanma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {results.map((r) => (
                  <tr key={String(r._id)} className="hover:bg-surface-container-low/60 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-sm font-semibold text-primary">{r.examTitle}</p>
                      <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">{r.examTag}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-on-surface-variant">#{r.attemptNumber}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-1 rounded-lg text-sm font-black ${scoreColor(r.score)}`}>
                        {r.score}%
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(r.moduleScores ?? []).map((m) => (
                          <span
                            key={m.moduleIndex}
                            className="px-2 py-0.5 rounded-md bg-surface-container-low border border-outline-variant/20 text-[11px] font-bold text-on-surface-variant"
                          >
                            {m.moduleName}: {m.scorePercent}%
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                      {formatDuration(r.durationSeconds)}
                    </td>
                    <td className="px-5 py-3 text-xs text-on-surface-variant whitespace-nowrap">
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
