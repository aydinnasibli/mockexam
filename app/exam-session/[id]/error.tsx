'use client';

import { useEffect } from 'react';
import { usePostHog } from '@posthog/react';
import Button from '@/components/ui/Button';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * The screen a candidate sees when a paid sitting goes wrong.
 *
 * Migrated onto the design tokens the rest of the product uses. It had been
 * left on the pre-token palette — `bg-[#f0f2f5]`, `bg-white`, `red-200`,
 * `font-headline`, `editorial-gradient` — which made the one screen that turns
 * up at the worst possible moment the one that looked least like the product.
 *
 * The warning about an unsaved result is kept and given the `warn` token rather
 * than hardcoded amber: it is the most important sentence here, because it is
 * the only thing telling the candidate their work might not have reached us.
 */
export default function ExamSessionError({ error, reset }: Props) {
  const posthog = usePostHog();
  useEffect(() => {
    posthog.captureException(error);
  }, [error, posthog]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="w-full max-w-md text-center">
        <div className="font-mono text-label font-normal tracking-[0.16em] uppercase mb-5 text-ink-mute">
          Xəta
        </div>
        <h1 className="font-display m-0 mb-3 text-heading leading-tight font-light tracking-[-0.03em] text-ink">
          İmtahan oturumu xətası
        </h1>
        <p className="m-0 mb-5 text-sm text-ink-soft">
          İmtahan yüklənərkən problem yarandı.
        </p>
        <p className="m-0 mb-7 rounded-card border border-warn bg-warn/8 px-4 py-3 text-sm leading-relaxed text-ink">
          Əgər imtahanı artıq başlamışdınızsa, nəticəniz saxlanılmamış ola bilər.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="sm" onClick={reset}>
            Yenidən cəhd et
          </Button>
          <Button variant="ghost" size="sm" href="/dashboard">
            Panelə qayıt
          </Button>
        </div>
      </div>
    </main>
  );
}
