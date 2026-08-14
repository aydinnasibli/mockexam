'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { MotionConfig } from 'framer-motion';
import DashboardSidebar, { type ViewerSummary } from './DashboardSidebar';
import PageTransition from '@/components/ui/PageTransition';
import SkipLink from '@/components/ui/SkipLink';

interface Props {
  viewer: ViewerSummary;
  children: React.ReactNode;
}

export default function DashboardShell({ viewer, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      {/* Bone, not the darker surface-2: the signed-in pages stand on the same
          ground as every public page, and the white panels read as paper on it. */}
      <div className="min-h-screen bg-bg text-ink">
        <SkipLink />
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-ink/35 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <DashboardSidebar viewer={viewer} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex min-h-screen flex-col md:ml-60">
          {/* Mobile top bar — the public navbar's 1px rule and real logo, at
              the shorter height a content bar wants. */}
          <div className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-rule bg-bg px-4 md:hidden">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="-ml-2 p-2 text-ink-soft transition-colors hover:text-ink"
              aria-label={sidebarOpen ? 'Menyu bağla' : 'Menyu aç'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <Link href="/" className="-my-1 flex items-center gap-2.25 py-1">
              <Image src="/logo.svg" alt="Testcentre" width={20} height={18} className="shrink-0" />
              <span className="text-lg leading-none font-medium tracking-tight text-ink">
                Test<span className="font-light text-ink-soft">centre</span>
              </span>
            </Link>
          </div>

          {/* One landmark for the whole section, as app/admin/layout.tsx does —
              pages render plain content so they can never nest a second <main>. */}
          <main id="content" tabIndex={-1} className="flex-1">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
    </MotionConfig>
  );
}
