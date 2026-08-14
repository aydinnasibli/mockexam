import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { clerkClient } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamModel from '@/lib/models/Exam';
import SeedButton from './SeedButton';
import AdminPageHeader from './PageHeader';
import { requireAdminPage } from '@/lib/admin';

export const metadata = { title: 'Admin Paneli' };

async function getStats() {
  await dbConnect();
  const [
    completedPurchases,
    totalPurchases,
    activeExams,
    totalExams,
    revenueAgg,
    recentPurchases,
  ] = await Promise.all([
    Purchase.countDocuments({ status: 'COMPLETED' }),
    Purchase.countDocuments(),
    ExamModel.countDocuments({ isActive: true }),
    ExamModel.countDocuments(),
    Purchase.aggregate([
      { $match: { status: 'COMPLETED' } },
      { $group: { _id: null, total: { $sum: '$amountCents' } } },
    ]),
    Purchase.find({ status: 'COMPLETED' }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const clerk = await clerkClient();
  const totalUsers = await clerk.users.getCount();

  return {
    totalUsers,
    completedPurchases,
    totalPurchases,
    activeExams,
    totalExams,
    totalRevenueCents: revenueAgg[0]?.total ?? 0,
    recentPurchases,
  };
}

export default async function AdminOverviewPage() {
  await requireAdminPage();
  const stats = await getStats();
  const revenue = (stats.totalRevenueCents / 100).toFixed(2);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Admin"
        title="Ümumi baxış."
        meta="Platformanın ümumi vəziyyəti"
        action={
          <Link href="/admin/exams/new" className="btn-primary btn-sm">
            Yeni imtahan <span className="arrow" aria-hidden>→</span>
          </Link>
        }
      />

      {/* Figures. One ruled band, the way the home hero states its numbers —
          not four drop-shadowed tiles with an icon apiece.
          The 1px gap over a rule-coloured ground draws the dividers, so they
          land correctly at 1, 2 and 4 columns without any nth-child rules. */}
      <div className="panel mb-6 grid grid-cols-1 gap-px overflow-hidden bg-rule sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Ümumi istifadəçi',  value: String(stats.totalUsers) },
          { label: 'Tamamlanmış satış', value: String(stats.completedPurchases), sub: `Cəmi ${stats.totalPurchases}` },
          { label: 'Aktiv imtahan',     value: String(stats.activeExams),        sub: `Ümumi ${stats.totalExams}` },
          { label: 'Ümumi gəlir',       value: `${revenue} ₼` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-surface px-5 py-5">
            <div className="figure text-3xl">{value}</div>
            <p className="mono-label m-0 mt-2.5">{label}</p>
            {sub && <p className="m-0 mt-1.5 text-[13px] text-ink-mute">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent purchases */}
        <div className="panel lg:col-span-2">
          <div className="panel-head">
            <h2 className="panel-title">Son satışlar</h2>
            <Link
              href="/admin/purchases"
              className="flex items-center gap-1 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Hamısına bax <ArrowRight size={13} />
            </Link>
          </div>
          {stats.recentPurchases.length === 0 ? (
            <p className="m-0 px-5 py-14 text-center text-sm text-ink-soft">Hələ satış yoxdur</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>İstifadəçi</th>
                    <th>İmtahan</th>
                    <th>Məbləğ</th>
                    <th>Tarix</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPurchases.map((p) => (
                    <tr key={String(p._id)}>
                      <td className="num text-xs text-ink-mute!">…{p.userId.slice(-8)}</td>
                      <td className="font-medium text-ink!">{p.examId}</td>
                      <td className="num">{(p.amountCents / 100).toFixed(2)} {p.currency}</td>
                      <td className="num text-xs text-ink-mute!">
                        {new Date(p.createdAt).toLocaleDateString('az-AZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side rail */}
        <div className="flex flex-col gap-6">
          {/* Quick links */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Sürətli keçidlər</h2>
            </div>
            <div className="px-5">
              {[
                { href: '/admin/exams',     label: 'İmtahanları idarə et' },
                { href: '/admin/purchases', label: 'Satışlara bax' },
                { href: '/admin/users',     label: 'İstifadəçilərə bax' },
              ].map(({ href, label }, i) => (
                <Link
                  key={href}
                  href={href}
                  className={`group flex items-center justify-between gap-4 py-3.5 ${i > 0 ? 'border-t border-rule-soft' : ''}`}
                >
                  <span className="text-sm font-medium text-ink-soft transition-colors group-hover:text-ink">
                    {label}
                  </span>
                  <ArrowRight size={14} className="shrink-0 text-ink-mute transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              ))}
            </div>
          </div>

          {/* Seed */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">Verilənlər bazası</h2>
            </div>
            <div className="panel-body">
              <p className="m-0 mb-4 text-sm text-ink-soft">
                Standart imtahan kataloqgunu DB-yə idxal et. Mövcud imtahanlar keçilər.
              </p>
              <SeedButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
