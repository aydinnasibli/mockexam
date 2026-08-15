'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import SkipLink from '@/components/ui/SkipLink';

/**
 * Chrome for the admin panel.
 *
 * The sidebar was `fixed w-60` with `ml-60` on the content and no responsive
 * variant at all, so below 900px the rail sat on top of the page and every
 * admin screen overflowed — /admin/users rendered 1141px wide in a 375px
 * viewport. The dashboard already had a drawer for exactly this; this is the
 * same pattern, so the two signed-in shells behave identically.
 *
 * The open state lives here rather than in the layout because `app/admin/
 * layout.tsx` is a Server Component doing the admin authorization check, and
 * that check must not be moved into the client.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
      <SkipLink />

      {/* Mobile backdrop — tapping anywhere off the rail closes it. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/35 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col md:ml-60">
        {/* Mobile top bar, matching the kabinet's: 56px, one hairline rule. */}
        <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-bg px-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="-ml-2 p-2 text-ink-soft transition-colors hover:text-ink"
            aria-label={sidebarOpen ? 'Menyu bağla' : 'Menyu aç'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link href="/admin" className="-my-1 flex items-center gap-2.25 py-1">
            <Image src="/logo.svg" alt="Testcentre" width={20} height={18} className="shrink-0" />
            <span className="text-lg leading-none font-medium tracking-tight text-ink">
              Test<span className="font-light text-ink-soft">centre</span>
            </span>
          </Link>
        </div>

        {/* px-5 on mobile, px-8 from md: the old flat px-8 left only 311px of
            content on a 375px screen. */}
        <main id="content" tabIndex={-1} className="flex-1 px-5 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
