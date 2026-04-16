import Link from 'next/link';
import { ArrowRight, Users, BookOpen, ShoppingBag, TrendingUp } from 'lucide-react';
import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import ExamModel from '@/lib/models/Exam';
import SeedButton from './SeedButton';

export const metadata = { title: 'Admin Paneli — Məşqçi' };

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
  const { userId } = await auth();
  const stats = await getStats();
  const revenue = (stats.totalRevenueCents / 100).toFixed(2);

  return (
    <div>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
            Admin Paneli
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">
            Platformanın ümumi vəziyyəti
          </p>
        </div>
        <Link
          href="/admin/exams/new"
          className="editorial-gradient text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity text-sm"
        >
          + Yeni İmtahan
        </Link>
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {[
          { icon: Users, label: 'Ümumi İstifadəçi', value: stats.totalUsers, accent: true },
          {
            icon: ShoppingBag,
            label: 'Tamamlanmış Satış',
            value: stats.completedPurchases,
            sub: `Cəmi: ${stats.totalPurchases}`,
          },
          {
            icon: BookOpen,
            label: 'Aktiv İmtahan',
            value: stats.activeExams,
            sub: `Ümumi: ${stats.totalExams}`,
          },
          { icon: TrendingUp, label: 'Ümumi Gəlir', value: `${revenue} ₼`, accent: true },
        ].map(({ icon: Icon, label, value, sub, accent }) => (
          <div
            key={label}
            className={`bg-white p-6 rounded-2xl border shadow-sm ${
              accent ? 'border-secondary/30 border-l-4 border-l-secondary' : 'border-outline-variant/40'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-secondary-fixed/60 text-secondary rounded-xl">
                <Icon size={18} />
              </div>
              <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest">
                {label}
              </span>
            </div>
            <div className="text-3xl font-black text-primary">{value}</div>
            {sub && <p className="text-xs text-on-surface-variant mt-1 font-medium">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {/* Recent purchases */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary font-headline">Son Satışlar</h2>
            <Link
              href="/admin/purchases"
              className="text-secondary font-bold text-sm hover:underline underline-offset-2 flex items-center gap-1"
            >
              Hamısına bax <ArrowRight size={14} />
            </Link>
          </div>
          {stats.recentPurchases.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <ShoppingBag className="text-outline mb-3" size={36} />
              <p className="text-sm font-semibold text-primary">Hələ satış yoxdur</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest">
                    <th className="px-5 py-4 font-black">İstifadəçi</th>
                    <th className="px-5 py-4 font-black">İmtahan</th>
                    <th className="px-5 py-4 font-black">Məbləğ</th>
                    <th className="px-5 py-4 font-black">Tarix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {stats.recentPurchases.map((p) => (
                    <tr key={String(p._id)} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">
                        ...{p.userId.slice(-8)}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-primary">{p.examId}</td>
                      <td className="px-5 py-3 text-sm font-bold text-primary">
                        {(p.amountCents / 100).toFixed(2)} {p.currency}
                      </td>
                      <td className="px-5 py-3 text-xs text-on-surface-variant">
                        {new Date(p.createdAt).toLocaleDateString('az-AZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sidebar panel */}
        <div className="flex flex-col gap-5">
          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary font-headline mb-4">Sürətli Keçidlər</h2>
            <div className="space-y-1">
              {[
                { href: '/admin/exams', label: 'İmtahanları idarə et', icon: BookOpen },
                { href: '/admin/purchases', label: 'Satışlara bax', icon: ShoppingBag },
                { href: '/admin/users', label: 'İstifadəçilərə bax', icon: Users },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-container-low transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} className="text-secondary" />
                    <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                      {label}
                    </span>
                  </div>
                  <ArrowRight size={14} className="text-outline group-hover:text-secondary transition-colors" />
                </Link>
              ))}
            </div>
          </div>

          {/* Seed */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary font-headline mb-2">Verilənlər Bazası</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Standart imtahan kataloqgunu DB-yə idxal et. Mövcud imtahanlar keçilər.
            </p>
            <SeedButton />
          </div>
        </div>
      </div>
    </div>
  );
}
