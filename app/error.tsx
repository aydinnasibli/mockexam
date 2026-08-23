'use client';

import { useEffect } from 'react';
import { usePostHog } from '@posthog/react';
import Button from '@/components/ui/Button';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * The application-wide error boundary, on the same tokens as every other
 * surface. It had been left on the pre-token palette (`bg-[#f0f2f5]`,
 * `red-100`, `font-headline`, `editorial-gradient`) long after the rest of the
 * product moved.
 */
export default function GlobalError({ error, reset }: Props) {
  const posthog = usePostHog();
  useEffect(() => {
    posthog.captureException(error);
  }, [error, posthog]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-6">
      <div className="max-w-md text-center">
        <div className="font-mono text-label font-normal tracking-[0.16em] uppercase mb-5 text-ink-mute">
          Xəta
        </div>
        <h1 className="font-display m-0 mb-3 text-heading leading-tight font-light tracking-[-0.03em] text-ink">
          Xəta baş verdi
        </h1>
        <p className="m-0 mb-7 text-sm text-ink-soft">
          Gözlənilməz bir problem yarandı. Zəhmət olmasa yenidən cəhd edin.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="sm" onClick={reset}>
            Yenidən cəhd et
          </Button>
          <Button variant="ghost" size="sm" href="/">
            Ana səhifə
          </Button>
        </div>
      </div>
    </main>
  );
}
