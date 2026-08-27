'use client';

import { FastForward } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * Confirmation for handing back the rest of a section.
 *
 * The cost is one-way and easy to miss: the section's remaining minutes are
 * forfeited, not moved onto the next one, and its questions lock the moment the
 * candidate agrees. So this states the unanswered count for THIS section and
 * the time being given up, in the same shape as the submit dialog — the two
 * decisions are neighbours in the header and should read alike.
 */
export default function FinishModuleDialog({
  moduleName, nextModuleName, answeredCount, totalQuestions, remainingLabel, busy, onCancel, onConfirm,
}: {
  moduleName: string;
  nextModuleName: string;
  answeredCount: number;
  totalQuestions: number;
  remainingLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const unanswered = totalQuestions - answeredCount;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="finish-module-title"
        className="rounded-2xl p-6 md:p-8 max-w-sm w-full text-center bg-surface shadow-lg"
      >
        <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-accent-soft">
          <FastForward className="text-ink" size={24} />
        </div>
        <h3 id="finish-module-title" className="font-display font-medium text-xl leading-tight tracking-tight text-ink mb-3">
          «{moduleName}» bölməsini bitirirsiniz?
        </h3>
        <div className="text-sm mb-2">
          <p>
            <span className="font-medium text-ink">{answeredCount}</span> / {totalQuestions} sual cavablandı.
          </p>
          {unanswered > 0 && (
            <p className="mt-1 font-medium text-warn">{unanswered} sual cavabsız qalır.</p>
          )}
        </div>
        <p className="text-sm mb-6 text-ink-mute">
          Qalan <span className="font-medium text-ink">{remainingLabel}</span> vaxt itiriləcək və bu bölmənin
          sualları bağlanacaq. «{nextModuleName}» dərhal başlayacaq.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors border border-rule text-ink-soft"
          >
            Davam et
          </button>
          <Button
            size="none"
            className="flex-1 gap-2.5 rounded-xl px-5.5 py-3 text-sm disabled:opacity-60"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Bağlanır...' : 'Bölməni bitir'}
          </Button>
        </div>
      </div>
    </div>
  );
}
