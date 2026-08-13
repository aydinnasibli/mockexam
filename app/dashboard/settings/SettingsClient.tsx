'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { SignOutButton } from '@clerk/nextjs';
import Image from 'next/image';
import { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Loader2 } from 'lucide-react';
import { getUserSettings, saveUserSettings } from '@/lib/actions/settings';
import { EXAM_TYPES } from '@/lib/exam-types';

const examTypeOptions = EXAM_TYPES;

/**
 * One row of the ruled action list — the same construction as the "Səhvin növü
 * / Təkrarlanma" rail in §03 of the home page: a label, a hairline rule, and a
 * chevron that steps right on hover.
 */
function RowLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full cursor-pointer items-center justify-between gap-4 py-3.5 text-left transition-colors"
    >
      <span className="text-sm font-medium text-ink-soft transition-colors group-hover:text-ink">{label}</span>
      <ChevronRight size={15} className="shrink-0 text-ink-mute transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-ink" />
    </button>
  );
}

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
    <main className="min-h-screen bg-bg">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="mb-9">
          <div className="mb-5 flex items-center gap-3">
            <span className="dot" aria-hidden />
            <span className="mono-label mono-label-lg text-ink">Hesab</span>
          </div>
          <h1 className="m-0 mb-3 text-[32px] leading-[1.04] font-light tracking-[-0.035em] text-ink md:text-[40px]">
            Parametrlər.
          </h1>
          <p className="m-0 text-[17px] leading-[1.55] text-ink-soft">Hesab məlumatlarınızı idarə edin.</p>
        </header>

        <div className="space-y-4">

          {/* Profile */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="mono-label mono-label-lg m-0 text-ink">Profil</h2>
            </div>
            <div className="panel-body">
              <div className="mb-5 flex items-center gap-5 border-b border-rule pb-5">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt=""
                    width={60}
                    height={60}
                    className="h-15 w-15 shrink-0 rounded-full object-cover ring-1 ring-rule"
                  />
                ) : (
                  <div className="flex h-15 w-15 shrink-0 items-center justify-center rounded-full bg-ink">
                    <span className="text-xl font-medium text-bg">{firstName[0]}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="m-0 text-lg leading-tight font-medium tracking-[-0.015em] text-ink">{fullName}</p>
                  <p className="m-0 mt-1 truncate text-sm text-ink-soft">{email}</p>
                  {memberSince && (
                    <p className="mono-label m-0 mt-2">Üzv olduğu tarix: {memberSince}</p>
                  )}
                </div>
              </div>

              <div className="mb-1">
                <div className="flex items-center justify-between gap-4 border-t border-rule-soft py-3.5">
                  <span className="mono-label">Ad Soyad</span>
                  <span className="truncate text-sm font-medium text-ink">{fullName}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-rule-soft py-3.5">
                  <span className="mono-label">E-poçt</span>
                  <span className="max-w-55 truncate text-sm font-medium text-ink">{email}</span>
                </div>
                <div className="border-t border-rule-soft">
                  <RowLink label="Profili düzənlə — ad, şəkil, e-poçt" onClick={() => openUserProfile()} />
                </div>
              </div>
            </div>
          </div>

          {/* Target exam goal */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="mono-label mono-label-lg m-0 text-ink">İmtahan Hədəfi</h2>
            </div>
            <div className="panel-body space-y-5">
              <p className="m-0 text-sm text-ink-soft">Hədəf tarixinizi təyin edin — paneldə geri sayım görünəcək.</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="target-type">İmtahan növü</label>
                  <select
                    id="target-type"
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
                  <label className="field-label" htmlFor="target-date">İmtahan tarixi</label>
                  <input
                    id="target-date"
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
                  className="btn-primary btn-sm disabled:opacity-60"
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  Yadda saxla
                </button>
                {(targetDate || targetType) && (
                  <button
                    onClick={() => { setTargetDate(''); setTargetType(''); }}
                    className="ml-auto cursor-pointer text-[13px] font-medium text-ink-mute transition-colors hover:text-ink"
                  >
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="mono-label mono-label-lg m-0 text-ink">Təhlükəsizlik</h2>
            </div>
            <div className="px-5 py-1">
              <RowLink label="Şifrəni dəyiş" onClick={() => openUserProfile()} />
            </div>
          </div>

          {/* Account. Signing out is not a destructive action and no longer
              wears a red alert box; the rust semantic stays reserved for wrong
              answers and failed states. */}
          <div className="panel">
            <div className="panel-head">
              <h2 className="mono-label mono-label-lg m-0 text-ink">Hesab</h2>
            </div>
            <div className="panel-body">
              <SignOutButton>
                <button className="btn-ghost btn-sm cursor-pointer hover:border-error hover:text-error">
                  Hesabdan çıx
                </button>
              </SignOutButton>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
