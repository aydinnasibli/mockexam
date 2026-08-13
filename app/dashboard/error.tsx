'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePostHog } from '@posthog/react';

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
        <div className="mono-label mono-label-lg mb-5 text-error">Xəta</div>
        <h2 className="m-0 mb-3 text-[28px] leading-tight font-light tracking-[-0.03em] text-ink">
          Xəta baş verdi
        </h2>
        <p className="m-0 mb-7 text-sm text-ink-soft">
          Səhifə yüklənərkən problem yarandı.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button onClick={reset} className="btn-primary btn-sm cursor-pointer">
            Yenidən cəhd et
          </button>
          <Link href="/dashboard" className="btn-ghost btn-sm">
            Panelə qayıt
          </Link>
        </div>
      </div>
    </div>
  );
}
