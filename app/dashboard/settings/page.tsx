'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { SignOutButton } from '@clerk/nextjs';
import {
  User, Mail, Shield, ChevronRight, Pencil, CalendarDays, LogOut,
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
    <main className="min-h-screen bg-[#f0f2f5]">
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
  );
}
