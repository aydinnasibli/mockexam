'use client';

import { UserProfile } from '@clerk/nextjs';
import Link from 'next/link';
import { SignOutButton } from '@clerk/nextjs';
import { LayoutDashboard, BarChart2, LogOut, Settings, PlusCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function SettingsPage() {
  const { user } = useUser();

  const firstName = user?.firstName ?? 'İstifadəçi';
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'İstifadəçi';
  const email = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const imageUrl = user?.imageUrl;

  return (
    <div className="bg-surface text-on-surface min-h-screen">
      {/* ── Sidebar ── */}
      <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col py-6 bg-surface-container-low border-r border-outline-variant/40 z-40">
        <div className="px-6 mb-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg editorial-gradient flex items-center justify-center">
              <span className="text-white text-[10px] font-black">TC</span>
            </div>
            <span className="text-base font-extrabold text-primary tracking-tight font-headline">Test Centre</span>
          </Link>
        </div>

        <div className="flex items-center px-6 mb-7 gap-3">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/20" />
          ) : (
            <div className="w-10 h-10 rounded-full editorial-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-black">{firstName[0]}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-primary text-sm leading-tight truncate">{fullName}</p>
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-0.5 truncate">{email}</p>
          </div>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-3">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/60 hover:text-primary transition-all">
            <LayoutDashboard size={18} className="opacity-70" /> Panel
          </Link>
          <Link href="/analytics" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/60 hover:text-primary transition-all">
            <BarChart2 size={18} className="opacity-70" /> Nəticələr
          </Link>
          <Link href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold bg-white text-primary shadow-sm">
            <Settings size={18} className="text-secondary" /> Parametrlər
          </Link>
        </nav>

        <div className="px-4 mt-4 space-y-2">
          <Link href="/exams" className="w-full editorial-gradient text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-90 transition-opacity text-sm">
            <PlusCircle size={16} /> Sınaq Əldə Et
          </Link>
          <SignOutButton>
            <button className="w-full text-on-surface-variant py-3 px-4 flex items-center gap-3 hover:text-error transition-colors text-sm font-medium rounded-xl hover:bg-white/50">
              <LogOut size={16} /> Çıxış
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="ml-64 p-8 min-h-screen">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">Parametrlər</h1>
          <p className="text-on-surface-variant text-sm font-medium">Profil məlumatlarınızı, parolunuzu və hesabınızı idarə edin.</p>
        </header>

        <UserProfile
          appearance={{
            elements: {
              rootBox: 'w-full',
              card: 'shadow-none border border-outline-variant/40 rounded-2xl',
              navbar: 'border-r border-outline-variant/20',
              navbarButton: 'text-sm font-semibold',
              headerTitle: 'font-headline text-primary',
              headerSubtitle: 'text-on-surface-variant',
              formButtonPrimary: 'editorial-gradient shadow-none hover:opacity-90',
              formFieldInput: 'border-outline-variant rounded-xl',
              badge: 'bg-secondary-fixed/60 text-secondary',
            },
          }}
        />
      </main>
    </div>
  );
}
