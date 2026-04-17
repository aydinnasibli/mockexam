'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, SignOutButton } from '@clerk/nextjs';
import {
  LayoutDashboard, BarChart2, Settings, PlusCircle, LogOut,
} from 'lucide-react';

export default function DashboardSidebar() {
  const { user } = useUser();
  const pathname = usePathname();

  const firstName = user?.firstName ?? 'Tələbə';
  const fullName  = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Tələbə';
  const email     = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const imageUrl  = user?.imageUrl;

  const navItems = [
    { href: '/dashboard',          icon: LayoutDashboard, label: 'Panel',       active: pathname === '/dashboard' },
    { href: '/analytics',          icon: BarChart2,       label: 'Nəticələr',   active: pathname === '/analytics' || pathname.startsWith('/analytics/') },
    { href: '/dashboard/settings', icon: Settings,        label: 'Parametrlər', active: pathname === '/dashboard/settings' },
  ];

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col bg-white border-r border-outline-variant/40 z-40">

      <div className="px-5 py-5 border-b border-outline-variant/20">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl editorial-gradient flex items-center justify-center shadow-sm shrink-0">
            <span className="text-white text-[11px] font-black">TC</span>
          </div>
          <span className="text-base font-extrabold text-primary tracking-tight font-headline">Test Centre</span>
        </Link>
      </div>

      <div className="px-4 py-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#f0f2f5]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover shrink-0 ring-2 ring-primary/10" />
          ) : (
            <div className="w-8 h-8 rounded-full editorial-gradient flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white text-xs font-black">{firstName[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-primary text-xs leading-tight truncate">{fullName}</p>
            <p className="text-[10px] text-on-surface-variant truncate">{email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/40">Menyu</p>
        {navItems.map(({ href, icon: Icon, label, active: isActive }) => {
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm font-bold'
                  : 'font-semibold text-on-surface-variant hover:bg-[#f0f2f5] hover:text-primary'
              }`}
            >
              <Icon size={16} className={isActive ? '' : 'opacity-60'} /> {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-outline-variant/20 space-y-1.5">
        <Link href="/exams" className="w-full editorial-gradient text-white py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm shadow-sm">
          <PlusCircle size={15} /> Sınaq Əldə Et
        </Link>
        <SignOutButton>
          <button className="w-full text-on-surface-variant py-2 px-4 flex items-center gap-2.5 hover:text-error transition-colors text-sm font-medium rounded-xl hover:bg-[#f0f2f5]">
            <LogOut size={15} /> Çıxış
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
