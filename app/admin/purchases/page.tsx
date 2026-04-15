'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ShoppingBag, CheckCircle, XCircle, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';

interface Purchase {
  _id: string;
  userId: string;
  examId: string;
  lsOrderId: string;
  amountCents: number;
  currency: string;
  status: 'COMPLETED' | 'FAILED';
  createdAt: string;
}

interface Pagination {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export default function AdminPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetch(`/api/admin/purchases?page=${p}&limit=20`)
      .then((r) => r.json())
      .then((d) => {
        setPurchases(d.purchases ?? []);
        setPagination(d.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const prev = () => { if (page > 1) setPage((p) => p - 1); };
  const next = () => { if (pagination && page < pagination.pages) setPage((p) => p + 1); };

  return (
    <div>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
            Satışlar
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">
            {pagination ? `${pagination.total} ümumi satış` : 'Yüklənir...'}
          </p>
        </div>
        <button
          onClick={() => load(page)}
          className="p-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
          title="Yenilə"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      {/* Stats */}
      {pagination && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Ümumi', value: pagination.total },
            {
              label: 'Tamamlanmış',
              value: purchases.filter((p) => p.status === 'COMPLETED').length,
            },
            { label: 'Səhifə', value: `${page} / ${pagination.pages}` },
            { label: 'Hər Səhifə', value: pagination.limit },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-outline-variant/40 p-4 shadow-sm"
            >
              <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">
                {label}
              </p>
              <p className="text-2xl font-black text-primary">{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <ShoppingBag className="text-outline mb-3" size={40} />
            <p className="text-sm font-semibold text-primary">Hələ satış yoxdur</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest border-b border-outline-variant/20">
                    <th className="px-5 py-4 font-black">Sifariş ID</th>
                    <th className="px-5 py-4 font-black">İstifadəçi</th>
                    <th className="px-5 py-4 font-black">İmtahan</th>
                    <th className="px-5 py-4 font-black">Məbləğ</th>
                    <th className="px-5 py-4 font-black">Status</th>
                    <th className="px-5 py-4 font-black">Tarix</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {purchases.map((p) => (
                    <tr
                      key={p._id}
                      className="hover:bg-surface-container-low/60 transition-colors"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant truncate max-w-[140px]">
                        {p.lsOrderId}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">
                        ...{p.userId.slice(-10)}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-primary">
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
                        {new Date(p.createdAt).toLocaleString('az-AZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/20">
                <p className="text-xs text-on-surface-variant font-medium">
                  Səhifə {page} / {pagination.pages} · Ümumi {pagination.total} satış
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={prev}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={next}
                    disabled={page === pagination.pages}
                    className="p-2 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
