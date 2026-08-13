'use client';

import { useEffect } from 'react';
import { usePostHog } from '@posthog/react';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: Props) {
  const posthog = usePostHog();
  useEffect(() => {
    posthog.captureException(error);
  }, [error, posthog]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-sm text-center">
        <div className="mono-label mono-label-lg mb-5 text-error">Xəta</div>
        <h2 className="m-0 mb-3 text-[28px] leading-tight font-light tracking-[-0.03em] text-ink">
          Xəta baş verdi
        </h2>
        <p className="m-0 mb-7 text-sm text-ink-soft">
          Admin panelini yükləyərkən problem yarandı.
        </p>
        <button onClick={reset} className="btn-primary btn-sm cursor-pointer">
          Yenidən cəhd et
        </button>
      </div>
    </div>
  );
}
