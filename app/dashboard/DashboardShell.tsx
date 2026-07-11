'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import Link from 'next/link';
import { MotionConfig } from 'framer-motion';
import DashboardSidebar, { type ViewerSummary } from './DashboardSidebar';
import PageTransition from '@/components/ui/PageTransition';

interface Props {
  viewer: ViewerSummary;
  children: React.ReactNode;
}

export default function DashboardShell({ viewer, children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <MotionConfig reducedMotion="user">
      <div className="bg-surface-2 text-ink min-h-screen">
        {/* Mobile backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <DashboardSidebar viewer={viewer} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="md:ml-60 min-h-screen flex flex-col">
          {/* Mobile top bar */}
          <div className="md:hidden sticky top-0 z-20 bg-surface border-b border-rule px-4 h-14 flex items-center gap-3 shrink-0">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-2 rounded-lg hover:bg-surface-2 transition-colors text-ink"
              aria-label="Menyu"
            >
              <Menu size={20} />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-ink flex items-center justify-center shrink-0">
                <span className="text-bg text-[9px] font-black">TC</span>
              </div>
              <span className="font-display text-[15px] font-black text-ink tracking-tight">
                Test<span className="font-light">centre</span>
              </span>
            </Link>
          </div>

          <PageTransition>{children}</PageTransition>
        </div>
      </div>
    </MotionConfig>
  );
}
