import Link from 'next/link';
import Image from 'next/image';
import { Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { clerkClient } from '@clerk/nextjs/server';

export const metadata = { title: 'İstifadəçilər — Admin' };

const PAGE_SIZE = 20;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: Props) {
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
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
          İstifadəçilər
        </h1>
        <p className="text-on-surface-variant font-medium text-sm">
          {total} qeydiyyatlı istifadəçi
        </p>
      </header>

      <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
        {users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <Users className="text-outline mb-3" size={40} />
            <p className="text-sm font-semibold text-primary">İstifadəçi yoxdur</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-[10px] uppercase tracking-widest border-b border-outline-variant/20">
                    <th className="px-5 py-4 font-black">İstifadəçi</th>
                    <th className="px-5 py-4 font-black">E-poçt</th>
                    <th className="px-5 py-4 font-black">Clerk ID</th>
                    <th className="px-5 py-4 font-black">Qeydiyyat</th>
                    <th className="px-5 py-4 font-black">Son Giriş</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {users.map((u) => {
                    const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || 'Ad yoxdur';
                    const initial  = (u.firstName?.[0] ?? u.emailAddresses[0]?.emailAddress?.[0] ?? '?').toUpperCase();
                    return (
                      <tr key={u.id} className="hover:bg-surface-container-low/60 transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {u.imageUrl ? (
                              <Image
                                src={u.imageUrl}
                                alt={fullName}
                                width={32}
                                height={32}
                                className="rounded-full object-cover flex-shrink-0 ring-1 ring-outline-variant/30"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full editorial-gradient flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-black">{initial}</span>
                              </div>
                            )}
                            <span className="text-sm font-semibold text-primary">{fullName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-on-surface-variant">
                          {u.emailAddresses[0]?.emailAddress ?? '—'}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-on-surface-variant">
                          ...{u.id.slice(-10)}
                        </td>
                        <td className="px-5 py-3 text-xs text-on-surface-variant">
                          {new Date(u.createdAt).toLocaleDateString('az-AZ')}
                        </td>
                        <td className="px-5 py-3 text-xs text-on-surface-variant">
                          {u.lastSignInAt
                            ? new Date(u.lastSignInAt).toLocaleDateString('az-AZ')
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-outline-variant/20">
                <p className="text-xs text-on-surface-variant font-medium">
                  Səhifə {page} / {totalPages} · Ümumi {total} istifadəçi
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/users?page=${page - 1}`}
                    aria-disabled={page === 1}
                    className={`p-2 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors ${
                      page === 1 ? 'pointer-events-none opacity-40' : ''
                    }`}
                  >
                    <ChevronLeft size={16} />
                  </Link>
                  <Link
                    href={`/admin/users?page=${page + 1}`}
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
