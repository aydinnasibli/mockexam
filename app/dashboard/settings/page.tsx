'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { SignOutButton } from '@clerk/nextjs';
import Link from 'next/link';
import {
  LayoutDashboard, BarChart2, Settings, PlusCircle, LogOut,
  User, Mail, Shield, ChevronRight, Pencil, CalendarDays,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useUser();
  const { openUserProfile } = useClerk();

  const firstName  = user?.firstName ?? 'İstifadəçi';
  const fullName   = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'İstifadəçi';
  const email      = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const imageUrl   = user?.imageUrl;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('az-AZ', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

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
      <main className="ml-64 min-h-screen bg-surface-subtle">
        <div className="max-w-2xl mx-auto px-8 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight font-headline mb-1">Parametrlər</h1>
          <p className="text-on-surface-variant text-sm font-medium">Hesab məlumatlarınızı idarə edin.</p>
        </header>

        <div className="space-y-4">

          {/* Profile */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/20">
              <h2 className="text-sm font-bold text-primary font-headline uppercase tracking-wider">Profil</h2>
            </div>
            <div className="p-6">
              {/* Avatar + name */}
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-outline-variant/10">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover ring-4 ring-primary/10 shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full editorial-gradient flex items-center justify-center ring-4 ring-primary/10 shrink-0">
                    <span className="text-white text-xl font-black">{firstName[0]}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-primary text-lg leading-tight">{fullName}</p>
                  <p className="text-sm text-on-surface-variant mt-0.5">{email}</p>
                  {memberSince && (
                    <p className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-1.5">
                      <CalendarDays size={12} /> Üzv olduğu tarix: {memberSince}
                    </p>
                  )}
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-0 divide-y divide-outline-variant/10 mb-5">
                <div className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                    <User size={15} /> Ad Soyad
                  </span>
                  <span className="font-semibold text-primary text-sm">{fullName}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2.5 text-sm text-on-surface-variant">
                    <Mail size={15} /> E-poçt
                  </span>
                  <span className="font-semibold text-primary text-sm truncate max-w-[220px]">{email}</span>
                </div>
              </div>

              <button
                onClick={() => openUserProfile()}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low hover:bg-surface-container rounded-xl transition-colors group"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-on-surface-variant group-hover:text-primary">
                  <Pencil size={15} /> Profili düzənlə — ad, şəkil, e-poçt
                </span>
                <ChevronRight size={15} className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/20">
              <h2 className="text-sm font-bold text-primary font-headline uppercase tracking-wider">Təhlükəsizlik</h2>
            </div>
            <div className="p-6">
              <button
                onClick={() => openUserProfile()}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-container-low hover:bg-surface-container rounded-xl transition-colors group"
              >
                <span className="flex items-center gap-2.5 text-sm font-semibold text-on-surface-variant group-hover:text-primary">
                  <Shield size={15} /> Şifrəni dəyiş
                </span>
                <ChevronRight size={15} className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Account / danger zone */}
          <div className="bg-white rounded-2xl border border-outline-variant/40 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-outline-variant/20">
              <h2 className="text-sm font-bold text-primary font-headline uppercase tracking-wider">Hesab</h2>
            </div>
            <div className="p-6">
              <SignOutButton>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl transition-colors group">
                  <span className="flex items-center gap-2.5 text-sm font-semibold">
                    <LogOut size={15} /> Hesabdan çıx
                  </span>
                  <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </SignOutButton>
            </div>
          </div>

        </div>
        </div>
      </main>
    </div>
  );
}
