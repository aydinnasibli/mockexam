import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import dbConnect from '@/lib/mongodb';
import Purchase from '@/lib/models/Purchase';
import AdminPageHeader from '../PageHeader';
import { requireAdminPage } from '@/lib/admin';

export const metadata = { title: 'Satışlar — Admin' };

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminPurchasesPage({ searchParams }: Props) {
  await requireAdminPage();
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
      <AdminPageHeader eyebrow="Satışlar" title="Satışlar." meta={`${total} ümumi satış`} />

      {/* Figures */}
      <div className="panel mb-6 grid grid-cols-1 gap-px overflow-hidden bg-rule sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Ümumi', value: total },
          { label: 'Bu səhifə', value: purchases.length },
          { label: 'Tamamlanmış', value: purchases.filter((p) => p.status === 'COMPLETED').length },
          { label: `Səhifə ${page} / ${totalPages}`, value: PAGE_SIZE },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface px-5 py-5">
            <div className="figure text-3xl">{value}</div>
            <p className="mono-label m-0 mt-2.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        {purchases.length === 0 ? (
          <p className="m-0 px-6 py-20 text-center text-base font-light tracking-tight text-ink">
            Hələ satış yoxdur
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Sifariş ID</th>
                    <th>İstifadəçi</th>
                    <th>İmtahan</th>
                    <th>Məbləğ</th>
                    <th>Status</th>
                    <th>Tarix</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={String(p._id)}>
                      <td className="num max-w-35 truncate text-xs text-ink-mute!">
                        {p.transactionId}
                      </td>
                      <td className="num text-xs text-ink-mute!">…{p.userId.slice(-10)}</td>
                      <td className="font-medium text-ink!">{p.examId}</td>
                      <td className="num">{(p.amountCents / 100).toFixed(2)} {p.currency}</td>
                      <td>
                        {/* A dot and a word, the way the home page marks an
                            open programme — not a filled icon in a fourth red. */}
                        {p.status === 'COMPLETED' ? (
                          <span className="flex items-center gap-2 text-[13px] whitespace-nowrap text-ok">
                            <span className="h-1.5 w-1.5 rounded-full bg-ok" aria-hidden /> Tamamlandı
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-[13px] whitespace-nowrap text-error">
                            <span className="h-1.5 w-1.5 rounded-full bg-error" aria-hidden /> Uğursuz
                          </span>
                        )}
                      </td>
                      <td className="num text-xs whitespace-nowrap text-ink-mute!">
                        {new Date(p.createdAt).toLocaleString('az-AZ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-4">
                <p className="mono-label m-0">
                  Səhifə {page} / {totalPages} · Ümumi {total} satış
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/purchases?page=${page - 1}`}
                    aria-disabled={page === 1}
                    aria-label="Əvvəlki səhifə"
                    className={`rounded-btn border border-rule p-2 text-ink-soft transition-colors hover:border-ink-faint hover:text-ink ${
                      page === 1 ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <ChevronLeft size={15} />
                  </Link>
                  <Link
                    href={`/admin/purchases?page=${page + 1}`}
                    aria-disabled={page === totalPages}
                    aria-label="Növbəti səhifə"
                    className={`rounded-btn border border-rule p-2 text-ink-soft transition-colors hover:border-ink-faint hover:text-ink ${
                      page === totalPages ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <ChevronRight size={15} />
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
