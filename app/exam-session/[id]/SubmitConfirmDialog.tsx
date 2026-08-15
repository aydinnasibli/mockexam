'use client';

import { CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * The last thing between a student and an irreversible submit.
 *
 * It states the unanswered count explicitly, because the most costly mistake
 * here is finishing a timed exam without realising questions were skipped.
 */
export default function SubmitConfirmDialog({
  answeredCount, totalQuestions, submitting, onCancel, onConfirm,
}: {
  answeredCount: number;
  totalQuestions: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const unanswered = totalQuestions - answeredCount;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-confirm-title"
        className="rounded-2xl p-6 md:p-8 max-w-sm w-full text-center bg-surface shadow-lg"
      >
        <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-accent-soft">
          <CheckCircle2 className="text-ink" size={24} />
        </div>
        <h3 id="submit-confirm-title" className="font-display font-medium text-xl leading-tight tracking-tight text-ink mb-3">
          İmtahanı bitirirsiniz?
        </h3>
        <div className="text-sm mb-2">
          <p>
            <span className="font-medium text-ink">{answeredCount}</span> / {totalQuestions} sual cavablandı.
          </p>
          {unanswered > 0 && (
            <p className="mt-1 font-medium text-warn">{unanswered} sual cavabsız qalır.</p>
          )}
        </div>
        <p className="text-sm mb-6 text-ink-mute">Bu əməliyyat geri qaytarıla bilməz.</p>
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
            disabled={submitting}
          >
            {submitting ? 'Göndərilir...' : 'Bitir'}
          </Button>
        </div>
      </div>
    </div>
  );
}
