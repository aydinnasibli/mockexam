'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, ChevronLeft, ChevronRight, RefreshCw, UserCircle } from 'lucide-react';

interface ClerkUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  imageUrl: string;
  createdAt: number;
  lastSignInAt: number | null;
}

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ClerkUser[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback((off: number) => {
    setLoading(true);
    fetch(`/api/admin/users?limit=${PAGE_SIZE}&offset=${off}`)
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(offset); }, [offset, load]);

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const prev = () => { if (offset >= PAGE_SIZE) setOffset((o) => o - PAGE_SIZE); };
  const next = () => { if (offset + PAGE_SIZE < total) setOffset((o) => o + PAGE_SIZE); };

  return (
    <div>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">
            İstifadəçilər
          </h1>
          <p className="text-on-surface-variant font-medium text-sm">
            {total} qeydiyyatlı istifadəçi
          </p>
        </div>
        <button
          onClick={() => load(offset)}
          className="p-2.5 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors"
          title="Yenilə"
        >
          <RefreshCw size={18} />
        </button>
      </header>

      <div className="bg-white rounded-2xl border border-outline-variant/40 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
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
                    const initial = (u.firstName?.[0] ?? u.email?.[0] ?? '?').toUpperCase();
                    return (
                      <tr
                        key={u.id}
                        className="hover:bg-surface-container-low/60 transition-colors"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {u.imageUrl ? (
                              <img
                                src={u.imageUrl}
                                alt={fullName}
                                className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-outline-variant/30"
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
                          {u.email ?? '—'}
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
                  Səhifə {currentPage} / {totalPages} · Ümumi {total} istifadəçi
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={prev}
                    disabled={offset === 0}
                    className="p-2 rounded-lg border border-outline-variant/40 hover:bg-surface-container-low transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={next}
                    disabled={offset + PAGE_SIZE >= total}
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
