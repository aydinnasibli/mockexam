import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { clerkClient } from '@clerk/nextjs/server';

import { count, desc, eq, sum } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { exams as examsTable, purchases as purchasesTable } from '@/lib/db/schema';
import SeedButton from './SeedButton';
import ResyncTotalsButton from './ResyncTotalsButton';
import AdminPageHeader from './PageHeader';
import { requireAdminPage } from '@/lib/infra/admin';
import Button, { ButtonArrow } from '@/components/ui/Button';

export const metadata = { title: 'Admin Paneli' };

async function getStats() {
  const [
    completedPurchases,
    totalPurchases,
    activeExams,
    totalExams,
    revenueAgg,
    recentPurchases,
  ] = await Promise.all([
    db.select({ n: count() }).from(purchasesTable).where(eq(purchasesTable.status, 'COMPLETED')).then(r => r[0].n),
    db.select({ n: count() }).from(purchasesTable).then(r => r[0].n),
    db.select({ n: count() }).from(examsTable).where(eq(examsTable.isActive, true)).then(r => r[0].n),
    db.select({ n: count() }).from(examsTable).then(r => r[0].n),
    db.select({ total: sum(purchasesTable.amountCents) })
      .from(purchasesTable)
      .where(eq(purchasesTable.status, 'COMPLETED')),
    db.select()
      .from(purchasesTable)
      .where(eq(purchasesTable.status, 'COMPLETED'))
      .orderBy(desc(purchasesTable.createdAt))
      .limit(5),
  ]);

  const clerk = await clerkClient();
  const totalUsers = await clerk.users.getCount();

  return {
    totalUsers,
    completedPurchases,
    totalPurchases,
    activeExams,
    totalExams,
    totalRevenueCents: Number(revenueAgg[0]?.total ?? 0),
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
          <Button size="sm" href="/admin/exams/new">
            Yeni imtahan <ButtonArrow />
          </Button>
        }
      />

      {/* Figures. One ruled band, the way the home hero states its numbers —
          not four drop-shadowed tiles with an icon apiece.
          The 1px gap over a rule-coloured ground draws the dividers, so they
          land correctly at 1, 2 and 4 columns without any nth-child rules. */}
      <div className="rounded-panel border border-rule bg-surface mb-6 grid grid-cols-1 gap-px overflow-hidden bg-rule sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Ümumi istifadəçi',  value: String(stats.totalUsers) },
          { label: 'Tamamlanmış satış', value: String(stats.completedPurchases), sub: `Cəmi ${stats.totalPurchases}` },
          { label: 'Aktiv imtahan',     value: String(stats.activeExams),        sub: `Ümumi ${stats.totalExams}` },
          { label: 'Ümumi gəlir',       value: `${revenue} ₼` },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-surface px-5 py-5">
            <div className="font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-ink text-3xl">{value}</div>
            <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2.5">{label}</p>
            {sub && <p className="m-0 mt-1.5 text-note text-ink-mute">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent purchases */}
        <div className="rounded-panel border border-rule bg-surface lg:col-span-2">
          <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
            <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink">Son satışlar</h2>
            <Link
              href="/admin/purchases"
              className="flex items-center gap-1 text-note font-medium text-ink-soft transition-colors hover:text-ink"
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
                    <tr key={p.id}>
                      <td className="num text-xs text-ink-mute">…{p.userId.slice(-8)}</td>
                      <td className="font-medium text-ink">{p.examId}</td>
                      <td className="num text-ink">{(p.amountCents / 100).toFixed(2)} {p.currency}</td>
                      <td className="num text-xs text-ink-mute">
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
          <div className="rounded-panel border border-rule bg-surface">
            <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
              <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink">Sürətli keçidlər</h2>
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
          <div className="rounded-panel border border-rule bg-surface">
            <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
              <h2 className="m-0 text-body font-medium tracking-[-0.01em] text-ink">Verilənlər bazası</h2>
            </div>
            <div className="p-5">
              <p className="m-0 mb-4 text-sm text-ink-soft">
                Standart imtahan kataloqgunu DB-yə idxal et. Mövcud imtahanlar keçilər.
              </p>
              <SeedButton />
              <ResyncTotalsButton />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
