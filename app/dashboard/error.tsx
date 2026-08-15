'use client';

import { useEffect } from 'react';
import { usePostHog } from '@posthog/react';
import Button from '@/components/ui/Button';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: Props) {
  const posthog = usePostHog();
  useEffect(() => {
    posthog.captureException(error);
  }, [error, posthog]);

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="max-w-sm text-center">
        <div className="font-mono text-label font-normal tracking-[0.16em] uppercase mb-5 text-ink-mute">Xəta</div>
        <h2 className="m-0 mb-3 text-heading leading-tight font-light tracking-[-0.03em] text-ink">
          Xəta baş verdi
        </h2>
        <p className="m-0 mb-7 text-sm text-ink-soft">
          Səhifə yüklənərkən problem yarandı.
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
    </div>
  );
}
