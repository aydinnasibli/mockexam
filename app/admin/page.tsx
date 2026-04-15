'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, BookOpen, ShoppingBag, TrendingUp,
  ArrowRight, Clock, CheckCircle, XCircle,
  Plus, RefreshCw,
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalPurchases: number;
  completedPurchases: number;
  totalExams: number;
  activeExams: number;
  totalRevenueCents: number;
  recentPurchases: Array<{
    _id: string;
    userId: string;
    examId: string;
    amountCents: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`bg-white p-6 rounded-2xl border shadow-sm hover:-translate-y-0.5 transition-transform ${
        accent
          ? 'border-secondary/30 border-l-4 border-l-secondary'
          : 'border-outline-variant/40'
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-secondary-fixed/60 text-secondary rounded-xl">
          <Icon size={18} />
        </div>
        <span className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest leading-tight">
          {label}
        </span>
      </div>
      <div className="text-3xl font-black text-primary">{value}</div>
      {sub && <p className="text-xs text-on-surface-variant mt-1 font-medium">{sub}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const loadStats = () => {
    setLoading(true);
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadStats(); }, []);

  const handleSeed = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/admin/exams/seed', { method: 'POST' });
      const data = await res.json();
      setSeedResult(`${data.created} imtahan əlavə edildi, ${data.skipped} keçildi.`);
      loadStats();
    } catch {
      setSeedResult('Xəta baş verdi.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-on-surface-variant font-medium">Yüklənir...</p>
        </div>
      </div>
    );
  }

  const revenue = stats ? (stats.totalRevenueCents / 100).toFixed(2) : '0.00';

  return (
    <div>
      {/* Header */}
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
            Admin Paneli
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">
            Platformanın ümumi vəziyyəti
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadStats}
            className="p-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
            title="Yenilə"
          >
            <RefreshCw size={18} />
          </button>
          <Link
            href="/admin/exams/new"
            className="editorial-gradient text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md hover:opacity-90 transition-opacity text-sm"
          >
            <Plus size={16} />
            İmtahan Əlavə Et
          </Link>
        </div>
      </header>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={Users}
          label="Ümumi İstifadəçi"
          value={stats?.totalUsers ?? 0}
          accent
        />
        <StatCard
          icon={ShoppingBag}
          label="Tamamlanmış Satış"
          value={stats?.completedPurchases ?? 0}
          sub={`Cəmi: ${stats?.totalPurchases ?? 0}`}
        />
        <StatCard
          icon={BookOpen}
          label="Aktiv İmtahan"
          value={stats?.activeExams ?? 0}
          sub={`Ümumi: ${stats?.totalExams ?? 0}`}
        />
        <StatCard
          icon={TrendingUp}
          label="Ümumi Gəlir"
          value={`${revenue} ₼`}
          accent
        />
      </div>

      {/* Content grid */}
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
          <div className="overflow-x-auto">
            {!stats?.recentPurchases?.length ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <ShoppingBag className="text-outline mb-3" size={36} />
                <p className="text-sm font-semibold text-primary mb-1">Hələ satış yoxdur</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest">
                    <th className="px-5 py-4 font-black">İstifadəçi</th>
                    <th className="px-5 py-4 font-black">İmtahan</th>
                    <th className="px-5 py-4 font-black">Məbləğ</th>
                    <th className="px-5 py-4 font-black">Status</th>
                    <th className="px-5 py-4 font-black">Tarix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {stats.recentPurchases.map((p) => (
                    <tr key={p._id} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-on-surface-variant truncate max-w-[120px]">
                        {p.userId.slice(-8)}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-primary truncate max-w-[140px]">
                        {p.examId}
                      </td>
                      <td className="px-5 py-3 text-sm font-bold text-primary">
                        {(p.amountCents / 100).toFixed(2)} {p.currency}
                      </td>
                      <td className="px-5 py-3">
                        {p.status === 'COMPLETED' ? (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700">
                            <CheckCircle size={13} /> Tamamlandı
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                            <XCircle size={13} /> Uğursuz
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-xs text-on-surface-variant">
                        {new Date(p.createdAt).toLocaleDateString('az-AZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-5">
          {/* Quick links */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary font-headline mb-4">Sürətli Keçidlər</h2>
            <div className="space-y-2">
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

          {/* Seed panel */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 p-6 shadow-sm">
            <h2 className="text-lg font-bold text-primary font-headline mb-2">Verilənlər Bazası</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Standart imtahan kataloqgunu DB-yə idxal et (mövcudlar keçilər).
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full py-2.5 border-2 border-secondary text-secondary font-bold rounded-xl hover:bg-secondary hover:text-white transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {seeding ? (
                <>
                  <div className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
                  Yüklənir...
                </>
              ) : (
                <>
                  <Clock size={15} />
                  Standart imtahanları idxal et
                </>
              )}
            </button>
            {seedResult && (
              <p className="text-xs text-emerald-700 font-semibold mt-2 text-center">{seedResult}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
