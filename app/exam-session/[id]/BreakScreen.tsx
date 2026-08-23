'use client';

import { Coffee, ArrowRight } from 'lucide-react';
import { MONO_SECTION } from '@/components/ui/type-styles';
import ModuleIcon from './ModuleIcon';

/**
 * The scheduled break between two sections.
 *
 * `breakAfterMinutes` used to be summed into the single exam countdown, so the
 * SAT's ten-minute break was simply ten more minutes of testing and no break
 * ever appeared. It is now its own window in the session schedule
 * (`lib/domain/exam-timing.ts`), which is what lets this be a real break: the
 * clock on screen counts the BREAK down, and none of it is drawn from the next
 * module's time.
 *
 * Sits at z-100 — above every tool the exam offers. It shared z-95 with the
 * calculator, which renders later in the player and therefore won on SAT (the
 * only exam where the calculator exists), leaving it floating over a screen
 * that is supposed to be a full stop. The formula sheet had the mirror problem
 * at z-90: opened before a break, it ended up BEHIND an opaque overlay with its
 * close button unreachable until the break ended.
 *
 * Deliberately not dismissible. A candidate cannot start the next section early
 * in any of the exams this platform mocks, and letting them skip ahead here
 * would put them on a different schedule from the server's — which is the one
 * that decides when their answers stop counting.
 */

interface Props {
  finishedModuleName: string;
  nextModuleName: string;
  nextModuleType: string;
  nextModuleQuestionCount: number;
  nextModuleMinutes: number;
  /** Seconds left in the break. */
  remaining: number;
}

function formatClock(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function BreakScreen({
  finishedModuleName, nextModuleName, nextModuleType,
  nextModuleQuestionCount, nextModuleMinutes, remaining,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center overflow-y-auto bg-bg p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Fasilə"
    >
      <div className="w-full max-w-lg text-center">
        <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-bg">
          <Coffee size={22} />
        </span>

        <p className={`${MONO_SECTION} text-ink-mute mb-3`}>Fasilə</p>
        <h2 className="font-display m-0 mb-2 text-2xl leading-tight font-normal tracking-tight text-ink md:text-3xl">
          {finishedModuleName} bölməsi bitdi
        </h2>
        <p className="m-0 mb-7 text-sm">
          İndi fasilə vaxtıdır. Bu vaxt imtahan vaxtınızdan çıxılmır.
        </p>

        <div
          className="mb-7 rounded-2xl border border-rule bg-surface-2 px-6 py-7"
          role="timer"
          aria-live="off"
        >
          <div className={`${MONO_SECTION} text-ink-mute mb-2`}>Fasilənin bitməsinə</div>
          <div className="font-mono text-5xl tabular-nums text-ink">{formatClock(remaining)}</div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-rule bg-surface p-4 text-left">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-ink">
            <ModuleIcon type={nextModuleType} size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className={`${MONO_SECTION} text-ink-mute m-0 mb-1`}>Növbəti bölmə</p>
            <p className="m-0 truncate text-sm font-medium text-ink">{nextModuleName}</p>
            <p className="m-0 mt-0.5 text-sm text-ink-mute">
              {nextModuleQuestionCount > 0 ? `${nextModuleQuestionCount} sual` : 'Açıq tapşırıq'}
              {nextModuleMinutes > 0 && ` · ${nextModuleMinutes} dəq`}
            </p>
          </div>
          <ArrowRight size={17} className="shrink-0 text-ink-mute" aria-hidden="true" />
        </div>

        <p className="mt-5 m-0 text-sm text-ink-mute">
          Növbəti bölmə fasilə bitən kimi avtomatik başlayacaq.
        </p>
      </div>
    </div>
  );
}
