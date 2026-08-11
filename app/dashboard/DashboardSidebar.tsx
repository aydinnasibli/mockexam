'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import { LayoutDashboard, BarChart2, Settings, PlusCircle, LogOut } from 'lucide-react';

/** User data resolved server-side in the dashboard layout — avoids client-side pop-in. */
export interface ViewerSummary {
  firstName: string;
  fullName: string;
  email: string;
  imageUrl: string;
}

interface Props {
  viewer: ViewerSummary;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function DashboardSidebar({ viewer, isOpen = false, onClose }: Props) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard',           icon: LayoutDashboard, label: 'Panel',       active: pathname === '/dashboard' },
    { href: '/dashboard/analytics', icon: BarChart2,       label: 'Nəticələr',   active: pathname === '/dashboard/analytics' || pathname.startsWith('/dashboard/analytics/') },
    { href: '/dashboard/settings',  icon: Settings,        label: 'Parametrlər', active: pathname === '/dashboard/settings' },
  ];

  return (
    <aside
      className={`h-screen w-60 fixed left-0 top-0 flex flex-col bg-surface border-r border-rule z-40 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b border-rule">
        <Link href="/" onClick={onClose} className="flex items-center gap-2">
          <Image src="/logo.svg" alt="Testcentre" width={22} height={20} className="shrink-0" />
          <span className="text-base font-black text-ink tracking-tight font-display">
            Test<span className="font-light">centre</span>
          </span>
        </Link>
      </div>

      {/* Eyebrow */}
      <div className="px-5 pt-5 pb-1">
        <p className="eyebrow">Kabinet</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 pt-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label, active: isActive }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              isActive
                ? 'bg-surface-2 text-ink'
                : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
            )}
            <Icon size={15} className={isActive ? 'text-ink opacity-70' : 'opacity-40'} />
            {label}
          </Link>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="px-3 py-4 border-t border-rule space-y-1">
        <Link
          href="/exams"
          onClick={onClose}
          className="w-full bg-ink text-bg py-2.5 px-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-ink/90 transition-colors text-sm"
        >
          <PlusCircle size={14} /> Sınaq əldə et
        </Link>
        <SignOutButton>
          <button className="w-full text-ink-soft py-2 px-4 flex items-center gap-2.5 hover:text-error transition-colors text-sm font-medium rounded-xl hover:bg-surface-2">
            <LogOut size={14} /> Çıxış
          </button>
        </SignOutButton>
      </div>

      {/* Avatar */}
      <div className="px-4 py-4 border-t border-rule">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-2">
          {viewer.imageUrl ? (
            <Image src={viewer.imageUrl} alt="Avatar" width={30} height={30} className="rounded-full object-cover shrink-0 ring-2 ring-rule" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center shrink-0">
              <span className="text-bg text-xs font-bold">{viewer.firstName[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-ink text-sm leading-tight truncate">{viewer.fullName}</p>
            <p className="text-sm text-ink-mute truncate">{viewer.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
