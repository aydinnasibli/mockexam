'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { SignOutButton } from '@clerk/nextjs';
import Image from 'next/image';
import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import {
  User, Mail, Shield, ChevronRight, Pencil, CalendarDays,
  LogOut, Save, Loader2,
} from 'lucide-react';
import { getUserSettings, saveUserSettings } from '@/lib/actions/settings';
import { EXAM_TYPES } from '@/lib/exam-types';

const examTypeOptions = EXAM_TYPES;

export default function SettingsClient() {
  const { user }           = useUser();
  const { openUserProfile } = useClerk();

  const firstName   = user?.firstName ?? 'İstifadəçi';
  const fullName    = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'İstifadəçi';
  const email       = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const imageUrl    = user?.imageUrl;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('az-AZ', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const [targetDate, setTargetDate]  = useState('');
  const [targetType, setTargetType]  = useState('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getUserSettings().then(s => {
      if (!s) return;
      setTargetDate(s.targetExamDate ?? '');
      setTargetType(s.targetExamType ?? '');
    });
  }, []);

  function handleSaveGoal() {
    startTransition(async () => {
      const res = await saveUserSettings({
        targetExamDate: targetDate || null,
        targetExamType: targetType || null,
      });
      if ('error' in res) {
        toast.error(res.error ?? 'Xəta baş verdi');
      } else {
        toast.success('Saxlanıldı');
      }
    });
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <main className="min-h-screen bg-surface-2">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <header className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink mb-1">Parametrlər</h1>
          <p className="text-ink-soft text-sm">Hesab məlumatlarınızı idarə edin.</p>
        </header>

        <div className="space-y-4">

          {/* Profile */}
          <div className="bg-surface rounded-2xl border border-rule overflow-hidden">
            <div className="px-6 py-4 border-b border-rule">
              <h2 className="eyebrow text-ink-mute">Profil</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-rule">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt="Avatar"
                    width={64}
                    height={64}
                    className="rounded-full object-cover ring-4 ring-ink/10 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-ink flex items-center justify-center ring-4 ring-ink/10 shrink-0">
                    <span className="text-bg text-xl font-bold">{firstName[0]}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-display font-bold text-ink text-lg leading-tight">{fullName}</p>
                  <p className="text-sm text-ink-soft mt-0.5">{email}</p>
                  {memberSince && (
                    <p className="flex items-center gap-1.5 text-sm text-ink-mute mt-1.5">
                      <CalendarDays size={12} /> Üzv olduğu tarix: {memberSince}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-0 divide-y divide-rule mb-5">
                <div className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2.5 text-sm text-ink-soft">
                    <User size={15} /> Ad Soyad
                  </span>
                  <span className="font-medium text-ink text-sm">{fullName}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="flex items-center gap-2.5 text-sm text-ink-soft">
                    <Mail size={15} /> E-poçt
                  </span>
                  <span className="font-medium text-ink text-sm truncate max-w-55">{email}</span>
                </div>
              </div>

              <button
                onClick={() => openUserProfile()}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-2 hover:bg-surface-3 rounded-xl transition-colors group"
              >
                <span className="flex items-center gap-2.5 text-sm font-medium text-ink-soft group-hover:text-ink">
                  <Pencil size={15} /> Profili düzənlə — ad, şəkil, e-poçt
                </span>
                <ChevronRight size={15} className="text-ink-mute group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Target exam goal */}
          <div className="bg-surface rounded-2xl border border-rule overflow-hidden">
            <div className="px-6 py-4 border-b border-rule">
              <h2 className="eyebrow text-ink-mute">İmtahan Hədəfi</h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-ink-soft">Hədəf tarixinizi təyin edin — paneldə geri sayım görünəcək.</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1.5">İmtahan növü</label>
                  <select
                    value={targetType}
                    onChange={e => setTargetType(e.target.value)}
                    className="input-new w-full"
                  >
                    <option value="">Seçin...</option>
                    {examTypeOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-ink-soft block mb-1.5">İmtahan tarixi</label>
                  <input
                    type="date"
                    value={targetDate}
                    min={today}
                    onChange={e => setTargetDate(e.target.value)}
                    className="input-new w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveGoal}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-2.5 bg-ink text-bg rounded-xl text-sm font-medium hover:bg-ink/90 transition-colors disabled:opacity-60"
                >
                  {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Yadda saxla
                </button>
                {(targetDate || targetType) && (
                  <button
                    onClick={() => { setTargetDate(''); setTargetType(''); }}
                    className="text-xs text-ink-mute hover:text-ink font-medium ml-auto transition-colors"
                  >
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-surface rounded-2xl border border-rule overflow-hidden">
            <div className="px-6 py-4 border-b border-rule">
              <h2 className="eyebrow text-ink-mute">Təhlükəsizlik</h2>
            </div>
            <div className="p-6">
              <button
                onClick={() => openUserProfile()}
                className="w-full flex items-center justify-between px-4 py-3 bg-surface-2 hover:bg-surface-3 rounded-xl transition-colors group"
              >
                <span className="flex items-center gap-2.5 text-sm font-medium text-ink-soft group-hover:text-ink">
                  <Shield size={15} /> Şifrəni dəyiş
                </span>
                <ChevronRight size={15} className="text-ink-mute group-hover:text-ink group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Account */}
          <div className="bg-surface rounded-2xl border border-rule overflow-hidden">
            <div className="px-6 py-4 border-b border-rule">
              <h2 className="eyebrow text-ink-mute">Hesab</h2>
            </div>
            <div className="p-6">
              <SignOutButton>
                <button className="w-full flex items-center justify-between px-4 py-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-xl transition-colors group">
                  <span className="flex items-center gap-2.5 text-sm font-medium">
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
