import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clerkClient } from '@clerk/nextjs/server';
import AdminPageHeader from '../PageHeader';
import { requireAdminPage } from '@/lib/infra/admin';

export const metadata = { title: 'İstifadəçilər — Admin' };

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
  await requireAdminPage();
  const { page: pageStr = '1' } = await searchParams;
  const page   = Math.max(1, parseInt(pageStr, 10));
  const offset = (page - 1) * PAGE_SIZE;

  const clerk = await clerkClient();
  const [response, total] = await Promise.all([
    clerk.users.getUserList({ limit: PAGE_SIZE, offset, orderBy: '-created_at' }),
    clerk.users.getCount(),
  ]);

  const users = response.data;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Hesablar"
        title="İstifadəçilər."
        meta={`${total} qeydiyyatlı istifadəçi`}
      />

      <div className="rounded-panel border border-rule bg-surface overflow-hidden">
        {users.length === 0 ? (
          <p className="m-0 px-6 py-20 text-center text-base font-light tracking-tight text-ink">
            İstifadəçi yoxdur
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>İstifadəçi</th>
                    <th>E-poçt</th>
                    <th>Clerk ID</th>
                    <th>Qeydiyyat</th>
                    <th>Son giriş</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Ad yoxdur';
                    const initial  = (u.firstName?.[0] ?? u.emailAddresses[0]?.emailAddress?.[0] ?? '?').toUpperCase();
                    return (
                      <tr key={u.id}>
                        <td className="text-ink-soft">
                          <Link href={`/admin/users/${u.id}`} className="group flex items-center gap-3">
                            {u.imageUrl ? (
                              <Image
                                src={u.imageUrl}
                                alt=""
                                width={30}
                                height={30}
                                className="h-7.5 w-7.5 shrink-0 rounded-full object-cover ring-1 ring-rule"
                              />
                            ) : (
                              <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-ink">
                                <span className="text-label font-medium text-bg">{initial}</span>
                              </div>
                            )}
                            <span className="font-medium text-ink group-hover:underline">{fullName}</span>
                          </Link>
                        </td>
                        <td className="text-ink-soft">{u.emailAddresses[0]?.emailAddress ?? '—'}</td>
                        <td className="num text-xs text-ink-mute">…{u.id.slice(-10)}</td>
                        <td className="num text-xs whitespace-nowrap text-ink-mute">
                          {new Date(u.createdAt).toLocaleDateString('az-AZ')}
                        </td>
                        <td className="num text-xs whitespace-nowrap text-ink-mute">
                          {u.lastSignInAt
                            ? new Date(u.lastSignInAt).toLocaleDateString('az-AZ')
                            : '—'}
                        </td>
                        <td className="text-right text-ink-soft">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="inline-flex rounded-btn border border-rule p-1.5 text-ink-soft transition-colors hover:border-ink-faint hover:text-ink"
                            aria-label={`${fullName} detalları`}
                          >
                            <ChevronRight size={14} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-5 py-4">
                <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0">
                  Səhifə {page} / {totalPages} · Ümumi {total} istifadəçi
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/users?page=${page - 1}`}
                    aria-disabled={page === 1}
                    aria-label="Əvvəlki səhifə"
                    className={`rounded-btn border border-rule p-2 text-ink-soft transition-colors hover:border-ink-faint hover:text-ink ${
                      page === 1 ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <ChevronLeft size={15} />
                  </Link>
                  <Link
                    href={`/admin/users?page=${page + 1}`}
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
