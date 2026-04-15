'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';
import {
  LayoutDashboard, BookOpen, ShoppingBag, Users,
  LogOut, Shield, Database,
} from 'lucide-react';

const navLinks = [
  { href: '/admin', label: 'Ümumi Baxış', icon: LayoutDashboard, exact: true },
  { href: '/admin/exams', label: 'İmtahanlar', icon: BookOpen, exact: false },
  { href: '/admin/purchases', label: 'Satışlar', icon: ShoppingBag, exact: false },
  { href: '/admin/users', label: 'İstifadəçilər', icon: Users, exact: false },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 flex flex-col py-6 bg-surface-container-low border-r border-outline-variant/40 z-40">
      {/* Brand */}
      <div className="px-6 mb-2">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg editorial-gradient flex items-center justify-center">
            <span className="text-white text-[10px] font-black">TC</span>
          </div>
          <span className="text-base font-extrabold text-primary tracking-tight font-headline">
            Test Centre
          </span>
        </Link>
      </div>

      {/* Admin badge */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary-fixed/60 rounded-lg w-fit">
          <Shield size={12} className="text-secondary" />
          <span className="text-[10px] font-black text-secondary uppercase tracking-widest">
            Admin Panel
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3">
        {navLinks.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                active
                  ? 'bg-white text-primary shadow-sm font-bold'
                  : 'text-on-surface-variant hover:bg-white/60 hover:text-primary'
              }`}
            >
              <Icon size={18} className={active ? 'text-secondary' : 'opacity-70'} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="px-4 mt-4 space-y-2">
        <Link
          href="/dashboard"
          className="w-full py-3 px-4 flex items-center gap-3 text-on-surface-variant hover:bg-white/60 hover:text-primary transition-colors text-sm font-medium rounded-xl"
        >
          <Database size={16} />
          İstifadəçi Paneli
        </Link>
        <SignOutButton>
          <button className="w-full text-on-surface-variant py-3 px-4 flex items-center gap-3 hover:text-error transition-colors text-sm font-medium rounded-xl hover:bg-white/50">
            <LogOut size={16} />
            Çıxış
          </button>
        </SignOutButton>
      </div>
    </aside>
  );
}
