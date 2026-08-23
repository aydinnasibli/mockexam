'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, RotateCcw, TriangleAlert } from 'lucide-react';
import Button from '@/components/ui/Button';
import Tag from '@/components/ui/Tag';
import { MONO_SECTION } from '@/components/ui/type-styles';
import type { PublicExam } from '@/lib/db/exams';

/**
 * The choice offered when an attempt is already running.
 *
 * The player used to resume straight into any session it found, which meant an
 * abandoned attempt could never be escaped: the clock had usually expired, so
 * arriving simply auto-submitted an empty paper. There was no restart anywhere
 * in the product — submitting cleared the session, giving up did not.
 *
 * The clock keeps running behind this screen. That is deliberate and stated: a
 * candidate mid-exam must not be able to buy thinking time by reloading, and
 * pretending otherwise would be the same free-time bug the module schedule
 * exists to close.
 */

interface Props {
  exam: PublicExam;
  /** Seconds left on the whole attempt. */
  remaining: number;
  answeredCount: number;
  totalQuestions: number;
  restarting: boolean;
  onContinue: () => void;
  onRestart: () => void;
}

function formatClock(seconds: number) {
  const s = Math.max(0, seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} saat ${m} dəq` : `${m} dəq`;
}

export default function ResumeScreen({
  exam, remaining, answeredCount, totalQuestions, restarting, onContinue, onRestart,
}: Props) {
  const [confirming, setConfirming] = useState(false);
  const expired = remaining <= 0;

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <header className="flex h-14 shrink-0 items-center border-b border-rule px-4 md:h-16 md:px-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span className="font-display text-lg font-normal text-ink">Test<span>centre</span></span>
        </Link>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-5 py-10 md:py-14">
          <div className="mb-4 flex items-center gap-2">
            <Tag tone="accent">{exam.tag}</Tag>
            <span className={`${MONO_SECTION} text-ink-mute`}>Davam edən cəhd</span>
          </div>

          <h1 className="font-display m-0 mb-3 text-3xl leading-tight font-normal tracking-tight text-ink md:text-4xl">
            {exam.title}
          </h1>

          <p className="m-0 mb-8 text-base leading-[1.6]">
            {expired
              ? 'Bu cəhdin vaxtı bitib. Davam etsəniz, cavablarınız dərhal göndəriləcək.'
              : 'Bu imtahanı əvvəl başlamısınız. Qaldığınız yerdən davam edə və ya hamısını yenidən başlada bilərsiniz.'}
          </p>

          <div className="mb-8 grid grid-cols-2 gap-4 border-y border-rule py-6">
            <div>
              <div className={`${MONO_SECTION} text-ink-mute mb-2`}>Qalan vaxt</div>
              <div className={`font-display text-2xl leading-none tabular-nums md:text-3xl ${expired ? 'text-error' : 'text-ink'}`}>
                {expired ? 'Bitib' : formatClock(remaining)}
              </div>
            </div>
            <div className="border-l border-rule pl-5">
              <div className={`${MONO_SECTION} text-ink-mute mb-2`}>Cavablandırılıb</div>
              <div className="font-display text-2xl leading-none tabular-nums text-ink md:text-3xl">
                {answeredCount}<span className="ml-1 text-sm text-ink-mute">/ {totalQuestions}</span>
              </div>
            </div>
          </div>

          {confirming ? (
            <div className="rounded-card border border-warn bg-warn/8 p-5">
              <div className="mb-2 flex items-center gap-2">
                <TriangleAlert size={16} className="shrink-0 text-warn" />
                <p className="m-0 text-sm font-medium text-ink">Yenidən başlamaq istədiyinizə əminsiniz?</p>
              </div>
              <p className="m-0 mb-5 text-sm leading-relaxed">
                Bu cəhddəki bütün cavablarınız silinəcək və vaxt sıfırdan başlayacaq.
                Bu addımı geri qaytarmaq mümkün deyil.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={onRestart} disabled={restarting}>
                  {restarting ? 'Sıfırlanır…' : 'Bəli, yenidən başlat'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={restarting}>
                  Ləğv et
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <Button size="none" className="gap-2.5 px-8 py-3.5 text-base" onClick={onContinue}>
                Davam et <ArrowRight size={17} />
              </Button>
              <Button size="none" variant="ghost" className="gap-2 px-5 py-3.5 text-base" onClick={() => setConfirming(true)}>
                <RotateCcw size={16} /> Yenidən başlat
              </Button>
            </div>
          )}

          {!expired && (
            <p className="mt-5 m-0 text-sm text-ink-mute">
              Diqqət: bu ekranda da vaxt işləməyə davam edir.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
