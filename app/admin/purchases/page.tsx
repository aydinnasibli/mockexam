import Link from 'next/link';
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';

export const metadata = { title: 'Satışlar — Admin' };

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminPurchasesPage({ searchParams }: Props) {
  const { page: pageStr = '1' } = await searchParams;
  const page = Math.max(1, parseInt(pageStr, 10));
  const skip = (page - 1) * PAGE_SIZE;

  await dbConnect();
  const [purchases, total] = await Promise.all([
    Purchase.find().sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
    Purchase.countDocuments(),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
          Satışlar
        </h1>
        <p className="text-on-surface-variant font-medium text-sm">
          {total} ümumi satış
        </p>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Ümumi', value: total },
          { label: 'Bu Səhifə', value: purchases.length },
          { label: 'Tamamlanmış', value: purchases.filter((p) => p.status === 'COMPLETED').length },
          { label: `Səhifə ${page} / ${totalPages}`, value: PAGE_SIZE },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl border border-outline-variant/40 p-4 shadow-sm">
            <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-widest mb-1">{label}</p>
            <p className="text-2xl font-black text-primary">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
        {purchases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
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
                    <tr key={String(p._id)} className="hover:bg-surface-container-low/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant max-w-[140px] truncate">
                        {p.lsOrderId}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">
                        ...{p.userId.slice(-10)}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-primary">{p.examId}</td>
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/20">
                <p className="text-xs text-on-surface-variant font-medium">
                  Səhifə {page} / {totalPages} · Ümumi {total} satış
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/purchases?page=${page - 1}`}
                    aria-disabled={page === 1}
                    className={`p-2 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors ${
                      page === 1 ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <ChevronLeft size={16} />
                  </Link>
                  <Link
                    href={`/admin/purchases?page=${page + 1}`}
                    aria-disabled={page === totalPages}
                    className={`p-2 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors ${
                      page === totalPages ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
