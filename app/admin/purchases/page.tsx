import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { count, desc } from 'drizzle-orm';
import { db } from '@/lib/infra/db';
import { purchases as purchasesTable } from '@/lib/db/schema';
import AdminPageHeader from '../PageHeader';
import { requireAdminPage } from '@/lib/infra/admin';

export const metadata = { title: 'Satışlar — Admin' };

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminPurchasesPage({ searchParams }: Props) {
  await requireAdminPage();
  const { page: pageStr = '1' } = await searchParams;
  // `Math.max(1, NaN)` is NaN, which reached the query as an invalid OFFSET
  // and crashed the page on `?page=abc`.
  const page = Math.max(1, Number.parseInt(pageStr, 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [purchases, [{ n: total }]] = await Promise.all([
    db.select()
      .from(purchasesTable)
      .orderBy(desc(purchasesTable.createdAt))
      .offset(skip)
      .limit(PAGE_SIZE),
    db.select({ n: count() }).from(purchasesTable),
  ]);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <AdminPageHeader eyebrow="Satışlar" title="Satışlar." meta={`${total} ümumi satış`} />

      {/* Figures */}
      <div className="rounded-panel border border-rule bg-surface mb-6 grid grid-cols-1 gap-px overflow-hidden bg-rule sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Ümumi', value: total },
          { label: 'Bu səhifə', value: purchases.length },
          { label: 'Tamamlanmış', value: purchases.filter((p) => p.status === 'COMPLETED').length },
          // Was `PAGE_SIZE` — a constant 20 rendered as a statistic under a
          // "Səhifə 1 / 1" label, which read as a real figure and was not one.
          { label: 'Səhifə', value: `${page} / ${totalPages}` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface px-5 py-5">
            <div className="font-mono font-light tracking-[-0.03em] tabular-nums lining-nums leading-none text-ink text-3xl">{value}</div>
            <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-panel border border-rule bg-surface overflow-hidden">
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
                    <tr key={p.id}>
                      <td className="num max-w-35 truncate text-xs text-ink-mute">
                        {p.transactionId}
                      </td>
                      <td className="num text-xs text-ink-mute">…{p.userId.slice(-10)}</td>
                      <td className="font-medium text-ink">{p.examId}</td>
                      <td className="num text-ink">{(p.amountCents / 100).toFixed(2)} {p.currency}</td>
                      <td className="text-ink-soft">
                        {/* A dot and a word, the way the home page marks an
                            open programme — not a filled icon in a fourth red. */}
                        {/*
                            Four statuses, not two. This branched only on
                            COMPLETED, so a PENDING payment mid-reconcile and a
                            processed REFUND both rendered in red as "Uğursuz"
                            on the revenue screen.
                        */}
                        {(() => {
                          const label = {
                            COMPLETED: 'Tamamlandı',
                            PENDING:   'Gözləyir',
                            REFUNDED:  'Geri qaytarıldı',
                            FAILED:    'Uğursuz',
                          }[p.status] ?? p.status;
                          const tone = {
                            COMPLETED: 'text-ok',
                            PENDING:   'text-warn',
                            REFUNDED:  'text-ink-soft',
                            FAILED:    'text-error',
                          }[p.status] ?? 'text-ink-soft';
                          const dot = {
                            COMPLETED: 'bg-ok',
                            PENDING:   'bg-warn',
                            REFUNDED:  'bg-ink-faint',
                            FAILED:    'bg-error',
                          }[p.status] ?? 'bg-ink-faint';
                          return (
                            <span className={`flex items-center gap-2 text-note whitespace-nowrap ${tone}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden /> {label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="num text-xs whitespace-nowrap text-ink-mute">
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
                <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0">
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
