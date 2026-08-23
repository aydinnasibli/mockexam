'use client';

import { useClerk, useUser } from '@clerk/nextjs';
import { SignOutButton } from '@clerk/nextjs';
import Image from 'next/image';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { ChevronRight, Loader2 } from 'lucide-react';
import { saveUserSettings } from '@/lib/actions/settings';
import { EXAM_TYPES } from '@/lib/domain/exam-types';
import { formatAzDate, todayIsoUtc } from '@/lib/shared/az-date';
import Button from '@/components/ui/Button';

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

interface Props {
  /** Read server-side in page.tsx — see the note there. '' means "not set". */
  initialTargetDate: string;
  initialTargetType: string;
}

export default function SettingsClient({ initialTargetDate, initialTargetType }: Props) {
  const { user }           = useUser();
  const { openUserProfile } = useClerk();

  const firstName   = user?.firstName ?? 'İstifadəçi';
  const fullName    = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'İstifadəçi';
  const email       = user?.emailAddresses?.[0]?.emailAddress ?? '';
  const imageUrl    = user?.imageUrl;
  // `toLocaleDateString('az-AZ')` renders differently under Node's ICU than in
  // a browser, which in a client component is a hydration mismatch. See
  // `formatAzDate`.
  const memberSince = user?.createdAt ? formatAzDate(user.createdAt) : '';

  const [targetDate, setTargetDate]  = useState(initialTargetDate);
  const [targetType, setTargetType]  = useState(initialTargetType);
  const [isPending, startTransition] = useTransition();

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

  /*
   * Computed once on mount, not during render: `new Date()` in a render body
   * differs between the server pass and the client pass around a UTC midnight,
   * which would hand the date input a different `min` than the markup shipped
   * with.
   */
  const [today] = useState(() => todayIsoUtc());

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <header className="mb-9">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            <span className="font-mono text-label font-normal tracking-[0.16em] uppercase text-ink-mute">Hesab</span>
          </div>
          <h1 className="m-0 mb-3 text-heading-lg leading-[1.04] font-light tracking-[-0.035em] text-ink md:text-display-xs">
            Parametrlər.
          </h1>
          <p className="m-0 text-lede leading-[1.55] text-ink-soft">Hesab məlumatlarınızı idarə edin.</p>
        </header>

        <div className="space-y-4">

          {/* Profile */}
          <div className="rounded-panel border border-rule bg-surface">
            <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
              <h2 className="font-mono text-label font-normal tracking-[0.16em] uppercase m-0 text-ink-mute">Profil</h2>
            </div>
            <div className="p-5">
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
                    <p className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute m-0 mt-2">Üzv olduğu tarix: {memberSince}</p>
                  )}
                </div>
              </div>

              <div className="mb-1">
                <div className="flex items-center justify-between gap-4 border-t border-rule-soft py-3.5">
                  <span className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute">Ad Soyad</span>
                  <span className="truncate text-sm font-medium text-ink">{fullName}</span>
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-rule-soft py-3.5">
                  <span className="font-mono text-caption font-normal tracking-[0.14em] uppercase text-ink-mute">E-poçt</span>
                  <span className="max-w-55 truncate text-sm font-medium text-ink">{email}</span>
                </div>
                <div className="border-t border-rule-soft">
                  <RowLink label="Profili düzənlə — ad, şəkil, e-poçt" onClick={() => openUserProfile()} />
                </div>
              </div>
            </div>
          </div>

          {/* Target exam goal */}
          <div className="rounded-panel border border-rule bg-surface">
            <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
              <h2 className="font-mono text-label font-normal tracking-[0.16em] uppercase m-0 text-ink-mute">İmtahan Hədəfi</h2>
            </div>
            <div className="p-5 space-y-5">
              <p className="m-0 text-sm text-ink-soft">Hədəf tarixinizi təyin edin — paneldə geri sayım görünəcək.</p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute" htmlFor="target-type">İmtahan növü</label>
                  <select
                    id="target-type"
                    value={targetType}
                    onChange={e => setTargetType(e.target.value)}
                    className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-3.5"
                  >
                    <option value="">Seçin...</option>
                    {examTypeOptions.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block font-mono text-label font-normal tracking-[0.14em] uppercase text-ink-mute" htmlFor="target-date">İmtahan tarixi</label>
                  <input
                    id="target-date"
                    type="date"
                    value={targetDate}
                    min={today}
                    onChange={e => setTargetDate(e.target.value)}
                    className="w-full rounded-btn border border-rule bg-surface bg-none font-sans text-base text-ink outline-none transition-[border-color] duration-200 focus:border-ink placeholder:text-ink-mute focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 px-4 py-3.5"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button size="sm" className="disabled:opacity-60"
                  onClick={handleSaveGoal}
                  disabled={isPending}
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  Yadda saxla
                </Button>
                {(targetDate || targetType) && (
                  <button
                    onClick={() => { setTargetDate(''); setTargetType(''); }}
                    className="ml-auto cursor-pointer text-note font-medium text-ink-mute transition-colors hover:text-ink"
                  >
                    Sıfırla
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-panel border border-rule bg-surface">
            <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
              <h2 className="font-mono text-label font-normal tracking-[0.16em] uppercase m-0 text-ink-mute">Təhlükəsizlik</h2>
            </div>
            <div className="px-5 py-1">
              <RowLink label="Şifrəni dəyiş" onClick={() => openUserProfile()} />
            </div>
          </div>

          {/* Account. Signing out is not a destructive action and no longer
              wears a red alert box; the rust semantic stays reserved for wrong
              answers and failed states. */}
          <div className="rounded-panel border border-rule bg-surface">
            <div className="flex items-center justify-between gap-4 border-b border-rule px-5 py-3.5">
              <h2 className="font-mono text-label font-normal tracking-[0.16em] uppercase m-0 text-ink-mute">Hesab</h2>
            </div>
            <div className="p-5">
              <SignOutButton>
                <Button variant="ghost" size="sm" className="hover:border-error hover:text-error">
                  Hesabdan çıx
                </Button>
              </SignOutButton>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
